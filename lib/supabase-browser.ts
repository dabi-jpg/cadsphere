/**
 * Browser-side Supabase client for use in React components.
 * 
 * SECURITY: Only the anon key is exposed to the browser (via NEXT_PUBLIC_ prefix).
 * The anon key is designed to be public and is safe to include in client bundles.
 * All data access is controlled by Row Level Security policies in Supabase.
 */
import { createBrowserClient } from "@supabase/ssr";

export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
