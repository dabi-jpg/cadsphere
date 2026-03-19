import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { handleApiError, ApiError } from '@/lib/api-error';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity';
import { uuidSchema, updateFileSchema } from '@/lib/validation';
import { sanitizeFile } from '@/lib/sanitize';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { dbUser } = await requireAuth();
    const resolvedParams = await params;
    const fileId = resolvedParams.id;

    // Validate UUID param
    if (!uuidSchema.safeParse(fileId).success) {
      throw new ApiError('Invalid file ID', 'VALIDATION_ERROR', 400);
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      throw new ApiError('Invalid JSON', 'INVALID_BODY', 400);
    }

    const parsed = updateFileSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(parsed.error.issues[0]?.message || 'Validation error', 'VALIDATION_ERROR', 400);
    }
    const data = parsed.data;

    const file = await prisma.file.findUnique({
      where: { id: fileId, userId: dbUser.id },
    });

    if (!file) {
      throw new ApiError('File not found or forbidden', 'NOT_FOUND', 404);
    }

    if (data.folderId) {
      const folder = await prisma.folder.findUnique({
        where: { id: data.folderId },
      });
      if (!folder || folder.userId !== dbUser.id) {
        throw new ApiError('Invalid folder', 'BAD_REQUEST', 400);
      }
    }

    const updatedFile = await prisma.file.update({
      where: { id: fileId },
      data,
    });

    logActivity({
      userId: dbUser.id,
      action: 'FILE_UPDATED',
      fileId,
      metadata: { changes: Object.keys(data) },
    });

    return NextResponse.json(sanitizeFile(updatedFile as unknown as Record<string, unknown>));
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
    const fileId = resolvedParams.id;

    // Validate UUID param
    if (!uuidSchema.safeParse(fileId).success) {
      throw new ApiError('Invalid file ID', 'VALIDATION_ERROR', 400);
    }

    const file = await prisma.file.findUnique({
      where: { id: fileId, userId: dbUser.id },
    });

    if (!file) {
      throw new ApiError('File not found or forbidden', 'NOT_FOUND', 404);
    }

    // Soft delete -> move to trash
    const deletedFile = await prisma.file.update({
      where: { id: fileId },
      data: {
        deletedAt: new Date(),
      },
    });

    logActivity({
      userId: dbUser.id,
      action: 'FILE_TRASHED',
      fileId,
      metadata: { filename: file.filename },
    });

    return NextResponse.json(sanitizeFile(deletedFile as unknown as Record<string, unknown>));
  } catch (error) {
    return handleApiError(error);
  }
}
