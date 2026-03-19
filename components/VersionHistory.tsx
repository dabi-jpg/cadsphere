/**
 * Version History side panel component.
 * Shows all versions of a file with View and Restore buttons.
 */
"use client";

import { useState, useEffect, useCallback } from "react";
import { X, RotateCcw, Eye, Loader2 } from "lucide-react";

interface Version {
  id: string;
  version_number: number;
  size: number;
  note: string | null;
  uploaded_at: string;
}

interface VersionHistoryProps {
  fileId: string;
  filename: string;
  onClose: () => void;
  onView: (versionId: string) => void;
  onRestored: () => void;
}

export default function VersionHistory({ fileId, filename, onClose, onView, onRestored }: VersionHistoryProps) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState<string | null>(null);

  const fetchVersions = useCallback(async () => {
    try {
      const res = await fetch(`/api/files/${fileId}/versions`);
      const data = await res.json();
      if (data.success) setVersions(data.data.versions);
    } catch {
      console.error("Failed to fetch versions");
    } finally {
      setLoading(false);
    }
  }, [fileId]);

  useEffect(() => { fetchVersions(); }, [fetchVersions]);

  const handleRestore = async (versionId: string) => {
    setRestoring(versionId);
    try {
      const res = await fetch(`/api/files/${fileId}/versions/${versionId}/restore`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        onRestored();
        fetchVersions();
      }
    } catch {
      console.error("Restore failed");
    } finally {
      setRestoring(null);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="fixed right-0 top-0 h-full w-full max-w-md z-50 bg-[#0A0A0A] border-l border-white/10 shadow-2xl flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-white truncate">Version History</h3>
          <p className="text-xs text-white/40 truncate">{filename}</p>
        </div>
        <button onClick={onClose} className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-full transition">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
          </div>
        ) : versions.length === 0 ? (
          <p className="text-white/40 text-sm text-center py-12">No version history available</p>
        ) : (
          versions.map((v, i) => (
            <div key={v.id} className={`border rounded-lg p-3 ${i === 0 ? "border-indigo-500/30 bg-indigo-500/5" : "border-white/10 bg-white/5"}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-white">
                  v{v.version_number}
                  {i === 0 && <span className="text-xs text-indigo-400 ml-2">(current)</span>}
                </span>
                <span className="text-xs text-white/40">{formatSize(v.size)}</span>
              </div>
              {v.note && <p className="text-xs text-white/50 mb-2">{v.note}</p>}
              <p className="text-xs text-white/30 mb-2">{formatDate(v.uploaded_at)}</p>
              <div className="flex gap-2">
                <button onClick={() => onView(v.id)} className="text-xs px-2 py-1 rounded bg-white/10 text-white/60 hover:text-white hover:bg-white/20 transition flex items-center gap-1">
                  <Eye className="w-3 h-3" /> View
                </button>
                {i !== 0 && (
                  <button
                    onClick={() => handleRestore(v.id)}
                    disabled={restoring === v.id}
                    className="text-xs px-2 py-1 rounded bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition flex items-center gap-1 disabled:opacity-50"
                  >
                    {restoring === v.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                    Restore
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
