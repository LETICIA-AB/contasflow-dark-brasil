// Notification store for accountant alerts

export interface Notification {
  id: string;
  type: "submission" | "classification" | "upload";
  clientId: string;
  clientName: string;
  message: string;
  timestamp: string;
  read: boolean;
}

const NOTIFICATIONS_KEY = "cf-v3-notifications";

export function loadNotifications(): Notification[] {
  const raw = localStorage.getItem(NOTIFICATIONS_KEY);
  return raw ? JSON.parse(raw) : [];
}

export function saveNotifications(notifications: Notification[]) {
  localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications));
}

export function addNotification(n: Omit<Notification, "id" | "timestamp" | "read">) {
  const all = loadNotifications();
  all.unshift({
    ...n,
    id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    read: false,
  });
  // Keep max 50
  if (all.length > 50) all.length = 50;
  saveNotifications(all);
}

export function markAllRead() {
  const all = loadNotifications();
  all.forEach((n) => (n.read = true));
  saveNotifications(all);
}

export function markRead(id: string) {
  const all = loadNotifications();
  const n = all.find((x) => x.id === id);
  if (n) n.read = true;
  saveNotifications(all);
}

export function clearNotifications() {
  localStorage.removeItem(NOTIFICATIONS_KEY);
}

export function unreadCount(): number {
  return loadNotifications().filter((n) => !n.read).length;
}
