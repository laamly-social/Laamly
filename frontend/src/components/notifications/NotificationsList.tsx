import { useEffect, useState } from 'react';
import {
  getNotifications,
  markNotificationAsRead,
  deleteNotification,
  subscribeToNotifications
} from '../../utils/notifications';
import { getNotificationPermission, isNotificationSupported } from '../../utils/browserNotifications';
import type { Notification } from '../../types';
import Avatar from '../ui/Avatar';
import { useNavigate } from 'react-router-dom';
import { NotificationWarningBanner } from './NotificationWarningBanner';

export function NotificationsList() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWarning, setShowWarning] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if we should show the warning banner
    const permission = getNotificationPermission();
    const supported = isNotificationSupported();
    
    // Show warning if notifications are supported but not granted
    setShowWarning(supported && permission !== 'granted');

    // Load notifications
    loadNotifications();

    // Subscribe to real-time notifications
    const unsubscribe = subscribeToNotifications((notification) => {
      setNotifications(prev => [notification, ...prev]);

      // Optional: Show browser notification if permitted
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(notification.fromName, {
          body: notification.message,
          icon: notification.fromAvatar,
        });
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  async function loadNotifications() {
    setLoading(true);
    const data = await getNotifications();
    setNotifications(data);
    setLoading(false);
  }

  async function handleMarkAsRead(notificationId?: string) {
    await markNotificationAsRead(notificationId);
    if (notificationId) {
      setNotifications(prev =>
        prev.map(n => (n.id === notificationId ? { ...n, read: true } : n))
      );
    } else {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    }
  }

  async function handleDelete(notificationId: string) {
    await deleteNotification(notificationId);
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  }

  function handleNotificationClick(notification: Notification) {
    // Mark as read
    if (!notification.read) {
      handleMarkAsRead(notification.id);
    }

    // Navigate to the relevant content
    switch (notification.contentType) {
      case 'post':
      case 'comment': // Comments are on posts, so navigate to the post
        navigate(`/post/${notification.contentId}`);
        break;
      case 'reel':
        navigate(`/reel/${notification.contentId}`);
        break;
      case 'message':
        navigate(`/messages?thread=${notification.contentId}`);
        break;
      default:
        break;
    }
  }

  function getNotificationIcon(type: Notification['type']) {
    switch (type) {
      case 'like':
        return '❤️';
      case 'comment':
      case 'reply':
        return '💬';
      case 'message':
        return '✉️';
      default:
        return '🔔';
    }
  }

  function formatTimestamp(ts: number) {
    const now = Date.now();
    const diff = now - ts;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(ts).toLocaleDateString();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">Loading notifications...</div>
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-gray-500">
        <div className="text-4xl mb-2">🔔</div>
        <div>No notifications yet</div>
      </div>
    );
  }

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="flex flex-col h-full">
      {/* Warning banner for disabled notifications */}
      {showWarning && (
        <NotificationWarningBanner 
          onDismiss={() => {
            setShowWarning(false);
            // Recheck permission in case user enabled it
            const permission = getNotificationPermission();
            if (permission === 'granted') {
              setShowWarning(false);
            }
          }}
        />
      )}

      {/* Header */}
      <div className="p-4 border-b border-muted dark:border-muted-dark flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold">Notifications</h2>
          {unreadCount > 0 && (
            <span className="bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => handleMarkAsRead()}
            className="text-sm text-blue-500 hover:text-blue-600"
          >
            Mark all as read
          </button>
        )}
      </div>

      {/* Notifications list */}
      <div className="flex-1 overflow-y-auto">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            onClick={() => handleNotificationClick(notification)}
            className={`
              p-4 py-6 bg-muted dark:bg-muted-dark 
              cursor-pointer hover:border-l-8 hover:border-accent
              transition-all flex items-start gap-3
              ${!notification.read ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
            `}
          >
            {/* Avatar */}
            <Avatar
              src={notification.fromAvatar}
              alt={notification.fromName}
              size="md"
            />

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-2">
                <span className="text-lg">{getNotificationIcon(notification.type)}</span>
                <div className="flex-1">
                  <p className="text-sm text-gray-900 dark:text-gray-100">
                    {notification.message}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatTimestamp(notification.createdAt)}
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="grid grid-rows-2">
              {!notification.read && (
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMarkAsRead(notification.id);
                  }}
                  className="text-xs bg-blue-400 dark:bg-blue-800 text-white h-[1rem] w-[1rem] rounded-full flex justify-center items-center hover:scale-125 transition"
                  title="Mark as read"
                >
                  ✓
                </span>
              )}
              <br></br>
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(notification.id);
                }}
                className="text-xs bg-red-400 dark:bg-red-800 text-white h-[1rem] w-[1rem] rounded-full flex justify-center items-center hover:scale-125 transition"
                title="Delete"
              >
                ×
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
