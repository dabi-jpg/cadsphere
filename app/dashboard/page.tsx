"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import ViewerModal from "@/components/viewer/ViewerModal";
import VersionHistory from "@/components/VersionHistory";
import ShareModal from "@/components/ShareModal";
import NotificationsDropdown from "@/components/NotificationsDropdown";
import {
  ALLOWED_CAD_EXTENSIONS,
  MAX_FILE_SIZE_BYTES,
  MAX_FILE_SIZE_DISPLAY,
  ALLOWED_EXTENSIONS_DISPLAY,
} from "@/lib/validation";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

// ─── Types ─────────────────────────────────────────────────────────────
interface UploadItem {
  id: string;
  filename: string;
  progress: number;
  status: 'pending' | 'uploading' | 'done' | 'error';
  error?: string;
}

interface FileItem {
  id: string;
  filename: string;
  filetype: string;
  size: number;
  storagePath: string;
  folderId: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  isStarred: boolean;
  _count: { versions: number };
  folder: { id: string; name: string } | null;
}

interface FolderItem {
  id: string;
  name: string;
  updatedAt: string;
  _count: { files: number };
}

interface StorageSummary {
  totalBytes: number;
  fileCount: number;
  byType: Record<string, number>;
}

// ─── Helpers ───────────────────────────────────────────────────────────
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function formatRelative(dateStr: string): string {
  const date = new Date(dateStr);
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMs / 3600000);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays < 30) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function getFileIcon(filetype: string): string {
  const t = filetype.toLowerCase().replace(".", "");
  if (["step", "stp", "iges", "igs"].includes(t)) return "view_in_ar";
  if (t === "stl") return "deployed_code";
  if (t === "dxf") return "architecture";
  return "insert_drive_file";
}

