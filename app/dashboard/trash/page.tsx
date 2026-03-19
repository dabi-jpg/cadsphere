"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { format } from "date-fns";

interface TrashItem {
  id: string;
  filename: string;
  size: number;
  deletedAt: string;
  originalLocation: string;
  daysLeft: number;
}

export default function TrashPage() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deletedItems, setDeletedItems] = useState<TrashItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchTrash = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/trash');
      const raw = await res.json();
      const list = raw.files ?? raw.data?.files ?? (Array.isArray(raw) ? raw : raw.data ?? []);
      if (list) {
        setDeletedItems(list.map((item: any) => ({
          id: item.id,
          filename: item.filename,
          size: item.size,
          deletedAt: item.deletedAt,
          originalLocation: item.folder?.name || item.originalLocation || "Your Projects",
          daysLeft: item.daysLeft ?? Math.max(0, 30 - Math.floor((Date.now() - new Date(item.deletedAt).getTime()) / (1000 * 60 * 60 * 24)))
        })));
      }
    } catch {
      toast.error('Failed to load trash items');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTrash(); }, [fetchTrash]);

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedIds(newSelected);
  };

  const handleRestore = async (id: string, name: string) => {
    try {
      const res = await fetch(`/api/trash/${id}/restore`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        toast.success(`Restored "${name}"`);
        setSelectedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
        await fetchTrash();
      } else {
        toast.error(data.error || "Failed to restore file");
      }
    } catch {
      toast.error("Network error during restore");
    }
  };

  const handleDeletePermanently = (id: string, name: string) => {
    toast(`Permanently delete "${name}"?`, {
      action: {
        label: "Delete",
        onClick: async () => {
          try {
            const res = await fetch(`/api/trash/${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
              toast.success(`Deleted "${name}" permanently.`);
              setSelectedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
              await fetchTrash();
            } else {
              toast.error(data.error || "Failed to delete file");
            }
          } catch {
            toast.error("Network error during deletion");
          }
        }
      }
    });
  };

  const handleEmptyTrash = () => {
    toast.error("Empty all trash? This action cannot be undone.", {
      action: {
        label: "Empty Trash",
        onClick: async () => {
          try {
            const res = await fetch('/api/trash/empty', { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
              toast.success(`Trash emptied.`);
              setSelectedIds(new Set());
              await fetchTrash();
            } else {
              toast.error(data.error || "Failed to empty trash");
            }
          } catch {
            toast.error("Network error during emptying trash");
          }
        }
      }
    });
  };

  const filteredItems = deletedItems.filter(item => item.filename.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
      
      {/* Header */}
      <header className="px-8 py-6 bg-white border-b border-slate-200 shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span className="material-symbols-outlined text-[18px]">home</span>
            <span>/</span>
            <span className="text-slate-900 font-medium">Trash</span>
          </div>
          <button 
            disabled={deletedItems.length === 0}
            onClick={handleEmptyTrash}
            className="text-sm font-bold text-red-600 hover:text-red-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[18px]">delete_sweep</span> 
            Empty Trash
          </button>
        </div>
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Trash</h1>
            <p className="text-sm text-slate-500 mt-1">Deleted items are stored for 30 days before permanent removal.</p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative w-64 text-sm">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
              <input 
                type="text" 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search trash..." 
                className="w-full pl-10 pr-4 py-2 bg-slate-100 border-none rounded-lg focus:ring-2 focus:ring-primary/20 outline-none"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Info Banner */}
      <div className="mx-8 mt-8 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-4 animate-in fade-in slide-in-from-top-2 duration-500">
        <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center shrink-0 shadow-sm border border-amber-200/50">
          <span className="material-symbols-outlined">schedule</span>
        </div>
        <div>
          <h4 className="text-sm font-bold text-amber-900">Items are stored for 30 days</h4>
          <p className="text-xs text-amber-800/80 mt-0.5">Deleted items will be permanently removed from our servers after 30 days. Restored items will return to their original project folders.</p>
        </div>
      </div>

      {/* Trash Table */}
      <div className="flex-1 overflow-y-auto px-8 py-8">
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-xs text-slate-500 uppercase tracking-widest bg-slate-50/50">
                <th className="font-bold p-4 pl-6 w-12">
                   <div className="w-4 h-4 border border-slate-300 rounded bg-white"></div>
                </th>
                <th className="font-bold p-4">Item Name</th>
                <th className="font-bold p-4">Days Left</th>
                <th className="font-bold p-4">Original Location</th>
                <th className="font-bold p-4">Deleted Date</th>
                <th className="font-bold p-4 text-right pr-6">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">Loading trash items...</td>
                </tr>
              ) : filteredItems.map(item => {
                const isSelected = selectedIds.has(item.id);
                return (
                  <tr 
                    key={item.id}
                    onClick={() => toggleSelect(item.id)}
                    className={`group cursor-pointer transition-colors ${isSelected ? "bg-primary/5 border-l-2 border-l-primary" : "hover:bg-slate-50 border-l-2 border-l-transparent"}`}
                  >
                    <td className="p-4 pl-6">
                      <div className={`w-4 h-4 border rounded transition-all ${isSelected ? "bg-primary border-primary" : "border-slate-300 bg-white"}`}>
                        {isSelected && <span className="material-symbols-outlined text-white text-[12px] block text-center mt-[-1px]">check</span>}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-slate-400 group-hover:text-primary transition-colors">description</span>
                        <div className="min-w-0">
                          <p className="font-bold text-sm text-slate-800 truncate">{item.filename}</p>
                          <p className="text-xs text-slate-500 mt-0.5 font-medium uppercase tracking-wider">{formatFileSize(item.size)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-full max-w-[80px] h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${item.daysLeft < 5 ? "bg-red-500" : item.daysLeft < 15 ? "bg-amber-500" : "bg-primary"}`} style={{ width: `${(item.daysLeft / 30) * 100}%` }}></div>
                        </div>
                        <span className={`text-[11px] font-bold ${item.daysLeft < 5 ? "text-red-600" : "text-slate-600"}`}>{item.daysLeft}d</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-widest">
                        <span className="material-symbols-outlined text-[16px]">folder</span>
                        {item.originalLocation}
                      </div>
                    </td>
                    <td className="p-4 text-xs font-medium text-slate-500 uppercase tracking-widest">
                      {format(new Date(item.deletedAt), 'MMM d, yyyy')}
                    </td>
                    <td className="p-4 pr-6 text-right">
                      <div className="flex items-center justify-end gap-2 shrink-0">
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleRestore(item.id, item.filename); }}
                          className="bg-primary/5 text-primary hover:bg-primary hover:text-white border border-primary/20 p-2 rounded-lg transition-all shadow-sm"
                          title="Restore"
                        >
                          <span className="material-symbols-outlined text-[20px] block">restore</span>
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDeletePermanently(item.id, item.filename); }}
                          className="bg-red-50 text-red-600 hover:bg-red-600 hover:text-white border border-red-200 p-2 rounded-lg transition-all shadow-sm"
                          title="Delete Permanently"
                        >
                          <span className="material-symbols-outlined text-[20px] block">delete_forever</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          
          {!loading && deletedItems.length === 0 && (
            <div className="p-20 flex flex-col items-center justify-center text-center">
               <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6 text-slate-200 border border-slate-100">
                 <span className="material-symbols-outlined text-5xl">delete_outline</span>
               </div>
               <h3 className="text-xl font-bold text-slate-800 mb-2">Trash is empty</h3>
               <p className="text-sm text-slate-500 max-w-sm">Items moved to trash will appear here for 30 days before being permanently deleted.</p>
            </div>
          )}
        </div>
        
        <p className="text-center text-xs text-slate-400 mt-12 font-bold uppercase tracking-[0.2em]">Showing {filteredItems.length} deleted items</p>
      </div>

    </div>
  );
}
