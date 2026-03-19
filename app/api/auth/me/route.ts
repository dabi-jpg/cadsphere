/**
 * GET /api/auth/me
 * 
 * Returns the currently authenticated user's profile.
 * SECURITY: Uses Supabase session from cookies. No token parsing needed.
 */
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { handleApiError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export async function GET() {
  try {
    const { supabaseUser, dbUser } = await requireAuth();
    return NextResponse.json({
      success: true,
      data: { user: dbUser },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

const updateProfileSchema = z.object({
  name: z.string().min(1).optional(),
  organization: z.string().optional(),
  role: z.string().optional(),
});

export async function PATCH(request: Request) {
  try {
    const { dbUser } = await requireAuth();
    const body = await request.json();
    const result = updateProfileSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json({ success: false, error: "Invalid data" }, { status: 400 });
    }

    const { name, organization, role } = result.data;
    const updatedUser = await prisma.user.update({
      where: { id: dbUser.id },
      data: { name, organization, role } as any,
    });

    return NextResponse.json({ success: true, data: { user: updatedUser } });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE() {
  try {
    const { dbUser, supabaseUser } = await requireAuth();
    // In a real scenario, you probably want to delete or transfer files first,
    // and delete the user from Supabase Auth as well via Admin API.
    // For now, we will soft-delete or delete from Prisma.
    // However, Supabase Auth user deletion requires Service Role Key.
    
    await prisma.user.delete({ where: { id: dbUser.id } });
    
    return NextResponse.json({ success: true, message: "Account deleted" });
  } catch (error) {
    return handleApiError(error);
  }
}
