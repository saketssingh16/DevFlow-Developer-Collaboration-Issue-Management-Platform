import React, { useEffect, useState } from 'react';
import { apiClient } from '../lib/apiClient';
import { Bell, CheckCheck, Check, Clock } from 'lucide-react';
import { getSocket } from '../lib/socketClient';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  link?: string | null;
  createdAt: string;
}

export function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      const [listRes, countRes] = await Promise.all([
        apiClient.get('/notifications'),
        apiClient.get('/notifications/unread-count')
      ]);
      setNotifications(listRes.data.data);
      setUnreadCount(countRes.data.data.unreadCount);
    } catch {
      // silently handle
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();

    const socket = getSocket();
    if (socket) {
      socket.on('notification.created', (newNotif: NotificationItem) => {
        setNotifications((prev) => [newNotif, ...prev]);
        setUnreadCount((c) => c + 1);
      });

      // Refetch authoritative server state on socket reconnect
      socket.on('connect', () => {
        fetchNotifications();
      });
    }

    return () => {
      if (socket) {
        socket.off('notification.created');
      }
    };
  }, []);

  const markAsRead = async (id: string) => {
    try {
      await apiClient.patch(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      // ignore
    }
  };

  const markAllRead = async () => {
    try {
      await apiClient.post('/notifications/mark-all-read');
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {
      // ignore
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8 max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Bell className="w-8 h-8 text-indigo-400" />
            Notifications
          </h1>
          <p className="text-slate-400 text-sm mt-1">Real-time alerts and activity updates</p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition"
          >
            <CheckCheck className="w-4 h-4 text-emerald-400" />
            Mark all as read ({unreadCount})
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center text-slate-400 text-sm py-12">Loading notifications...</div>
      ) : notifications.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center space-y-3">
          <Bell className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-lg font-medium text-white">No notifications</h3>
          <p className="text-slate-400 text-sm">You are all caught up! New issue activity will appear here in real time.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`p-4 rounded-xl border transition flex items-start justify-between gap-4 ${
                n.read
                  ? 'bg-slate-900/50 border-slate-800/80 text-slate-400'
                  : 'bg-slate-900 border-indigo-500/30 text-slate-100 shadow-lg ring-1 ring-indigo-500/10'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  {!n.read && <span className="w-2 h-2 rounded-full bg-indigo-500"></span>}
                  <h4 className="font-semibold text-sm text-white">{n.title}</h4>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">{n.message}</p>
                <div className="flex items-center gap-2 text-[11px] text-slate-500 pt-1">
                  <Clock className="w-3 h-3" />
                  {new Date(n.createdAt).toLocaleString()}
                </div>
              </div>

              {!n.read && (
                <button
                  onClick={() => markAsRead(n.id)}
                  className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded transition"
                  title="Mark as read"
                >
                  <Check className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default NotificationsPage;
