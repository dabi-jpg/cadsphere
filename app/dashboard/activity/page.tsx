"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

const ACTION_ICONS: Record<string, string> = {
  UPLOAD: "upload_file",
  DELETE: "delete",
  DOWNLOAD: "download",
  VIEW: "visibility",
  SHARE: "ios_share",
  RESTORE_VERSION: "history",
  CREATE_FOLDER: "create_new_folder",
  DELETE_FOLDER: "folder_delete",
  MOVE_FILE: "drive_file_move",
  BULK_DELETE: "delete_sweep",
  TAG_UPDATE: "local_offer",
};

const ACTION_COLORS: Record<string, string> = {
  UPLOAD: "text-emerald-500 bg-emerald-50",
  DELETE: "text-red-500 bg-red-50",
  DOWNLOAD: "text-blue-500 bg-blue-50",
  VIEW: "text-indigo-500 bg-indigo-50",
  SHARE: "text-purple-500 bg-purple-50",
  RESTORE_VERSION: "text-amber-500 bg-amber-50",
  CREATE_FOLDER: "text-cyan-500 bg-cyan-50",
  DELETE_FOLDER: "text-red-500 bg-red-50",
  MOVE_FILE: "text-orange-500 bg-orange-50",
  BULK_DELETE: "text-red-500 bg-red-50",
  TAG_UPDATE: "text-teal-500 bg-teal-50",
};

const ACTION_LABELS: Record<string, string> = {
  UPLOAD: "Uploaded file",
  DELETE: "Deleted file",
  DOWNLOAD: "Downloaded file",
  VIEW: "Viewed file",
  SHARE: "Shared file",
  RESTORE_VERSION: "Restored version",
  CREATE_FOLDER: "Created folder",
  DELETE_FOLDER: "Deleted folder",
  MOVE_FILE: "Moved file",
  BULK_DELETE: "Bulk deleted files",
  TAG_UPDATE: "Updated tags",
};

interface AuditEntry {
  id: string;
  action: string;
  file_id: string | null;
  filename: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export default function ActivityPage() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/audit?page=${p}&limit=20`);
      const data = await res.json();
      if (data.success) {
        setLogs(data.data.logs);
        setTotalPages(data.data.pagination.total_pages);
      }
    } catch {
      console.error("Failed to fetch audit logs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { 
    fetchLogs(page); 
    
    const supabase = createSupabaseBrowserClient();
    const channel = supabase.channel('activity-logs-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'audit_logs' }, () => {
        if (page === 1) fetchLogs(1); // Auto-refresh only when on the first page
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [page, fetchLogs]);

  const formatDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleString("en-US", {
      month: "short", day: "numeric", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  };

  return (
    <div className="flex-1 flex overflow-hidden bg-slate-50">
      <div className="flex-1 flex flex-col min-w-0">
        <header className="px-8 py-6 bg-white border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-3 mb-1">
            <Link href="/dashboard" className="text-slate-400 hover:text-primary transition text-sm">
              ← Dashboard
            </Link>
          </div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-900">
            <span className="material-symbols-outlined text-primary text-3xl">analytics</span>
            Activity Log
          </h1>
          <p className="text-sm text-slate-500 mt-1">Track all actions performed across your CAD Vault.</p>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full max-w-5xl mx-auto">
            <div className="overflow-auto flex-1">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 z-10 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="p-4 pl-6">Action</th>
                    <th className="p-4">File / Resource</th>
                    <th className="p-4">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {loading && logs.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="p-8 text-center text-slate-400">Loading activity...</td>
                    </tr>
                  ) : logs.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="p-8 text-center text-slate-400">No activity recorded yet.</td>
                    </tr>
                  ) : (
                    logs.map((log) => {
                      const icon = ACTION_ICONS[log.action] || "history";
                      const colorClass = ACTION_COLORS[log.action] || "text-slate-500 bg-slate-100";
                      
                      return (
                        <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-4 pl-6">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${colorClass}`}>
                              <span className="material-symbols-outlined text-[14px]">{icon}</span>
                              {ACTION_LABELS[log.action] || log.action}
                            </span>
                          </td>
                          <td className="p-4 font-medium text-slate-700 truncate max-w-[300px]">
                            {log.filename || "—"}
                          </td>
                          <td className="p-4 text-slate-500 text-sm whitespace-nowrap">
                            {formatDate(log.created_at)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="p-4 border-t border-slate-200 flex items-center justify-between bg-white shrink-0">
                <p className="text-sm text-slate-500 font-medium">
                  Page {page} of {totalPages}
                </p>
                <div className="flex gap-2">
                  <button 
                    disabled={page === 1}
                    onClick={() => setPage(p => p - 1)}
                    className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 font-semibold hover:bg-slate-50 transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[18px]">chevron_left</span> Previous
                  </button>
                  <button 
                    disabled={page === totalPages}
                    onClick={() => setPage(p => p + 1)}
                    className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 font-semibold hover:bg-slate-50 transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    Next <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
