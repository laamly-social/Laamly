// backend/routes/notifications.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../models/User');

function sessionUserUuid(req) {
  return String(req.session?.user?.uuid || '');
}

async function findUserBySession(req) {
  const uuid = sessionUserUuid(req);
  if (!uuid) return null;
  return await User.findOne({ uuid });
}

// GET /api/notifications
router.get('/', async (req, res) => {
  try {
    if (!req.session?.user) return res.status(401).json({ message: 'You need to be logged in' });

    const user = await findUserBySession(req);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const notifications = (user.notifications || []).map((n) => ({
      id: String(n._id),
      type: n.type,
      from: n.from,
      fromName: n.fromName,
      fromAvatar: n.fromAvatar,
      contentId: n.contentId,
      contentType: n.contentType,
      message: n.message,
      read: !!n.read,
      createdAt: new Date(n.createdAt).getTime(),
    }));

    // newest first (if needed)
    notifications.sort((a, b) => b.createdAt - a.createdAt);

    res.json({ notifications });
  } catch (err) {
    console.error('Error fetching notifications:', err);
    res.status(500).json({ message: 'Error fetching notifications' });
  }
});

// GET /api/notifications/unread-count  (optional but useful)
router.get('/unread-count', async (req, res) => {
  try {
    if (!req.session?.user) return res.json({ count: 0 });
    const user = await findUserBySession(req);
    const count = user ? (user.notifications || []).filter((n) => !n.read).length : 0;
    res.json({ count });
  } catch (err) {
    console.error('Error unread-count:', err);
    res.status(500).json({ count: 0 });
  }
});

// POST /api/notifications/mark-read
router.post('/mark-read', async (req, res) => {
  try {
    if (!req.session?.user) return res.status(401).json({ message: 'You need to be logged in' });

  const uuid = sessionUserUuid(req);
    const { notificationId } = req.body;

    if (notificationId) {
      await User.updateOne(
        { uuid, 'notifications._id': notificationId },
        { $set: { 'notifications.$.read': true } }
      );
    } else {
      await User.updateOne(
        { uuid },
        { $set: { 'notifications.$[].read': true } }
      );
    }
    res.json({ message: 'Notifications marked as read' });
  } catch (err) {
    console.error('Error marking notifications as read:', err);
    res.status(500).json({ message: 'Error marking notifications as read' });
  }
});

// DELETE /api/notifications/:notificationId
router.delete('/:notificationId', async (req, res) => {
  try {
    if (!req.session?.user) return res.status(401).json({ message: 'You need to be logged in' });

  const uuid = sessionUserUuid(req);
    const { notificationId } = req.params;

    await User.updateOne(
      { uuid },
      { $pull: { notifications: { _id: notificationId } } }
    );

    res.json({ message: 'Notification deleted' });
  } catch (err) {
    console.error('Error deleting notification:', err);
    res.status(500).json({ message: 'Error deleting notification' });
  }
});

module.exports = router;
