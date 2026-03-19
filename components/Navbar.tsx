"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

export function Navbar() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        setIsLoggedIn(data.success === true);
      } catch {
        setIsLoggedIn(false);
      } finally {
        setLoading(false);
      }
    };

    // Initial check
    checkAuth();

    // Listen for custom auth events
    const handleAuthChange = () => checkAuth();
    window.addEventListener("auth-change", handleAuthChange);

    return () => {
      window.removeEventListener("auth-change", handleAuthChange);
    };
  }, [pathname]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Ignored
    }
    setIsLoggedIn(false);
    window.dispatchEvent(new Event("auth-change"));
    router.push("/");
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold">C</div>
          <span className="font-bold text-xl tracking-tight text-slate-900 hidden sm:block">CorpCAD Vault</span>
        </Link>
        
        {/* Links */}
        <div className="hidden md:flex items-center space-x-8">
          <Link href="/#features" className="text-sm font-medium text-slate-600 hover:text-primary transition-colors">Infrastructure</Link>
          <Link href="/#news" className="text-sm font-medium text-slate-600 hover:text-primary transition-colors">Internal Updates</Link>
          <Link href="#" className="text-sm font-medium text-slate-600 hover:text-primary transition-colors">Support Docs</Link>
        </div>

        {/* Auth CTA */}
        <div className="flex gap-4 items-center">
          {loading ? (
            <div className="w-20 h-8" />
          ) : isLoggedIn ? (
            <>
              <Link
                href="/dashboard"
                className="text-sm font-medium text-slate-600 hover:text-primary transition-colors px-2 py-2"
              >
                Dashboard
              </Link>
              <button
                onClick={handleLogout}
                className="text-sm font-medium border border-slate-200 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm font-medium text-slate-600 hover:text-primary transition-colors px-2 py-2"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="bg-primary text-white text-sm font-semibold px-5 py-2 rounded-lg hover:bg-blue-700 transition shadow-sm shadow-blue-200"
              >
                Employee Login
              </Link>
            </>
          )}
        </div>

      </nav>
    </header>
  );
}
