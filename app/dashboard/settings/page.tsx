"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function SettingsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("Profile");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);

  const [profile, setProfile] = useState<{
    id: string;
    email: string;
    name: string | null;
    avatarUrl: string | null;
    organization: string | null;
    role: string | null;
  } | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    organization: "",
    role: "",
  });

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        if (data.success && data.data?.user) {
          const u = data.data.user;
          setProfile(u);
          setFormData({
            name: u.name || "",
            organization: u.organization || "",
            role: u.role || "",
          });
        } else {
          toast.error("Failed to load profile");
        }
      } catch {
        toast.error("Network error loading profile");
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Profile updated successfully");
        setProfile(data.data.user);
      } else {
        toast.error(data.error || "Failed to update profile");
      }
    } catch {
      toast.error("Network error updating profile");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!currentPassword || !newPassword) {
      toast.error('Please fill in both password fields')
      return
    }
    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters')
      return
    }
    try {
      setUpdatingPassword(true)
      const res = await fetch('/api/auth/update-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      const d = await res.json()
      if (res.ok) {
        toast.success('Password updated successfully')
        setCurrentPassword('')
        setNewPassword('')
      } else {
        toast.error(d.error || 'Failed to update password')
      }
    } catch {
      toast.error('Failed to update password')
    } finally {
      setUpdatingPassword(false)
    }
  }

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm('Are you sure? This cannot be undone. All your files will be permanently deleted.')
    if (!confirmed) return

    try {
      setDeleting(true)
      const res = await fetch('/api/auth/delete', { method: 'DELETE' })

      if (res.ok) {
        localStorage.clear()
        sessionStorage.clear()
        const supabase = createSupabaseBrowserClient()
        await supabase.auth.signOut()
        toast.success('Account deleted')
        window.location.href = '/login'
      } else {
        const d = await res.json()
        toast.error(d.error || 'Failed to delete account')
      }
    } catch {
      toast.error('Failed to delete account')
    } finally {
      setDeleting(false)
    }
  };
  
  return (
    <div className="flex-1 flex overflow-hidden bg-slate-50 relative">
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Header */}
        <header className="px-8 py-6 bg-white border-b border-slate-200 shrink-0">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold text-slate-900 mb-1">Account Settings</h1>
            <p className="text-sm text-slate-500">Manage your profile, preferences, and security settings.</p>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-4xl mx-auto flex flex-col md:flex-row gap-8">
            
            {/* Sidebar Navigation */}
            <aside className="w-full md:w-64 shrink-0">
              <nav className="space-y-1">
                {['Profile', 'Preferences', 'Security'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`w-full text-left px-4 py-3 rounded-lg text-sm font-semibold transition-colors flex items-center justify-between ${
                      activeTab === tab 
                        ? "bg-primary text-white shadow-sm shadow-blue-200" 
                        : "text-slate-600 hover:bg-slate-200/50"
                    }`}
                  >
                    {tab}
                    {activeTab === tab && <span className="material-symbols-outlined text-[18px]">chevron_right</span>}
                  </button>
                ))}
              </nav>
            </aside>

            {/* Main Content Areas */}
            <div className="flex-1">
              
              {/* Profile Settings */}
              {activeTab === "Profile" && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="flex items-center gap-6 pb-8 border-b border-slate-100">
                    <div className="relative group cursor-pointer">
                      <div className="w-24 h-24 rounded-full bg-slate-200 overflow-hidden border-4 border-white shadow-sm ring-1 ring-slate-200 flex items-center justify-center text-4xl font-bold text-slate-400">
                        {profile?.avatarUrl ? (
                          <img src={profile.avatarUrl} alt="Avatar" className="w-full h-full object-cover group-hover:opacity-75 transition-opacity" />
                        ) : (
                          <span>{profile?.name?.charAt(0) || profile?.email?.charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="material-symbols-outlined text-white drop-shadow-md">photo_camera</span>
                      </div>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">{profile?.name || "Anonymous User"}</h2>
                      <p className="text-slate-500 text-sm">{profile?.role || "Team Member"}</p>
                      <div className="mt-3 flex gap-3">
                        <button className="text-sm border border-slate-300 px-3 py-1.5 rounded bg-white hover:bg-slate-50 font-medium text-slate-700 shadow-sm transition-colors">Change Photo</button>
                        <button className="text-sm text-red-500 hover:text-red-700 font-medium px-3 py-1.5 transition-colors">Remove</button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700">Full Name</label>
                        <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:bg-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700">Email Address</label>
                        <input type="email" value={profile?.email || ""} disabled className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-lg text-sm text-slate-500 outline-none cursor-not-allowed" />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700">Organization</label>
                        <input type="text" value={formData.organization} onChange={e => setFormData({...formData, organization: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:bg-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700">Role</label>
                        <input type="text" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:bg-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" />
                      </div>
                    </div>
                    <div className="pt-4 flex justify-end">
                      <button onClick={handleSave} disabled={saving || loading} className="bg-primary hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg font-bold text-sm shadow-sm transition flex items-center gap-2">
                        {saving ? "Saving..." : "Save Changes"} <span className="material-symbols-outlined text-[18px]">check</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Preferences Settings */}
              {activeTab === "Preferences" && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-4">Appearance</h3>
                  <div className="flex flex-col sm:flex-row gap-6">
                    <button className="flex-1 p-6 border-2 border-primary rounded-xl flex items-center gap-4 bg-primary/5 cursor-default relative overflow-hidden transition-all">
                      <div className="w-10 h-10 rounded-full bg-white text-primary flex items-center justify-center shadow-sm shrink-0">
                        <span className="material-symbols-outlined">light_mode</span>
                      </div>
                      <div className="text-left">
                        <h4 className="font-bold text-slate-900">Light Mode</h4>
                        <p className="text-xs text-slate-500">Active design system</p>
                      </div>
                      <div className="absolute top-0 right-0 p-2 text-primary">
                        <span className="material-symbols-outlined font-bold">check_circle</span>
                      </div>
                    </button>
                    <button className="flex-1 p-6 border-2 border-transparent rounded-xl flex items-center gap-4 bg-slate-900 hover:opacity-90 transition-opacity cursor-not-allowed group relative overflow-hidden">
                      <div className="w-10 h-10 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined">dark_mode</span>
                      </div>
                      <div className="text-left relative z-10">
                        <h4 className="font-bold text-white">Dark Mode</h4>
                        <p className="text-xs text-slate-400">Legacy fallback</p>
                      </div>
                      <div className="absolute right-[-20px] top-[-20px] w-24 h-24 bg-slate-800 rounded-full opacity-50 blur-xl"></div>
                      <div className="absolute inset-0 bg-black/20 z-20 flex items-center justify-center backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity">
                         <span className="bg-slate-800 text-white text-[10px] px-2 py-1 rounded font-bold uppercase tracking-wider">Coming Soon</span>
                      </div>
                    </button>
                  </div>
                  
                  <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-4 pt-4">Notifications</h3>
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-slate-800 text-sm">Email Digest</h4>
                        <p className="text-xs text-slate-500">Receive daily summaries of vault activity.</p>
                      </div>
                      <div className="w-11 h-6 bg-primary rounded-full relative cursor-pointer shadow-inner">
                        <div className="absolute right-1 top-1 w-4 h-4 rounded-full bg-white shadow"></div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-slate-800 text-sm">Mention Alerts</h4>
                        <p className="text-xs text-slate-500">Notify immediately when tagged in a comment.</p>
                      </div>
                      <div className="w-11 h-6 bg-primary rounded-full relative cursor-pointer shadow-inner">
                        <div className="absolute right-1 top-1 w-4 h-4 rounded-full bg-white shadow"></div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between opacity-50">
                      <div>
                        <h4 className="font-bold text-slate-800 text-sm">Desktop Push</h4>
                        <p className="text-xs text-slate-500">Native OS notifications (Requires browser permission).</p>
                      </div>
                      <div className="w-11 h-6 bg-slate-200 rounded-full relative cursor-pointer shadow-inner">
                        <div className="absolute left-1 top-1 w-4 h-4 rounded-full bg-white shadow"></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Security Settings */}
              {activeTab === "Security" && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-4">Password Configuration</h3>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700">Current Password</label>
                        <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="Current password" className="w-full md:w-3/4 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:bg-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700">New Password</label>
                        <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="New password (min 8 characters)" className="w-full md:w-3/4 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:bg-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" />
                      </div>
                      <div className="pt-2">
                         <button onClick={handleUpdatePassword} disabled={updatingPassword} className="bg-white border border-slate-300 text-slate-700 px-6 py-2.5 rounded-lg font-bold text-sm shadow-sm hover:bg-slate-50 transition">{updatingPassword ? 'Updating...' : 'Update Password'}</button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 pt-4 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-slate-900">Two-Factor Authentication (2FA)</h3>
                      <span className="bg-green-100 text-green-700 text-xs font-bold px-3 py-1 rounded flex items-center gap-1 uppercase tracking-wider">
                        <span className="material-symbols-outlined text-[14px]">shield</span> Enabled
                      </span>
                    </div>
                    <p className="text-sm text-slate-600">Your account is secured with a hardware token. It is non-removable due to IT policy.</p>
                  </div>

                  {/* Danger Zone */}
                  <div className="space-y-4 pt-8 border-t border-slate-100">
                    <h3 className="text-lg font-bold text-red-600">Danger Zone</h3>
                    <div className="p-5 border border-red-200 bg-red-50 rounded-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                      <div>
                        <h4 className="font-bold text-red-800 text-sm">Delete Account</h4>
                        <p className="text-xs text-red-700/80 mt-1 max-w-md">Permanently wipe your profile and transfer all CAD file ownership to the Vault Admin. This action cannot be undone.</p>
                      </div>
                      <button onClick={handleDeleteAccount} disabled={deleting || loading} className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-sm whitespace-nowrap transition-colors">
                        {deleting ? "Deleting..." : "Delete Profile"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
              
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
