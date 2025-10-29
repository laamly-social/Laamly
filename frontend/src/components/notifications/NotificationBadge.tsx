import { useEffect, useState } from 'react';
import { getUnreadNotificationCount, subscribeToNotifications, onNotificationUpdate } from '../../utils/notifications';

export default function NotificationBadge() {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
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

  if (unreadCount === 0) return null;

  return (
    <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-500 rounded-full min-w-[1.25rem]">
      {unreadCount > 99 ? '99+' : unreadCount}
    </span>
  );
}
