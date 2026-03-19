/**
 * Server-side Supabase client for use in API route handlers.
 * 
 * SECURITY: Uses @supabase/ssr for cookie-based session management.
 * The service role client bypasses RLS and should ONLY be used for
 * admin operations where user context doesn't apply.
 * 
 * Architecture decision: Cookie-based auth is preferred over localStorage
 * JWT tokens because cookies are httpOnly (not accessible to XSS attacks)
 * and automatically sent with every request.
 */
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

/**
 * Creates a Supabase client scoped to the current user's session.
 * Uses cookies for authentication — the session is automatically
 * read from the request cookies set by the middleware.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll is called from a Server Component where cookies
            // cannot be set. This is safe to ignore because the middleware
            // will refresh the session before the Server Component renders.
          }
        },
      },
    }
  );
}

/**
 * Creates a Supabase admin client with the service role key.
 * SECURITY: This client bypasses Row Level Security.
 * Only use for server-side operations that require elevated privileges.
 */
export function createSupabaseAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
