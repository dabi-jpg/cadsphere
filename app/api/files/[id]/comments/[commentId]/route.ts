import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { handleApiError, ApiError } from '@/lib/api-error';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity';
import { uuidSchema } from '@/lib/validation';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    const { dbUser } = await requireAuth();
    const resolvedParams = await params;
    const fileId = resolvedParams.id;
    const commentId = resolvedParams.commentId;

    // Validate UUID params
    if (!uuidSchema.safeParse(fileId).success || !uuidSchema.safeParse(commentId).success) {
      throw new ApiError('Invalid ID format', 'VALIDATION_ERROR', 400);
    }

    const comment = await prisma.fileComment.findUnique({
      where: { id: commentId, fileId },
      include: { file: { select: { userId: true } } },
    });

    if (!comment) {
      throw new ApiError('Comment not found', 'NOT_FOUND', 404);
    }

    // Only comment author OR file owner can delete the comment
    if (comment.userId !== dbUser.id && comment.file.userId !== dbUser.id) {
      throw new ApiError('Forbidden', 'FORBIDDEN', 403);
    }

    await prisma.fileComment.delete({
      where: { id: commentId },
    });

    logActivity({
      userId: dbUser.id,
      action: 'COMMENT_DELETED',
      fileId,
      metadata: { commentId },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}
