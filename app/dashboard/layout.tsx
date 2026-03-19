"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const pathname = usePathname();

  const navItems = [
    { name: "Files", icon: "folder_open", href: "/dashboard" },
    { name: "Starred", icon: "star", href: "/dashboard/starred" },
    { name: "Activity", icon: "analytics", href: "/dashboard/activity" },
    { name: "Shared", icon: "folder_shared", href: "/dashboard/shared" },
    { name: "Trash", icon: "delete", href: "/dashboard/trash" },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-sans">
      
      {/* Mobile Sidebar Overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside 
        className={`${
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0 fixed inset-y-0 left-0 z-50 w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col transition-transform duration-200 ease-in-out md:static shrink-0`}
      >
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="size-10 rounded-full bg-primary flex items-center justify-center text-white">
              <span className="material-symbols-outlined">cloud_done</span>
            </div>
            <div>
              <h1 className="text-base font-bold leading-tight">CAD Server</h1>
              <p className="text-slate-500 text-xs">Cloud Storage</p>
            </div>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg font-medium transition-colors ${
                    isActive 
                      ? "bg-primary/10 text-primary" 
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                >
                  <span className="material-symbols-outlined">{item.icon}</span>
                  <span className="text-sm">{item.name}</span>
                </Link>
              );
            })}

            <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800">
              <Link
                href="/dashboard/settings"
                onClick={() => setIsMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg font-medium transition-colors ${
                  pathname === "/dashboard/settings"
                    ? "bg-primary/10 text-primary"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                <span className="material-symbols-outlined">settings</span>
                <span className="text-sm">Settings</span>
              </Link>
            </div>
          </nav>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-background-light dark:bg-background-dark">
        {/* Mobile Header Toggle */}
        <div className="md:hidden flex items-center p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <button 
            onClick={() => setIsMobileOpen(true)}
            className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg"
          >
            <span className="material-symbols-outlined">menu</span>
          </button>
          <span className="ml-3 font-bold">CAD Server</span>
        </div>

        {children}
      </main>
    </div>
  );
}
