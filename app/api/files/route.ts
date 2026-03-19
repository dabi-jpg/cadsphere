import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth';
import { handleApiError } from '@/lib/api-error';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { sanitizeFile } from '@/lib/sanitize';

export async function GET(request: Request) {
  try {
    const { dbUser } = await requireAuth()
    
    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q')
    const folderId = searchParams.get('folderId')
    const type = searchParams.get('type')
    const sort = searchParams.get('sort') ?? 'date'

    const where: Prisma.FileWhereInput = {
      userId: dbUser.id,
      deletedAt: null,
      ...(folderId ? { folderId } : {}),
      ...(type ? { filetype: { contains: type, mode: 'insensitive' } } : {}),
      ...(q ? { filename: { contains: q, mode: 'insensitive' } } : {}),
    }

    const orderBy: Prisma.FileOrderByWithRelationInput =
      sort === 'name' ? { filename: 'asc' } :
      sort === 'size' ? { size: 'desc' } :
      { createdAt: 'desc' }

    const files = await prisma.file.findMany({
      where,
      orderBy,
      include: {
        folder: { select: { id: true, name: true } },
        _count: { select: { versions: true } },
        starredBy: { where: { userId: dbUser.id }, select: { id: true } },
      },
    })

    const mapped = files.map(f => ({
      ...f,
      storagePath: undefined,  // never expose storage path
      isStarred: f.starredBy.length > 0,
      starredBy: undefined,
    }))

    const allFiles = await prisma.file.findMany({
      where: { userId: dbUser.id, deletedAt: null },
      select: { size: true, filetype: true }
    })

    const summary = {
      totalBytes: allFiles.reduce((sum, f) => sum + f.size, 0),
      fileCount: allFiles.length,
      byType: allFiles.reduce((acc, f) => {
        acc[f.filetype] = (acc[f.filetype] || 0) + f.size
        return acc
      }, {} as Record<string, number>)
    }

    return Response.json({ files: mapped, storage: summary })
  } catch (err) {
    return handleApiError(err)
  }
}
