const express = require('express');
const router = express.Router();

const User = require('../models/User');
const Reel = require('../models/Reel');
const { sendNotification } = require('../utils/notifications');

// Helper: find by either provider id (github/google)
const qById = (id) => ({ $or: [{ githubId: id }, { googleId: id }] });

module.exports = function createReelsRouter(io, userSockets) {
  // Create reel
  router.post('/create', async (req, res) => {
    try {
      if (!req.session.user) return res.status(401).json({ message: 'You need to be logged in' });
      const { title = '', description = '', src } = req.body || {};
      if (!src) return res.status(400).json({ message: 'Missing video src' });

      const reel = await Reel.create({
        author: String(req.session.user.id),
        title,
        description,
        src,
        datePosted: new Date()
      });

      return res.status(201).json({ message: 'Reel created', reelId: reel._id });
    } catch (e) {
      console.error('POST /reels/create failed:', e);
      return res.status(500).json({ message: 'Failed to create reel' });
    }
  });

  // Get all reels
  router.get('/get-all', async (req, res) => {
    try {
      const reels = await Reel.find({ deleted: { $ne: true } }).sort({ datePosted: -1 }).lean();

      for (const r of reels) {
        const author = await User.findOne(qById(r.author)).lean();

        r.authorInfo = author
          ? {
              handle: author.handle,
              name: author.profile?.name || author.handle,
              avatar: author.profile?.avatar || '',
              isCurrentUser: req.session.user ? r.author === String(req.session.user.id) : false
            }
          : { handle: 'unknown', name: 'Unknown', avatar: '', isCurrentUser: false };

        r.likes = (r.likedBy || []).length;
        r.saved = !!(req.session.user && (r.savedBy || []).map(String).includes(String(req.session.user.id)));
        r.liked = !!(req.session.user && (r.likedBy || []).map(String).includes(String(req.session.user.id)));
        r.createdAt = new Date(r.datePosted).getTime();

        if (Array.isArray(r.comments)) {
          r.comments = await Promise.all(
            r.comments.map(async (c) => {
              const commenter = await User.findOne(qById(c.author)).lean();
              if (commenter) {
                return {
                  ...c,
                  authorInfo: {
                    profile: commenter.profile,
                    handle: commenter.handle,
                    avatar: commenter.profile?.avatar || '',
                    name: commenter.profile?.name || commenter.handle,
                    isCurrentUser: req.session.user ? c.author === String(req.session.user.id) : false
                  }
                };
              }
              return { ...c, authorInfo: { deleted: true } };
            })
          );
        } else {
          r.comments = [];
        }
      }

      res.json({ reels });
    } catch (e) {
      console.error('GET /reels/get-all error:', e);
      res.status(500).json({ message: 'Error fetching reels' });
    }
  });

  // Toggle like (atomic + resilient to notification failure)
  router.post('/toggle-like', async (req, res) => {
    try {
      if (!req.session.user) return res.status(401).json({ message: 'Login required' });
      const { id } = req.body || {};
      if (!id) return res.status(400).json({ message: 'Missing id' });

      const uid = String(req.session.user.id);

      const current = await Reel.findById(id, { likedBy: 1, author: 1 }).lean();
      if (!current) return res.status(404).json({ message: 'Reel not found' });

      const alreadyLiked = (current.likedBy || []).map(String).includes(uid);

      // Atomic toggle
      if (alreadyLiked) {
        await Reel.updateOne({ _id: id }, { $pull: { likedBy: uid } });
      } else {
        await Reel.updateOne({ _id: id }, { $addToSet: { likedBy: uid } });
      }

      // Recompute count
      const updated = await Reel.findById(id, { likedBy: 1, author: 1 }).lean();
      const liked = !alreadyLiked;
      const likes = (updated?.likedBy || []).length;

      // Fire-and-forget notification (non-fatal)
      if (liked) {
        (async () => {
          try {
            const currentUser = await User.findOne(qById(uid)).lean();
            await sendNotification(io, userSockets, {
              to: String(updated.author),
              type: 'like',
              from: uid,
              fromName: currentUser?.profile?.name || currentUser?.handle || 'Someone',
              fromAvatar: currentUser?.profile?.avatar || '',
              contentId: id,
              contentType: 'reel',
              message: `${currentUser?.profile?.name || currentUser?.handle || 'Someone'} liked your reel`
            });
          } catch (err) {
            console.warn('toggle-like notification failed (non-fatal):', err?.message || err);
          }
        })();
      }

      return res.json({ liked, likes });
    } catch (e) {
      console.error('POST /reels/toggle-like error:', e);
      return res.status(500).json({ message: 'Failed to toggle like' });
    }
  });

  // Toggle save (atomic for consistency)
  router.post('/toggle-save', async (req, res) => {
    try {
      if (!req.session.user) return res.status(401).json({ message: 'Login required' });
      const { id } = req.body || {};
      if (!id) return res.status(400).json({ message: 'Missing id' });

      const uid = String(req.session.user.id);

      const current = await Reel.findById(id, { savedBy: 1 }).lean();
      if (!current) return res.status(404).json({ message: 'Reel not found' });

      const alreadySaved = (current.savedBy || []).map(String).includes(uid);

      if (alreadySaved) {
        await Reel.updateOne({ _id: id }, { $pull: { savedBy: uid } });
      } else {
        await Reel.updateOne({ _id: id }, { $addToSet: { savedBy: uid } });
      }

      const after = await Reel.findById(id, { savedBy: 1 }).lean();
      return res.json({ saved: !alreadySaved, savedCount: (after?.savedBy || []).length });
    } catch (e) {
      console.error('POST /reels/toggle-save error:', e);
      res.status(500).json({ message: 'Failed to toggle save' });
    }
  });

  // Delete reel
  router.post('/delete', async (req, res) => {
    try {
      if (!req.session.user) return res.status(401).json({ message: 'Login required' });
      const { id } = req.body || {};
      if (!id) return res.status(400).json({ message: 'Missing id' });

      const reel = await Reel.findById(id);
      if (!reel) return res.status(404).json({ message: 'Reel not found' });
      if (String(reel.author) !== String(req.session.user.id)) {
        return res.status(403).json({ message: 'Not your reel' });
      }

      await Reel.updateOne({ _id: id }, { $set: { deleted: true } });
      res.json({ message: 'Reel deleted', id });
    } catch (e) {
      console.error('POST /reels/delete error:', e);
      res.status(500).json({ message: 'Failed' });
    }
  });

  // Get a single reel by ID
  router.get('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const reel = await Reel.findById(id).lean();
      
      if (!reel || reel.deleted) {
        return res.status(404).json({ message: 'Reel not found' });
      }

      const author = await User.findOne(qById(reel.author)).lean();

      reel.authorInfo = author
        ? {
            handle: author.handle,
            name: author.profile?.name || author.handle,
            avatar: author.profile?.avatar || '',
            isCurrentUser: req.session.user ? reel.author === String(req.session.user.id) : false
          }
        : { handle: 'unknown', name: 'Unknown', avatar: '', isCurrentUser: false };

      reel.likes = (reel.likedBy || []).length;
      reel.saved = !!(req.session.user && (reel.savedBy || []).map(String).includes(String(req.session.user.id)));
      reel.liked = !!(req.session.user && (reel.likedBy || []).map(String).includes(String(req.session.user.id)));
      reel.createdAt = new Date(reel.datePosted).getTime();

      if (Array.isArray(reel.comments)) {
        reel.comments = await Promise.all(
          reel.comments.map(async (c) => {
            const commenter = await User.findOne(qById(c.author)).lean();
            if (commenter) {
              return {
                ...c,
                authorInfo: {
                  profile: commenter.profile,
                  handle: commenter.handle,
                  avatar: commenter.profile?.avatar || '',
                  name: commenter.profile?.name || commenter.handle,
                  isCurrentUser: req.session.user ? c.author === String(req.session.user.id) : false
                }
              };
            }
            return { ...c, authorInfo: { deleted: true } };
          })
        );
      } else {
        reel.comments = [];
      }

      res.json({ reel });
    } catch (e) {
      console.error('GET /reels/:id error:', e);
      res.status(500).json({ message: 'Error fetching reel' });
    }
  });

  // Create comment
  router.post('/comments/create', async (req, res) => {
    try {
      if (!req.session.user) return res.status(401).json({ message: 'You need to be logged in' });
      const { reelId, text } = req.body || {};
      if (!reelId || !text?.trim()) return res.status(400).json({ message: 'Missing reelId or text' });

      const reel = await Reel.findById(reelId);
      if (!reel) return res.status(404).json({ message: 'Reel not found' });

      reel.comments = reel.comments || [];
      reel.comments.push({
        author: String(req.session.user.id),
        content: String(text),
        datePosted: new Date(),
        stats: {}
      });
      await reel.save();

      const user = await User.findOne(qById(req.session.user.id)).lean();
      const currentUserInfo = user
        ? {
            id: req.session.user.id,
            handle: user.handle,
            name: user.profile?.name || user.handle,
            avatar: user.profile?.avatar || '',
            profile: user.profile
          }
        : null;

      // Notification (comment)
      try {
        await sendNotification(io, userSockets, {
          to: String(reel.author),
          type: 'comment',
          from: String(req.session.user.id),
          fromName: user?.profile?.name || user?.handle || 'Someone',
          fromAvatar: user?.profile?.avatar || '',
          contentId: reelId,
          contentType: 'reel',
          message: `${user?.profile?.name || user?.handle || 'Someone'} commented on your reel`
        });
      } catch (err) {
        console.warn('comments/create notification failed (non-fatal):', err?.message || err);
      }

      return res.json({ message: 'Comment added', currentUser: currentUserInfo });
    } catch (e) {
      console.error('POST /reels/comments/create failed:', e);
      return res.status(500).json({ message: 'Failed to add comment' });
    }
  });

  return router;
};
