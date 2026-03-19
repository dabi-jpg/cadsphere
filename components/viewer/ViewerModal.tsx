/**
 * ViewerModal — Fullscreen modal wrapper for the CAD viewer.
 *
 * Opens when the user clicks "View" on any file in the dashboard.
 * Fetches a fresh signed URL on open and passes it to CADViewer.
 *
 * Features:
 * - Fresh signed URL fetch on every open
 * - Filename + file size in header
 * - Close button + Escape key handler
 * - Responsive: full-screen on mobile, 90vh max on desktop
 */
"use client";

import React, { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { X, Loader2, AlertCircle } from "lucide-react";

const CADViewer = dynamic(() => import("./CADViewer"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center w-full h-full bg-[#030303]">
      <div className="flex flex-col items-center gap-4 text-center">
        <Loader2 className="w-10 h-10 text-indigo-400 animate-spin" />
        <p className="text-white/60 font-medium">Loading CAD Engine...</p>
      </div>
    </div>
  ),
});

interface ViewerModalProps {
  fileId: string;
  filename: string;
  fileSize?: number;
  onClose: () => void;
}

/** Format bytes into human-readable size */
function formatSize(bytes?: number): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/** Extract file extension including dot */
function getExtension(filename: string): string {
  const lastDot = filename.lastIndexOf(".");
  if (lastDot === -1) return "";
  return filename.slice(lastDot).toLowerCase();
}

export default function ViewerModal({
  fileId,
  filename,
  fileSize,
  onClose,
}: ViewerModalProps) {
  const [url, setUrl] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [urlLoading, setUrlLoading] = useState(true);

  const ext = getExtension(filename);

  // ─── Fetch fresh signed URL ─────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function fetchUrl() {
      try {
        setUrlLoading(true);
        setError("");

        const res = await fetch(`/api/files/${fileId}/url`);
        const data = await res.json();

        if (cancelled) return;

        const resolvedUrl = data.url ?? data.data?.url ?? data.data?.signed_url ?? data.signed_url;

        if (resolvedUrl) {
          setUrl(resolvedUrl);
        } else {
          console.error('URL API response shape:', data);
          setError(data.error || "Failed to load file access URL");
        }
      } catch {
        if (!cancelled) {
          setError("Network error fetching file access URL");
        }
      } finally {
        if (!cancelled) setUrlLoading(false);
      }
    }

    fetchUrl();
    return () => {
      cancelled = true;
    };
  }, [fileId]);

  // ─── Escape key handler ─────────────────────────────────────────────
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  // ─── Download handler ───────────────────────────────────────────────
  const handleDownload = useCallback(() => {
    if (url) {
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.target = "_blank";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  }, [url, filename]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4 md:p-8"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-[#030303] border border-white/10 w-full h-full sm:max-w-7xl sm:max-h-[90vh] sm:rounded-2xl flex flex-col overflow-hidden shadow-2xl relative">
        {/* Header */}
        <div className="flex items-center justify-between p-3 sm:p-4 border-b border-white/10 bg-[#0A0A0A] shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="min-w-0">
              <h2 className="text-sm sm:text-lg font-semibold text-white truncate">
                {filename}
              </h2>
              {fileSize && (
                <p className="text-xs text-white/40 mt-0.5">
                  {formatSize(fileSize)} • {ext.toUpperCase().replace(".", "")}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-colors shrink-0"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewer content */}
        <div className="flex-1 relative bg-black min-h-0">
          {error ? (
            <div className="flex items-center justify-center w-full h-full">
              <div className="text-center p-8 max-w-sm border border-red-500/20 bg-red-500/10 rounded-xl">
                <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-3" />
                <p className="text-red-400 mb-2 font-medium">
                  Unable to load file
                </p>
                <p className="text-white/60 text-sm">{error}</p>
              </div>
            </div>
          ) : urlLoading ? (
            <div className="flex items-center justify-center w-full h-full">
              <div className="flex flex-col items-center gap-4 text-center">
                <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                <p className="text-white/60 font-medium">
                  Securing file access...
                </p>
              </div>
            </div>
          ) : (
            <CADViewer
              fileUrl={url}
              filetype={ext}
              filename={filename}
              onDownload={handleDownload}
            />
          )}
        </div>
      </div>
    </div>
  );
}
