const express = require('express');
const router = express.Router();

const User = require('../models/User');
const Post = require('../models/Post');
const { sendNotification } = require('../utils/notifications');

const qById = (id) => ({ $or: [{ githubId: id }, { googleId: id }] });
const qInIds = (ids) => ({ $or: [{ githubId: { $in: ids } }, { googleId: { $in: ids } }] });

// Toggle like
module.exports = function createPostsRouter(io, userSockets) {

  router.post('/toggle-like', async (req, res) => {
    try {
      if (!req.session.user) return res.status(401).json({ message: 'You need to be logged in' });

      const { postId } = req.body;
      if (!postId) return res.status(400).json({ message: 'Missing post id' });

      const post = await Post.findById(postId);
      if (!post) return res.status(404).json({ message: 'Post not found' });

      const userId = String(req.session.user.id);
      post.likedBy = post.likedBy || [];

      const likedBySet = new Set(post.likedBy.map(String));
      const wasLiked = likedBySet.has(userId);

      if (wasLiked) {
        likedBySet.delete(userId);
        post.likedBy = Array.from(likedBySet);
        await User.updateOne(qById(userId), { $pull: { likedPostIds: post._id } });
      } else {
        likedBySet.add(userId);
        post.likedBy = Array.from(likedBySet);
        await User.updateOne(qById(userId), { $addToSet: { likedPostIds: post._id } });

        const currentUser = await User.findOne(qById(userId)).lean();
        await sendNotification(io, userSockets, {
          to: String(post.author),
          type: 'like',
          from: userId,
          fromName: currentUser?.profile?.name || currentUser?.handle || 'Someone',
          fromAvatar: currentUser?.profile?.avatar || '',
          contentId: postId,
          contentType: 'post',
          message: `${currentUser?.profile?.name || currentUser?.handle || 'Someone'} liked your post`
        });
      }

      await post.save();
      res.json({ liked: !wasLiked, likes: post.likedBy.length });
    } catch (err) {
      console.error('POST /posts/toggle-like failed:', err);
      return res.status(500).json({ message: 'Failed to toggle like' });
    }
  });

  // Create comment
  router.post('/comments/create', async (req, res) => {
    try {
      if (!req.session.user) return res.status(401).json({ message: 'You need to be logged in' });
      const postId = req.body.postId;
      const text = req.body.text;

      const post = await Post.findById(postId);
      if (!post) return res.status(404).json({ message: 'Post not found' });

      post.comments.push({
        author: String(req.session.user.id),
        content: String(text),
        datePosted: new Date(),
        stats: {}
      });
      await post.save();

      const user = await User.findOne(qById(req.session.user.id)).lean();
      const currentUserInfo = user ? {
        id: req.session.user.id,
        handle: user.handle,
        name: user.profile?.name || user.handle,
        avatar: user.profile?.avatar || '',
        profile: user.profile
      } : null;

      await sendNotification(io, userSockets, {
        to: String(post.author),
        type: 'comment',
        from: String(req.session.user.id),
        fromName: user?.profile?.name || user?.handle || 'Someone',
        fromAvatar: user?.profile?.avatar || '',
        contentId: postId,
        contentType: 'post',
        message: `${user?.profile?.name || user?.handle || 'Someone'} commented on your post`
      });

      return res.json({ message: 'Comment added', currentUser: currentUserInfo });
    } catch (e) {
      console.error('POST /posts/comments/create failed:', e);
      return res.status(500).json({ message: 'Failed to add comment' });
    }
  });

  // Get media for current user
  router.get('/getMedia', async (req, res) => {
    try {
      if (!req.session.user) return res.status(401).json({ message: 'You need to be logged in' });

      const user = await User.findOne(qById(req.session.user.id));
      if (!user) return res.status(404).json({ message: 'User not found' });

      const postIds = user.postIds || [];
      if (!postIds.length) return res.json({ media: [] });

      const posts = await Post.find({ _id: { $in: postIds }, deleted: { $ne: true } }).lean();
      const media = [];
      for (const post of posts) {
        if (Array.isArray(post.urls)) {
          for (const url of post.urls) {
            const ext = url.split('.').pop()?.toLowerCase();
            const kind = ['mp4', 'webm', 'ogg', 'mov'].includes(ext) ? 'video' : 'image';
            media.push({ kind, url });
          }
        }
        if (post.image) media.push({ kind: 'image', url: post.image });
      }
      return res.json({ media });
    } catch (err) {
      console.error('Error fetching user media:', err);
      return res.status(500).json({ message: 'Error fetching media' });
    }
  });

  // Edit post
  router.post('/edit', async (req, res) => {
    try {
      if (!req.session.user) return res.status(401).json({ message: 'You need to be logged in to edit posts' });
      const postId = req.body.id || req.body.postId;
      const newContent = req.body.content;

      if (!postId) return res.status(400).json({ message: 'Missing post id' });
      if (newContent === undefined) return res.status(400).json({ message: 'Missing content' });

      const post = await Post.findById(postId);
      if (!post) return res.status(404).json({ message: 'Post not found' });
      if (String(post.author) !== String(req.session.user.id)) {
        return res.status(403).json({ message: 'You can only edit your own posts' });
      }

      post.content = newContent;
      await post.save();
      return res.json({ message: 'Post edited successfully', postId, content: newContent });
    } catch (err) {
      console.error('POST /posts/edit failed:', err);
      return res.status(500).json({ message: 'Failed to edit post' });
    }
  });

  // Delete post
  router.post('/delete', async (req, res) => {
    try {
      if (!req.session.user) return res.status(401).json({ message: 'You need to be logged in to delete posts' });
      const postId = req.body.id || req.body.content?.id;
      if (!postId) return res.status(400).json({ message: 'Missing post id' });

      const post = await Post.findById(postId);
      if (!post) return res.status(404).json({ message: 'Post not found' });
      if (String(post.author) !== String(req.session.user.id)) {
        return res.status(403).json({ message: 'You can only delete your own posts' });
      }

      await Post.updateOne({ _id: postId }, { $set: { deleted: true } });
      return res.json({ message: 'Post deleted successfully', postId });
    } catch (err) {
      console.error('POST /posts/delete failed:', err);
      return res.status(500).json({ message: 'Failed to delete post' });
    }
  });

  // Create post
  router.post('/create', async (req, res) => {
    try {
      if (!req.session.user) return res.status(401).json({ message: 'You need to be logged in to post' });

      const post = await Post.create({
        content: req.body.content,
        urls: Array.isArray(req.body.urls) ? req.body.urls : [],
        datePosted: req.body.datePosted ? new Date(req.body.datePosted) : new Date(),
        author: String(req.session.user.id),
      });

      await User.updateOne(qById(req.session.user.id), { $push: { postIds: post._id } });
      return res.status(201).json({ message: 'Post created successfully!', postId: post._id });
    } catch (err) {
      console.error('POST /posts/create failed:', err);
      return res.status(500).json({ message: 'Failed to create post' });
    }
  });

  // Get all posts
  router.get('/get-all', async (req, res) => {
    try {
      const posts = await Post.find({ deleted: { $ne: true } }).lean();
      for (const p of posts) {
        try {
          const author = await User.findOne(qById(p.author)).lean();
          p.authorInfo = author
            ? {
                profile: author.profile,
                handle: author.handle,
                avatar: author.profile?.avatar || '',
                name: author.profile?.name || author.handle,
                isCurrentUser: req.session.user ? (p.author === String(req.session.user.id)) : false
              }
            : { handle: 'unknown', name: 'Unknown', avatar: '', isCurrentUser: false };

          p.authorId = p.author;
          p.createdAt = new Date(p.datePosted).getTime();

          p.likes = (p.likedBy || []).length;
          p.liked = !!(req.session.user && p.likedBy?.includes(String(req.session.user.id)));

          if (Array.isArray(p.comments)) {
            p.comments = await Promise.all(p.comments.map(async c => {
              const commenter = await User.findOne(qById(c.author)).lean();
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
              } else {
                return { ...c, authorInfo: { deleted: true } };
              }
            }));
          } else {
            p.comments = [];
          }
        } catch (e) {
          console.error(`Author fetch error for ${p._id}:`, e);
        }
      }
      return res.json({ posts });
    } catch (err) {
      console.error('Error fetching posts:', err);
      return res.status(500).json({ message: 'Error fetching posts' });
    }
  });

  return router;
};
