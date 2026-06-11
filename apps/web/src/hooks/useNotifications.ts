import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../api/client';
import { useWebSocket } from './useWebSocket';

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  priority: string;
  read: boolean;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await apiClient.get<Notification[]>('/notifications');
      setNotifications(data);
      setUnreadCount(data.filter((n) => !n.read).length);
    } catch {}
  }, []);

  const markAsRead = useCallback(async (id: string) => {
    await apiClient.put(`/notifications/${id}/read`);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    setUnreadCount((c) => Math.max(0, c - 1));
  }, []);

  const markAllAsRead = useCallback(async () => {
    await apiClient.put('/notifications/read-all');
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  }, []);

  useWebSocket(
    useCallback((msg: { type?: string }) => {
      if (msg.type?.startsWith('notification')) {
        fetchNotifications();
      }
    }, [fetchNotifications]),
  );

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  return { notifications, unreadCount, markAsRead, markAllAsRead, refetch: fetchNotifications };
}
