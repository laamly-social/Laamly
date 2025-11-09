import { useState } from "react";
import { Bell } from "lucide-react";
import Modal from "../ui/Modal";
import {
   requestNotificationPermission,
   setUserDismissedPrompt
} from "../../utils/browserNotifications";

interface NotificationPromptProps {
   onClose: () => void;
   onEnable: () => void;
}

/**
 * A modal/banner component that prompts users to enable browser notifications
 */
export function NotificationPrompt({
   onClose,
   onEnable
}: NotificationPromptProps) {
   const [isLoading, setIsLoading] = useState(false);

   const handleEnable = async () => {
      setIsLoading(true);
      try {
         const permission = await requestNotificationPermission();

         if (permission === "granted") {
            onEnable();
            onClose();
         } else if (permission === "denied") {
            // User denied permission
            setUserDismissedPrompt(true);
            onClose();
         }
      } catch (error) {
         console.error("Error requesting notifications:", error);
      } finally {
         setIsLoading(false);
      }
   };

   const handleDismiss = () => {
      setUserDismissedPrompt(true);
      onClose();
   };

   return (
      <Modal
         isOpen={true}
         onClose={handleDismiss}
         title="Stay Updated"
         maxWidth="md"
         footer={
            <div className="flex flex-col gap-3 w-full">
               <button
                  onClick={handleEnable}
                  disabled={isLoading}
                  className="w-full bg-accent hover:scale-105 transition text-white font-semibold py-3 px-4 rounded-xl duration-200 disabled:opacity-50 disabled:cursor-not-allowed">
                  {isLoading ? "Requesting..." : "Enable Notifications"}
               </button>

               <button
                  onClick={handleDismiss}
                  className="w-full text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 font-medium py-2 px-4 rounded-lg transition-colors duration-200 underline">
                  Nah
               </button>
            </div>
         }>
         {/* Icon */}
         <div className="flex justify-center p-6">
            <div className="bg-blue-100 dark:bg-blue-900/30 p-4 rounded-full">
               <Bell size={40} className="text-blue-600 dark:text-blue-400" />
            </div>
         </div>

         {/* Description */}
         <p className="text-center text-sub dark:text-sub-dark px-6 mb-6">
            Enable notifications to get instant updates when someone likes your
            posts, comments on your content, or sends you a message.
         </p>

         {/* Benefits list */}
         <ul className="space-y-3 my-8 mx-10">
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
      </Modal>
   );
}
