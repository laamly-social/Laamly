const express = require('express');
const router = express.Router();

const User = require('../models/User');
const Post = require('../models/Post');
const { sendNotification } = require('../utils/notifications');

const qById = (id) => ({ $or: [{ githubId: id }, { googleId: id }] });
const qInIds = (ids) => ({ $or: [{ githubId: { $in: ids } }, { googleId: { $in: ids } }] });

// Fetch image from URL and convert to base64
async function fetchImageAsBase64(imageUrl) {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString('base64');

    return base64;
  } catch (error) {
    console.error(`Error fetching image ${imageUrl}:`, error.message);
    throw error;
  }
}

// Call Ollama API to analyze images and generate tags
async function callOllamaApi(imageUrls, postText) {
  const url = "https://ollama-api.laamly.com/api/generate";

  try {
    // Fetch images from URLs and convert to base64 (if any)
    let base64Images = [];
    if (imageUrls && imageUrls.length > 0) {
      const base64ImagesPromises = imageUrls.map(imgUrl => fetchImageAsBase64(imgUrl));
      base64Images = await Promise.all(base64ImagesPromises);
    }

    // Add timeout to prevent hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    // Prepare prompt based on whether images are present
    const hasImages = base64Images.length > 0;
    const prompt = hasImages
      ? `Analyze the following social media post text and images. Return ONLY valid JSON with this exact structure, no other text:
{
  "isHalal": true,
  "tags": ["tag1", "tag2", "tag3"]
}

Instructions:
- Generate 5-8 relevant hashtags for the tags array
- Set isHalal to false if content contains haram elements, true otherwise
- Return ONLY the JSON object, no markdown, no explanations

Post text: ${postText}`
      : `Analyze the following social media post text. Return ONLY valid JSON with this exact structure, no other text:
{
  "isHalal": true,
  "tags": ["tag1", "tag2", "tag3"]
}

Instructions:
- Generate 5-8 relevant hashtags for the tags array based on the text content. THE MAX IS 8 TAGS. If there are multiple words in a hastag, do not put spaces, use pascalcase or underscores.
- Set isHalal to false if content contains haram elements, true otherwise
- Return ONLY the JSON object, no markdown, no explanations

Post text: ${postText}`;

    const requestBody = {
      model: "llava",
      prompt: prompt,
      stream: false
    };

    // Only include images if they exist
    if (hasImages) {
      requestBody.images = base64Images;
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Ollama API response status: ${response.status}`);
    }

    const apiResult = await response.json();

    // Parse the JSON response from the model
    try {
      let jsonString = apiResult.response;

      // Try to extract JSON from markdown code blocks or surrounding text
      const jsonMatch = jsonString.match(/```json\s*(\{.*?\})\s*```/s) ||
                       jsonString.match(/```\s*(\{.*?\})\s*```/s) ||
                       jsonString.match(/\{[^{}]*"isHalal"[^{}]*"tags"[^{}]*\}/s) ||
                       jsonString.match(/\{[^{}]*"tags"[^{}]*"isHalal"[^{}]*\}/s);

      if (jsonMatch) {
        jsonString = jsonMatch[1] || jsonMatch[0];
      }

      const parsedResponse = JSON.parse(jsonString);

      return {
        isHalal: parsedResponse.isHalal !== false,
        tags: Array.isArray(parsedResponse.tags) ? parsedResponse.tags : []
      };
    } catch (parseError) {
      console.error('Failed to parse Ollama response:', parseError.message);
      return {
        isHalal: true,
        tags: []
      };
    }
  } catch (error) {
    console.error('Ollama API error:', error.message);
    return {
      isHalal: true,
      tags: []
    };
  }
}

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

  // Regenerate tags for a post
  router.post('/regenerate-tags', async (req, res) => {
    try {
      if (!req.session.user) return res.status(401).json({ message: 'You need to be logged in' });
      const { postId } = req.body;
      if (!postId) return res.status(400).json({ message: 'Missing post id' });

      const post = await Post.findById(postId);
      if (!post) return res.status(404).json({ message: 'Post not found' });
      if (String(post.author) !== String(req.session.user.id)) {
        return res.status(403).json({ message: 'You can only regenerate tags for your own posts' });
      }

      // Get image URLs from the post
      const imageUrls = (post.urls || []).filter(url => !url.match(/\.(mp4|webm|ogg|mov)$/i));

      let aiAnalysis = { isHalal: true, tags: [] };

      // Analyze post with AI (with or without images)
      if (imageUrls.length > 0 || (post.content && post.content.trim())) {
        try {
          const urlsToAnalyze = imageUrls.slice(0, 3);
          aiAnalysis = await callOllamaApi(urlsToAnalyze, post.content || '');
        } catch (aiError) {
          console.error('AI Analysis failed:', aiError);
          return res.status(500).json({ message: 'Failed to regenerate tags' });
        }
      }

      post.tags = aiAnalysis.tags;
      post.isHalal = aiAnalysis.isHalal;
      await post.save();

      return res.json({
        message: 'Tags regenerated successfully',
        tags: post.tags,
        isHalal: post.isHalal
      });
    } catch (err) {
      console.error('POST /posts/regenerate-tags failed:', err);
      return res.status(500).json({ message: 'Failed to regenerate tags' });
    }
  });

  // Remove a tag from a post
  router.post('/remove-tag', async (req, res) => {
    try {
      if (!req.session.user) return res.status(401).json({ message: 'You need to be logged in' });
      const { postId, tag } = req.body;
      if (!postId || !tag) return res.status(400).json({ message: 'Missing post id or tag' });

      const post = await Post.findById(postId);
      if (!post) return res.status(404).json({ message: 'Post not found' });
      if (String(post.author) !== String(req.session.user.id)) {
        return res.status(403).json({ message: 'You can only remove tags from your own posts' });
      }

      post.tags = (post.tags || []).filter(t => t !== tag);
      await post.save();

      return res.json({
        message: 'Tag removed successfully',
        tags: post.tags
      });
    } catch (err) {
      console.error('POST /posts/remove-tag failed:', err);
      return res.status(500).json({ message: 'Failed to remove tag' });
    }
  });

  // Create post
  router.post('/create', async (req, res) => {
    try {
      if (!req.session.user) return res.status(401).json({ message: 'You need to be logged in to post' });

      const { content, urls, imageUrls, datePosted } = req.body;

      // Initialize AI analysis results
      let aiAnalysis = {
        isHalal: true,
        tags: []
      };

      // Analyze post with AI (with or without images)
      if ((imageUrls && Array.isArray(imageUrls) && imageUrls.length > 0) || (content && content.trim())) {
        try {
          // Limit to first 3 images to avoid overloading the AI
          const urlsToAnalyze = imageUrls && Array.isArray(imageUrls) ? imageUrls.slice(0, 3) : [];
          aiAnalysis = await callOllamaApi(urlsToAnalyze, content || '');
        } catch (aiError) {
          console.error('AI Analysis failed, continuing without tags:', aiError);
        }
      }

      const post = await Post.create({
        content: content,
        urls: Array.isArray(urls) ? urls : [],
        datePosted: datePosted ? new Date(datePosted) : new Date(),
        author: String(req.session.user.id),
        tags: aiAnalysis.tags,
        isHalal: aiAnalysis.isHalal
      });

      await User.updateOne(qById(req.session.user.id), { $push: { postIds: post._id } });

      return res.status(201).json({
        message: 'Post created successfully!',
        postId: post._id,
        aiAnalysis: aiAnalysis
      });
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

  // Get a single post by ID
  router.get('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const post = await Post.findById(id).lean();

      if (!post || post.deleted) {
        return res.status(404).json({ message: 'Post not found' });
      }

      const author = await User.findOne(qById(post.author)).lean();
      post.authorInfo = author
        ? {
            profile: author.profile,
            handle: author.handle,
            avatar: author.profile?.avatar || '',
            name: author.profile?.name || author.handle,
            isCurrentUser: req.session.user ? (post.author === String(req.session.user.id)) : false
          }
        : { handle: 'unknown', name: 'Unknown', avatar: '', isCurrentUser: false };

      post.authorId = post.author;
      post.createdAt = new Date(post.datePosted).getTime();
      post.likes = (post.likedBy || []).length;
      post.liked = !!(req.session.user && post.likedBy?.includes(String(req.session.user.id)));

      if (Array.isArray(post.comments)) {
        post.comments = await Promise.all(post.comments.map(async c => {
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
        post.comments = [];
      }

      return res.json({ post });
    } catch (err) {
      console.error('Error fetching post:', err);
      return res.status(500).json({ message: 'Error fetching post' });
    }
  });

  return router;
};
