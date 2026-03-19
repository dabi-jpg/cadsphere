/**
 * Audit log helper — writes structured audit entries to the database.
 *
 * Uses raw SQL via Prisma.$executeRawUnsafe to avoid needing the
 * generated Prisma client for the AuditLog model (works even if
 * prisma generate hasn't been re-run yet after schema changes).
 *
 * Used by API routes to track user actions for compliance and debugging.
 */
import { prisma } from "@/lib/prisma";

export type AuditAction =
  | "UPLOAD"
  | "DELETE"
  | "DOWNLOAD"
  | "VIEW"
  | "SHARE"
  | "RESTORE_VERSION"
  | "CREATE_FOLDER"
  | "DELETE_FOLDER"
  | "MOVE_FILE"
  | "BULK_DELETE"
  | "TAG_UPDATE"
  | "SHARE_ACCEPTED"
  | "SHARE_REJECTED";

export async function logAudit(params: {
  userId: string;
  action: AuditAction;
  fileId?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    const metadataJson = JSON.stringify(params.metadata ?? {});
    await prisma.$executeRawUnsafe(
      `INSERT INTO audit_logs (id, user_id, action, file_id, metadata, created_at)
       VALUES (gen_random_uuid()::text, $1, $2, $3, $4::jsonb, NOW())`,
      params.userId,
      params.action,
      params.fileId ?? null,
      metadataJson,
    );
  } catch (err) {
    // Never let audit logging break the main request
    console.error("Audit log write failed:", err);
  }
}
