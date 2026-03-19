import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth';
import { handleApiError, ApiError } from '@/lib/api-error';
import { prisma } from '@/lib/prisma';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { logActivity } from '@/lib/activity';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export async function POST(request: Request) {
  try {
    const { dbUser } = await requireAuth();

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const folderId = formData.get('folderId') as string | null;

    if (!file) {
      throw new ApiError('No file provided', 'BAD_REQUEST', 400);
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new ApiError('File exceeds 50MB limit', 'PAYLOAD_TOO_LARGE', 413);
    }

    const filename = file.name;
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

      // 3. Optional: Try to create a thumbnail (Skipped for now, just placeholder)
      
      return { newFile, newVersion };
    });

    // Fire and forget activity log
    logActivity({
      userId: dbUser.id,
      action: 'FILE_UPLOAD',
      fileId: result.newFile.id,
      metadata: { filename, size },
    });

    return NextResponse.json(result.newFile, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
