import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { handleApiError, ApiError } from '@/lib/api-error';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity';
import { uuidSchema } from '@/lib/validation';
import { sanitizeFile } from '@/lib/sanitize';

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

    const file = await prisma.file.findUnique({
      where: { id: fileId, userId: dbUser.id },
    });

    if (!file) {
      throw new ApiError('File not found', 'NOT_FOUND', 404);
    }

    if (!file.deletedAt) {
      throw new ApiError('File is not in trash', 'BAD_REQUEST', 400);
    }

    const restoredFile = await prisma.file.update({
      where: { id: fileId },
      data: {
        deletedAt: null,
      },
      include: {
        folder: { select: { name: true } }
      }
    });

    logActivity({
      userId: dbUser.id,
      action: 'FILE_RESTORED',
      fileId,
      metadata: { filename: file.filename },
    });

    return NextResponse.json(sanitizeFile(restoredFile as unknown as Record<string, unknown>));
  } catch (error) {
    return handleApiError(error);
  }
}
