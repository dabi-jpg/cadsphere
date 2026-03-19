/**
 * Next.js Middleware
 * 
 * Runs on every request. Handles:
 * 1. Security headers on all responses (CSP, HSTS, XSS, etc.)
 * 2. Supabase session refresh (keeps auth cookies alive)
 * 3. Route protection (redirect unauthenticated users from /dashboard, /viewer)
 * 4. Rate limiting for API routes
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

/** OWASP-recommended security headers */
const securityHeaders: Record<string, string> = {
  'X-DNS-Prefetch-Control': 'on',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.tailwindcss.com https://fonts.googleapis.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https://*.supabase.co https://lh3.googleusercontent.com",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
    "worker-src 'self' blob:",
    "frame-ancestors 'none'",
  ].join('; '),
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
  const PROTECTED_API_ROUTES = [
    '/api/files',
    '/api/folders',
    '/api/trash',
    '/api/starred',
    '/api/shared',
    '/api/activity',
    '/api/audit'
  ];

  const isProtectedApiRoute = PROTECTED_API_ROUTES.some((route) =>
    pathname.startsWith(route)
  );

  if (isProtectedApiRoute && !user) {
    return NextResponse.json(
      { error: "Unauthorized", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  const isProtectedRoute = PROTECTED_ROUTES.some((route) =>
    pathname.startsWith(route)
  );

  if (isProtectedRoute && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ─── Apply Security Headers ───────────────────────────────────────
  for (const [key, value] of Object.entries(securityHeaders)) {
    supabaseResponse.headers.set(key, value);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/api/files/:path*',
    '/api/folders/:path*',
    '/api/trash/:path*',
    '/api/starred/:path*',
    '/api/shared/:path*',
    '/api/activity/:path*',
    '/api/audit/:path*',
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
