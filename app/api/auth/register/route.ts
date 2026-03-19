/**
 * POST /api/auth/register
 * 
 * Registers a new user via Supabase Auth and syncs to our database.
 * SECURITY: Input validated with Zod. Rate limited. Passwords handled by Supabase (never stored by us).
 */
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validation";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(req: Request) {
  try {
    // Rate limiting: 3 attempts per hour per IP
    const ip = getClientIp(req);
    const limit = rateLimit({
      key: `register:${ip}`,
      limit: 3,
      windowMs: 60 * 60 * 1000,
    });
    if (!limit.success) {
      return Response.json(
        { error: 'Too many requests. Please try again later.', code: 'RATE_LIMITED' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((limit.resetAt - Date.now()) / 1000)) } }
      );
    }

    // Parse and validate request body
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { success: false, error: "Invalid JSON body", code: "INVALID_BODY" },
        { status: 400 }
      );
    }

    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || "Validation failed";
      return NextResponse.json(
        { success: false, error: firstError, code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const { name, email, password } = parsed.data;

    // Create user via Supabase Auth
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
        },
      },
    });

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    // Sync user into our database so file foreign key references work.
    if (data.user) {
      try {
        await prisma.user.upsert({
          where: { supabaseId: data.user.id },
          update: { 
            email: data.user.email!,
            name: name,
          },
          create: {
            supabaseId: data.user.id,
            email: data.user.email!,
            name: name,
            avatarUrl: data.user.user_metadata?.avatar_url ?? null,
          },
        });
      } catch (dbError) {
        console.error("User database sync failed:", dbError);
      }
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          user: {
            id: data.user?.id,
            email: data.user?.email,
            created_at: data.user?.created_at,
          },
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
