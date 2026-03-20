import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth';
import { handleApiError, ApiError } from '@/lib/api-error';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity';
import { uuidSchema } from '@/lib/validation';

const updateFolderSchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  parentId: z.string().uuid().nullable().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { dbUser } = await requireAuth();
    const resolvedParams = await params;
    const folderId = resolvedParams.id;

    if (!uuidSchema.safeParse(folderId).success) {
      throw new ApiError('Invalid folder ID', 'VALIDATION_ERROR', 400);
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      throw new ApiError('Invalid JSON', 'INVALID_BODY', 400);
    }

    const parsed = updateFolderSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(parsed.error.issues[0]?.message || 'Validation error', 'VALIDATION_ERROR', 400);
    }
    const data = parsed.data;

    const folder = await prisma.folder.findUnique({
      where: { id: folderId, userId: dbUser.id },
    });

    if (!folder) {
      throw new ApiError('Folder not found', 'NOT_FOUND', 404);
    }

    if (data.parentId) {
      // Prevent circular logic
      if (data.parentId === folderId) {
        throw new ApiError('Cannot move folder into itself', 'BAD_REQUEST', 400);
      }
      const parent = await prisma.folder.findUnique({
        where: { id: data.parentId },
      });
      if (!parent || parent.userId !== dbUser.id) {
        throw new ApiError('Invalid parent folder', 'BAD_REQUEST', 400);
      }
    }

    const updatedFolder = await prisma.folder.update({
      where: { id: folderId },
      data,
      include: {
        _count: { select: { files: true, children: true } },
      },
    });

    logActivity({
      userId: dbUser.id,
      action: 'FOLDER_UPDATED',
      metadata: { folderId, name: updatedFolder.name },
    });

    return NextResponse.json(updatedFolder);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { dbUser } = await requireAuth()
    const resolvedParams = await params
    const folderId = resolvedParams.id

    const folder = await prisma.folder.findUnique({ where: { id: folderId } })
    if (!folder) throw new ApiError('Folder not found', 'NOT_FOUND', 404)
    if (folder.userId !== dbUser.id) throw new ApiError('Forbidden', 'FORBIDDEN', 403)
    
    await prisma.file.updateMany({
      where: { folderId, userId: dbUser.id },
      data: { folderId: null }
    })
    
    await prisma.folder.updateMany({
      where: { parentId: folderId, userId: dbUser.id },
      data: { parentId: null }
    })
    
    await prisma.folder.delete({ where: { id: folderId } })
    
    return Response.json({ success: true })
  } catch (err) {
    return handleApiError(err)
  }
}
