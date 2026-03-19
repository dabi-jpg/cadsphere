import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth';
import { handleApiError, ApiError } from '@/lib/api-error';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity';

const updateShareSchema = z.object({
  permission: z.enum(['VIEWER', 'EDITOR']),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { dbUser } = await requireAuth();
    const resolvedParams = await params;
    const shareId = resolvedParams.id;
    const body = await request.json();
    const { permission } = updateShareSchema.parse(body);

    const share = await prisma.sharedFile.findUnique({
      where: { id: shareId },
      include: { file: true },
    });

    if (!share) {
      throw new ApiError('Share not found', 'NOT_FOUND', 404);
    }

    // Only file owner can update permissions
    if (share.file.userId !== dbUser.id) {
      throw new ApiError('Forbidden', 'FORBIDDEN', 403);
    }

    const updatedShare = await prisma.sharedFile.update({
      where: { id: shareId },
      data: { permission },
      include: {
         sharedWith: { select: { name: true, email: true } }
      }
    });

    logActivity({
      userId: dbUser.id,
      action: 'FILE_SHARE_UPDATED',
      fileId: share.fileId,
      metadata: { targetUserId: share.sharedWithId, permission },
    });

    return NextResponse.json(updatedShare);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { dbUser } = await requireAuth();
    const resolvedParams = await params;
    const shareId = resolvedParams.id;

    const share = await prisma.sharedFile.findUnique({
      where: { id: shareId },
      include: { file: true },
    });

    if (!share) {
      throw new ApiError('Share not found', 'NOT_FOUND', 404);
    }

    // Only file owner OR the person it was shared with can remove the share
    if (share.file.userId !== dbUser.id && share.sharedWithId !== dbUser.id) {
      throw new ApiError('Forbidden', 'FORBIDDEN', 403);
    }

    await prisma.sharedFile.delete({
      where: { id: shareId },
    });

    logActivity({
      userId: dbUser.id,
      action: 'FILE_SHARE_REMOVED',
      fileId: share.fileId,
      metadata: { targetUserId: share.sharedWithId },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}
