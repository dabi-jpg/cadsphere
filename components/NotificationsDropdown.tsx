import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export default function NotificationsDropdown({ onShareResolved }: { onShareResolved: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch {
      // ignore silently to not bombard user
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleAction = async (shareId: string, action: "ACCEPT" | "REJECT") => {
    try {
      const res = await fetch(`/api/notifications/${shareId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        toast.success(action === "ACCEPT" ? "File shared accepted" : "Share rejected");
        setNotifications((prev) => prev.filter((n) => n.id !== shareId));
        if (action === "ACCEPT") onShareResolved();
      } else {
        toast.error("Failed to process action");
      }
    } catch {
      toast.error("Network error");
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => { setIsOpen(!isOpen); if (!isOpen) fetchNotifications(); }}
        className="text-slate-500 hover:bg-slate-100 p-2 rounded-full relative transition-colors"
      >
        <span className="material-symbols-outlined">notifications</span>
        {notifications.length > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 rounded-xl shadow-xl bg-white ring-1 ring-black ring-opacity-5 z-50 animate-in fade-in slide-in-from-top-2 overflow-hidden flex flex-col max-h-[70vh]">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <h3 className="text-sm font-bold text-slate-900">Notifications</h3>
            {notifications.length > 0 && (
              <span className="bg-primary/10 text-primary text-xs font-bold px-2 py-0.5 rounded-full">
                {notifications.length} New
              </span>
            )}
          </div>
          <div className="overflow-y-auto flex-1 p-2 space-y-1">
            {loading && notifications.length === 0 ? (
              <p className="text-center text-xs text-slate-500 py-6">Loading...</p>
            ) : notifications.length > 0 ? (
              notifications.map((n) => (
                <div key={n.id} className="p-3 rounded-lg hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[18px]">folder_shared</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-slate-800 leading-snug">
                        <span className="font-bold">{n.sharedBy?.name || n.sharedBy?.email || "Someone"}</span> wants to share <span className="font-bold">"{n.file?.filename}"</span> with you.
                      </p>
                      <p className="text-xs text-slate-500 mt-1">{formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}</p>
                      
                      <div className="flex items-center gap-2 mt-3">
                        <button 
                          onClick={() => handleAction(n.id, "ACCEPT")}
                          className="flex-1 bg-primary text-white text-xs font-bold py-1.5 rounded-md hover:bg-blue-700 transition-colors"
                        >
                          Accept
                        </button>
                        <button 
                          onClick={() => handleAction(n.id, "REJECT")}
                          className="flex-1 bg-slate-100 text-slate-700 text-xs font-bold py-1.5 rounded-md hover:bg-slate-200 transition-colors"
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <span className="material-symbols-outlined text-3xl text-slate-300 mb-2">notifications_off</span>
                <p className="text-sm text-slate-500">You're all caught up!</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
