import { prisma } from './prisma';

interface LogActivityParams {
  userId: string;
  action: string;
  fileId?: string;
  metadata?: any;
}

export async function logActivity({
  userId,
  action,
  fileId,
  metadata,
}: LogActivityParams) {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        fileId,
        metadata: metadata || {},
      },
    });
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
}
