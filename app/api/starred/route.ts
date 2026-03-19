import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { handleApiError } from '@/lib/api-error';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { dbUser } = await requireAuth();

    const starred = await prisma.starredFile.findMany({
      where: { userId: dbUser.id },
      include: {
        file: {
          include: {
            folder: { select: { id: true, name: true } },
            _count: { select: { versions: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formattedFiles = starred.map(s => ({
      ...s.file,
      isStarred: true, // by definition
      starredAt: s.createdAt,
    }));

    return NextResponse.json({ files: formattedFiles });
  } catch (error) {
    return handleApiError(error);
  }
}
