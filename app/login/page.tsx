/**
 * Login page — uses Supabase Auth via the /api/auth/login endpoint.
 * 
 * Replaced with Stitch design: "Login - Light Mode (Updated)"
 */
"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();

  // If already authenticated, redirect to dashboard
  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          router.push("/dashboard");
        }
      })
      .catch(() => {});
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error || "Login failed");
        setLoading(false);
        return;
      }

      // Notify other components of auth state change
      window.dispatchEvent(new Event("auth-change"));

      // Redirect to the originally requested page, or dashboard
      const redirect = searchParams.get("redirect") || "/dashboard";
      router.push(redirect);
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="bg-background text-on-background min-h-screen flex flex-col font-sans">
      {/* TopNavBar */}
      <nav className="bg-white dark:bg-slate-950 flex justify-between items-center w-full px-6 py-3 max-w-full mx-auto border-b border-slate-200 dark:border-slate-800 font-sans text-sm font-medium tracking-tight">
        <div className="text-xl font-bold tracking-tighter text-blue-600 dark:text-blue-400">
          CADSphere
        </div>
        <div className="flex items-center gap-4 text-slate-600 dark:text-slate-400">
          <span className="material-symbols-outlined cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900 p-2 rounded-lg transition-all">help</span>
          <span className="material-symbols-outlined cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900 p-2 rounded-lg transition-all">settings</span>
        </div>
      </nav>

      {/* Main Content Canvas */}
      <main className="flex-grow flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-[400px] space-y-8">
          {/* Minimalist Login Card */}
          <div className="bg-surface rounded-xl p-8 border border-outline-variant shadow-sm transition-all">
            <div className="mb-8 text-center md:text-left">
              <h1 className="text-[1.25rem] font-bold text-on-surface tracking-tight mb-2">Technical Portal Access</h1>
              <p className="text-[0.875rem] text-on-surface-variant font-medium">Internal Engineering Environment</p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-xs font-semibold">
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest font-semibold text-slate-500" htmlFor="email">Email Address</label>
                <div className="relative group">
                  <input 
                    className="w-full h-11 bg-surface-container-low border border-outline rounded-lg px-4 text-[0.875rem] placeholder:text-outline focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all" 
                    id="email" 
                    placeholder="engineer@cadsphere.com" 
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] uppercase tracking-widest font-semibold text-slate-500" htmlFor="password">Password</label>
                  <Link href="#" className="text-[10px] uppercase tracking-widest font-semibold text-primary hover:underline">Forgot?</Link>
                </div>
                <div className="relative group">
                  <input 
                    className="w-full h-11 bg-surface-container-low border border-outline rounded-lg px-4 text-[0.875rem] placeholder:text-outline focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all" 
                    id="password" 
                    placeholder="••••••••" 
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="pt-2">
                <button 
                  className="w-full h-11 bg-primary text-on-primary font-semibold rounded-lg text-[0.875rem] hover:opacity-90 active:opacity-80 transition-all shadow-sm flex items-center justify-center" 
                  type="submit"
                  disabled={loading}
                >
                  {loading ? "Signing In..." : "Sign In"}
                </button>
              </div>
            </form>
          </div>

          {/* Footer Link */}
          <div className="text-center">
            <p className="text-[0.875rem] text-on-surface-variant">
              Don&apos;t have an account? 
              <Link className="ml-1 text-primary font-bold hover:underline transition-all" href="/signup">Sign Up</Link>
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center w-full px-8 py-6 mt-auto">
        <div className="text-[10px] uppercase tracking-widest font-semibold text-slate-500 dark:text-slate-400 mb-4 md:mb-0">
          © 2026 CADSphere Precision Engineering
        </div>
        <div className="flex flex-wrap justify-center gap-6">
          <Link className="text-[10px] uppercase tracking-widest font-semibold text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors underline-offset-4 hover:underline" href="#">Privacy Policy</Link>
          <Link className="text-[10px] uppercase tracking-widest font-semibold text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors underline-offset-4 hover:underline" href="#">Terms of Service</Link>
          <Link className="text-[10px] uppercase tracking-widest font-semibold text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors underline-offset-4 hover:underline" href="#">Security</Link>
          <Link className="text-[10px] uppercase tracking-widest font-semibold text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors underline-offset-4 hover:underline" href="#">Status</Link>
        </div>
      </footer>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center text-on-surface-variant font-medium text-sm">Loading login portal...</div>}>
      <LoginForm />
    </Suspense>
  );
}
