import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { handleApiError, ApiError } from '@/lib/api-error';
import { prisma } from '@/lib/prisma';
import { getSignedUrl } from '@/lib/storage';
import { logActivity } from '@/lib/activity';
import { uuidSchema } from '@/lib/validation';
import { rateLimit } from '@/lib/rate-limit';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { dbUser } = await requireAuth();
    const resolvedParams = await params;
    const fileId = resolvedParams.id;

    // Validate UUID param
    if (!uuidSchema.safeParse(fileId).success) {
      throw new ApiError('Invalid file ID', 'VALIDATION_ERROR', 400);
    }

    // Rate limit: 60 requests per hour per user
    const limit = rateLimit({
      key: `url:${dbUser.id}`,
      limit: 60,
      windowMs: 60 * 60 * 1000,
    });
    if (!limit.success) {
      return Response.json(
        { error: 'Too many requests. Please try again later.', code: 'RATE_LIMITED' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((limit.resetAt - Date.now()) / 1000)) } }
      );
    }

    const file = await prisma.file.findUnique({
      where: { id: fileId },
      include: {
        sharedWith: {
          where: { sharedWithId: dbUser.id },
        },
      },
    });

    if (!file) {
      throw new ApiError('File not found', 'NOT_FOUND', 404);
    }

    // Authorization: User owns the file OR file is shared with User
    if (file.userId !== dbUser.id && file.sharedWith.length === 0) {
      throw new ApiError('Forbidden', 'FORBIDDEN', 403);
    }

    const signedUrl = await getSignedUrl(file.storagePath);

    // Optional: Log download/view activity
    logActivity({
      userId: dbUser.id,
      action: 'FILE_DOWNLOADED',
      fileId: file.id,
      metadata: { filename: file.filename },
    });

    return NextResponse.json({ url: signedUrl });
  } catch (error) {
    return handleApiError(error);
  }
}
