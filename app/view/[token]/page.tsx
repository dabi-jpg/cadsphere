/**
 * Public viewer page — accessible without login via a share token.
 * Validates the token against the ShareLink table and renders the CAD viewer.
 */
"use client";

import { useEffect, useState, use } from "react";
import dynamic from "next/dynamic";
import { Loader2, AlertCircle } from "lucide-react";
import Link from "next/link";

const CADViewer = dynamic(() => import("@/components/viewer/CADViewer"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center w-full h-full bg-[#030303]">
      <Loader2 className="w-10 h-10 text-indigo-400 animate-spin" />
    </div>
  ),
});

export default function PublicViewerPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const [url, setUrl] = useState("");
  const [filename, setFilename] = useState("");
  const [filetype, setFiletype] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function validateToken() {
      try {
        const res = await fetch(`/api/share/${token}`);
        const data = await res.json();
        if (data.success) {
          setUrl(data.data.signed_url);
          setFilename(data.data.filename);
          setFiletype(data.data.filetype);
        } else {
          setError(data.error || "Invalid or expired share link");
        }
      } catch {
        setError("Failed to load shared file");
      } finally {
        setLoading(false);
      }
    }
    validateToken();
  }, [token]);

  return (
    <main className="min-h-screen bg-[#030303] text-white flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-white/10 bg-[#0A0A0A]">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-sm text-white/40 hover:text-white transition">
            CADSphere
          </Link>
          {filename && (
            <h2 className="text-lg font-semibold truncate max-w-md">{filename}</h2>
          )}
        </div>
        <span className="text-xs text-white/30">Shared view</span>
      </div>

      <div className="flex-1 relative">
        {loading ? (
          <div className="flex items-center justify-center w-full h-full min-h-[60vh]">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
              <p className="text-white/60">Validating share link...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center w-full h-full min-h-[60vh]">
            <div className="text-center p-8 max-w-sm border border-red-500/20 bg-red-500/10 rounded-xl">
              <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-3" />
              <p className="text-red-400 mb-2 font-medium">Link unavailable</p>
              <p className="text-white/60 text-sm">{error}</p>
            </div>
          </div>
        ) : (
          <div className="h-[calc(100vh-65px)]">
            <CADViewer fileUrl={url} filetype={filetype} filename={filename} />
          </div>
        )}
      </div>
    </main>
  );
}
