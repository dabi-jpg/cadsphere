import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { handleApiError } from '@/lib/api-error';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { dbUser } = await requireAuth();
    
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.toLowerCase() || '';

    // Search for users other than the current user
    const users = await (prisma.user as any).findMany({
      where: {
        id: { not: dbUser.id },
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
        ]
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true
      },
      take: 20
    });

    return NextResponse.json(users);
  } catch (error) {
    return handleApiError(error);
  }
}
