const express = require('express');
const router = express.Router();

const User = require('../models/User');

// GET /api/notifications - Get all notifications for the current user
router.get('/', async (req, res) => {
   try {
      if (!req.session.user) {
         return res.status(401).json({ message: 'You need to be logged in' });
      }

      const userId = String(req.session.user.id);
      const user = await User.findOne({ githubId: userId }).lean();

      if (!user) {
         return res.status(404).json({ message: 'User not found' });
      }

      const notifications = (user.notifications || []).map(n => ({
         id: n._id.toString(),
         type: n.type,
         from: n.from,
         fromName: n.fromName,
         fromAvatar: n.fromAvatar,
         contentId: n.contentId,
         contentType: n.contentType,
         message: n.message,
         read: n.read,
         createdAt: new Date(n.createdAt).getTime()
      }));

      res.json({ notifications });
   } catch (err) {
      console.error('Error fetching notifications:', err);
      return res.status(500).json({ message: 'Error fetching notifications' });
   }
});

// POST /api/notifications/mark-read - Mark one or all notifications as read
router.post('/mark-read', async (req, res) => {
   try {
      if (!req.session.user) {
         return res.status(401).json({ message: 'You need to be logged in' });
      }

      const userId = String(req.session.user.id);
      const { notificationId } = req.body;

      if (notificationId) {
         // Mark specific notification as read
         await User.updateOne(
            { githubId: userId, 'notifications._id': notificationId },
            { $set: { 'notifications.$.read': true } }
         );
      } else {
         // Mark all notifications as read
         await User.updateOne(
            { githubId: userId },
            { $set: { 'notifications.$[].read': true } }
         );
      }

      res.json({ message: 'Notifications marked as read' });
   } catch (err) {
      console.error('Error marking notifications as read:', err);
      return res.status(500).json({ message: 'Error marking notifications as read' });
   }
});

// DELETE /api/notifications/:notificationId - Delete a specific notification
router.delete('/:notificationId', async (req, res) => {
   try {
      if (!req.session.user) {
         return res.status(401).json({ message: 'You need to be logged in' });
      }

      const userId = String(req.session.user.id);
      const { notificationId } = req.params;

      await User.updateOne(
         { githubId: userId },
         { $pull: { notifications: { _id: notificationId } } }
      );

      res.json({ message: 'Notification deleted' });
   } catch (err) {
      console.error('Error deleting notification:', err);
      return res.status(500).json({ message: 'Error deleting notification' });
   }
});

module.exports = router;
