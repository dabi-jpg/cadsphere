import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth';
import { handleApiError, ApiError } from '@/lib/api-error';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity';

const folderSchema = z.object({
  name: z.string().min(1, 'Folder name is required'),
  parentId: z.string().nullable().optional(),
});

export async function GET(request: Request) {
  try {
    const { dbUser } = await requireAuth();
    const { searchParams } = new URL(request.url);
    const parentId = searchParams.get('parentId');

    const folders = await prisma.folder.findMany({
      where: {
        userId: dbUser.id,
        parentId: parentId === 'root' ? null : (parentId || undefined),
      },
      include: {
        _count: { select: { files: true, children: true } },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(folders);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { dbUser } = await requireAuth();
    const body = await request.json();
    const { name, parentId } = folderSchema.parse(body);

    if (parentId) {
      const parent = await prisma.folder.findUnique({
        where: { id: parentId },
      });
      if (!parent || parent.userId !== dbUser.id) {
        throw new ApiError('Invalid parent folder', 'BAD_REQUEST', 400);
      }
    }

    const folder = await prisma.folder.create({
      data: {
        name,
        parentId: parentId || null,
        userId: dbUser.id,
      },
      include: {
        _count: { select: { files: true, children: true } },
      },
    });

    logActivity({
      userId: dbUser.id,
      action: 'FOLDER_CREATED',
      metadata: { folderId: folder.id, name },
    });

    return NextResponse.json(folder, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
