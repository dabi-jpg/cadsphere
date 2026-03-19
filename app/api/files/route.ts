import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth';
import { handleApiError } from '@/lib/api-error';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export async function GET(request: Request) {
  try {
    const { dbUser } = await requireAuth();

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.toLowerCase();
    const folderId = searchParams.get('folderId');
    const type = searchParams.get('type');

    // Build Prisma query dynamically
    const where: Prisma.FileWhereInput = {
      userId: dbUser.id,
      deletedAt: null, // Don't show files in trash
    };

    if (q) {
      where.filename = { contains: q, mode: 'insensitive' };
    }

    if (folderId === 'root') {
      where.folderId = null;
    } else if (folderId) {
      where.folderId = folderId;
    }

    if (type) {
      where.filetype = { contains: type, mode: 'insensitive' };
    }

    const [files, summary] = await Promise.all([
      prisma.file.findMany({
        where,
        include: {
          folder: { select: { id: true, name: true } },
          _count: { select: { versions: true } },
          starredBy: {
            where: { userId: dbUser.id },
            select: { id: true }
          }
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.file.aggregate({
        where: { userId: dbUser.id, deletedAt: null },
        _sum: { size: true },
        _count: { id: true },
      }),
    ]);

    const formattedFiles = files.map(f => ({
      ...f,
      isStarred: f.starredBy.length > 0,
    }));

    // Generate byType breakdown
    const byTypeData = await prisma.file.groupBy({
      by: ['filetype'],
      where: { userId: dbUser.id, deletedAt: null },
      _count: { id: true },
      _sum: { size: true },
    });

    const byType = byTypeData.reduce((acc, curr) => {
      acc[curr.filetype] = curr._sum.size || 0;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      files: formattedFiles,
      storage: {
        totalBytes: summary._sum.size || 0,
        fileCount: summary._count.id || 0,
        byType,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
