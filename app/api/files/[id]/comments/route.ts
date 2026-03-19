import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth';
import { handleApiError, ApiError } from '@/lib/api-error';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity';

const commentSchema = z.object({
  body: z.string().min(1, 'Comment cannot be empty'),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { dbUser } = await requireAuth();
    const resolvedParams = await params;
    const fileId = resolvedParams.id;

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
    const body = await request.json();
    
    const { body: commentBody } = commentSchema.parse(body);

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
