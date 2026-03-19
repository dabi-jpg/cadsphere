import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { handleApiError } from '@/lib/api-error';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { dbUser } = await requireAuth();
    
    // Fetch pending shares for this user
    const pendingShares = await (prisma.sharedFile as any).findMany({
      where: {
        sharedWithId: dbUser.id,
        status: 'PENDING'
      },
      include: {
        file: true,
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
