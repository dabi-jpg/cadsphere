import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { handleApiError, Errors, successResponse } from '@/lib/api-error';
import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/audit';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ shareId: string }> }
) {
  try {
    const { shareId } = await params;
    const { dbUser } = await requireAuth();
    
    const body = await request.json();
    const { action } = body; // "ACCEPT" | "REJECT"

    if (action !== "ACCEPT" && action !== "REJECT") {
      return Errors.badRequest("Invalid action. Must be ACCEPT or REJECT");
    }

    const sharedFile = await (prisma.sharedFile as any).findUnique({
      where: { id: shareId }
    });

    if (!sharedFile) return Errors.notFound("Shared file");
    if (sharedFile.sharedWithId !== dbUser.id) return Errors.forbidden();

    const updated = await (prisma.sharedFile as any).update({
      where: { id: shareId },
      data: { status: action === "ACCEPT" ? "ACCEPTED" : "REJECTED" }
    });

    logAudit({
      userId: dbUser.id,
      action: action === "ACCEPT" ? "SHARE_ACCEPTED" : "SHARE_REJECTED",
      fileId: sharedFile.fileId,
      metadata: { shareId }
    });

    return successResponse(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
