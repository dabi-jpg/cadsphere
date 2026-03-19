import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { handleApiError } from '@/lib/api-error';
import { prisma } from '@/lib/prisma';
import { sanitizeFile } from '@/lib/sanitize';

export async function GET(request: Request) {
  try {
    const { dbUser } = await requireAuth();
    
    // Fetch pending shares for this user — only return safe file fields
    const pendingShares = await (prisma.sharedFile as any).findMany({
      where: {
        sharedWithId: dbUser.id,
        status: 'PENDING'
      },
      include: {
        file: {
          select: {
            id: true,
            filename: true,
            filetype: true,
            size: true,
            createdAt: true,
          }
        },
        sharedBy: {
          select: { id: true, name: true, email: true, avatarUrl: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(pendingShares);
  } catch (error) {
    return handleApiError(error);
  }
}
