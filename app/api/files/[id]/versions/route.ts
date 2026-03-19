import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { handleApiError, ApiError } from '@/lib/api-error';
import { prisma } from '@/lib/prisma';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { logActivity } from '@/lib/activity';
import { uuidSchema } from '@/lib/validation';
import { sanitizeFile } from '@/lib/sanitize';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { dbUser } = await requireAuth();
    const resolvedParams = await params;
    const fileId = resolvedParams.id;

    if (!uuidSchema.safeParse(fileId).success) {
      throw new ApiError('Invalid file ID', 'VALIDATION_ERROR', 400);
    }

    const file = await prisma.file.findUnique({
      where: { id: fileId },
      include: {
        sharedWith: { where: { sharedWithId: dbUser.id } },
      },
    });

    if (!file || (file.userId !== dbUser.id && file.sharedWith.length === 0)) {
      throw new ApiError('File not found', 'NOT_FOUND', 404);
    }

    const versions = await prisma.fileVersion.findMany({
      where: { fileId },
      select: {
        id: true,
        fileId: true,
        versionNumber: true,
        size: true,
        note: true,
        createdAt: true,
      },
      orderBy: { versionNumber: 'desc' },
    });

    return NextResponse.json(versions);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { dbUser } = await requireAuth();
    const resolvedParams = await params;
    const fileId = resolvedParams.id;

    if (!uuidSchema.safeParse(fileId).success) {
      throw new ApiError('Invalid file ID', 'VALIDATION_ERROR', 400);
    }

    const fileCheck = await prisma.file.findUnique({
      where: { id: fileId, userId: dbUser.id },
    });

    // Only owner can upload a new version
    if (!fileCheck) {
      throw new ApiError('File not found or forbidden', 'NOT_FOUND', 404);
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const note = formData.get('note') as string | null;

    if (!file) {
      throw new ApiError('No file provided', 'BAD_REQUEST', 400);
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new ApiError('File exceeds 50MB limit', 'PAYLOAD_TOO_LARGE', 413);
    }

    const latestVersion = await prisma.fileVersion.findFirst({
      where: { fileId },
      orderBy: { versionNumber: 'desc' },
    });

    const nextVersionNumber = latestVersion ? latestVersion.versionNumber + 1 : 1;

    // Upload to Supabase Storage
    const timestamp = Date.now();
    const uniqueFilename = `${dbUser.id}/${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { data: storageData, error: storageError } = await supabaseAdmin.storage
      .from('cad-files')
      .upload(uniqueFilename, buffer, {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      });

    if (storageError) {
      throw new ApiError('Failed to upload file to storage', 'STORAGE_ERROR', 500);
    }

    // DB update transaction
    const newVersion = await prisma.$transaction(async (tx) => {
      // 1. Create FileVersion
      const version = await tx.fileVersion.create({
        data: {
          fileId,
          versionNumber: nextVersionNumber,
          storagePath: storageData.path,
          size: file.size,
          note: note || `Version ${nextVersionNumber}`,
        },
      });

      // 2. Update parent File pointer
      await tx.file.update({
        where: { id: fileId },
        data: {
          size: file.size,
          storagePath: storageData.path,
          updatedAt: new Date(),
        },
      });

      return version;
    });

    logActivity({
      userId: dbUser.id,
      action: 'FILE_VERSION_ADDED',
      fileId,
      metadata: { versionNumber: nextVersionNumber, note },
    });

    // Return version without storagePath
    return NextResponse.json(sanitizeFile(newVersion as unknown as Record<string, unknown>), { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
