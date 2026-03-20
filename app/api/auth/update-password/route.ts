import { requireAuth } from '@/lib/auth'
import { handleApiError, ApiError } from '@/lib/api-error'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { z } from 'zod'

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, 'Password must be at least 8 characters').max(128),
})

export async function POST(request: Request) {
  try {
    const { supabaseUser } = await requireAuth()

    const body = await request.json().catch(() => null)
    if (!body) throw new ApiError('Invalid body', 'INVALID_BODY', 400)

    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      throw new ApiError(parsed.error.issues[0].message, 'VALIDATION_ERROR', 400)
    }

    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    // Verify current password by attempting sign in
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: supabaseUser.email!,
      password: parsed.data.currentPassword,
    })

    if (signInError) {
      throw new ApiError('Current password is incorrect', 'WRONG_PASSWORD', 400)
    }

    // Update to new password
    const { error: updateError } = await supabase.auth.updateUser({
      password: parsed.data.newPassword,
    })

    if (updateError) {
      throw new ApiError(updateError.message, 'UPDATE_FAILED', 500)
    }

    return Response.json({ success: true, message: 'Password updated successfully' })
  } catch (err) {
    return handleApiError(err)
  }
}
