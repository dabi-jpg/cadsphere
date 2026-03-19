import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { handleApiError, ApiError } from '@/lib/api-error';
import { prisma } from '@/lib/prisma';
import { deleteFromStorage } from '@/lib/storage';
import { logActivity } from '@/lib/activity';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { dbUser } = await requireAuth();
    const resolvedParams = await params;
    const fileId = resolvedParams.id;

    const file = await prisma.file.findUnique({
      where: { id: fileId },
      include: { versions: true },
    });

    if (!file || file.userId !== dbUser.id) {
      throw new ApiError('File not found', 'NOT_FOUND', 404);
    }

    // Must be in trash to be permanently deleted via this route
    if (!file.deletedAt) {
      throw new ApiError('File is not in trash', 'BAD_REQUEST', 400);
    }

    // 1. Delete all versions from Supabase Storage
    for (const version of file.versions) {
      await deleteFromStorage(version.storagePath);
    }

    // 2. Delete the record from Prisma (cascade will handle relations)
    await prisma.file.delete({
      where: { id: fileId },
    });

    logActivity({
      userId: dbUser.id,
      action: 'FILE_PERMANENTLY_DELETED',
      metadata: { filename: file.filename },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}
