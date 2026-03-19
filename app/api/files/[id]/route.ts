import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth';
import { handleApiError, ApiError } from '@/lib/api-error';
import { prisma } from '@/lib/prisma';
import { deleteFromStorage } from '@/lib/storage';
import { logActivity } from '@/lib/activity';

const updateFileSchema = z.object({
  filename: z.string().min(1).optional(),
  folderId: z.string().nullable().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { dbUser } = await requireAuth();
    const resolvedParams = await params;
    const fileId = resolvedParams.id;
    const body = await request.json();
    
    const data = updateFileSchema.parse(body);

    const file = await prisma.file.findUnique({
      where: { id: fileId },
    });

    if (!file || file.userId !== dbUser.id) {
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

    return NextResponse.json(updatedFile);
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

    const file = await prisma.file.findUnique({
      where: { id: fileId },
    });

    if (!file || file.userId !== dbUser.id) {
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

    return NextResponse.json(deletedFile);
  } catch (error) {
    return handleApiError(error);
  }
}
