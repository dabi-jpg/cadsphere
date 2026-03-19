import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { ApiError } from './api-error';
import { prisma } from './prisma';

export async function requireAuth() {
  const cookieStore = await cookies();

  const supabase = createServerClient(
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
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );

  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    throw new ApiError('Unauthorized', 'UNAUTHORIZED', 401);
  }

  const supabaseUser = data.user;

  // First check if the user exists so we can conditionally backfill name
  const existingUser = await prisma.user.findUnique({
    where: { supabaseId: supabaseUser.id },
    select: { name: true },
  });

  const metadataName = supabaseUser.user_metadata?.full_name
    ?? supabaseUser.user_metadata?.name
    ?? null;

  const dbUser = await prisma.user.upsert({
    where: { supabaseId: supabaseUser.id },
    update: {
      email: supabaseUser.email!,
      // Backfill name from metadata only if currently null
      ...((!existingUser?.name && metadataName) ? { name: metadataName } : {}),
      updatedAt: new Date(),
    },
    create: {
      supabaseId: supabaseUser.id,
      email: supabaseUser.email!,
      name: metadataName,
      avatarUrl: supabaseUser.user_metadata?.avatar_url ?? null,
    },
  });

  return { supabaseUser, dbUser };
}
