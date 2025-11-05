const User = require('../models/User');

/**
 * Send a notification to a user via socket.io or save it to the database
 * @param {Object} io - Socket.io instance
 * @param {Map} userSockets - Map of userId to Set of socket IDs
 * @param {Object} notification - Notification data
 * @param {string} notification.to - UUID of recipient
 * @param {string} notification.type - Type: 'like', 'comment', 'message', 'reply'
 * @param {string} notification.from - UUID of sender
 * @param {string} notification.fromName - Display name of sender
 * @param {string} notification.fromAvatar - Avatar URL of sender
 * @param {string} notification.contentId - ID of the content (postId, reelId, threadId)
 * @param {string} notification.contentType - Type: 'post', 'reel', 'message', 'comment'
 * @param {string} notification.message - Human-readable message
 */
async function sendNotification(io, userSockets, notification) {
   const { to, type, from, fromName, fromAvatar, contentId, contentType, message } = notification;

   // Don't send notification to yourself
   if (to === from) return;

   const notificationData = {
      type,
      from,
      fromName,
      fromAvatar,
      contentId,
      contentType,
      message,
      read: false,
      createdAt: new Date()
   };

   // Check if user is online
   const isOnline = userSockets.has(to);

   if (isOnline) {
      // User is online - send via socket
      const socketIds = userSockets.get(to);
      socketIds.forEach(socketId => {
         io.to(socketId).emit('notification', notificationData);
      });
   }

   // Always save to database so notifications persist
   try {
      await User.updateOne(
         { uuid: to },
         {
            $push: {
               notifications: {
                  $each: [notificationData],
                  $position: 0,
                  $slice: 50 // Keep only the 50 most recent notifications
               }
            }
         }
      );
   } catch (err) {
      console.error('Error saving notification:', err);
   }
}

module.exports = { sendNotification };
