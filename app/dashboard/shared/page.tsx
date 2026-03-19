"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import ViewerModal from "@/components/viewer/ViewerModal";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

interface SharedFile {
  id: string;
  permission: string;
  createdAt: string;
  status?: string;
  file: {
    id: string;
    filename: string;
    filetype: string;
    size: number;
    createdAt: string;
    updatedAt?: string;
    folderId?: string | null;
    tags?: string[];
    folder?: { id: string; name: string } | null;
    _count?: { versions: number };
  };
  sharedBy: {
    id: string;
    name: string | null;
    email: string;
    avatarUrl: string | null;
    role?: string | null;
    organization?: string | null;
  };
}

interface SharedByMeItem {
  id: string;
  permission: string;
  createdAt: string;
  status?: string;
  file: {
    id: string;
    filename: string;
    filetype: string;
    size: number;
    createdAt: string;
  };
  sharedWith: {
    id: string;
    name: string | null;
    email: string;
    avatarUrl: string | null;
  };
}

interface Comment {
  id: string;
  body: string;
  createdAt: string;
  userId: string;
  user: {
    name: string | null;
    avatarUrl: string | null;
  };
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getFileIcon(filetype: string): string {
  const t = filetype.toLowerCase().replace(".", "");
  if (["step", "stp", "iges", "igs"].includes(t)) return "view_in_ar";
  if (t === "stl") return "deployed_code";
  if (t === "dxf") return "architecture";
  return "insert_drive_file";
}

export default function SharedFilesPage() {
  const [activeTab, setActiveTab] = useState("Shared with Me");
  const [searchQuery, setSearchQuery] = useState("");
  const [commentText, setCommentText] = useState("");
  
  const [sharedFiles, setSharedFiles] = useState<SharedFile[]>([]);
  const [sharedByMe, setSharedByMe] = useState<SharedByMeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFile, setActiveFile] = useState<SharedFile | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [viewingFile, setViewingFile] = useState<{ id: string; name: string; size?: number } | null>(null);

  const fetchShared = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/shared');
      if (!res.ok) {
        console.error('Shared API error:', res.status);
        toast.error('Failed to load shared files');
        return;
      }
      const raw = await res.json();
      
      const withMe = raw.sharedFiles ?? raw.data?.sharedFiles ?? [];
      const byMe = raw.sharedByMe ?? raw.data?.sharedByMe ?? [];

      setSharedFiles(withMe);
      setSharedByMe(byMe);

