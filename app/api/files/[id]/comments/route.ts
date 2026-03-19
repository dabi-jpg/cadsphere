import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth';
import { handleApiError, ApiError } from '@/lib/api-error';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity';
import { uuidSchema, createCommentSchema } from '@/lib/validation';
import { rateLimit } from '@/lib/rate-limit';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { dbUser } = await requireAuth();
    const resolvedParams = await params;
    const fileId = resolvedParams.id;

    if (!uuidSchema.safeParse(fileId).success) {
      throw new ApiError('Invalid file ID', 'VALIDATION_ERROR', 400);
    }

    // Permissions check
    const file = await prisma.file.findUnique({
      where: { id: fileId },
      include: {
        sharedWith: { where: { sharedWithId: dbUser.id } },
      },
    });

    if (!file || (file.userId !== dbUser.id && file.sharedWith.length === 0)) {
      throw new ApiError('File not found', 'NOT_FOUND', 404);
    }

    const comments = await prisma.fileComment.findMany({
      where: { fileId },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true, email: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(comments);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { dbUser } = await requireAuth();
    const resolvedParams = await params;
    const fileId = resolvedParams.id;

    if (!uuidSchema.safeParse(fileId).success) {
      throw new ApiError('Invalid file ID', 'VALIDATION_ERROR', 400);
    }

    // Rate limit: 30 comments per hour per user
    const limit = rateLimit({
      key: `comments:${dbUser.id}`,
      limit: 30,
      windowMs: 60 * 60 * 1000,
    });
    if (!limit.success) {
      return Response.json(
        { error: 'Too many requests. Please try again later.', code: 'RATE_LIMITED' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((limit.resetAt - Date.now()) / 1000)) } }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      throw new ApiError('Invalid JSON', 'INVALID_BODY', 400);
    }

    const parsed = createCommentSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(parsed.error.issues[0]?.message || 'Validation error', 'VALIDATION_ERROR', 400);
    }
    const { body: commentBody } = parsed.data;

    // Permissions check
    const file = await prisma.file.findUnique({
      where: { id: fileId },
      include: {
        sharedWith: { where: { sharedWithId: dbUser.id } },
      },
    });

    if (!file || (file.userId !== dbUser.id && file.sharedWith.length === 0)) {
      throw new ApiError('File not found', 'NOT_FOUND', 404);
    }

    const newComment = await prisma.fileComment.create({
      data: {
        fileId,
        userId: dbUser.id,
        body: commentBody,
      },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true, email: true } },
      },
    });

    logActivity({
      userId: dbUser.id,
      action: 'COMMENT_ADDED',
      fileId,
      metadata: { commentId: newComment.id },
    });

    return NextResponse.json(newComment, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
