import { useState } from 'react';
import { Bell, X } from 'lucide-react';
import {
  requestNotificationPermission,
  setUserDismissedPrompt
} from '../../utils/browserNotifications';

interface NotificationPromptProps {
  onClose: () => void;
  onEnable: () => void;
}

/**
 * A modal/banner component that prompts users to enable browser notifications
 */
export function NotificationPrompt({ onClose, onEnable }: NotificationPromptProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleEnable = async () => {
    setIsLoading(true);
    try {
      const permission = await requestNotificationPermission();

      if (permission === 'granted') {
        onEnable();
        onClose();
      } else if (permission === 'denied') {
        // User denied permission
        setUserDismissedPrompt(true);
        onClose();
      }
    } catch (error) {
      console.error('Error requesting notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDismiss = () => {
    setUserDismissedPrompt(true);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/10 backdrop-blur-sm">
      <div className="bg-bg dark:bg-bg-dark border-2 border-border dark:border-border-dark rounded-xl max-w-md w-full p-6 relative animate-in fade-in zoom-in duration-200">
        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          aria-label="Close"
        >
          <X size={24} />
        </button>

        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="bg-blue-100 dark:bg-blue-900/30 p-4 rounded-full">
            <Bell size={40} className="text-blue-600 dark:text-blue-400" />
          </div>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-gray-100 mb-2">
          Stay Updated
        </h2>

        {/* Description */}
        <p className="text-center text-sub dark:text-sub-dark mb-6">
          Enable notifications to get instant updates when someone likes your posts,
          comments on your content, or sends you a message.
        </p>

        {/* Benefits list */}
        <ul className="space-y-3 my-8 mx-4">
          <li className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300">
            <span className="text-green-500 mt-0.5">✓</span>
            <span>Get notified about new likes and comments</span>
          </li>
          <li className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300">
            <span className="text-green-500 mt-0.5">✓</span>
            <span>Never miss important messages</span>
          </li>
          <li className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300">
            <span className="text-green-500 mt-0.5">✓</span>
            <span>Stay connected even when the app is closed</span>
          </li>
        </ul>

        {/* Action buttons */}
        <div className="flex flex-col gap-3">
          <button
            onClick={handleEnable}
            disabled={isLoading}
            className="w-full bg-accent hover:scale-105 transition text-white font-semibold py-3 px-4 rounded-xl duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Requesting...' : 'Enable Notifications'}
          </button>

          <button
            onClick={handleDismiss}
            className="w-full text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 font-medium py-2 px-4 rounded-lg transition-colors duration-200 underline"
          >
            Nah
          </button>
        </div>
      </div>
    </div>
  );
}
