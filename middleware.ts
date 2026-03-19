/**
 * Next.js Middleware
 * 
 * Runs on every request. Handles:
 * 1. Supabase session refresh (keeps auth cookies alive)
 * 2. Route protection (redirect unauthenticated users from /dashboard, /viewer)
 * 3. Rate limiting for API routes
 * 
 * SECURITY: Session cookies are refreshed on every request to prevent
 * stale sessions. Protected routes redirect to /login if no session exists.
 */
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

/** Routes that require authentication */
const PROTECTED_ROUTES = ["/dashboard", "/viewer"];

/** API routes with specific rate limit configs */
const API_RATE_LIMIT_MAP: Record<string, { readonly maxRequests: number; readonly windowMs: number }> = {
  "/api/auth/": RATE_LIMITS.auth,
  "/api/files/upload": RATE_LIMITS.upload,
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ─── Rate Limiting for API routes ─────────────────────────────────
  if (pathname.startsWith("/api/")) {
    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded?.split(",")[0]?.trim() || "unknown";
    
    // Find matching rate limit config
    let config: { readonly maxRequests: number; readonly windowMs: number } = RATE_LIMITS.general;
    for (const [prefix, limitConfig] of Object.entries(API_RATE_LIMIT_MAP)) {
      if (pathname.startsWith(prefix)) {
        config = limitConfig;
        break;
      }
    }

    const { allowed, remaining, resetMs } = checkRateLimit(`mw:${ip}:${pathname}`, config);
    if (!allowed) {
      return NextResponse.json(
        { success: false, error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: {
            "X-RateLimit-Remaining": "0",
            "Retry-After": String(Math.ceil(resetMs / 1000)),
          },
        }
      );
    }
  }

  // ─── Supabase Session Refresh ─────────────────────────────────────
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Set cookies on the request (for downstream server components)
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          // Create fresh response with updated cookies
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh the session — this call updates the cookies if the session
  // is about to expire, ensuring seamless session persistence.
  const { data: { user } } = await supabase.auth.getUser();

  // ─── Route Protection ─────────────────────────────────────────────
  const isProtectedRoute = PROTECTED_ROUTES.some((route) =>
    pathname.startsWith(route)
  );

  if (isProtectedRoute && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public assets (svg, png, jpg, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
