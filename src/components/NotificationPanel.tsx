import { useState, useEffect, useRef } from "react";
import { loadNotifications, markAllRead, type Notification } from "@/data/notificationStore";

interface Props {
  onNavigateToClient?: (clientId: string) => void;
}

export default function NotificationPanel({ onNavigateToClient }: Props) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>(loadNotifications);
  const panelRef = useRef<HTMLDivElement>(null);

  const unread = notifications.filter((n) => !n.read).length;

  // Poll for new notifications every 2s
  useEffect(() => {
    const interval = setInterval(() => {
      setNotifications(loadNotifications());
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleOpen = () => {
    setOpen(!open);
    if (!open && unread > 0) {
      markAllRead();
      setTimeout(() => setNotifications(loadNotifications()), 100);
    }
  };

  const timeAgo = (ts: string) => {
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "agora";
    if (mins < 60) return `${mins}min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
  };

  const iconFor = (type: string) => {
    if (type === "submission") return "✅";
    if (type === "upload") return "📄";
    return "🏷️";
  };

  return (
    <div ref={panelRef} className="relative">
      <button
        onClick={handleOpen}
        className="relative w-10 h-10 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
        aria-label="Notificações"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-cf-red text-white text-[10px] font-bold flex items-center justify-center px-1 animate-pulse">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-80 max-h-96 rounded-xl border border-border/60 shadow-2xl overflow-hidden z-50 bg-card"
        >
          <div className="px-4 py-3 border-b border-border/40 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Notificações</h3>
            {notifications.length > 0 && (
              <span className="text-[10px] text-muted-foreground">{notifications.length} total</span>
            )}
          </div>

          <div className="overflow-y-auto max-h-72">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-muted-foreground text-sm">Nenhuma notificação</p>
              </div>
            ) : (
              notifications.slice(0, 20).map((n) => (
                <button
                  key={n.id}
                  onClick={() => {
                    if (onNavigateToClient) onNavigateToClient(n.clientId);
                    setOpen(false);
                  }}
                  className={`w-full px-4 py-3 text-left flex gap-3 items-start hover:bg-secondary/30 transition-colors border-b border-border/20 ${
                    !n.read ? "bg-primary/5" : ""
                  }`}
                >
                  <span className="text-lg mt-0.5 shrink-0">{iconFor(n.type)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{n.clientName}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0 mt-1">{timeAgo(n.timestamp)}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
