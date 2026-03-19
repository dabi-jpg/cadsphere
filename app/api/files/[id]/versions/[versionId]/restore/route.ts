/**
 * POST /api/files/[id]/versions/[versionId]/restore — Restore a file version
 */
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { handleApiError, ApiError } from "@/lib/api-error";
import { logAudit } from "@/lib/audit";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  try {
    const { dbUser } = await requireAuth();
    const { id, versionId } = await params;

    const file = await prisma.file.findUnique({ where: { id } });
    if (!file) {
      throw new ApiError("File not found", "NOT_FOUND", 404);
    }
    if (file.userId !== dbUser.id) {
      throw new ApiError("Forbidden", "FORBIDDEN", 403);
    }

    const versions = await prisma.$queryRawUnsafe<Array<{
      id: string; file_id: string; version_number: number; storage_path: string; size: number
    }>>(
      `SELECT id, file_id, version_number, storage_path, size FROM file_versions WHERE id = $1`, versionId
    );
    if (versions.length === 0 || versions[0].file_id !== id) {
      throw new ApiError("Version not found", "NOT_FOUND", 404);
    }

    const version = versions[0];

    // Update main file record to point to this version
    await prisma.file.update({
      where: { id },
      data: { storagePath: version.storage_path, size: version.size },
    });

    logAudit({
      userId: dbUser.id,
      action: "RESTORE_VERSION",
      fileId: id,
      metadata: { versionId, versionNumber: version.version_number },
    });

    return Response.json({ success: true, data: { restored: true, version_number: version.version_number } });
  } catch (error) {
    return handleApiError(error);
  }
}
