import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { handleApiError, ApiError } from '@/lib/api-error';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const { dbUser } = await requireAuth();
    const resolvedParams = await params;
    const fileId = resolvedParams.fileId;

    const file = await prisma.file.findUnique({
      where: { id: fileId },
      include: {
        sharedWith: { where: { sharedWithId: dbUser.id } },
      },
    });

    if (!file || (file.userId !== dbUser.id && file.sharedWith.length === 0)) {
      throw new ApiError('File not found', 'NOT_FOUND', 404);
    }

    const starred = await prisma.starredFile.upsert({
      where: {
        fileId_userId: { fileId, userId: dbUser.id },
      },
      create: { fileId, userId: dbUser.id },
      update: {}, // do nothing if it already exists
    });

    return NextResponse.json(starred, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const { dbUser } = await requireAuth();
    const resolvedParams = await params;
    const fileId = resolvedParams.fileId;

    await prisma.starredFile.deleteMany({
      where: {
        fileId,
        userId: dbUser.id,
      },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}
