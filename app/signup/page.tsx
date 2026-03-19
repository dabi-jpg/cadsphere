/**
 * Signup page — creates a new user via Supabase Auth.
 * 
 * Replaced with Stitch design: "Sign Up - Light Mode"
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name || name.length < 2) {
      setError("Please enter your full name");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error || "Registration failed");
        setLoading(false);
        return;
      }

      setSuccess(true);

      // Auto-login after registration
      const loginRes = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const loginData = await loginRes.json();

      if (loginData.success) {
        window.dispatchEvent(new Event("auth-change"));
        router.push("/dashboard");
      } else {
        // Registration succeeded but auto-login failed; redirect to login
        router.push("/login");
      }
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="bg-background text-on-background min-h-screen flex flex-col font-sans">
      {/* Header Navigation */}
      <header className="fixed top-0 w-full z-50 flex justify-between items-center px-6 h-16 bg-white border-b border-outline-variant">
        <div className="text-xl font-bold tracking-tighter text-on-surface">CADSphere</div>
        <div className="flex items-center gap-6">
          <span className="text-on-surface-variant text-sm font-medium cursor-pointer">Support</span>
        </div>
      </header>

      <main className="flex-grow flex items-center justify-center px-4 pt-16 pb-12">
        {/* Main Sign Up Card */}
        <div className="w-full max-w-[440px] bg-surface rounded-xl border border-outline-variant p-8 md:p-10 shadow-sm relative z-10">
          {/* Technical Detail Ornament */}
          <div className="flex items-center gap-2 mb-8">
            <div className="w-8 h-[1px] bg-primary"></div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-primary">CAD Portal Access</span>
          </div>
          
          <h1 className="text-2xl font-bold tracking-tight text-on-surface mb-2">Create your Account</h1>
          <p className="text-on-surface-variant text-sm mb-8">Join the architecture and engineering network.</p>

          {error && (
            <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-xs font-semibold">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-6 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-600 text-xs font-semibold text-center">
              Account created! Redirecting...
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-5">
            {/* Full Name Field */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant ml-1" htmlFor="name">Full Name</label>
              <div className="relative">
                <input 
                  className="w-full h-11 px-4 bg-surface-container-low border border-outline rounded-lg text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all placeholder:text-on-surface-variant/40" 
                  id="name"
                  placeholder="e.g. Julianne Sterling" 
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            </div>
            
            {/* Email Address Field */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant ml-1" htmlFor="email">Email Address</label>
              <div className="relative">
                <input 
                  className="w-full h-11 px-4 bg-surface-container-low border border-outline rounded-lg text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all placeholder:text-on-surface-variant/40" 
                  id="email"
                  placeholder="name@company.com" 
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant ml-1" htmlFor="password">Password</label>
              <div className="relative">
                <input 
                  className="w-full h-11 px-4 bg-surface-container-low border border-outline rounded-lg text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all placeholder:text-on-surface-variant/40" 
                  id="password"
                  placeholder="Min. 8 characters" 
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button 
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant/60 hover:text-primary transition-colors focus:outline-none" 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {showPassword ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </div>
            </div>

            {/* Policy Agreement */}
            <div className="pt-2">
              <p className="text-[11px] text-on-surface-variant leading-relaxed">
                By signing up, you agree to our <span className="text-primary font-medium cursor-pointer hover:underline">Terms of Service</span> and <span className="text-primary font-medium cursor-pointer hover:underline">Security Architecture</span> protocols.
              </p>
            </div>

            {/* Primary Action */}
            <button 
              className="w-full h-12 bg-primary text-on-primary font-semibold rounded-lg hover:opacity-90 active:opacity-100 transition-all flex items-center justify-center gap-2 mt-4 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed" 
              type="submit"
              disabled={loading}
            >
              {loading ? "Creating Account..." : "Sign Up"}
              {!loading && <span className="material-symbols-outlined text-[20px]">arrow_forward</span>}
            </button>
          </form>

          {/* Footer Link */}
          <div className="mt-8 pt-8 border-t border-outline-variant text-center">
            <p className="text-sm text-on-surface-variant font-medium">
              Already have an account? 
              <Link className="ml-1 text-primary font-semibold hover:underline decoration-2 underline-offset-4" href="/login">Sign In</Link>
            </p>
          </div>
        </div>
      </main>

      {/* Background Ornaments */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none opacity-[0.03]">
        <div 
          className="absolute top-0 left-0 w-full h-full" 
          style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #0f172a 1px, transparent 0)', backgroundSize: '40px 40px' }}
        ></div>
        <div className="absolute top-1/4 -right-24 w-96 h-96 border border-primary rounded-full opacity-20"></div>
        <div className="absolute bottom-1/4 -left-24 w-64 h-64 border border-primary rounded-full opacity-10"></div>
      </div>

      {/* Footer Component */}
      <footer className="w-full py-8 px-6 flex flex-col md:flex-row justify-between items-center gap-4 bg-surface-dim border-t border-outline-variant">
        <div className="text-[10px] font-medium uppercase tracking-widest text-on-surface-variant">
          © 2026 CADSphere Precision CAD Systems. All rights reserved.
        </div>
        <div className="flex gap-6">
          <Link className="text-[10px] font-medium uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors" href="#">Privacy Policy</Link>
          <Link className="text-[10px] font-medium uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors" href="#">GDPR Compliance</Link>
        </div>
      </footer>
    </div>
  );
}
