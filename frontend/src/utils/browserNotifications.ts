/**
 * Browser Push Notifications Utility
 * Handles requesting permission and displaying browser notifications
 */

import type { Notification as AppNotification } from "../types";

export type NotificationPermission = "granted" | "denied" | "default";

/**
 * Check if browser notifications are supported
 */
export function isNotificationSupported(): boolean {
   return "Notification" in window;
}

/**
 * Get current notification permission status
 */
export function getNotificationPermission(): NotificationPermission {
   if (!isNotificationSupported()) {
      return "denied";
   }
   return Notification.permission as NotificationPermission;
}

/**
 * Request notification permission from the user
 * Returns the permission result
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
   if (!isNotificationSupported()) {
      console.warn("Browser notifications are not supported");
      return "denied";
   }

   if (Notification.permission === "granted") {
      return "granted";
   }

   if (Notification.permission === "denied") {
      return "denied";
   }

   try {
      const permission = await Notification.requestPermission();
      return permission as NotificationPermission;
   } catch (error) {
      console.error("Error requesting notification permission:", error);
      return "denied";
   }
}

/**
 * Show a browser notification
 */
export function showBrowserNotification(
   title: string,
   options?: NotificationOptions
): globalThis.Notification | null {
   if (!isNotificationSupported() || Notification.permission !== "granted") {
      return null;
   }

   try {
      const notification = new Notification(title, {
         icon: "/icon-192x192.png",
         badge: "/icon-192x192.png",
         ...options
      });

      return notification;
   } catch (error) {
      console.error("Error showing notification:", error);
      return null;
   }
}

/**
 * Convert app notification to browser notification format and display it
 */
export function showAppNotification(
   notification: AppNotification
): globalThis.Notification | null {
   if (Notification.permission !== "granted") {
      return null;
   }

   const { type, fromName, message, contentType } = notification;

   // Create notification title based on type
   let title = "";
   let body = message;

   switch (type) {
      case "like":
         title = `${fromName} liked your ${contentType}`;
         break;
      case "comment":
         title = `${fromName} commented on your ${contentType}`;
         break;
      case "reply":
         title = `${fromName} replied to your comment`;
         break;
      case "message":
         title = `New message from ${fromName}`;
         break;
      default:
         title = `New notification from ${fromName}`;
   }

   return showBrowserNotification(title, {
      body,
      icon: notification.fromAvatar || "/icon-192x192.png",
      badge: "/icon-192x192.png",
      tag: notification.id, // Prevents duplicate notifications
      requireInteraction: false,
      silent: false,
      data: {
         notificationId: notification.id,
         contentId: notification.contentId,
         contentType: notification.contentType,
         type: notification.type
      }
   });
}

/**
 * Handle notification click to navigate to content
 */
export function setupNotificationClickHandler(
   onNotificationClick: (data: any) => void
) {
   if (!isNotificationSupported()) return;

   // This won't work for service worker notifications, but will work for regular notifications
   // For service worker notifications, you'd handle this in the service worker
   window.addEventListener("notificationclick", (event: any) => {
      event.preventDefault();
      const notification = event.target as globalThis.Notification;

      if (notification.data) {
         onNotificationClick(notification.data);
      }

      notification.close();
      window.focus();
   });
}

/**
 * Check if user has previously dismissed the notification prompt
 */
export function hasUserDismissedPrompt(): boolean {
   return localStorage.getItem("notification-prompt-dismissed") === "true";
}

/**
 * Mark that user has dismissed the notification prompt
 */
export function setUserDismissedPrompt(dismissed: boolean = true): void {
   localStorage.setItem("notification-prompt-dismissed", String(dismissed));
}

/**
 * Check if we should show the notification prompt to the user
 */
export function shouldShowNotificationPrompt(): boolean {
   if (!isNotificationSupported()) {
      return false;
   }

   const permission = getNotificationPermission();

   // Don't show if already granted or permanently denied
   if (permission !== "default") {
      return false;
   }

   // Don't show if user previously dismissed it
   if (hasUserDismissedPrompt()) {
      return false;
   }

   return true;
}
