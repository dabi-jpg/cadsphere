import { requireAuth } from '@/lib/auth';
import { handleApiError, ApiError } from '@/lib/api-error';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity';
import { z } from 'zod';

const schema = z.object({
  filename: z.string().min(1).max(255),
  filetype: z.string().min(1),
  size: z.number(),
  storagePath: z.string().min(1),
  folderId: z.string().uuid().optional().nullable(),
});

export async function POST(request: Request) {
  try {
    const { dbUser } = await requireAuth();
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(parsed.error.issues[0].message, 'VALIDATION_ERROR', 400);
    }

    const { filename, filetype, size, storagePath, folderId } = parsed.data;

    // Verify the storage path belongs to this user
    if (!storagePath.startsWith(`${dbUser.id}/`)) {
      throw new ApiError('Invalid storage path', 'FORBIDDEN', 403);
    }

    const newFile = await prisma.file.create({
      data: {
        filename,
        filetype,
        size,
        storagePath,
        userId: dbUser.id,
        folderId: folderId ?? null,
      },
      include: {
        folder: { select: { id: true, name: true } },
        _count: { select: { versions: true } },
      },
    });

    await prisma.fileVersion.create({
      data: {
        fileId: newFile.id,
        versionNumber: 1,
        storagePath,
        size,
        note: 'Initial upload',
      },
    });

    await logActivity({
      userId: dbUser.id,
      action: 'FILE_UPLOAD',
      fileId: newFile.id,
      metadata: { filename, size },
    });

    return Response.json({ file: { ...newFile, isStarred: false } }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
