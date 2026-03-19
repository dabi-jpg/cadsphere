import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth';
import { handleApiError, ApiError } from '@/lib/api-error';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity';

const updateFolderSchema = z.object({
  name: z.string().min(1).optional(),
  parentId: z.string().nullable().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { dbUser } = await requireAuth();
    const resolvedParams = await params;
    const folderId = resolvedParams.id;
    const body = await request.json();
    const data = updateFolderSchema.parse(body);

    const folder = await prisma.folder.findUnique({
      where: { id: folderId },
    });

    if (!folder || folder.userId !== dbUser.id) {
      throw new ApiError('Folder not found', 'NOT_FOUND', 404);
    }

    if (data.parentId) {
      // Prevent circular logic simply (could be more robust)
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

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { dbUser } = await requireAuth();
    const resolvedParams = await params;
    const folderId = resolvedParams.id;

    const folder = await prisma.folder.findUnique({
      where: { id: folderId },
    });

    if (!folder || folder.userId !== dbUser.id) {
      throw new ApiError('Folder not found', 'NOT_FOUND', 404);
    }

    await prisma.folder.delete({
      where: { id: folderId },
    });

    logActivity({
      userId: dbUser.id,
      action: 'FOLDER_DELETED',
      metadata: { folderId, name: folder.name },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}
