'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { toast } from 'sonner'
import Link from 'next/link'

export default function ResetPasswordPage() {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [validSession, setValidSession] = useState(false)
  const [checking, setChecking] = useState(true)
  const router = useRouter()

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    // First check if there's already a valid session from the hash
    const hashParams = new URLSearchParams(
      window.location.hash.substring(1)
    )
    const accessToken = hashParams.get('access_token')
    const refreshToken = hashParams.get('refresh_token')
    const type = hashParams.get('type')

    if (accessToken && type === 'recovery') {
      // Set the session manually from the hash tokens
      supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken ?? '',
      }).then(({ error }) => {
        if (error) {
          toast.error('Invalid or expired reset link')
          setChecking(false)
        } else {
          setValidSession(true)
          setChecking(false)
          // Clean the URL hash
          window.history.replaceState(null, '', window.location.pathname)
        }
      })
      return
    }

    // Also listen for PASSWORD_RECOVERY event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' && session) {
        setValidSession(true)
        setChecking(false)
      }
    })

    // If no hash tokens found after 3 seconds, show error
    const timeout = setTimeout(() => {
      setChecking(false)
    }, 3000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [])

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPassword || !confirmPassword) { toast.error('Fill in both fields'); return }
    if (newPassword !== confirmPassword) { toast.error('Passwords do not match'); return }
    if (newPassword.length < 8) { toast.error('Minimum 8 characters'); return }
    try {
      setLoading(true)
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) toast.error(error.message)
      else {
        toast.success('Password reset successfully!')
        await supabase.auth.signOut()
        router.push('/login')
      }
    } catch { toast.error('Failed to reset password') }
    finally { setLoading(false) }
  }

  return (
    <div className="bg-background text-on-background min-h-screen flex flex-col font-sans">
      <header className="fixed top-0 w-full z-50 flex justify-between items-center px-6 h-16 bg-white border-b border-slate-200">
        <div className="text-xl font-bold tracking-tighter text-slate-900">
          Blueprint Precision
        </div>
        <div className="flex gap-6 items-center">
          <Link className="font-sans text-[14px] font-medium tracking-tight text-slate-500 hover:text-blue-700 transition-colors" href="#">Support</Link>
        </div>
      </header>

      <main className="flex-grow flex items-center justify-center px-4 pt-16">
        <div className="w-full max-w-md bg-surface border border-outline-variant p-8 rounded-lg shadow-sm z-10 relative">
          
          {checking ? (
            <div className="flex flex-col gap-6 text-center py-8">
              <span className="material-symbols-outlined text-4xl text-secondary animate-pulse">hourglass_empty</span>
              <h2 className="text-xl font-bold text-on-surface">Validating Session...</h2>
              <p className="text-sm text-on-surface-variant">Please wait while we verify your secure link.</p>
            </div>
          ) : !validSession ? (
            <div className="flex flex-col gap-6 text-center py-8">
              <span className="material-symbols-outlined text-4xl text-error">error</span>
              <h2 className="text-xl font-bold text-on-surface">Invalid or Expired Link</h2>
              <p className="text-sm text-on-surface-variant">This password reset link is invalid or has expired.</p>
              <div className="mt-4 pt-6 text-center">
                <Link className="text-[0.875rem] text-primary font-medium hover:underline flex items-center justify-center gap-1" href="/forgot-password">
                  <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                  Request new reset link
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-2 mb-8 text-center md:text-left">
                <div className="flex justify-center md:justify-start mb-4">
                  <div className="w-12 h-12 bg-primary-container rounded-lg flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary">lock_reset</span>
                  </div>
                </div>
                <h1 className="text-[1.25rem] font-bold text-on-surface tracking-tight">Reset Password</h1>
                <p className="text-[0.875rem] text-on-surface-variant">Please enter and confirm your new password.</p>
              </div>

              <form onSubmit={handleReset} className="flex flex-col gap-6">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[0.75rem] font-bold uppercase tracking-widest text-on-surface-variant px-1" htmlFor="new_password">
                    New Password
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="material-symbols-outlined text-on-surface-variant text-[18px]">password</span>
                    </div>
                    <input 
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      className="w-full bg-surface-container-low border border-outline-variant rounded-lg pl-10 pr-4 py-2.5 text-[0.875rem] focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none" 
                      id="new_password" 
                      placeholder="••••••••" 
                      type="password"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[0.75rem] font-bold uppercase tracking-widest text-on-surface-variant px-1" htmlFor="confirm_password">
                    Confirm New Password
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="material-symbols-outlined text-on-surface-variant text-[18px]">verified_user</span>
                    </div>
                    <input 
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      className="w-full bg-surface-container-low border border-outline-variant rounded-lg pl-10 pr-4 py-2.5 text-[0.875rem] focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none" 
                      id="confirm_password" 
                      placeholder="••••••••" 
                      type="password"
                    />
                  </div>
                </div>

                <button disabled={loading} className="mt-2 w-full bg-primary text-on-primary font-semibold py-3 px-4 rounded-lg hover:opacity-90 active:opacity-80 transition-all flex items-center justify-center gap-2" type="submit">
                  {loading ? 'Resetting...' : 'Reset Password'}
                  <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                </button>
              </form>
              <div className="mt-8 pt-6 border-t border-outline-variant text-center">
                <Link className="text-[0.875rem] text-primary font-medium hover:underline flex items-center justify-center gap-1" href="/login">
                  <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                  Back to login
                </Link>
              </div>
            </>
          )}

        </div>
      </main>

      <div className="fixed bottom-0 left-0 p-6 pointer-events-none opacity-20 hidden md:block">
        <div className="border-l border-b border-primary w-24 h-24 relative">
          <span className="absolute bottom-1 left-1 text-[8px] font-mono text-primary">SCALE 1:100</span>
        </div>
      </div>
      <div className="fixed top-20 right-0 p-6 pointer-events-none opacity-20 hidden md:block">
        <div className="border-r border-t border-primary w-16 h-16 relative">
          <span className="absolute top-1 right-1 text-[8px] font-mono text-primary uppercase">Precision Cad v2.4</span>
        </div>
      </div>

      <footer className="w-full flex flex-col items-center gap-4 text-center px-4 py-8 bg-slate-50 border-t border-slate-200">
        <div className="flex gap-6 mb-2">
          <Link className="font-sans text-[12px] uppercase tracking-widest text-slate-500 hover:text-blue-600 transition-colors" href="#">Privacy Policy</Link>
          <Link className="font-sans text-[12px] uppercase tracking-widest text-slate-500 hover:text-blue-600 transition-colors" href="#">Terms of Service</Link>
          <Link className="font-sans text-[12px] uppercase tracking-widest text-slate-500 hover:text-blue-600 transition-colors" href="#">Security</Link>
        </div>
        <p className="font-sans text-[12px] uppercase tracking-widest text-slate-400">© 2024 Blueprint Precision CAD Portal. All rights reserved.</p>
      </footer>
    </div>
  )
}