      if (!activeFile && withMe.length > 0) {
        setActiveFile(withMe[0]);
      }
    } catch {
      toast.error('Failed to load shared files');
    } finally {
      setLoading(false);
    }
  }, [activeFile]);

  useEffect(() => { 
    fetchShared(); 
    
    const supabase = createSupabaseBrowserClient();
    const channel = supabase.channel('shared-files-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shared_files' }, () => {
        fetchShared();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchShared]);

  const fetchComments = useCallback(async (fileId: string) => {
    try {
      const res = await fetch(`/api/files/${fileId}/comments`);
      if (!res.ok) return;
      const data = await res.json();
      setComments(Array.isArray(data) ? data : data.data ?? []);
    } catch {
      console.error("Failed to load comments");
    }
  }, []);

  useEffect(() => {
    if (activeFile) {
      fetchComments(activeFile.file.id);
      
      const supabase = createSupabaseBrowserClient();
      const channel = supabase.channel(`comments-changes-${activeFile.file.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'comments', filter: `file_id=eq.${activeFile.file.id}` }, () => {
          fetchComments(activeFile.file.id);
        })
        .subscribe();
        
      return () => { supabase.removeChannel(channel); };
    } else {
      setComments([]);
    }
  }, [activeFile, fetchComments]);

  const handlePostComment = async () => {
    if (!activeFile || !commentText.trim()) return;
    try {
      const res = await fetch(`/api/files/${activeFile.file.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: commentText })
      });
      if (res.ok) {
        setCommentText("");
        await fetchComments(activeFile.file.id);
      } else {
        const data = await res.json().catch(() => null);
        toast.error(data?.error || "Failed to post comment");
      }
    } catch {
      toast.error("Network error posting comment");
    }
  };

  // ─── Action handlers ──────────────────────────────────────────────
  const handleDownload = useCallback(async (fileId: string, filename: string) => {
    try {
      const res = await fetch(`/api/files/${fileId}/url`);
      const d = await res.json();
      const url = d.url ?? d.data?.url ?? d.data?.signed_url;
      if (!url) { toast.error("Could not get download link"); return; }
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.target = "_blank";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success("Download started");
    } catch {
      toast.error("Download failed");
    }
  }, []);

  const handleRemoveShare = useCallback(async (shareId: string) => {
    toast("Remove this shared file?", {
      action: {
        label: "Remove",
        onClick: async () => {
          try {
            const res = await fetch(`/api/shared/${shareId}`, { method: "DELETE" });
            if (res.ok || res.status === 204) {
              toast.success("Share removed");
              setSharedFiles((prev) => prev.filter((s) => s.id !== shareId));
              setSharedByMe((prev) => prev.filter((s) => s.id !== shareId));
              if (activeFile?.id === shareId) setActiveFile(null);
            } else {
              toast.error("Failed to remove share");
            }
          } catch {
            toast.error("Network error");
          }
        },
      },
      cancel: { label: "Cancel", onClick: () => {} },
    });
  }, [activeFile]);

  const filteredFiles = sharedFiles.filter(item => item.file.filename.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredByMe = sharedByMe.filter(item => item.file.filename.toLowerCase().includes(searchQuery.toLowerCase()));

  // ─── Skeleton Row ─────────────────────────────────────────────────
  const SkeletonRows = () => (
    <>
      {[1, 2, 3].map(i => (
        <tr key={i} className="animate-pulse">
          <td className="p-4 pl-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-100 rounded" />
              <div>
                <div className="h-4 w-36 bg-slate-100 rounded mb-1" />
                <div className="h-3 w-16 bg-slate-100 rounded" />
              </div>
            </div>
          </td>
          <td className="p-4"><div className="h-4 w-28 bg-slate-100 rounded" /></td>
          <td className="p-4"><div className="h-4 w-20 bg-slate-100 rounded" /></td>
          <td className="p-4"><div className="h-5 w-14 bg-slate-100 rounded" /></td>
          <td className="p-4 pr-6"><div className="h-5 w-28 bg-slate-100 rounded ml-auto" /></td>
        </tr>
      ))}
    </>
  );

  return (
    <div className="flex-1 flex overflow-hidden bg-slate-50">
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Header */}
        <header className="px-8 py-6 bg-white border-b border-slate-200 shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span className="material-symbols-outlined text-[18px]">home</span>
              <span>/</span>
              <span className="text-slate-900 font-medium">Shared Files</span>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h1 className="text-2xl font-bold text-slate-900">Shared Files & Collaboration</h1>
            
            <div className="flex items-center gap-3">
              <div className="relative w-64">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                <input 
                  type="text" 
                  placeholder="Search shared files..." 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-100 border-none rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                />
              </div>
            </div>
          </div>
        </header>

        {/* Tabs */}
        <div className="px-8 pt-6 pb-2 shrink-0">
          <div className="flex items-center border-b border-slate-200 pb-4 mb-4">
            <div className="flex gap-6">
              {['Shared with Me', 'Shared by Me'].map(tab => (
                <button 
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`text-sm font-semibold pb-4 -mb-4 border-b-2 transition-colors ${activeTab === tab ? "border-primary text-primary" : "border-transparent text-slate-500 hover:text-slate-800"}`}
                >
                  {tab}
                  <span className="ml-2 text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                    {tab === 'Shared with Me' ? sharedFiles.length : sharedByMe.length}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* File Tables */}
        <div className="flex-1 overflow-y-auto px-8 pb-8">

          {/* ═══════════════ Shared with Me ═══════════════ */}
          {activeTab === 'Shared with Me' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="p-4 pl-6">Name</th>
                    <th className="p-4">Shared By</th>
                    <th className="p-4">Date Shared</th>
                    <th className="p-4">Permissions</th>
                    <th className="p-4 pr-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? <SkeletonRows /> : filteredFiles.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-12 text-center text-slate-400">
                        <span className="material-symbols-outlined text-3xl block mb-2 opacity-40">folder_shared</span>
                        No files have been shared with you yet.
                      </td>
                    </tr>
                  ) : filteredFiles.map((sf) => {
                    const isActive = activeFile?.id === sf.id;
                    const type = sf.file.filetype.replace('.', '').toUpperCase();
                    return (
                      <tr 
                        key={sf.id} 
                        onClick={() => setActiveFile(sf)}
                        className={`group hover:bg-slate-50 transition-colors cursor-pointer ${isActive ? "bg-primary/5 border-l-2 border-l-primary" : "border-l-2 border-l-transparent"}`}
                      >
                        <td className="p-4 pl-6">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded flex items-center justify-center shrink-0 ${
                              type === 'STEP' || type === 'STP' ? 'bg-emerald-50 text-emerald-600' :
                              type === 'DXF' ? 'bg-amber-50 text-amber-600' :
                              type === 'STL' ? 'bg-blue-50 text-blue-600' :
                              'bg-purple-50 text-purple-600'
                            }`}>
                              <span className="material-symbols-outlined text-[20px]">{getFileIcon(sf.file.filetype)}</span>
                            </div>
                            <div className="min-w-0">
                              <p className={`font-semibold text-sm truncate ${isActive ? "text-primary" : "text-slate-900"}`}>{sf.file.filename}</p>
                              <p className="text-xs text-slate-500">{formatFileSize(sf.file.size)} • {type}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            {sf.sharedBy.avatarUrl ? (
                              <img src={sf.sharedBy.avatarUrl} alt="" className="w-6 h-6 rounded-full" />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs text-slate-600 font-bold border border-slate-300">
                                {sf.sharedBy.name?.charAt(0) || sf.sharedBy.email.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <p className="text-sm font-medium text-slate-800 truncate">{sf.sharedBy.name || sf.sharedBy.email}</p>
                          </div>
                        </td>
                        <td className="p-4 text-sm text-slate-600">{format(new Date(sf.createdAt), 'MMM d, yyyy')}</td>
                        <td className="p-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                            sf.permission === 'EDITOR' ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {sf.permission === 'EDITOR' ? 'Editor' : 'Viewer'}
                          </span>
                        </td>
                        <td className="p-4 pr-6 text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button title="View 3D model" onClick={(e) => { e.stopPropagation(); setViewingFile({ id: sf.file.id, name: sf.file.filename, size: sf.file.size }); }} className="p-1.5 text-slate-500 hover:text-primary hover:bg-primary/10 rounded transition">
                              <span className="material-symbols-outlined text-[18px] block">visibility</span>
                            </button>
                            <button title="Download" onClick={(e) => { e.stopPropagation(); handleDownload(sf.file.id, sf.file.filename); }} className="p-1.5 text-slate-500 hover:text-primary hover:bg-primary/10 rounded transition">
                              <span className="material-symbols-outlined text-[18px] block">download</span>
                            </button>
                            <button title="Remove share" onClick={(e) => { e.stopPropagation(); handleRemoveShare(sf.id); }} className="p-1.5 text-slate-500 hover:text-red-500 hover:bg-red-50 rounded transition">
                              <span className="material-symbols-outlined text-[18px] block">link_off</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* ═══════════════ Shared by Me ═══════════════ */}
          {activeTab === 'Shared by Me' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="p-4 pl-6">Name</th>
                    <th className="p-4">Shared With</th>
                    <th className="p-4">Date Shared</th>
                    <th className="p-4">Permissions</th>
                    <th className="p-4 pr-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? <SkeletonRows /> : filteredByMe.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-12 text-center text-slate-400">
                        <span className="material-symbols-outlined text-3xl block mb-2 opacity-40">share</span>
                        You haven&apos;t shared any files yet.
                      </td>
                    </tr>
                  ) : filteredByMe.map((sf) => {
                    const type = sf.file.filetype.replace('.', '').toUpperCase();
                    return (
                      <tr key={sf.id} className="group hover:bg-slate-50 transition-colors">
                        <td className="p-4 pl-6">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded flex items-center justify-center shrink-0 ${
                              type === 'STEP' || type === 'STP' ? 'bg-emerald-50 text-emerald-600' :
                              type === 'DXF' ? 'bg-amber-50 text-amber-600' :
                              type === 'STL' ? 'bg-blue-50 text-blue-600' :
                              'bg-purple-50 text-purple-600'
                            }`}>
                              <span className="material-symbols-outlined text-[20px]">{getFileIcon(sf.file.filetype)}</span>
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-sm truncate text-slate-900">{sf.file.filename}</p>
                              <p className="text-xs text-slate-500">{formatFileSize(sf.file.size)} • {type}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            {sf.sharedWith.avatarUrl ? (
                              <img src={sf.sharedWith.avatarUrl} alt="" className="w-6 h-6 rounded-full" />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs text-slate-600 font-bold border border-slate-300">
                                {sf.sharedWith.name?.charAt(0) || sf.sharedWith.email.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <p className="text-sm font-medium text-slate-800 truncate">{sf.sharedWith.name || sf.sharedWith.email}</p>
                          </div>
                        </td>
                        <td className="p-4 text-sm text-slate-600">{format(new Date(sf.createdAt), 'MMM d, yyyy')}</td>
                        <td className="p-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                            sf.permission === 'EDITOR' ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {sf.permission === 'EDITOR' ? 'Editor' : 'Viewer'}
                          </span>
                        </td>
                        <td className="p-4 pr-6 text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button title="View 3D model" onClick={(e) => { e.stopPropagation(); setViewingFile({ id: sf.file.id, name: sf.file.filename, size: sf.file.size }); }} className="p-1.5 text-slate-500 hover:text-primary hover:bg-primary/10 rounded transition">
                              <span className="material-symbols-outlined text-[18px] block">visibility</span>
                            </button>
                            <button title="Download" onClick={(e) => { e.stopPropagation(); handleDownload(sf.file.id, sf.file.filename); }} className="p-1.5 text-slate-500 hover:text-primary hover:bg-primary/10 rounded transition">
                              <span className="material-symbols-outlined text-[18px] block">download</span>
                            </button>
                            <button title="Revoke share" onClick={(e) => { e.stopPropagation(); handleRemoveShare(sf.id); }} className="p-1.5 text-slate-500 hover:text-red-500 hover:bg-red-50 rounded transition">
                              <span className="material-symbols-outlined text-[18px] block">person_remove</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════ Collaboration Sidebar ═══════════════ */}
      <aside className="hidden lg:flex flex-col w-[380px] bg-white border-l border-slate-200 shrink-0 shadow-sm">
        
        {activeFile ? (
          <>
            <div className="p-6 border-b border-slate-200 bg-slate-50/50">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3 min-w-0 pr-4">
                  <div className={`w-10 h-10 rounded flex items-center justify-center shrink-0 ${
                    activeFile.file.filetype.replace('.', '').toUpperCase() === 'STEP' ? 'bg-emerald-50 text-emerald-600' :
                    activeFile.file.filetype.replace('.', '').toUpperCase() === 'DXF' ? 'bg-amber-50 text-amber-600' :
                    activeFile.file.filetype.replace('.', '').toUpperCase() === 'STL' ? 'bg-blue-50 text-blue-600' :
                    'bg-purple-50 text-purple-600'
                  }`}>
                     <span className="material-symbols-outlined text-[20px]">{getFileIcon(activeFile.file.filetype)}</span>
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-slate-900 text-sm truncate">{activeFile.file.filename}</h3>
                    <p className="text-xs text-slate-500">{formatFileSize(activeFile.file.size)} • {activeFile.file.filetype.replace('.', '').toUpperCase()} File</p>
                  </div>
                </div>
                <button className="text-slate-400 hover:text-slate-600 shrink-0" onClick={() => setActiveFile(null)}>
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>
              
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setViewingFile({ id: activeFile.file.id, name: activeFile.file.filename, size: activeFile.file.size })}
                  className="flex-1 bg-white border border-slate-200 text-slate-700 py-1.5 rounded text-sm font-semibold hover:bg-slate-50 flex items-center justify-center gap-1 shadow-sm"
                >
                  <span className="material-symbols-outlined text-[16px]">visibility</span> View Model
                </button>
                <button 
                  onClick={() => handleDownload(activeFile.file.id, activeFile.file.filename)}
                  className="flex-1 bg-primary text-white py-1.5 rounded text-sm font-semibold hover:bg-blue-700 flex items-center justify-center gap-1 shadow-sm"
                >
                  <span className="material-symbols-outlined text-[16px]">download</span> Download
                </button>
              </div>
            </div>

            {/* Shared by info */}
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/30">
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-2">Shared By</p>
              <div className="flex items-center gap-3">
                {activeFile.sharedBy.avatarUrl ? (
                  <img src={activeFile.sharedBy.avatarUrl} alt="" className="w-8 h-8 rounded-full" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 border border-slate-300">
                    {activeFile.sharedBy.name?.charAt(0) || activeFile.sharedBy.email.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{activeFile.sharedBy.name || activeFile.sharedBy.email}</p>
                  <p className="text-xs text-slate-500 truncate">{activeFile.sharedBy.email}</p>
                </div>
                <span className={`ml-auto text-xs font-semibold px-2 py-0.5 rounded ${
                  activeFile.permission === 'EDITOR' ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-600'
                }`}>
                  {activeFile.permission === 'EDITOR' ? 'Editor' : 'Viewer'}
                </span>
              </div>
            </div>

            {/* Tab Header */}
            <div className="flex border-b border-slate-200 px-6 shrink-0">
              <button className="py-3 text-sm font-semibold border-b-2 border-primary text-primary mr-6 relative">
                Comments
                {comments.length > 0 && (
                  <span className="absolute -top-1 -right-4 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">{comments.length}</span>
                )}
              </button>
              <button disabled className="opacity-50 py-3 text-sm font-semibold border-b-2 border-transparent text-slate-500 cursor-not-allowed">
                Versions
              </button>
            </div>

            {/* Comments Feed */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {comments.length === 0 ? (
                <p className="text-sm text-center text-slate-400 mt-4">No comments yet. Start the conversation!</p>
              ) : comments.map((comment) => (
                <div key={comment.id} className="flex gap-3 relative">
                  {comment.user.avatarUrl ? (
                    <img src={comment.user.avatarUrl} alt="" className="w-8 h-8 rounded-full z-10 shrink-0" />
                  ) : (
                    <div className="w-8 h-8 rounded-full z-10 shrink-0 bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 border border-slate-300">
                      {comment.user.name?.charAt(0) || '?'}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between mb-1">
                      <span className="text-sm font-bold text-slate-900 truncate pr-2">{comment.user.name || "Unknown User"}</span>
                      <span className="text-[10px] text-slate-500 shrink-0">{format(new Date(comment.createdAt), 'MMM d, h:mm a')}</span>
                    </div>
                    <div className="p-3 rounded-lg text-sm bg-slate-100 text-slate-700 break-words whitespace-pre-wrap">
                      {comment.body}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Comment Input */}
            <div className="p-4 border-t border-slate-200 bg-slate-50/50 shrink-0">
              <div className="bg-white border border-slate-300 rounded-xl shadow-sm focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all flex flex-col">
                <textarea 
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handlePostComment();
                    }
                  }}
                  placeholder="Add a comment to this file..."
                  className="w-full resize-none p-3 text-sm outline-none bg-transparent min-h-[80px]"
                />
                <div className="flex items-center justify-between px-3 pb-2 border-t border-slate-100 pt-2 shrink-0">
                  <div className="flex items-center gap-1">
                    <button className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100">
                      <span className="material-symbols-outlined text-[18px]">sentiment_satisfied</span>
                    </button>
                    <button className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100">
                      <span className="material-symbols-outlined text-[18px]">attach_file</span>
                    </button>
                  </div>
                  <button 
                    onClick={handlePostComment}
                    disabled={!commentText.trim()} 
                    className="bg-primary text-white p-1.5 rounded-lg hover:bg-blue-700 shadow-sm transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Send Comment"
                  >
                    <span className="material-symbols-outlined text-[16px] block px-1">send</span>
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col justify-center items-center text-slate-400 p-8 text-center text-sm">
            <span className="material-symbols-outlined opacity-30 text-5xl mb-4 text-center block">people</span>
            <p className="font-medium">Select a shared file to view collaboration tools</p>
          </div>
        )}
      </aside>

      {/* View Modal */}
      {viewingFile && (
        <ViewerModal fileId={viewingFile.id} filename={viewingFile.name} fileSize={viewingFile.size} onClose={() => setViewingFile(null)} />
      )}

    </div>
  );
}
