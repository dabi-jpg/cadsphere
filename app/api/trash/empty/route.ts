import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { handleApiError } from '@/lib/api-error';
import { prisma } from '@/lib/prisma';
import { deleteFromStorage } from '@/lib/storage';
import { logActivity } from '@/lib/activity';

export async function DELETE(request: Request) {
  try {
    const { dbUser } = await requireAuth();

    const trashFiles = await prisma.file.findMany({
      where: {
        userId: dbUser.id,
        deletedAt: { not: null },
      },
      include: { versions: true },
    });

    if (trashFiles.length === 0) {
      return new NextResponse(null, { status: 204 });
    }

    let deletedCount = 0;

    for (const file of trashFiles) {
      try {
        // 1. Delete all versions from Storage
        for (const version of file.versions) {
          await deleteFromStorage(version.storagePath);
        }
        
        // 2. Delete from DB
        await prisma.file.delete({
          where: { id: file.id },
        });

        deletedCount++;
      } catch (e) {
        console.error(`Failed to permanently delete file ${file.id}`, e);
        // Continue with other files even if one fails
      }
    }

    logActivity({
      userId: dbUser.id,
      action: 'TRASH_EMPTIED',
      metadata: { deletedCount },
    });

    return NextResponse.json({ deletedCount });
  } catch (error) {
    return handleApiError(error);
  }
}
