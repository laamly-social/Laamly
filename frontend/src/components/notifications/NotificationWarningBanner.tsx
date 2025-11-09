import { Bell, X } from "lucide-react";
import { useState } from "react";
import { requestNotificationPermission } from "../../utils/browserNotifications";

interface NotificationWarningBannerProps {
   onDismiss?: () => void;
}

/**
 * Warning banner that appears when browser notifications are disabled
 * Shows at the top of the notifications panel
 */
export function NotificationWarningBanner({
   onDismiss
}: NotificationWarningBannerProps) {
   const [isLoading, setIsLoading] = useState(false);
   const [isDismissed, setIsDismissed] = useState(false);

   if (isDismissed) return null;

   const handleEnable = async () => {
      setIsLoading(true);
      try {
         const permission = await requestNotificationPermission();

         if (permission === "granted") {
            // Success - banner will disappear on next render via parent component check
            onDismiss?.();
         }
      } catch (error) {
         console.error("Error requesting notifications:", error);
      } finally {
         setIsLoading(false);
      }
   };

   const handleDismiss = () => {
      setIsDismissed(true);
      onDismiss?.();
   };

   return (
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-border dark:border-border-dark p-4 mx-4 mt-4 rounded-lg">
         <div className="flex items-start gap-3">
            {/* Icon */}
            <div className="flex-shrink-0">
               <Bell className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
               <h3 className="text-sm font-semibold text-yellow-800 dark:text-yellow-200 mb-1">
                  Enable Browser Notifications
               </h3>
               <p className="text-xs text-yellow-700 dark:text-yellow-300 mb-2">
                  Get instant alerts for new likes, comments, and messages even
                  when Laamly is closed.
               </p>

               <button
                  onClick={handleEnable}
                  disabled={isLoading}
                  className="text-xs font-medium text-yellow-800 dark:text-yellow-200 bg-yellow-100 dark:bg-yellow-800/40 hover:bg-yellow-200 dark:hover:bg-yellow-800/60 px-3 py-1.5 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  {isLoading ? "Requesting..." : "Enable Now"}
               </button>
            </div>

            {/* Close button */}
            <button
               onClick={handleDismiss}
               className="flex-shrink-0 text-yellow-600 dark:text-yellow-400 hover:text-yellow-800 dark:hover:text-yellow-200 transition-colors"
               aria-label="Dismiss">
               <X className="h-4 w-4" />
            </button>
         </div>
      </div>
   );
}
