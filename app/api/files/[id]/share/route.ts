/**
 * GET /api/files/[id]/share — Generate a shareable link (7-day expiry)
 * POST /api/files/[id]/share — Share a file with another user
 */
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { handleApiError, ApiError } from "@/lib/api-error";
import { logAudit } from "@/lib/audit";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { uuidSchema } from "@/lib/validation";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";

function generateToken(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  for (const byte of array) {
    token += chars[byte % chars.length];
  }
  return token;
}

const shareBodySchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  permission: z.enum(['VIEWER', 'EDITOR']).default('VIEWER'),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { dbUser } = await requireAuth();
    const { id } = await params;

    if (!uuidSchema.safeParse(id).success) {
      throw new ApiError('Invalid file ID', 'VALIDATION_ERROR', 400);
    }

    const file = await prisma.file.findUnique({ where: { id, userId: dbUser.id } });
    if (!file) {
      throw new ApiError("File not found", "NOT_FOUND", 404);
    }

    const token = generateToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await prisma.$executeRawUnsafe(
      `INSERT INTO share_links (id, file_id, token, expires_at, created_at)
       VALUES (gen_random_uuid()::text, $1, $2, $3, NOW())`,
      id, token, expiresAt
    );

    const headerStore = await headers();
    const host = headerStore.get("host") || "localhost:3000";
    const proto = headerStore.get("x-forwarded-proto") || "http";
    const shareUrl = `${proto}://${host}/view/${token}`;

    logAudit({ userId: dbUser.id, action: "SHARE", fileId: id, metadata: { token } });

    return NextResponse.json({
      success: true,
      data: {
        token,
        url: shareUrl,
        expires_at: expiresAt.toISOString(),
      },
    });
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
    const { id } = await params;

    if (!uuidSchema.safeParse(id).success) {
      throw new ApiError('Invalid file ID', 'VALIDATION_ERROR', 400);
    }

    // Rate limit: 30 shares per hour per user
    const limit = rateLimit({
      key: `share:${dbUser.id}`,
      limit: 30,
      windowMs: 60 * 60 * 1000,
    });
    if (!limit.success) {
      return Response.json(
        { error: 'Too many requests. Please try again later.', code: 'RATE_LIMITED' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((limit.resetAt - Date.now()) / 1000)) } }
      );
    }

    const file = await prisma.file.findUnique({ where: { id, userId: dbUser.id } });
    if (!file) {
      throw new ApiError("File not found", "NOT_FOUND", 404);
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      throw new ApiError("Invalid JSON", "INVALID_BODY", 400);
    }

    const parsed = shareBodySchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(parsed.error.issues[0]?.message || 'Validation error', 'VALIDATION_ERROR', 400);
    }
    const { userId, permission } = parsed.data;

    const sharedFile = await (prisma.sharedFile as any).upsert({
      where: {
        fileId_sharedWithId: {
          fileId: id,
          sharedWithId: userId,
        },
      },
      update: {
        permission,
        status: "PENDING",
      },
      create: {
        fileId: id,
        sharedById: dbUser.id,
        sharedWithId: userId,
        permission,
        status: "PENDING",
      },
      include: {
        sharedWith: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    logAudit({ userId: dbUser.id, action: "SHARE", fileId: id, metadata: { sharedWith: userId } });

    return NextResponse.json({ success: true, data: sharedFile });
  } catch (error) {
    return handleApiError(error);
  }
}
