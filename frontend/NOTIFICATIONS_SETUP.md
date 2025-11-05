# Browser Push Notifications Setup

This document describes the browser push notification system that has been integrated into the Laamly PWA.

## Overview

The app now prompts users to enable browser notifications and pushes all in-app notifications to the browser using the Notifications API. Users receive real-time browser notifications for:

- ✅ New likes on posts and reels
- ✅ Comments on their content
- ✅ Replies to their comments
- ✅ New messages

## Architecture

### Files Created/Modified

1. **`src/utils/browserNotifications.ts`** - Core notification utilities
   - Permission checking and requesting
   - Browser notification display
   - LocalStorage management for user preferences
   - Converts app notifications to browser notification format

2. **`src/components/notifications/NotificationPrompt.tsx`** - UI Component
   - Beautiful modal prompt for requesting notification permission
   - Shows benefits of enabling notifications
   - Handles user acceptance/dismissal
   - Persists user choice to localStorage

3. **`src/hooks/useNotificationPermission.ts`** - React Hook
   - Manages notification permission state
   - Controls prompt visibility
   - Auto-shows prompt after 5 seconds for new users
   - Respects user's previous dismissal

4. **`src/utils/notifications.ts`** - Modified
   - Enhanced to trigger browser notifications when new notifications arrive
   - Handles notification click events to focus the app window

5. **`src/App.tsx`** - Modified
   - Integrated notification prompt into main app
   - Only shows for logged-in users

## How It Works

### 1. Initial Prompt (After 5 seconds)

When a user first visits the app (and is logged in), after 5 seconds they'll see a modal prompt asking them to enable notifications. The prompt:

- Shows benefits of enabling notifications
- Has "Enable Notifications" and "Maybe Later" buttons
- Remembers if user dismissed it (won't show again)
- Only appears if browser supports notifications and permission is still "default"

### 2. Permission Request

When user clicks "Enable Notifications":
- Browser's native permission dialog appears
- If granted: notifications are enabled and prompt closes
- If denied: prompt closes and won't appear again
- User choice is saved to localStorage

### 3. Receiving Notifications

When a new notification arrives via Socket.IO:
1. The app's notification badge updates (existing behavior)
2. **NEW**: If permission is granted, a browser notification is shown
3. The notification includes:
   - Title based on notification type
   - Body text with the message
   - User's avatar as the icon
   - App icon as the badge

### 4. Notification Click

When user clicks a browser notification:
- The app window/tab is focused
- The notification closes
- (Future enhancement: Can navigate to specific content)

## User Experience

### New User Journey

1. User logs in to Laamly
2. After 5 seconds, sees beautiful notification prompt modal
3. User reads benefits and clicks "Enable Notifications"
4. Browser shows native permission dialog
5. User grants permission
6. From now on, receives push notifications even when app is closed/minimized

### Notification Types

Each notification type shows a customized title:

- **Like**: "John Doe liked your post"
- **Comment**: "Jane Smith commented on your reel"
- **Reply**: "Alice replied to your comment"
- **Message**: "New message from Bob"

## Browser Support

✅ **Desktop**
- Chrome, Edge, Firefox, Safari (macOS 13+)

✅ **Mobile**
- Chrome, Edge, Samsung Internet (Android)
- Safari (iOS 16.4+) - requires PWA installation

❌ **Not Supported**
- iOS Safari (web) - requires installed PWA
- Older browsers

## Testing

### Manual Testing

1. **Start the dev server**
   ```bash
   npm run dev
   ```

2. **Log in to the app**

3. **Wait 5 seconds** - prompt should appear

4. **Click "Enable Notifications"**

5. **Grant permission** in browser dialog

6. **Trigger a test notification** (have someone like your post, comment, etc.)

7. **Verify** browser notification appears

### Testing Without Waiting

To test immediately, open browser console and run:
```javascript
// Clear the dismissed flag
localStorage.removeItem('notification-prompt-dismissed');

// Reload the page
location.reload();
```

### Testing Different States

**Granted Permission:**
```javascript
// Notifications should appear automatically for new events
```

**Denied Permission:**
- No browser notifications will appear
- In-app notifications still work normally

**Default (Not Asked):**
- Prompt will appear after 5 seconds

## Customization

### Change Prompt Delay

Edit `src/hooks/useNotificationPermission.ts`:

```typescript
const timer = setTimeout(() => {
  if (shouldShowNotificationPrompt()) {
    setShouldShowPrompt(true);
  }
}, 5000); // Change this value (milliseconds)
```

### Customize Notification Content

Edit `src/utils/browserNotifications.ts` in the `showAppNotification` function:

```typescript
switch (type) {
  case 'like':
    title = `${fromName} liked your ${contentType}`;
    break;
  // Add custom messages for each type
}
```

### Change Notification Icons

Replace the icon paths in `showBrowserNotification`:

```typescript
const notification = new Notification(title, {
  icon: '/your-custom-icon.png',  // Change this
  badge: '/your-custom-badge.png', // Change this
  ...options,
});
```

## Privacy & Settings

### User Control

Users can control notifications in multiple ways:

1. **Browser Settings**: Standard browser notification settings apply
2. **App Dismissal**: Clicking "Maybe Later" prevents prompt from showing again
3. **Permission Change**: Users can revoke permission in browser settings anytime

### Data Storage

The app stores one preference:
- `notification-prompt-dismissed`: Boolean flag (localStorage)

No other notification-related data is stored locally.

## Troubleshooting

### Notifications Not Appearing

1. **Check permission status**:
   ```javascript
   console.log(Notification.permission);
   // Should be "granted"
   ```

2. **Check if notifications are blocked** in browser settings

3. **Verify HTTPS**: Notifications require HTTPS (or localhost for testing)

4. **Check browser support**: Some browsers don't support notifications

### Prompt Not Showing

1. **Clear localStorage**:
   ```javascript
   localStorage.removeItem('notification-prompt-dismissed');
   ```

2. **Check if already granted/denied**: Prompt only shows for "default" state

3. **Verify user is logged in**: Prompt only shows for authenticated users

## Future Enhancements

Potential improvements:

1. **Action Buttons**: Add "Reply" or "View" buttons to notifications
2. **Navigation**: Click notification to navigate to specific content
3. **Sound**: Custom notification sounds
4. **Grouping**: Group multiple notifications
5. **Service Worker**: Use service worker for background notifications
6. **Settings Page**: Add notification preferences in user settings

## Security Considerations

- Notifications are only shown to logged-in users
- User must explicitly grant permission
- No sensitive data in notification content
- Works with existing authentication system
- Respects user privacy and browser settings
