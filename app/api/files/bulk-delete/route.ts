/**
 * POST /api/files/bulk-delete — Delete multiple files at once
 */
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { handleApiError, ApiError } from "@/lib/api-error";
import { logAudit } from "@/lib/audit";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { z } from "zod";

const bulkDeleteSchema = z.object({
  fileIds: z.array(z.string()).min(1).max(100),
});

export async function POST(request: Request) {
  try {
    const { dbUser } = await requireAuth();

    const body = await request.json().catch(() => null);
    if (!body) {
      throw new ApiError("Invalid JSON", "INVALID_BODY", 400);
    }

    const parsed = bulkDeleteSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(parsed.error.issues[0].message, "VALIDATION_ERROR", 400);
    }

    const { fileIds } = parsed.data;

    // Find files owned by this user
    const files = await prisma.file.findMany({
      where: { id: { in: fileIds }, userId: dbUser.id },
    });

    if (files.length === 0) {
      throw new ApiError("No matching files found", "NOT_FOUND", 404);
    }

    // Delete from Supabase Storage
    const storagePaths = files.map(f => f.storagePath);
    await supabaseAdmin.storage.from("cad-files").remove(storagePaths);

    // Delete from database
    await prisma.file.deleteMany({
      where: { id: { in: files.map(f => f.id) } },
    });

    logAudit({
      userId: dbUser.id,
      action: "BULK_DELETE",
      metadata: { count: files.length, filenames: files.map(f => f.filename) },
    });

    return Response.json({ success: true, data: { deleted: files.length } });
  } catch (error) {
    return handleApiError(error);
  }
}
