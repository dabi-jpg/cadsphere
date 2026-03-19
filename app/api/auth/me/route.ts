/**
 * GET /api/auth/me — Returns the currently authenticated user's profile.
 * PATCH /api/auth/me — Update user profile.
 * DELETE /api/auth/me — Delete user account.
 * 
 * SECURITY: Uses requireAuth(). Sanitized error responses. Never returns sensitive fields.
 */
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { handleApiError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export async function GET() {
  try {
    const { dbUser } = await requireAuth();

    // Return only safe fields — no supabaseId or sensitive data
    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: dbUser.id,
          email: dbUser.email,
          name: dbUser.name,
          avatarUrl: dbUser.avatarUrl,
          createdAt: dbUser.createdAt,
          updatedAt: dbUser.updatedAt,
        }
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  organization: z.string().max(100).trim().optional(),
  role: z.string().max(100).trim().optional(),
});

export async function PATCH(request: Request) {
  try {
    const { dbUser } = await requireAuth();

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON', code: 'INVALID_BODY' }, { status: 400 });
    }

    const result = updateProfileSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0]?.message || 'Validation error', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const { name, organization, role } = result.data;
    const updatedUser = await prisma.user.update({
      where: { id: dbUser.id },
      data: { name, organization, role } as Record<string, unknown>,
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ success: true, data: { user: updatedUser } });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE() {
  try {
    const { dbUser } = await requireAuth();
    await prisma.user.delete({ where: { id: dbUser.id } });
    return NextResponse.json({ success: true, message: "Account deleted" });
  } catch (error) {
    return handleApiError(error);
  }
}
