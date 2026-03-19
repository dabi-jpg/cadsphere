import { useState, useEffect } from "react";
import { toast } from "sonner";

interface ShareModalProps {
  fileId: string;
  onClose: () => void;
}

export default function ShareModal({ fileId, onClose }: ShareModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [sharing, setSharing] = useState<string | null>(null);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/users?q=${encodeURIComponent(searchQuery)}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data);
        }
      } catch {
        // ignore search errors
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const handleShare = async (userId: string, userName: string) => {
    setSharing(userId);
    try {
      const res = await fetch(`/api/files/${fileId}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, permission: "VIEWER" }),
      });
      if (res.ok) {
        toast.success(`Shared with ${userName}`);
        onClose();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to share");
      }
    } catch {
      toast.error("Network error while sharing");
    } finally {
      setSharing(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[80vh]">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">Share File</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50 transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-6">
          <div className="relative mb-6">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm transition-all"
            />
          </div>

          <div className="overflow-y-auto max-h-[40vh]">
            {loading ? (
              <p className="text-center text-sm text-slate-500 py-4">Searching...</p>
            ) : results.length > 0 ? (
              <ul className="space-y-2">
                {results.map((user) => (
                  <li key={user.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-primary/30 hover:bg-slate-50 transition-all">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-10 h-10 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center shrink-0 overflow-hidden">
                        {user.avatarUrl ? (
                          <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-sm font-bold text-slate-600">{user.name?.charAt(0).toUpperCase() ?? "U"}</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate">{user.name}</p>
                        <p className="text-xs text-slate-500 truncate">{user.email}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleShare(user.id, user.name || user.email)}
                      disabled={sharing === user.id}
                      className="ml-4 shrink-0 px-4 py-1.5 bg-primary text-white text-xs font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                      {sharing === user.id ? "Sharing..." : "Share"}
                    </button>
                  </li>
                ))}
              </ul>
            ) : searchQuery.trim() !== "" ? (
              <p className="text-center text-sm text-slate-500 py-4">No users found.</p>
            ) : (
              <div className="text-center py-8">
                <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">group</span>
                <p className="text-sm text-slate-500">Search for team members to share this file with.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
