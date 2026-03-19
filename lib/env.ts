/**
 * Environment variable validation.
 *
 * Validates required env vars at startup / import time so the app
 * fails fast with a clear message instead of crashing mid-request.
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `❌ Missing required environment variable: ${name}\n` +
      `   Check your .env file or deployment configuration.`
    );
  }
  return value;
}

/** Public (browser-safe) env vars */
export const env = {
  /** Supabase project URL */
  NEXT_PUBLIC_SUPABASE_URL: required("NEXT_PUBLIC_SUPABASE_URL"),
  /** Supabase anonymous/public key */
  NEXT_PUBLIC_SUPABASE_ANON_KEY: required("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
} as const;

/** Server-only env vars — only import this in server-side code */
export const serverEnv = {
  /** Supabase service role key (admin) */
  SUPABASE_SERVICE_ROLE_KEY: required("SUPABASE_SERVICE_ROLE_KEY"),
  /** Prisma database connection string */
  DATABASE_URL: required("DATABASE_URL"),
} as const;
