const express = require('express');
const router = express.Router();

const User = require('../models/User');
const Reel = require('../models/Reel');
const { sendNotification } = require('../utils/notifications');

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
         const author = await User.findOne({ githubId: r.author }).lean();
         r.authorInfo = author ? {
            handle: author.handle,
            name: author.profile?.name || author.handle,
            avatar: author.profile?.avatar || '',
            isCurrentUser: req.session.user ? (r.author === String(req.session.user.id)) : false
         } : { handle: 'unknown', name: 'Unknown', avatar: '', isCurrentUser: false };

         r.likes = (r.likedBy || []).length;
         r.saved = !!(req.session.user && r.savedBy?.includes(String(req.session.user.id)));
         r.liked = !!(req.session.user && r.likedBy?.includes(String(req.session.user.id)));
         r.createdAt = new Date(r.datePosted).getTime();

         if (Array.isArray(r.comments)) {
            r.comments = await Promise.all(r.comments.map(async (c) => {
               const commenter = await User.findOne({ githubId: c.author }).lean();
               if (commenter) {
                  return {
                     ...c,
                     authorInfo: {
                        profile: commenter.profile,
                        handle: commenter.handle,
                        avatar: commenter.profile?.avatar || '',
                        name: commenter.profile?.name || commenter.handle,
                        isCurrentUser: req.session.user ? (c.author === String(req.session.user.id)) : false
                     }
                  };
               }
               return { ...c, authorInfo: { deleted: true } };
            }));
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

// Toggle like
router.post('/toggle-like', async (req, res) => {
   try {
      if (!req.session.user) return res.status(401).json({ message: 'Login required' });
      const { id } = req.body || {};
      const uid = String(req.session.user.id);
      const reel = await Reel.findById(id);
      if (!reel) return res.status(404).json({ message: 'Reel not found' });

      const set = new Set(reel.likedBy?.map(String) || []);
      const wasLiked = set.has(uid);
      wasLiked ? set.delete(uid) : set.add(uid);
      reel.likedBy = Array.from(set);
      await reel.save();

      // Send notification if liked (not unliked)
      if (!wasLiked) {
         const currentUser = await User.findOne({ githubId: uid }).lean();
         await sendNotification(io, userSockets, {
            to: String(reel.author),
            type: 'like',
            from: uid,
            fromName: currentUser?.profile?.name || currentUser?.handle || 'Someone',
            fromAvatar: currentUser?.profile?.avatar || '',
            contentId: id,
            contentType: 'reel',
            message: `${currentUser?.profile?.name || currentUser?.handle || 'Someone'} liked your reel`
         });
      }

      res.json({ liked: set.has(uid), likes: reel.likedBy.length });
   } catch (e) {
      console.error('POST /reels/toggle-like error:', e);
      res.status(500).json({ message: 'Failed' });
   }
});

// Toggle save
router.post('/toggle-save', async (req, res) => {
   try {
      if (!req.session.user) return res.status(401).json({ message: 'Login required' });
      const { id } = req.body || {};
      const uid = String(req.session.user.id);
      const reel = await Reel.findById(id);
      if (!reel) return res.status(404).json({ message: 'Reel not found' });

      const set = new Set(reel.savedBy?.map(String) || []);
      set.has(uid) ? set.delete(uid) : set.add(uid);
      reel.savedBy = Array.from(set);
      await reel.save();
      res.json({ saved: set.has(uid) });
   } catch (e) {
      console.error('POST /reels/toggle-save error:', e);
      res.status(500).json({ message: 'Failed' });
   }
});

// Delete reel
router.post('/delete', async (req, res) => {
   try {
      if (!req.session.user) return res.status(401).json({ message: 'Login required' });
      const { id } = req.body || {};
      const reel = await Reel.findById(id);
      if (!reel) return res.status(404).json({ message: 'Reel not found' });
      if (String(reel.author) !== String(req.session.user.id)) return res.status(403).json({ message: 'Not your reel' });
      await Reel.updateOne({ _id: id }, { $set: { deleted: true } });
      res.json({ message: 'Reel deleted', id });
   } catch (e) {
      console.error('POST /reels/delete error:', e);
      res.status(500).json({ message: 'Failed' });
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

      const user = await User.findOne({ githubId: req.session.user.id }).lean();
      const currentUserInfo = user ? {
         id: req.session.user.id,
         handle: user.handle,
         name: user.profile?.name || user.handle,
         avatar: user.profile?.avatar || '',
         profile: user.profile
      } : null;

      // Send notification to reel author
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

      return res.json({ message: 'Comment added', currentUser: currentUserInfo });
   } catch (e) {
      console.error('POST /reels/comments/create failed:', e);
      return res.status(500).json({ message: 'Failed to add comment' });
   }
});

return router;
};