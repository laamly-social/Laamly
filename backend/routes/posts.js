const express = require('express');
const router = express.Router();

const User = require('../models/User');
const Post = require('../models/Post');
const { sendNotification } = require('../utils/notifications');

const qByUuid = (uuid) => ({ uuid });
const qInUuids = (uuids) => ({ uuid: { $in: uuids } });

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
    const prompt = `Analyze the following social media post.
Images included: ${hasImages ? 'yes' : 'no'}
Respond ONLY with valid JSON in this format:
{
  "isHalal": true,
  "tags": ["tag1", "tag2", "tag3"]
}
Instructions:
- Generate 5-8 relevant hashtags for "tags" (no spaces; use PascalCase or underscores for multi-word tags. Don't make them all caps)
- Set "isHalal" to false if any haram content is detected, true otherwise
- Do NOT include any extra text, markdown, or explanation. The output will be parsed directly.
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

/* ------------------------------------------------------------------
   FEED RANKING HELPERS (halal-weighted + tag similarity)
   ------------------------------------------------------------------ */

const FEED_DEFAULT_PAGE_SIZE = 10;
const FEED_MAX_PAGE_SIZE = 50;
const FEED_LIKED_LOOKBACK_DAYS = 30;
const FEED_CANDIDATE_DAYS = 90;
const FEED_MIN_CANDIDATES = 80;
const FEED_MAX_CANDIDATES = 400;

/** Normalize a tag like "QuranRecitation" or "quran_tafsir" → ["quran","recitation"/"tafsir"] */
function normalizeTagToTokens(tag) {
  if (!tag) return [];
  let s = String(tag);
  s = s.replace(/^#/, ""); // remove leading #
  s = s.replace(/([a-z])([A-Z])/g, "$1_$2"); // split camelCase
  const parts = s
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
  return parts;
}

/** Build per-user token affinity from tags on posts they liked recently */
async function buildUserTagTokenAffinity(viewerUuid) {
  if (!viewerUuid) return {};

  const since = new Date(
    Date.now() - FEED_LIKED_LOOKBACK_DAYS * 24 * 60 * 60 * 1000
  );

  const likedPosts = await Post.find(
    {
      deleted: { $ne: true },
      likedBy: viewerUuid,
      datePosted: { $gte: since },
    },
    { tags: 1 }
  ).lean();

  const tokenCounts = {};

  for (const p of likedPosts) {
    if (!Array.isArray(p.tags)) continue;
    for (const rawTag of p.tags) {
      const tokens = normalizeTagToTokens(rawTag);
      for (const token of tokens) {
        tokenCounts[token] = (tokenCounts[token] || 0) + 1;
      }
    }
  }

  return tokenCounts;
}

/** Score a raw post document using recency, engagement, tags, and halal-ness */
function scorePostForUser(rawPost, tokenAffinity = {}) {
  const now = Date.now();

  const createdAtMs =
    rawPost.datePosted instanceof Date
      ? rawPost.datePosted.getTime()
      : typeof rawPost.datePosted === "string"
      ? new Date(rawPost.datePosted).getTime()
      : now;

  const ageHours = Math.max(0, (now - createdAtMs) / (1000 * 60 * 60));
  // strong within first 24h, then decays
  const recencyScore = 1 / (1 + ageHours / 24);

  const likeCount = Array.isArray(rawPost.likedBy)
    ? rawPost.likedBy.length
    : Number(rawPost.likes || 0);
  const commentCount = Array.isArray(rawPost.comments)
    ? rawPost.comments.length
    : 0;

  const engagementScore = Math.log(1 + likeCount * 2 + commentCount * 1.5);

  // Token-based tag affinity (captures related tags, not just exact strings)
  const tags = Array.isArray(rawPost.tags) ? rawPost.tags : [];
  let tagScore = 0;
  const seenTokens = new Set();

  for (const rawTag of tags) {
    const tokens = normalizeTagToTokens(rawTag);
    for (const token of tokens) {
      if (seenTokens.has(token)) continue;
      seenTokens.add(token);
      const w = tokenAffinity[token] || 0;
      if (w > 0) {
        tagScore += Math.log(1 + w);
      }
    }
  }

  if (seenTokens.size > 0) {
    // small normalization so posts with tons of tags don't explode
    tagScore = tagScore / Math.sqrt(seenTokens.size);
  }

  // Halal multiplier: halal posts stay at full weight, haram posts are heavily downranked
  const halalMultiplier = rawPost.isHalal === false ? 0.3 : 1.0;

  // tiny random jitter so the feed doesn't freeze in one exact order
  const randomJitter = Math.random() * 0.03;

  const base =
    0.4 * recencyScore +
    0.4 * engagementScore +
    0.2 * tagScore;

  return halalMultiplier * base + randomJitter;
}

/** Merge halal and haram lists so feed is halal-heavy but still can show haram content. */
function mergeHalalAndHaram(halalScored, haramScored, halalBatch = 4, haramBatch = 1) {
  const merged = [];
  let iH = 0;
  let iN = 0;

  while (iH < halalScored.length || iN < haramScored.length) {
    // push a batch of halal
    for (let k = 0; k < halalBatch && iH < halalScored.length; k++) {
      merged.push(halalScored[iH++]);
    }
    // then a smaller batch of haram
    for (let k = 0; k < haramBatch && iN < haramScored.length; k++) {
      merged.push(haramScored[iN++]);
    }

    if (iH >= halalScored.length && iN >= haramScored.length) break;
  }

  return merged;
}

/** Hydrate posts with author info, likes, liked, and comment user info (original style) */
async function hydratePosts(rawPosts, req) {
  const posts = rawPosts.map((p) => ({ ...p }));
  const viewer = req.session?.user || null;
  const viewerUuid = viewer ? String(viewer.uuid || viewer.id) : null;

  for (const p of posts) {
    try {
      const author = await User.findOne(qByUuid(p.author)).lean();
      const isCurrentUser = viewerUuid ? String(p.author) === viewerUuid : false;

      p.authorInfo = author
        ? {
            profile: author.profile,
            handle: author.handle,
            avatar: author.profile?.avatar || '',
            name: author.profile?.name || author.handle,
            isCurrentUser
          }
        : { handle: 'unknown', name: 'Unknown', avatar: '', isCurrentUser: false };

      p.authorId = p.author;
      p.createdAt = new Date(p.datePosted).getTime();

      const likedBy = Array.isArray(p.likedBy) ? p.likedBy.map(String) : [];
      p.likes = likedBy.length;
      p.liked = !!(viewerUuid && likedBy.includes(viewerUuid));

      const viewedBy = Array.isArray(p.viewedBy) ? p.viewedBy.map(String) : [];
      p.views = viewedBy.length;

      if (Array.isArray(p.comments)) {
        p.comments = await Promise.all(
          p.comments.map(async (c) => {
            const commenter = await User.findOne(qByUuid(c.author)).lean();
            if (commenter) {
              const commentIsCurrentUser = viewerUuid
                ? String(c.author) === viewerUuid
                : false;
              return {
                ...c,
                authorInfo: {
                  profile: commenter.profile,
                  handle: commenter.handle,
                  avatar: commenter.profile?.avatar || '',
                  name: commenter.profile?.name || commenter.handle,
                  isCurrentUser: commentIsCurrentUser
                }
              };
            } else {
              return { ...c, authorInfo: { deleted: true } };
            }
          })
        );
      } else {
        p.comments = [];
      }
    } catch (e) {
      console.error(`Author fetch error for ${p._id}:`, e);
    }
  }

  return posts;
}

/* ------------------------------------------------------------------
   ROUTES
   ------------------------------------------------------------------ */

module.exports = function createPostsRouter(io, userSockets) {

  // Toggle like
  router.post('/toggle-like', async (req, res) => {
    try {
      if (!req.session.user) return res.status(401).json({ message: 'You need to be logged in' });

      const { postId } = req.body;
      if (!postId) return res.status(400).json({ message: 'Missing post id' });

      const post = await Post.findById(postId);
      if (!post) return res.status(404).json({ message: 'Post not found' });

      const userUuid = String(req.session.user.uuid);
      post.likedBy = post.likedBy || [];

      const likedBySet = new Set(post.likedBy.map(String));
      const wasLiked = likedBySet.has(userUuid);

      if (wasLiked) {
        likedBySet.delete(userUuid);
        post.likedBy = Array.from(likedBySet);
        await User.updateOne(qByUuid(userUuid), { $pull: { likedPostIds: post._id } });
      } else {
        likedBySet.add(userUuid);
        post.likedBy = Array.from(likedBySet);
        await User.updateOne(qByUuid(userUuid), { $addToSet: { likedPostIds: post._id } });

        const currentUser = await User.findOne(qByUuid(userUuid)).lean();
        await sendNotification(io, userSockets, {
          to: String(post.author),
          type: 'like',
          from: userUuid,
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

  // Track view (increment view count for unique viewers)
  router.post('/track-view', async (req, res) => {
    try {
      const { postId } = req.body;
      if (!postId) return res.status(400).json({ message: 'Missing post id' });

      const post = await Post.findById(postId);
      if (!post) return res.status(404).json({ message: 'Post not found' });

      // Track views even for anonymous users - use a session ID or IP if user not logged in
      const viewerId = req.session.user ? String(req.session.user.uuid) : `anon-${req.ip}`;
      
      post.viewedBy = post.viewedBy || [];
      const viewedBySet = new Set(post.viewedBy.map(String));
      
      // Only increment if this viewer hasn't viewed before
      if (!viewedBySet.has(viewerId)) {
        viewedBySet.add(viewerId);
        post.viewedBy = Array.from(viewedBySet);
        await post.save();
      }

      res.json({ views: post.viewedBy.length });
    } catch (err) {
      console.error('POST /posts/track-view failed:', err);
      return res.status(500).json({ message: 'Failed to track view' });
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
        author: String(req.session.user.uuid),
        content: String(text),
        datePosted: new Date(),
        stats: {}
      });
      await post.save();

      const user = await User.findOne(qByUuid(req.session.user.uuid)).lean();
      const currentUserInfo = user ? {
        id: user.uuid,
        uuid: user.uuid,
        handle: user.handle,
        name: user.profile?.name || user.handle,
        avatar: user.profile?.avatar || '',
        profile: user.profile
      } : null;

      await sendNotification(io, userSockets, {
        to: String(post.author),
        type: 'comment',
        from: String(req.session.user.uuid),
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
      if (String(post.author) !== String(req.session.user.uuid)) {
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
      if (String(post.author) !== String(req.session.user.uuid)) {
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
      if (String(post.author) !== String(req.session.user.uuid)) {
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
      if (String(post.author) !== String(req.session.user.uuid)) {
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
        author: String(req.session.user.uuid),
        tags: aiAnalysis.tags,
        isHalal: aiAnalysis.isHalal
      });

      await User.updateOne(qByUuid(req.session.user.uuid), { $push: { postIds: post._id } });

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

  // Personalized halal-weighted feed with pagination
  // GET /posts/feed?page=1&pageSize=10
  router.get('/feed', async (req, res) => {
    try {
      const viewer = req.session?.user || null;
      const viewerUuid = viewer ? String(viewer.uuid || viewer.id) : null;

      const page = Math.max(1, parseInt(req.query.page, 10) || 1);
      const requestedSize = parseInt(req.query.pageSize, 10) || FEED_DEFAULT_PAGE_SIZE;
      const pageSize = Math.min(requestedSize, FEED_MAX_PAGE_SIZE);

      const since = new Date(Date.now() - FEED_CANDIDATE_DAYS * 24 * 60 * 60 * 1000);
      const candidateLimit = Math.min(
        Math.max(page * pageSize * 4, FEED_MIN_CANDIDATES),
        FEED_MAX_CANDIDATES
      );

      // Pull candidate posts and user affinity in parallel
      const [rawPosts, tokenAffinity] = await Promise.all([
        Post.find({
          deleted: { $ne: true },
          datePosted: { $gte: since },
        })
          .sort({ datePosted: -1 })
          .limit(candidateLimit)
          .lean(),
        buildUserTagTokenAffinity(viewerUuid),
      ]);

      // Score raw posts first (cheaper), then merge halal and haram
      const scored = rawPosts.map((p) => ({
        raw: p,
        score: scorePostForUser(p, tokenAffinity),
      }));

      const halal = scored
        .filter((x) => x.raw.isHalal !== false)
        .sort((a, b) => b.score - a.score);

      const haram = scored
        .filter((x) => x.raw.isHalal === false)
        .sort((a, b) => b.score - a.score);

      const merged = mergeHalalAndHaram(halal, haram).map((x) => x.raw);

      const total = merged.length;
      const start = (page - 1) * pageSize;
      const end = start + pageSize;
      const pageRaw = merged.slice(start, end);

      // Hydrate only the page we’re returning
      const hydrated = await hydratePosts(pageRaw, req);

      return res.json({
        posts: hydrated,
        page,
        pageSize,
        total,
        hasMore: end < total,
      });
    } catch (err) {
      console.error('GET /posts/feed failed:', err);
      return res.status(500).json({ message: 'Failed to build feed' });
    }
  });

  // Get all posts (legacy / admin / debugging)
  router.get('/get-all', async (req, res) => {
    try {
      const postsRaw = await Post.find({ deleted: { $ne: true } }).lean();
      const posts = await hydratePosts(postsRaw, req);
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
      const postRaw = await Post.findById(id).lean();

      if (!postRaw || postRaw.deleted) {
        return res.status(404).json({ message: 'Post not found' });
      }

      const [post] = await hydratePosts([postRaw], req);
      return res.json({ post });
    } catch (err) {
      console.error('Error fetching post:', err);
      return res.status(500).json({ message: 'Error fetching post' });
    }
  });

  return router;
};
