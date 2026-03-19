/**
 * GET /api/audit — List audit logs for the authenticated user (paginated)
 */
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { prisma } from "@/lib/prisma";
import { Errors, successResponse } from "@/lib/api-error";

export async function GET(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return Errors.unauthorized();

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "25")));
    const offset = (page - 1) * limit;

    const [logs, countResult] = await Promise.all([
      prisma.$queryRawUnsafe<Array<{
        id: string; action: string; file_id: string | null; metadata: string; created_at: Date; filename: string | null;
      }>>(
        `SELECT al.id, al.action, al.file_id, al.metadata::text, al.created_at,
                f.filename
         FROM audit_logs al
         LEFT JOIN files f ON f.id = al.file_id
         WHERE al.user_id = $1
         ORDER BY al.created_at DESC
         LIMIT $2 OFFSET $3`,
        user.id, limit, offset
      ),
      prisma.$queryRawUnsafe<Array<{ count: string }>>(
        `SELECT COUNT(*)::text as count FROM audit_logs WHERE user_id = $1`, user.id
      ),
    ]);

    const total = parseInt(countResult[0]?.count || "0");

    return successResponse({
      logs: logs.map(l => ({
        id: l.id,
        action: l.action,
        file_id: l.file_id,
        filename: l.filename,
        metadata: (() => { try { return JSON.parse(l.metadata); } catch { return {}; } })(),
        created_at: l.created_at,
      })),
      pagination: { page, limit, total, total_pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Audit log error:", error);
    return Errors.internal();
  }
}
