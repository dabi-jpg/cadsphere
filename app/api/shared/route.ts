import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth';
import { handleApiError, ApiError } from '@/lib/api-error';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity';
import { rateLimit } from '@/lib/rate-limit';

const shareSchema = z.object({
  fileId: z.string().min(1),
  email: z.string().email(),
  permission: z.enum(['VIEWER', 'EDITOR']).default('VIEWER'),
});

export async function GET(request: Request) {
  try {
    const { dbUser } = await requireAuth();

    // Files shared WITH the current user
    const sharedFiles = await prisma.sharedFile.findMany({
      where: { sharedWithId: dbUser.id },
      include: {
        file: {
          select: {
            id: true,
            filename: true,
            filetype: true,
            size: true,
            createdAt: true,
            updatedAt: true,
            folderId: true,
            tags: true,
            deletedAt: true,
            folder: { select: { id: true, name: true } },
            _count: { select: { versions: true } },
          },
        },
        sharedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
            role: true,
            organization: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Filter out shares where the file was deleted
    const active = sharedFiles.filter(s => s.file.deletedAt === null);

    // Files shared BY the current user
    const sharedByMe = await prisma.sharedFile.findMany({
      where: { sharedById: dbUser.id },
      include: {
        file: {
          select: {
            id: true,
            filename: true,
            filetype: true,
            size: true,
            createdAt: true,
            deletedAt: true,
          },
        },
        sharedWith: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      sharedFiles: active,
      sharedByMe: sharedByMe.filter(s => s.file.deletedAt === null),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { dbUser } = await requireAuth();

    // Rate limit: 30 shares per hour per user
    const limit = rateLimit({
      key: `share:${dbUser.id}`,
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

    const parsed = shareSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(parsed.error.issues[0]?.message || 'Validation error', 'VALIDATION_ERROR', 400);
    }
    const { fileId, email, permission } = parsed.data;

    const file = await prisma.file.findUnique({
      where: { id: fileId },
    });

    if (!file || file.userId !== dbUser.id) {
      throw new ApiError('File not found', 'NOT_FOUND', 404);
    }

    // Find user to share with
    const targetUser = await prisma.user.findUnique({
      where: { email },
    });

    if (!targetUser) {
      throw new ApiError('User not found in system', 'BAD_REQUEST', 400);
    }

    if (targetUser.id === dbUser.id) {
      throw new ApiError('Cannot share with yourself', 'BAD_REQUEST', 400);
    }

    const newShare = await prisma.sharedFile.create({
      data: {
        fileId,
        sharedById: dbUser.id,
        sharedWithId: targetUser.id,
        permission,
      },
      include: {
        sharedWith: { select: { name: true, email: true } }
      }
    });

    logActivity({
      userId: dbUser.id,
      action: 'FILE_SHARED',
      fileId,
      metadata: { sharedWithEmail: email, permission },
    });

    return NextResponse.json(newShare, { status: 201 });
  } catch (error) {
    if ((error as any).code === 'P2002') {
      return handleApiError(new ApiError('File already shared with this user', 'CONFLICT', 409));
    }
    return handleApiError(error);
  }
}
