import { requireAuth } from '@/lib/auth';
import { handleApiError, ApiError } from '@/lib/api-error';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { z } from 'zod';

const schema = z.object({
  filename: z.string().min(1).max(255),
  filetype: z.string().min(1),
  size: z.number().max(200 * 1024 * 1024, 'File exceeds 200MB limit'),
});

const ALLOWED = ['.stl', '.step', '.stp', '.dxf', '.igs', '.iges'];

export async function POST(request: Request) {
  try {
    const { dbUser } = await requireAuth();
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(parsed.error.issues[0].message, 'VALIDATION_ERROR', 400);
    }

    const { filename, size } = parsed.data;
    const ext = '.' + filename.split('.').pop()?.toLowerCase();
    if (!ALLOWED.includes(ext)) {
      throw new ApiError(`File type ${ext} not allowed`, 'INVALID_TYPE', 415);
    }

    const storagePath = `${dbUser.id}/${crypto.randomUUID()}-${filename}`;

    const { data, error } = await supabaseAdmin.storage
      .from('cad-files')
      .createSignedUploadUrl(storagePath);

    if (error || !data) {
      throw new ApiError('Failed to create upload URL', 'STORAGE_ERROR', 500);
    }

    return Response.json({
      signedUrl: data.signedUrl,
      storagePath,
      token: data.token,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
