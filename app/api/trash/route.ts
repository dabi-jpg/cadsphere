import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { handleApiError } from '@/lib/api-error';
import { prisma } from '@/lib/prisma';
import { differenceInDays } from 'date-fns';

export async function GET(request: Request) {
  try {
    const { dbUser } = await requireAuth();

    const trashFiles = await prisma.file.findMany({
      where: {
        userId: dbUser.id,
        deletedAt: { not: null },
      },
      include: {
        folder: { select: { name: true } },
      },
      orderBy: { deletedAt: 'desc' },
    });

    const formattedTrash = trashFiles.map(file => {
      const daysSinceDeletion = differenceInDays(new Date(), file.deletedAt!);
      const daysRemaining = Math.max(0, 30 - daysSinceDeletion);

      return {
        ...file,
        daysRemaining,
        originalLocation: file.folder ? file.folder.name : 'Root',
      };
    });

    return NextResponse.json(formattedTrash);
  } catch (error) {
    return handleApiError(error);
  }
}
