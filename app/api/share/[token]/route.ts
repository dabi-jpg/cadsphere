/**
 * GET /api/share/[token] — Validate a share token and return a signed URL
 * Public endpoint — no authentication required.
 */
import { prisma } from "@/lib/prisma";
import { createSupabaseAdminClient } from "@/lib/supabase-server";
import { Errors, successResponse } from "@/lib/api-error";
import { getFileExtension } from "@/lib/validation";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const links = await prisma.$queryRawUnsafe<Array<{
      file_id: string; expires_at: Date; filename: string; storage_path: string;
    }>>(
      `SELECT sl.file_id, sl.expires_at, f.filename, f.storage_path
       FROM share_links sl
       JOIN files f ON f.id = sl.file_id
       WHERE sl.token = $1`, token
    );

    if (links.length === 0) return Errors.notFound("Share link");
    const link = links[0];

    if (new Date() > link.expires_at) {
      return Errors.badRequest("This share link has expired");
    }

    // Use admin client since there's no user session
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.storage
      .from("cad-files")
      .createSignedUrl(link.storage_path, 3600);

    if (error || !data?.signedUrl) {
      console.error("Share signed URL error:", error);
      return Errors.internal("Failed to generate file URL");
    }

    return successResponse({
      signed_url: data.signedUrl,
      filename: link.filename,
      filetype: getFileExtension(link.filename),
    });
  } catch (error) {
    console.error("Share validate error:", error);
    return Errors.internal();
  }
}
