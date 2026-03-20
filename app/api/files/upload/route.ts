import { NextResponse } from 'next/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60; // 60 seconds timeout for large uploads
import { requireAuth } from '@/lib/auth';
import { handleApiError, ApiError } from '@/lib/api-error';
import { prisma } from '@/lib/prisma';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { logActivity } from '@/lib/activity';
import { rateLimit } from '@/lib/rate-limit';
import { sanitizeFile } from '@/lib/sanitize';

const MAX_FILE_SIZE = 210 * 1024 * 1024; // 210MB
const MAX_FILENAME_LENGTH = 255;

export async function POST(request: Request) {
  try {
    const { dbUser } = await requireAuth();

    // Rate limit: 20 uploads per hour per user
    const limit = rateLimit({
      key: `upload:${dbUser.id}`,
      limit: 20,
      windowMs: 60 * 60 * 1000,
    });
    if (!limit.success) {
      return Response.json(
        { error: 'Too many requests. Please try again later.', code: 'RATE_LIMITED' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((limit.resetAt - Date.now()) / 1000)) } }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const folderId = formData.get('folderId') as string | null;

    if (!file) {
      throw new ApiError('No file provided', 'BAD_REQUEST', 400);
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new ApiError('File exceeds 50MB limit', 'PAYLOAD_TOO_LARGE', 413);
    }

    // SECURITY: Check filename length
    if (file.name.length > MAX_FILENAME_LENGTH) {
      throw new ApiError('Filename too long', 'FILENAME_TOO_LONG', 400);
    }

    // SECURITY: Sanitize filename — remove path traversal characters
    const sanitizedFilename = file.name
      .replace(/[/\\?%*:|"<>]/g, '-')  // remove special chars
      .replace(/\.\./g, '')             // prevent path traversal
      .trim();

    // SECURITY: Block double extensions like "malware.exe.stl"
    const parts = sanitizedFilename.split('.');
    if (parts.length > 2) {
      throw new ApiError('Invalid filename format', 'INVALID_FILENAME', 400);
    }

    // Validate folderId is a valid UUID if provided
    if (folderId) {
      const { success } = z.string().uuid().safeParse(folderId);
      if (!success) {
        throw new ApiError('Invalid folder ID', 'VALIDATION_ERROR', 400);
      }
    }

    const filename = sanitizedFilename;
    const filetype = file.type || 'application/octet-stream';
    const size = file.size;

    // Verify folder exists and belongs to user if folderId provided
    if (folderId) {
      const folder = await prisma.folder.findUnique({
        where: { id: folderId },
      });
      if (!folder || folder.userId !== dbUser.id) {
        throw new ApiError('Invalid folder', 'BAD_REQUEST', 400);
      }
    }

    // Upload to Supabase Storage
    const timestamp = Date.now();
    const uniqueFilename = `${dbUser.id}/${timestamp}-${filename.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { data: storageData, error: storageError } = await supabaseAdmin.storage
      .from('cad-files')
      .upload(uniqueFilename, buffer, {
        contentType: filetype,
        upsert: false,
      });

    if (storageError) {
      console.error('Supabase upload error:', storageError);
      throw new ApiError('Failed to upload file to storage', 'STORAGE_ERROR', 500);
    }

    const storagePath = storageData.path;

    // Database changes in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the File record
      const newFile = await tx.file.create({
        data: {
          filename,
          filetype,
          size,
          storagePath,
          userId: dbUser.id,
          folderId: folderId || null,
        },
      });

      // 2. Create the initial FileVersion record
      const newVersion = await tx.fileVersion.create({
        data: {
          fileId: newFile.id,
          versionNumber: 1,
          storagePath,
          size,
          note: 'Initial upload',
        },
      });

      return { newFile, newVersion };
    });

    // Fire and forget activity log
    logActivity({
      userId: dbUser.id,
      action: 'FILE_UPLOAD',
      fileId: result.newFile.id,
      metadata: { filename, size },
    });

    return NextResponse.json(sanitizeFile(result.newFile as Record<string, unknown>), { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