// ─── Main Dashboard ────────────────────────────────────────────────────
export default function Dashboard() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [summary, setSummary] = useState<StorageSummary | null>(null);
  const [userProfile, setUserProfile] = useState<{ name: string | null; avatarUrl: string | null; email: string | null } | null>(null);
  const [loadingFiles, setLoadingFiles] = useState(true);
  
  // New upload state
  const [uploadQueue, setUploadQueue] = useState<UploadItem[]>([]);
  const [showUploadPanel, setShowUploadPanel] = useState(false);
  
  const [isDragOver, setIsDragOver] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"Activity" | "Info">("Activity");
  const [viewingFile, setViewingFile] = useState<{ id: string; name: string; size?: number } | null>(null);
  const [versionFile, setVersionFile] = useState<{ id: string; name: string } | null>(null);
  
  // New features state
  const [viewStyle, setViewStyle] = useState<"list" | "grid">("list");
  const [sortBy, setSortBy] = useState<"date" | "name" | "size">("date");
  const [isNewFolderModalOpen, setIsNewFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);
  const profileRef = useRef<HTMLDivElement>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [shareModalFileId, setShareModalFileId] = useState<string | null>(null);
  const router = useRouter();

  const activeFile = files.find((f) => f.id === selectedFileId) ?? files[0] ?? null;

  // ─── Fetch all data ──────────────────────────────────────────────────
  const fetchFiles = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set("q", searchQuery);

      const [resFiles, resFolders, resUser] = await Promise.all([
        fetch(`/api/files?${params.toString()}`),
        fetch("/api/folders"),
        fetch("/api/auth/me"),
      ]);

      // --- Files ---
      if (resFiles.ok) {
        const raw = await resFiles.json();
        // Handle both { files, summary } and { success, data: { files, storage } } shapes
        const filesList: FileItem[] = raw.files ?? raw.data?.files ?? [];
        const storageSummary: StorageSummary | null = raw.summary ?? raw.data?.storage ?? null;
        setFiles(filesList);
        setSummary(storageSummary);
      } else {
        console.error("Files API error:", resFiles.status);
      }

      // --- Folders ---
      if (resFolders.ok) {
        const raw = await resFolders.json();
        // Handle both array and { success, data } shapes
        const foldersList: FolderItem[] = Array.isArray(raw) ? raw : raw.data ?? [];
        setFolders(foldersList);
      }

      // --- User ---
      if (resUser.ok) {
        const raw = await resUser.json();
        const user = raw.user ?? raw.data?.user ?? null;
        if (user) setUserProfile({ name: user.name ?? null, avatarUrl: user.avatarUrl ?? null, email: user.email ?? null });
      }
    } catch (err) {
      console.error("fetchFiles error:", err);
    } finally {
      setLoadingFiles(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    fetchFiles();

    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel("dashboard-files")
      .on("postgres_changes", { event: "*", schema: "public", table: "files" }, () => {
        fetchFiles();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchFiles]);

  // ─── Upload ──────────────────────────────────────────────────────────
  const updateUploadItem = useCallback((id: string, updates: Partial<UploadItem>) => {
    setUploadQueue(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  }, []);

  const uploadSingleFile = async (file: File, folderId?: string): Promise<void> => {
    const id = Math.random().toString(36).slice(2);
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();

    if (!ALLOWED_CAD_EXTENSIONS.includes(ext as typeof ALLOWED_CAD_EXTENSIONS[number])) {
      setUploadQueue(prev => [...prev, { id, filename: file.name, progress: 0, status: 'error', error: `Invalid type ${ext}` }]);
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setUploadQueue(prev => [...prev, { id, filename: file.name, progress: 0, status: 'error', error: 'Exceeds 200MB limit' }]);
      return;
    }

    setUploadQueue(prev => [...prev, { id, filename: file.name, progress: 0, status: 'uploading' }]);

    try {
      const presignRes = await fetch('/api/files/upload/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, filetype: ext.replace('.', ''), size: file.size }),
      });
      if (!presignRes.ok) {
        const d = await presignRes.json();
        throw new Error(d.error || 'Failed to get upload URL');
      }
      const { signedUrl, storagePath } = await presignRes.json();

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) updateUploadItem(id, { progress: Math.round((e.loaded / e.total) * 100) });
        });
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(`Upload failed ${xhr.status}`));
        });
        xhr.addEventListener('error', () => reject(new Error('Network error')));
        xhr.open('PUT', signedUrl);
        xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
        xhr.send(file);
      });

      const completeRes = await fetch('/api/files/upload/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          filetype: ext.replace('.', ''),
          size: file.size,
          storagePath,
          folderId: folderId ?? null,
        }),
      });
      if (!completeRes.ok) {
        const d = await completeRes.json();
        throw new Error(d.error || 'Failed to save file');
      }
      updateUploadItem(id, { status: 'done', progress: 100 });
    } catch (err) {
      updateUploadItem(id, { status: 'error', error: err instanceof Error ? err.message : 'Failed' });
    }
  };

  const uploadFiles = useCallback(async (files: File[]) => {
    setShowUploadPanel(true);
    const chunks: File[][] = [];
    for (let i = 0; i < files.length; i += 3) chunks.push(files.slice(i, i + 3));
    for (const chunk of chunks) await Promise.all(chunk.map(f => uploadSingleFile(f, selectedFolderId ?? undefined)));
    await fetchFiles();
    toast.success(`${files.length} file${files.length > 1 ? 's' : ''} uploaded successfully`);
  }, [fetchFiles, selectedFolderId]);

  const uploadFolder = useCallback(async (files: File[]) => {
    if (files.length === 0) return;
    setShowUploadPanel(true);
    const firstFile = files[0] as any;
    const folderName = firstFile.webkitRelativePath
      ? firstFile.webkitRelativePath.split('/')[0]
      : 'Uploaded Folder';

    const folderRes = await fetch('/api/folders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: folderName }),
    });
    const folderData = await folderRes.json();
    const folderId = folderData.folder?.id ?? folderData.id ?? null;

    const chunks: File[][] = [];
    for (let i = 0; i < files.length; i += 3) chunks.push(files.slice(i, i + 3));
    for (const chunk of chunks) await Promise.all(chunk.map(f => uploadSingleFile(f, folderId)));
    await fetchFiles();
    toast.success(`Folder "${folderName}" uploaded with ${files.length} files`);
  }, [fetchFiles]);

  // ─── Drag & Drop ────────────────────────────────────────────────────
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.items?.length) setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) setIsDragOver(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    setIsDragOver(false);
    dragCounterRef.current = 0;
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) await uploadFiles(files);
  }, [uploadFiles]);

  // ─── Delete ──────────────────────────────────────────────────────────
  const handleDelete = useCallback(async (fileId: string, filename: string) => {
    toast(`Delete "${filename}"?`, {
      action: {
        label: "Delete",
        onClick: async () => {
          try {
            const res = await fetch(`/api/files/${fileId}`, { method: "DELETE" });
            if (res.ok) {
              setFiles((prev) => prev.filter((f) => f.id !== fileId));
              if (selectedFileId === fileId) setSelectedFileId(null);
              toast.success("File moved to trash");
            } else {
              const d = await res.json();
              toast.error(d.error || "Delete failed");
            }
          } catch {
            toast.error("Network error during deletion");
          }
        },
      },
      cancel: { label: "Cancel", onClick: () => {} },
    });
  }, [selectedFileId]);

  // ─── Folders ─────────────────────────────────────────────────────────
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return toast.error("Folder name required");
    try {
      const res = await fetch("/api/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newFolderName }),
      });
      if (res.ok) {
        toast.success("Folder created");
        setNewFolderName("");
        setIsNewFolderModalOpen(false);
        fetchFiles();
      } else {
        toast.error("Failed to create folder");
      }
    } catch {
      toast.error("Network error");
    }
  };

  const handleMoveFileToFolder = async (fileId: string, folderId: string | null) => {
    try {
      const res = await fetch(`/api/files/${fileId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderId }),
      });
      if (res.ok) {
        toast.success("File moved successfully");
        fetchFiles();
      } else {
        toast.error("Failed to move file");
      }
    } catch {
      toast.error("Network error");
    }
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
    } catch {
      toast.error("Failed to log out");
    }
  };

  // ─── Share ───────────────────────────────────────────────────────────
  const handleShare = useCallback((fileId: string) => {
    setShareModalFileId(fileId);
  }, []);

  // ─── Download ────────────────────────────────────────────────────────
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

  // ─── Star ────────────────────────────────────────────────────────────
  const toggleStar = useCallback(async (file: FileItem) => {
    try {
      const method = file.isStarred ? "DELETE" : "POST";
      const res = await fetch(`/api/starred/${file.id}`, { method });
      if (res.ok) {
        setFiles((prev) =>
          prev.map((f) => f.id === file.id ? { ...f, isStarred: !f.isStarred } : f)
        );
        toast.success(file.isStarred ? `Removed from starred` : `Added to starred`);
      } else {
        toast.error("Failed to update star");
      }
    } catch {
      toast.error("Failed to update star");
    }
  }, []);

  // ─── Filtered files ──────────────────────────────────────────────────
  let processedFiles = files;
  let processedFolders = folders;

  if (selectedFolderId) {
    processedFiles = files.filter(f => f.folderId === selectedFolderId);
    processedFolders = []; // no nested folders
  } else {
    processedFiles = files.filter(f => !f.folderId);
  }

  if (searchQuery) {
    processedFiles = files.filter((f) => f.filename.toLowerCase().includes(searchQuery.toLowerCase()));
    processedFolders = folders.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }

  processedFiles.sort((a, b) => {
    if (sortBy === "name") return a.filename.localeCompare(b.filename);
    if (sortBy === "size") return b.size - a.size;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  processedFolders.sort((a, b) => {
    if (sortBy === "name") return a.name.localeCompare(b.name);
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  // ─── Storage bar ─────────────────────────────────────────────────────
  const storagePct = summary && summary.totalBytes > 0
    ? Math.min(100, Math.round((summary.totalBytes / (100 * 1024 * 1024 * 1024)) * 100))
    : 0;

  return (
    <div
      className="flex-1 flex overflow-hidden"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* ── Drag overlay ─────────────────────────────────────────────── */}
      {isDragOver && (
        <div className="fixed inset-0 z-50 bg-primary/10 border-2 border-dashed border-primary flex items-center justify-center pointer-events-none">
          <div className="bg-white px-8 py-6 rounded-2xl shadow-xl text-center">
            <span className="material-symbols-outlined text-primary text-5xl mb-3 block">cloud_upload</span>
            <p className="text-lg font-bold text-slate-900">Drop your CAD file here</p>
            <p className="text-slate-500 text-sm mt-1">{ALLOWED_EXTENSIONS_DISPLAY}</p>
          </div>
        </div>
      )}

      {/* ── Center content ───────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-50 relative">

        {/* Header */}
        <header className="px-8 py-4 bg-white border-b border-slate-200 shrink-0 flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">search</span>
            <input
              type="text"
              placeholder="Search files, folders, or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-100 border-none rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none"
            />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <NotificationsDropdown onShareResolved={fetchFiles} />
            <button className="text-slate-500 hover:bg-slate-100 p-2 rounded-full">
              <span className="material-symbols-outlined">help</span>
            </button>
            <div className="relative" ref={profileRef}>
              <button 
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="h-8 w-8 rounded-full bg-slate-200 border border-slate-300 overflow-hidden flex items-center justify-center font-bold text-slate-500 shrink-0 hover:ring-2 hover:ring-primary/50 transition-all"
              >
                {userProfile?.avatarUrl ? (
                  <img src={userProfile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs">{userProfile?.name?.charAt(0).toUpperCase() ?? "U"}</span>
                )}
              </button>
              
              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-xl shadow-lg bg-white ring-1 ring-black ring-opacity-5 divide-y divide-slate-100 z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="px-4 py-3">
                    <p className="text-sm font-semibold text-slate-900 truncate">{userProfile?.name || "User"}</p>
                    <p className="text-xs text-slate-500 truncate">{userProfile?.email}</p>
                  </div>
                  <div className="py-1">
                    <button 
                      onClick={() => router.push("/dashboard/settings")}
                      className="group flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-primary transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px] text-slate-400 group-hover:text-primary transition-colors">settings</span>
                      Settings
                    </button>
                  </div>
                  <div className="py-1">
                    <button 
                      onClick={handleLogout}
                      className="group flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px] text-red-500 group-hover:text-red-700 transition-colors">logout</span>
                      Log out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-8">

          {/* Quick Access */}
          <section className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-800">Quick Access</h2>
              <button className="text-sm text-primary font-medium hover:underline">View All</button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {folders.slice(0, 3).map((folder, idx) => {
                const colors = [
                  { bg: "bg-indigo-50", text: "text-indigo-600", icon: "dataset" },
                  { bg: "bg-emerald-50", text: "text-emerald-600", icon: "folder" },
                  { bg: "bg-blue-50", text: "text-blue-600", icon: "folder_shared" },
                ];
                const c = colors[idx % colors.length];
                return (
                  <div key={folder.id} className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md hover:border-primary/50 cursor-pointer transition-all group">
                    <div className="flex items-start justify-between mb-4">
                      <div className={`w-10 h-10 ${c.bg} ${c.text} rounded-lg flex items-center justify-center`}>
                        <span className="material-symbols-outlined">{c.icon}</span>
                      </div>
                    </div>
                    <h3 className="font-semibold text-slate-800 mb-1 leading-tight truncate" title={folder.name}>{folder.name}</h3>
                    <p className="text-xs text-slate-500">
                      {formatRelative(folder.updatedAt)} • {folder._count?.files ?? 0} files
                    </p>
                  </div>
                );
              })}
              <div
                onClick={() => folderInputRef.current?.click()}
                className="bg-white border border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center p-4 hover:bg-slate-50 hover:border-primary cursor-pointer transition-all text-slate-500 hover:text-primary min-h-[140px]"
              >
                <span className="material-symbols-outlined mb-2 text-2xl">drive_folder_upload</span>
                <span className="text-sm font-semibold">Upload Folder</span>
              </div>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="bg-primary/5 border border-dashed border-primary/30 rounded-xl flex flex-col items-center justify-center p-4 hover:bg-primary/10 hover:border-primary cursor-pointer transition-all text-primary min-h-[140px]"
              >
                <span className="material-symbols-outlined mb-2 text-2xl">upload_file</span>
                <span className="text-sm font-semibold">Upload File</span>
              </div>
            </div>
          </section>

          {/* Main Files Area */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-bold text-slate-800">
                  {selectedFolderId ? folders.find(f => f.id === selectedFolderId)?.name || "Folder" : "Files"}
                </h2>
                {summary && !searchQuery && !selectedFolderId && (
                  <span className="text-xs font-semibold px-2 py-1 bg-slate-200 text-slate-600 rounded-full">
                    {summary.fileCount} file{summary.fileCount !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
              <div className="flex justify-end items-center gap-3">
                <div className="flex bg-slate-200/50 rounded-lg p-1 border border-slate-200">
                  <button onClick={() => setViewStyle('list')} className={`p-1.5 rounded-md transition-all ${viewStyle === 'list' ? 'bg-white shadow-sm text-primary' : 'text-slate-500 hover:text-slate-700'}`}>
                    <span className="material-symbols-outlined text-[18px] block">view_list</span>
                  </button>
                  <button onClick={() => setViewStyle('grid')} className={`p-1.5 rounded-md transition-all ${viewStyle === 'grid' ? 'bg-white shadow-sm text-primary' : 'text-slate-500 hover:text-slate-700'}`}>
                    <span className="material-symbols-outlined text-[18px] block">grid_view</span>
                  </button>
                </div>
                <select 
                  value={sortBy} 
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-white border border-slate-200 text-sm rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-primary/20 text-slate-700 font-medium cursor-pointer"
                >
                  <option value="date">Date Modified</option>
                  <option value="name">Name</option>
                  <option value="size">Size</option>
                </select>
              </div>
            </div>

            {selectedFolderId && (
              <button onClick={() => setSelectedFolderId(null)} className="mb-4 flex items-center gap-2 text-sm text-slate-500 hover:text-primary transition-colors font-medium">
                <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                Back to root
              </button>
            )}

            {loadingFiles ? (
              <div className="text-center py-12 text-slate-400">Loading...</div>
            ) : processedFiles.length === 0 && processedFolders.length === 0 ? (
              <div className="text-center py-12 text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl">
                <span className="material-symbols-outlined text-4xl mb-2 opacity-50 block">folder_open</span>
                <p>{searchQuery ? `No results for "${searchQuery}"` : "This folder is empty."}</p>
              </div>
            ) : viewStyle === "list" ? (
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs text-slate-500 uppercase tracking-wider bg-slate-50/50">
                      <th className="font-medium p-4 pl-6">Name</th>
                      <th className="font-medium p-4">Modified</th>
                      <th className="font-medium p-4">Size</th>
                      <th className="font-medium p-4 pr-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {/* Folders List rows */}
                    {processedFolders.map((folder) => (
                      <tr 
                        key={folder.id}
                        onClick={() => setSelectedFolderId(folder.id)}
                        onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("bg-primary/5"); }}
                        onDragLeave={(e) => { e.currentTarget.classList.remove("bg-primary/5"); }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.currentTarget.classList.remove("bg-primary/5");
                          const fileId = e.dataTransfer.getData("fileId");
                          if (fileId) handleMoveFileToFolder(fileId, folder.id);
                        }}
                        className="group cursor-pointer hover:bg-slate-50 transition-colors border-l-2 border-l-transparent"
                      >
                        <td className="p-4 pl-6">
                          <div className="flex items-center gap-3">
                            <span className="material-symbols-outlined text-xl text-emerald-500">folder</span>
                            <span className="font-bold text-sm text-slate-800">{folder.name}</span>
                          </div>
                        </td>
                        <td className="p-4 text-sm text-slate-600">{formatRelative(folder.updatedAt)}</td>
                        <td className="p-4 text-sm text-slate-600">—</td>
                        <td className="p-4 pr-6 text-right"></td>
                      </tr>
                    ))}
                    {/* Files List rows */}
                    {processedFiles.map((file) => {
                      const isSelected = file.id === selectedFileId;
                      return (
                        <tr
                          key={file.id}
                          onClick={() => setSelectedFileId(file.id)}
                          draggable
                          onDragStart={(e) => { e.dataTransfer.setData("fileId", file.id); }}
                          className={`group cursor-pointer transition-colors ${
                            isSelected ? "bg-primary/5 border-l-2 border-l-primary" : "hover:bg-slate-50 border-l-2 border-l-transparent"
                          }`}
                        >
                          <td className="p-4 pl-6">
                            <div className="flex items-center gap-3">
                              <span className={`material-symbols-outlined text-xl ${isSelected ? "text-primary" : "text-slate-400 group-hover:text-primary"} transition-colors`}>
                                {getFileIcon(file.filetype)}
                              </span>
                              <div>
                                <p className="font-semibold text-sm text-slate-800">{file.filename}</p>
                                <p className="text-xs text-slate-500 mt-0.5">
                                  {file.filename.slice(file.filename.lastIndexOf('.')).replace('.', '').toUpperCase()}
                                  {file._count.versions > 1 && <span className="ml-2 text-primary">v{file._count.versions}</span>}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 text-sm text-slate-600">{formatRelative(file.updatedAt || file.createdAt)}</td>
                          <td className="p-4 text-sm text-slate-600">{formatBytes(file.size)}</td>
                          <td className="p-4 pr-6 text-right">
                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button title="View 3D model" onClick={(e) => { e.stopPropagation(); setViewingFile({ id: file.id, name: file.filename, size: file.size }); }} className="p-1.5 text-slate-500 hover:text-primary hover:bg-primary/10 rounded transition">
                                <span className="material-symbols-outlined text-[18px] block">visibility</span>
                              </button>
                              <button title={file.isStarred ? "Unstar" : "Star"} onClick={(e) => { e.stopPropagation(); toggleStar(file); }} className={`p-1.5 rounded transition ${file.isStarred ? "text-amber-500 bg-amber-50" : "text-slate-500 hover:text-amber-500 hover:bg-amber-50"}`}>
                                <span className="material-symbols-outlined text-[18px] block">{file.isStarred ? "star" : "star_border"}</span>
                              </button>
                              <button title="Download" onClick={(e) => { e.stopPropagation(); handleDownload(file.id, file.filename); }} className="p-1.5 text-slate-500 hover:text-primary hover:bg-primary/10 rounded transition">
                                <span className="material-symbols-outlined text-[18px] block">download</span>
                              </button>
                              <button title="Share" onClick={(e) => { e.stopPropagation(); handleShare(file.id); }} className="p-1.5 text-slate-500 hover:text-primary hover:bg-primary/10 rounded transition">
                                <span className="material-symbols-outlined text-[18px] block">ios_share</span>
                              </button>
                              <button title="Delete" onClick={(e) => { e.stopPropagation(); handleDelete(file.id, file.filename); }} className="p-1.5 text-slate-500 hover:text-red-500 hover:bg-red-50 rounded transition">
                                <span className="material-symbols-outlined text-[18px] block">delete</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {/* Folders Grid items */}
                {processedFolders.map((folder) => (
                  <div 
                    key={folder.id} 
                    onClick={() => setSelectedFolderId(folder.id)}
                    onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("ring-2", "ring-primary"); }}
                    onDragLeave={(e) => { e.currentTarget.classList.remove("ring-2", "ring-primary"); }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.remove("ring-2", "ring-primary");
                      const fileId = e.dataTransfer.getData("fileId");
                      if (fileId) handleMoveFileToFolder(fileId, folder.id);
                    }}
                    className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer hover:shadow-md hover:border-primary/50 transition-all select-none"
                  >
                    <span className="material-symbols-outlined text-4xl text-emerald-500 mb-2">folder</span>
                    <span className="font-bold text-sm text-slate-800 line-clamp-1 w-full" title={folder.name}>{folder.name}</span>
                  </div>
                ))}
                {/* Files Grid items */}
                {processedFiles.map((file) => (
                  <div 
                    key={file.id} 
                    onClick={() => setSelectedFileId(file.id)}
                    draggable
                    onDragStart={(e) => { e.dataTransfer.setData("fileId", file.id); }}
                    className={`bg-white border rounded-xl overflow-hidden flex flex-col cursor-pointer transition-all ${selectedFileId === file.id ? "ring-2 ring-primary border-transparent" : "border-slate-200 hover:shadow-md hover:border-primary/50"}`}
                  >
                    <div className="flex-1 bg-slate-50 flex flex-col items-center justify-center p-6 text-slate-400 group">
                      <span className="material-symbols-outlined text-5xl group-hover:scale-110 transition-transform mb-2">
                        {getFileIcon(file.filetype)}
                      </span>
                      <span className="text-xs font-bold bg-white px-2 py-0.5 rounded shadow-sm text-slate-600">
                        {file.filename.slice(file.filename.lastIndexOf('.')).replace('.', '').toUpperCase()}
                      </span>
                    </div>
                    <div className="p-3 bg-white border-t border-slate-100 flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-slate-800 line-clamp-1" title={file.filename}>{file.filename}</p>
                        <p className="text-xs text-slate-500">{formatRelative(file.updatedAt || file.createdAt)}</p>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); setViewingFile({ id: file.id, name: file.filename, size: file.size }); }} className="ml-2 text-slate-400 hover:text-primary transition-colors">
                        <span className="material-symbols-outlined">visibility</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* ── Right Detail Sidebar ─────────────────────────────────────── */}
      <aside className="hidden xl:flex w-80 flex-col bg-white border-l border-slate-200 shrink-0">
        {activeFile ? (
          <>
            <div className="p-6 border-b border-slate-100">
              {/* 3D preview thumbnail */}
              <div
                onClick={() => setViewingFile({ id: activeFile.id, name: activeFile.filename, size: activeFile.size })}
                className="w-full aspect-video bg-slate-100 rounded-xl mb-5 border border-slate-200 overflow-hidden flex items-center justify-center group cursor-pointer relative"
              >
                <span className="material-symbols-outlined text-4xl text-slate-300 group-hover:scale-110 transition-transform">
                  {getFileIcon(activeFile.filetype)}
                </span>
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-sm font-medium gap-2">
                  <span className="material-symbols-outlined text-[18px]">play_circle</span>
                  View 3D Model
                </div>
              </div>

              <h3 className="font-bold text-slate-900 text-base mb-1 break-all leading-tight">{activeFile.filename}</h3>
              <p className="text-slate-500 text-sm mb-4">
                {formatBytes(activeFile.size)} • {activeFile.filetype.replace(".", "").toUpperCase()}
              </p>

              <div className="flex gap-2">
                <button
                  onClick={() => handleDownload(activeFile.id, activeFile.filename)}
                  className="flex-1 bg-primary text-white py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">download</span>
                  Download
                </button>
                <button
                  onClick={() => handleShare(activeFile.id)}
                  className="bg-white border border-slate-200 text-slate-600 px-3 py-2 rounded-lg hover:bg-slate-50 transition"
                >
                  <span className="material-symbols-outlined text-[18px] block">ios_share</span>
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200">
              <button
                onClick={() => setActiveTab("Activity")}
                className={`flex-1 py-3 text-sm font-semibold border-b-2 transition ${activeTab === "Activity" ? "border-primary text-primary" : "border-transparent text-slate-500 hover:text-slate-800"}`}
              >
                Activity
              </button>
              <button
                onClick={() => setActiveTab("Info")}
                className={`flex-1 py-3 text-sm font-semibold border-b-2 transition ${activeTab === "Info" ? "border-primary text-primary" : "border-transparent text-slate-500 hover:text-slate-800"}`}
              >
                Properties
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
              {activeTab === "Activity" && (
                <div className="relative pl-6">
                  <div className="absolute left-1.5 top-2 bottom-0 w-px bg-slate-200" />
                  <div className="relative mb-6">
                    <div className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-primary border-2 border-white" />
                    <p className="text-sm font-medium text-slate-800">File uploaded</p>
                    <p className="text-xs text-slate-500 mt-0.5">{formatRelative(activeFile.createdAt)}</p>
                    <button
                      onClick={() => setVersionFile({ id: activeFile.id, name: activeFile.filename })}
                      className="mt-2 text-xs text-primary font-medium bg-blue-50 px-2 py-1 rounded inline-block hover:bg-blue-100 transition"
                    >
                      View Version History
                    </button>
                  </div>
                  {activeFile._count.versions > 1 && (
                    <div className="relative">
                      <div className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-slate-300 border-2 border-white" />
                      <p className="text-sm font-medium text-slate-800">{activeFile._count.versions} versions</p>
                      <p className="text-xs text-slate-500 mt-0.5">Click above to view history</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "Info" && (
                <div className="space-y-4">
                  <div>
                    <span className="block text-xs text-slate-500 uppercase font-semibold mb-1">Type</span>
                    <span className="text-sm text-slate-800">{activeFile.filetype.replace(".", "").toUpperCase()} CAD Model</span>
                  </div>
                  <div>
                    <span className="block text-xs text-slate-500 uppercase font-semibold mb-1">Size</span>
                    <span className="text-sm text-slate-800">{formatBytes(activeFile.size)}</span>
                  </div>
                  <div>
                    <span className="block text-xs text-slate-500 uppercase font-semibold mb-1">Uploaded</span>
                    <span className="text-sm text-slate-800">{formatRelative(activeFile.createdAt)}</span>
                  </div>
                  <div>
                    <span className="block text-xs text-slate-500 uppercase font-semibold mb-1">Location</span>
                    <span className="text-sm text-slate-800 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">folder</span>
                      {activeFile.folder?.name ?? "Root"}
                    </span>
                  </div>
                  {activeFile.tags.length > 0 && (
                    <div>
                      <span className="block text-xs text-slate-500 uppercase font-semibold mb-2">Tags</span>
                      <div className="flex flex-wrap gap-1">
                        {activeFile.tags.map((tag) => (
                          <span key={tag} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{tag}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div>
                    <span className="block text-xs text-slate-500 uppercase font-semibold mb-1">File ID</span>
                    <span className="text-xs text-slate-400 font-mono bg-slate-100 px-2 py-1 rounded block truncate">{activeFile.id}</span>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
            <span className="material-symbols-outlined text-5xl mb-4 opacity-40">touch_app</span>
            <p className="text-sm">Select a file to view its details, history, and actions.</p>
          </div>
        )}
      </aside>

      {/* ── Hidden file inputs ───────────────────────────────────────── */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept={ALLOWED_CAD_EXTENSIONS.join(",")}
        multiple
        onChange={(e) => {
          const files = Array.from(e.target.files || [])
          if (files.length > 0) uploadFiles(files)
        }}
      />
      <input
        type="file"
        ref={folderInputRef}
        className="hidden"
        webkitdirectory=""
        multiple
        onChange={(e) => {
          const files = Array.from(e.target.files || [])
          if (files.length > 0) uploadFolder(files)
        }}
      />

      {/* ── Upload Panel ─────────────────────────────────────────────── */}
      {showUploadPanel && uploadQueue.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50 bg-white border border-slate-200 rounded-xl shadow-xl w-80 max-h-96 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between p-3 border-b border-slate-100">
            <span className="text-sm font-semibold text-slate-800">
              {uploadQueue.filter(u => u.status === 'uploading').length > 0
                ? `Uploading ${uploadQueue.filter(u => u.status === 'uploading').length} files...`
                : `${uploadQueue.filter(u => u.status === 'done').length}/${uploadQueue.length} done`}
            </span>
            <button onClick={() => { setShowUploadPanel(false); setUploadQueue([]) }} className="text-slate-400 hover:text-slate-600">
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
          <div className="overflow-y-auto flex-1 p-2 space-y-2">
            {uploadQueue.map(item => (
              <div key={item.id} className="p-2 rounded-lg bg-slate-50">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-700 truncate flex-1 mr-2">{item.filename}</span>
                  {item.status === 'done' && <span className="material-symbols-outlined text-green-500 text-[16px]">check_circle</span>}
                  {item.status === 'error' && <span className="material-symbols-outlined text-red-500 text-[16px]">error</span>}
                  {item.status === 'uploading' && <span className="text-xs text-primary font-medium">{item.progress}%</span>}
                </div>
                {item.status === 'uploading' && (
                  <div className="w-full bg-slate-200 rounded-full h-1 overflow-hidden">
                    <div className="bg-primary h-1 rounded-full transition-all duration-300" style={{ width: `${item.progress}%` }} />
                  </div>
                )}
                {item.status === 'error' && <p className="text-xs text-red-500 mt-0.5">{item.error}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Viewer modal ─────────────────────────────────────────────── */}
      {viewingFile && (
        <ViewerModal
          fileId={viewingFile.id}
          filename={viewingFile.name}
          fileSize={viewingFile.size}
          onClose={() => setViewingFile(null)}
        />
      )}

      {/* ── Version history panel ────────────────────────────────────── */}
      {versionFile && (
        <VersionHistory
          fileId={versionFile.id}
          filename={versionFile.name}
          onClose={() => setVersionFile(null)}
          onView={() => {}}
          onRestored={() => { fetchFiles(); setVersionFile(null); }}
        />
      )}

      {shareModalFileId && (
        <ShareModal
          fileId={shareModalFileId}
          onClose={() => setShareModalFileId(null)}
        />
      )}

      {/* ── New Folder Modal ────────────────────────────────────────── */}
      {isNewFolderModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">New Folder</h2>
              <button onClick={() => setIsNewFolderModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50 transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-6">
              <input
                type="text"
                autoFocus
                placeholder="Folder name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleCreateFolder(); }}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm transition-all"
              />
              <div className="mt-6 flex gap-3">
                <button onClick={() => setIsNewFolderModalOpen(false)} className="flex-1 bg-slate-100 text-slate-700 font-bold py-2.5 rounded-xl hover:bg-slate-200 transition-colors">Cancel</button>
                <button onClick={handleCreateFolder} className="flex-1 bg-primary text-white font-bold py-2.5 rounded-xl hover:bg-blue-700 transition-colors">Create</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
