import { getSocket } from './socket';
import type { Notification } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

// Event emitter for notification count updates
type NotificationUpdateListener = () => void;
const notificationUpdateListeners = new Set<NotificationUpdateListener>();

/**
 * Subscribe to notification updates (new, read, deleted)
 */
export function onNotificationUpdate(listener: NotificationUpdateListener) {
  notificationUpdateListeners.add(listener);
  return () => {
    notificationUpdateListeners.delete(listener);
  };
}

/**
 * Trigger all notification update listeners
 */
function triggerNotificationUpdate() {
  notificationUpdateListeners.forEach(listener => listener());
}

/**
 * Fetch all notifications for the current user
 */
export async function getNotifications(): Promise<Notification[]> {
  try {
    const response = await fetch(`${API_URL}/api/notifications`, {
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch notifications');
    }

    const data = await response.json();
    return data.notifications || [];
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }
}

/**
 * Mark a notification as read (or all notifications if no ID provided)
 */
export async function markNotificationAsRead(notificationId?: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/api/notifications/mark-read`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ notificationId }),
    });

    if (response.ok) {
      triggerNotificationUpdate();
    }
    return response.ok;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return false;
  }
}

/**
 * Delete a specific notification
 */
export async function deleteNotification(notificationId: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/api/notifications/${notificationId}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    if (response.ok) {
      triggerNotificationUpdate();
    }
    return response.ok;
  } catch (error) {
    console.error('Error deleting notification:', error);
    return false;
  }
}

/**
 * Subscribe to real-time notification events
 */
export function subscribeToNotifications(
  onNotification: (notification: Notification) => void
) {
  const socket = getSocket();

  const handler = (data: Notification) => {
    onNotification(data);
    triggerNotificationUpdate();
  };

  socket.on('notification', handler);

  return () => {
    socket.off('notification', handler);
  };
}

/**
 * Get count of unread notifications
 */
export async function getUnreadNotificationCount(): Promise<number> {
  const notifications = await getNotifications();
  return notifications.filter(n => !n.read).length;
}
