/**
 * Environment variable validation.
 * SECURITY: Validates all required env vars at startup using Zod.
 * Fails fast with clear error messages if configuration is invalid.
 */
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Missing or invalid environment variables:');
  parsed.error.issues.forEach((e) => console.error(`  ${String(e.path.join('.'))}: ${e.message}`));
  throw new Error('Invalid environment configuration. Server cannot start.');
}

export const env = parsed.data;
