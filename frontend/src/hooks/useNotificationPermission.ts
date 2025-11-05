import { useState, useEffect } from 'react';
import { 
  shouldShowNotificationPrompt, 
  getNotificationPermission,
  isNotificationSupported,
  type NotificationPermission 
} from '../utils/browserNotifications';

/**
 * Hook to manage notification permission state and prompt visibility
 */
export function useNotificationPermission() {
  const [permission, setPermission] = useState<NotificationPermission>(
    getNotificationPermission()
  );
  const [shouldShowPrompt, setShouldShowPrompt] = useState(false);

  useEffect(() => {
    // Check if we should show the prompt after a brief delay
    // This gives users time to explore the app first
    const timer = setTimeout(() => {
      if (shouldShowNotificationPrompt()) {
        setShouldShowPrompt(true);
      }
    }, 5000); // Show prompt after 5 seconds

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Listen for permission changes
    if (!isNotificationSupported()) return;

    const checkPermission = () => {
      const currentPermission = getNotificationPermission();
      setPermission(currentPermission);
      
      // Hide prompt if permission is no longer 'default'
      if (currentPermission !== 'default') {
        setShouldShowPrompt(false);
      }
    };

    // Check periodically for permission changes
    const interval = setInterval(checkPermission, 1000);

    return () => clearInterval(interval);
  }, []);

  const hidePrompt = () => {
    setShouldShowPrompt(false);
  };

  const showPromptManually = () => {
    if (permission === 'default') {
      setShouldShowPrompt(true);
    }
  };

  return {
    permission,
    isSupported: isNotificationSupported(),
    shouldShowPrompt,
    hidePrompt,
    showPromptManually,
  };
}
