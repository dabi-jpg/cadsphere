import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { handleApiError } from '@/lib/api-error';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { dbUser } = await requireAuth();

    // Fetch the 50 most recent activity logs for this user OR on files they own
    const logs = await prisma.auditLog.findMany({
      where: {
        OR: [
          { userId: dbUser.id },
          { user: { files: { some: { userId: dbUser.id } } } } // if someone else did an action on their file
        ]
      },
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    // We can manually fetch filename metadata if fileId is present
    const fileIds = logs.map(l => l.fileId).filter(Boolean) as string[];
    const files = await prisma.file.findMany({
      where: { id: { in: fileIds } },
      select: { id: true, filename: true },
    });
    
    const fileMap = new Map(files.map(f => [f.id, f.filename]));

    const formattedLogs = logs.map(log => ({
      ...log,
      file: log.fileId ? { filename: fileMap.get(log.fileId) || 'Deleted file' } : null,
    }));

    return NextResponse.json(formattedLogs);
  } catch (error) {
    return handleApiError(error);
  }
}
