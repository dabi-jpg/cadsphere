'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'
import { toast } from 'sonner'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) { toast.error('Please enter your email'); return }
    try {
      setLoading(true)
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'https://cadsphere.vercel.app/reset-password',
      })
      if (error) toast.error(error.message)
      else { toast.success('Reset email sent! Check your inbox.'); setEmailSent(true) }
    } catch { toast.error('Failed to send reset email') }
    finally { setLoading(false) }
  }

  return (
    <div className="bg-background text-on-background min-h-screen flex flex-col font-sans">
      <nav className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center w-full px-6 h-16 max-w-full">
        <div className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50">Blueprint CAD</div>
        <div className="flex items-center gap-6">
          <div className="hidden md:flex gap-6">
            <Link className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 font-inter text-sm font-medium uppercase tracking-wider transition-colors" href="#">Support</Link>
            <Link className="text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 pb-1 font-inter text-sm font-medium uppercase tracking-wider" href="/login">Login</Link>
          </div>
          <button className="bg-primary text-on-primary px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">Contact IT</button>
        </div>
      </nav>

      <main className="flex-grow flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-[440px]">
          <div className="bg-surface p-8 md:p-10 rounded-xl outline outline-1 outline-outline-variant shadow-sm">
            <div className="flex flex-col items-center mb-8 text-center">
              <div className="w-12 h-12 bg-primary-container text-primary rounded-full flex items-center justify-center mb-6">
                <span className="material-symbols-outlined text-2xl">lock_reset</span>
              </div>
              <h1 className="text-xl font-bold text-on-surface mb-2 tracking-tight">Forgot Password?</h1>
              <p className="text-sm text-on-surface-variant max-w-[280px]">
                {emailSent 
                  ? "Check your email for a reset link. You can close this window securely."
                  : "Enter your email address to receive instructions to reset your password."}
              </p>
            </div>

            {!emailSent && (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-secondary" htmlFor="email">Work Email Address</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="material-symbols-outlined text-outline text-lg">mail</span>
                    </div>
                    <input 
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="block w-full pl-10 pr-3 py-3 bg-surface-container-low border border-outline-variant rounded-lg text-sm placeholder-outline focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none" 
                      id="email" 
                      name="email" 
                      placeholder="name@company.com" 
                      required 
                      type="email"
                    />
                  </div>
                </div>
                <div className="pt-2">
                  <button disabled={loading} className="w-full bg-primary text-on-primary py-3 px-4 rounded-lg font-semibold text-sm hover:opacity-95 transition-opacity active:opacity-80 flex items-center justify-center gap-2" type="submit">
                    <span>{loading ? 'Sending...' : 'Continue'}</span>
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </button>
                </div>
                <div className="text-center">
                  <Link className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline decoration-2 underline-offset-4" href="/login">
                    <span className="material-symbols-outlined text-base">arrow_back</span>
                    Back to Login
                  </Link>
                </div>
              </form>
            )}

            {emailSent && (
              <div className="text-center pt-2">
                <Link className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline decoration-2 underline-offset-4" href="/login">
                  <span className="material-symbols-outlined text-base">arrow_back</span>
                  Back to Login
                </Link>
              </div>
            )}
          </div>

          <div className="mt-8 flex flex-col items-center gap-4 text-center">
            <div className="h-[1px] w-full bg-outline-variant"></div>
            <div className="flex items-center gap-3">
              <div className="flex -space-x-2">
                <img alt="Portrait of a male engineer profile" className="w-6 h-6 rounded-full border-2 border-surface object-cover" src="/forgot-password-bg.png" />
              </div>
              <p className="text-[10px] font-medium text-on-surface-variant uppercase tracking-wider">Join 2,400+ Precision Engineers</p>
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center w-full px-8 py-4 gap-4">
        <div className="text-[10px] font-medium uppercase tracking-widest text-slate-400 dark:text-slate-500">
          © 2024 Blueprint Precision Engineering. Internal Use Only.
        </div>
        <div className="flex gap-6">
          <Link className="text-[10px] font-medium uppercase tracking-widest text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors focus:ring-1 focus:ring-blue-500" href="#">Privacy Policy</Link>
          <Link className="text-[10px] font-medium uppercase tracking-widest text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors focus:ring-1 focus:ring-blue-500" href="#">Terms of Service</Link>
          <Link className="text-[10px] font-medium uppercase tracking-widest text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors focus:ring-1 focus:ring-blue-500" href="#">Security Architecture</Link>
        </div>
      </footer>
    </div>
  )
}
