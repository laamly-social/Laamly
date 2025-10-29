import { useEffect, useState } from 'react';
import { getUnreadNotificationCount, subscribeToNotifications, onNotificationUpdate } from '../../utils/notifications';

interface NotificationBellProps {
  onClick?: () => void;
  className?: string;
}

export default function NotificationBell({ onClick, className = "" }: NotificationBellProps) {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Load initial count
    loadUnreadCount();

    // Subscribe to socket notifications
    const unsubscribeSocket = subscribeToNotifications(() => {
      loadUnreadCount();
    });

    // Subscribe to local notification updates (mark read/delete)
    const unsubscribeUpdates = onNotificationUpdate(() => {
      loadUnreadCount();
    });

    return () => {
      unsubscribeSocket();
      unsubscribeUpdates();
    };
  }, []);

  async function loadUnreadCount() {
    const count = await getUnreadNotificationCount();
    setUnreadCount(count);
  }

  return (
    <div
      onClick={onClick}
      className={`relative ${className}`}
    >
      <svg
        className="w-6 h-6"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
        />
      </svg>
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white bg-red-500 rounded-full min-w-[1.25rem]">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </div>
  );
}
