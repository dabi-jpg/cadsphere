/**
 * POST /api/auth/login
 * 
 * Authenticates a user via Supabase Auth and sets session cookies.
 * SECURITY: Input validated with Zod. Rate limited. Session managed via httpOnly cookies.
 */
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { loginSchema } from "@/lib/validation";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(req: Request) {
  try {
    // Rate limiting: 5 attempts per 15 minutes per IP
    const ip = getClientIp(req);
    const limit = rateLimit({
      key: `login:${ip}`,
      limit: 5,
      windowMs: 15 * 60 * 1000,
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

    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || "Validation failed";
      return NextResponse.json(
        { success: false, error: firstError, code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;

    // Sign in via Supabase Auth — this sets session cookies automatically
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // SECURITY: Generic error message prevents email enumeration
      return NextResponse.json(
        { success: false, error: "Invalid email or password" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: data.user.id,
          email: data.user.email,
          created_at: data.user.created_at,
        },
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
