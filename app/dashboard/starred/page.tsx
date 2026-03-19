"use client";

import { useState, useEffect, useCallback } from "react";
import ViewerModal from "@/components/viewer/ViewerModal";
import { toast } from "sonner";
import { format } from "date-fns";

// Use the same FileItem interface as dashboard
interface FileItem {
  id: string;
  filename: string;
  filetype: string;
  size: number;
  storage_path: string;
  folder_id: string | null;
  tags: string[];
  created_at: string;
  owner_id?: string;
  isStarred?: boolean;
}

export default function StarredPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [viewingFile, setViewingFile] = useState<{ id: string; name: string; size?: number } | null>(null);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchStarred = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/starred');
      const raw = await res.json();
      const list = raw.starredFiles ?? raw.data ?? (Array.isArray(raw) ? raw : []);
      if (list) {
        setFiles(list.map((item: any) => ({ ...item.file, isStarred: true })));
        if (!selectedId && list.length > 0) {
          setSelectedId(list[0].file.id);
        }
      }
    } catch {
      toast.error('Failed to load starred files');
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  useEffect(() => { fetchStarred(); }, [fetchStarred]);

  const toggleStar = useCallback(async (file: FileItem) => {
    try {
      await fetch(`/api/starred/${file.id}`, { method: 'DELETE' });
      toast.success(`Removed ${file.filename} from starred`);
      await fetchStarred(); // Refresh list
    } catch {
      toast.error('Failed to update star status');
    }
  }, [fetchStarred]);

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  const activeFile = files.find(f => f.id === selectedId) || null;

  const filteredFiles = files.filter(f => f.filename.toLowerCase().includes(searchQuery.toLowerCase()));

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
              <span className="text-slate-900 font-medium">Starred Files</span>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Starred Files</h1>
              <p className="text-sm text-slate-500 mt-1">Quick access to your critical CAD assets and project blueprints.</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative w-64">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                <input 
                  type="text" 
                  placeholder="Search starred files..." 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-100 border-none rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                />
              </div>
            </div>
          </div>
        </header>

        {/* Content Grid */}
        <div className="flex-1 overflow-y-auto p-8">
          {loading ? (
            <div className="flex-1 flex items-center justify-center p-8 text-slate-400">Loading starred files...</div>
          ) : filteredFiles.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
              <span className="material-symbols-outlined text-5xl mb-4 opacity-30">star</span>
              <p className="text-sm">No starred files found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredFiles.map((file) => (
                <div 
                  key={file.id}
                  onClick={() => setSelectedId(file.id)}
                  className={`group bg-white border rounded-xl p-5 cursor-pointer transition-all hover:shadow-md ${
                    selectedId === file.id ? "border-primary ring-1 ring-primary/20" : "border-slate-200"
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center bg-blue-50 text-blue-600`}>
                      <span className="material-symbols-outlined text-2xl">insert_drive_file</span>
                    </div>
                    <button className="text-primary" onClick={(e) => { e.stopPropagation(); toggleStar(file); }}>
                      <span className="material-symbols-outlined font-fill">star</span>
                    </button>
                  </div>
                  <h3 className="font-bold text-slate-900 mb-1 group-hover:text-primary transition-colors truncate">{file.filename}</h3>
                  <p className="text-xs text-slate-500 mb-4">{file.filename.slice(file.filename.lastIndexOf('.')).replace('.', '').toUpperCase()} CAD Model • {formatFileSize(file.size)}</p>
                  <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Modified {format(new Date(file.created_at), 'MMM d, yyyy')}</span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={(e) => { e.stopPropagation(); setViewingFile({ id: file.id, name: file.filename, size: file.size }); }} className="p-1 text-slate-400 hover:text-primary"><span className="material-symbols-outlined text-sm">visibility</span></button>
                      <button onClick={async (e) => { 
                        e.stopPropagation(); 
                        const r = await fetch(`/api/files/${file.id}/url`);
                        const d = await r.json();
                        const url = d.url ?? d.data?.url ?? d.data?.signed_url;
                        if(url) {
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = file.filename;
                          a.target = "_blank";
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                        } else toast.error("Could not get download link");
                      }} className="p-1 text-slate-400 hover:text-primary"><span className="material-symbols-outlined text-sm">download</span></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <p className="text-center text-xs text-slate-400 mt-12 font-medium uppercase tracking-widest">Showing {filteredFiles.length} starred files</p>
        </div>
      </div>

      {/* Right Activity Sidebar */}
      <aside className="hidden lg:flex flex-col w-[380px] bg-white border-l border-slate-200 shrink-0 shadow-sm font-sans">
        {activeFile ? (
          <>
            <div className="p-8 border-b border-slate-100">
              <div className="w-full aspect-video bg-slate-50 rounded-2xl mb-6 flex items-center justify-center border border-slate-100 group cursor-pointer relative overflow-hidden" onClick={() => setViewingFile({ id: activeFile.id, name: activeFile.filename, size: activeFile.size })}>
                <span className="material-symbols-outlined text-5xl text-slate-200 group-hover:scale-110 transition-transform">view_in_ar</span>
                <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                   <span className="bg-white text-primary text-xs font-bold px-3 py-1.5 rounded-full shadow-sm flex items-center gap-1">
                     <span className="material-symbols-outlined text-[14px]">play_arrow</span> OPEN VIEWER
                   </span>
                </div>
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-1 break-all">{activeFile.filename}</h2>
              <p className="text-sm text-slate-500 mb-6">{formatFileSize(activeFile.size)} • {activeFile.filename.slice(activeFile.filename.lastIndexOf('.')).replace('.', '').toUpperCase()}</p>
              
              <div className="flex gap-3">
                <button onClick={async () => {
                   const r = await fetch(`/api/files/${activeFile.id}/url`);
                   const d = await r.json();
                   const url = d.url ?? d.data?.url ?? d.data?.signed_url;
                   if(url) {
                     const a = document.createElement("a");
                     a.href = url;
                     a.download = activeFile.filename;
                     a.target = "_blank";
                     document.body.appendChild(a);
                     a.click();
                     document.body.removeChild(a);
                     toast.success("Download started");
                   } else toast.error("Could not get download link");
                }} className="flex-1 bg-primary text-white py-2.5 rounded-xl text-sm font-bold hover:bg-blue-700 transition shadow-sm flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">download</span> Download
                </button>
                <button onClick={async () => {
                  try {
                    const res = await fetch(`/api/files/${activeFile.id}/url`);
                    const d = await res.json();
                    const url = d.url ?? d.data?.url ?? d.data?.signed_url;
                    if (url) { await navigator.clipboard.writeText(url); toast.success("Share link copied!"); }
                    else { toast.error("Failed to generate link"); }
                  } catch { toast.error("Failed to copy link"); }
                }} className="bg-white border border-slate-200 text-slate-600 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition shadow-sm">
                  <span className="material-symbols-outlined text-[20px] block">share</span>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">Recent Starred Activity</h3>
              <div className="space-y-8 relative before:absolute before:left-[15px] before:top-2 before:bottom-2 before:w-px before:bg-slate-100">
                
                <div className="relative pl-10">
                  <div className="absolute left-0 top-0 w-[30px] h-[30px] rounded-full bg-blue-50 border-2 border-white flex items-center justify-center z-10">
                    <span className="material-symbols-outlined text-primary text-[14px]">person</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 leading-none mb-1">{activeFile.filename}</h4>
                    <p className="text-xs text-slate-500">Updated • {format(new Date(activeFile.created_at), 'MMM d, yyyy')}</p>
                    <div className="mt-2 p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs text-slate-600 italic">
                      "File was uploaded"
                    </div>
                  </div>
                </div>

                <div className="relative pl-10">
                  <div className="absolute left-0 top-0 w-[30px] h-[30px] rounded-full bg-emerald-50 border-2 border-white flex items-center justify-center z-10">
                    <span className="material-symbols-outlined text-emerald-600 text-[14px]">comment</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 leading-none mb-1">New Comment</h4>
                    <p className="text-xs text-slate-500">By John Doe • 5h ago</p>
                    <p className="text-xs text-slate-600 mt-2 line-clamp-2">"Please verify the mounting points on the bottom plate before tomorrow."</p>
                  </div>
                </div>

                <div className="relative pl-10">
                  <div className="absolute left-0 top-0 w-[30px] h-[30px] rounded-full bg-amber-50 border-2 border-white flex items-center justify-center z-10">
                    <span className="material-symbols-outlined text-amber-600 text-[14px]">star</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 leading-none mb-1">Added to Starred</h4>
                    <p className="text-xs text-slate-500">{format(new Date(activeFile.created_at), 'MMM d, yyyy')}</p>
                  </div>
                </div>

              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
            <span className="material-symbols-outlined text-5xl mb-4 opacity-30">star</span>
            <p className="text-sm font-medium">Select a starred asset to view detail activity</p>
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
