#!/usr/bin/env node
const express = require("express");
const axios = require("axios");
const mongoose = require("mongoose");
const session = require("express-session");
const cors = require("cors");
const dns = require("dns");               // ✅ DNS workaround
const http = require("http");             // ✅ Add http for Socket.IO
const { Server } = require("socket.io");  // ✅ Add Socket.IO
require("dotenv").config();

// ---------- DNS workaround for SRV on restrictive networks ----------
try {
  // Prefer IPv4 first (avoids some resolver edge cases)
  dns.setDefaultResultOrder?.("ipv4first");
  // Use public resolvers so SRV lookups to Atlas don't get blocked by campus DNS
  dns.setServers(["1.1.1.1", "8.8.8.8"]);
  console.info("[DNS] Using resolvers:", dns.getServers());
} catch (e) {
  console.warn("[DNS] Could not set custom DNS servers:", e?.message || e);
}

const app = express();
const server = http.createServer(app); // ✅ Create HTTP server

// --- Hardcode local ports/origins for dev ---
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN;
const PORT = 8080; // hardcoded

app.set("trust proxy", 1);

// --- Core middleware ---
const allowedOrigins = [
  "https://laamly.com",
  "https://laamly.hnasheralneam.dev",
  "http://localhost:5177",
  "http://localhost:5175"
];

const corsOptions =  {
  origin: (origin, callback) => {
    if (allowedOrigins.includes(origin) || !origin) {
      callback(null, true);
    } else {
      callback(new Error("CORS- REJECTED! Nobody loves you"));
    }
  },
  credentials: true
};

app.use(cors(corsOptions));
// app.use(cors({ origin: FRONTEND_ORIGIN, credentials: true }));

// ✅ Initialize Socket.IO with CORS
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true
  }
});

app.use(express.json());
app.use(express.static("public"));

const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || "dev-secret",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    sameSite: "lax",
    httpOnly: true,
    maxAge: 1000 * 60 * 60, // 1h
  },
});

app.use(sessionMiddleware);

// ✅ Share session with Socket.IO - Wrap middleware for Socket.IO compatibility
const wrap = middleware => (socket, next) => middleware(socket.request, {}, next);
io.use(wrap(sessionMiddleware));

// Add logging for Socket.IO connections
io.use((socket, next) => {
  const session = socket.request.session;
  console.log("Socket.IO connection attempt - Session data:", {
    hasSession: !!session,
    hasUser: !!session?.user,
    userId: session?.user?.id,
    socketId: socket.id
  });
  next();
});

// ---------- Mongo connection (robust) ----------
const MONGODB_URI =
  process.env.MONGODB_URI ||
  `mongodb+srv://vaylu:${encodeURIComponent(process.env.MONGODB_PASSWORD || "")}` +
  `@cluster0.e1en0n4.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// --- Schemas/Models ---
const userSchema = new mongoose.Schema({
  githubId: String,
  profile: Object,
  handle: String,
  stats: Object,
  postIds: [mongoose.Schema.Types.ObjectId],
  likedPostIds: [mongoose.Schema.Types.ObjectId], // Posts this user has liked
});

const postSchema = new mongoose.Schema({
  content: String,
  author: String, // githubId
  urls: [String], // LINKS ONLY
  datePosted: Date,
  stats: Object,
  deleted: { type: Boolean, default: false },
  likedBy: [String], // Array of githubIds who liked this post
  comments: [{
    author: String,
    content: String,
    datePosted: Date,
    stats: Object
  }]
});

const chatSchema = new mongoose.Schema({
  members: [String], // githubId array
  messages: [{
    from: String,     // githubId of sender
    text: String,
    attachments: [String], // URLs to uploaded files
    ts: { type: Date, default: Date.now },
    read: { type: Boolean, default: false },
    edited: { type: Boolean, default: false },
    reactions: [{
      userId: String,
      emoji: String
    }]
  }],
  lastMessage: String,
  lastMessageTs: Date,
  isGroup: { type: Boolean, default: false },
  groupName: String,
  groupAvatar: String,
  unreadCount: {
    type: Map,
    of: Number,
    default: {}
  }, // Map of userId -> unread count
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// --- Reels Schema/Model ---
const reelSchema = new mongoose.Schema({
  author: String,               // githubId
  title: String,
  description: String,
  src: String,                  // single video link (PictShare)
  datePosted: { type: Date, default: Date.now },
  likedBy: [String],            // githubId list
  savedBy: [String],            // githubId list
  deleted: { type: Boolean, default: false },
  comments: [{
    author: String,             // githubId
    content: String,
    datePosted: Date,
    stats: Object
  }]
});

let User, Post, Reel, Chat;
try { User = mongoose.model("VeyluUser"); } catch { User = mongoose.model("VeyluUser", userSchema); }
try { Post = mongoose.model("VeyluPost"); } catch { Post = mongoose.model("VeyluPost", postSchema); }
try { Reel = mongoose.model("VeyluReel"); } catch { Reel = mongoose.model("VeyluReel", reelSchema); }
try { Chat = mongoose.model("LaamlyChat"); } catch { Chat = mongoose.model("LaamlyChat", chatSchema); }

// ✅ Track user socket connections
const userSockets = new Map(); // userId -> Set of socketIds

// ✅ Socket.IO connection handling
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // ✅ Store user session info in socket
  const session = socket.request.session;
  if (session?.user?.id) {
    socket.userId = String(session.user.id);

    // Track this socket for this user
    if (!userSockets.has(socket.userId)) {
      userSockets.set(socket.userId, new Set());
    }
    userSockets.get(socket.userId).add(socket.id);

    console.log(`Socket ${socket.id} authenticated as user ${socket.userId}`);
  } else {
    console.warn(`Socket ${socket.id} connected without authentication`);
  }

  // Join thread room
  socket.on("join-thread", (threadId) => {
    socket.join(threadId);
    console.log(`Socket ${socket.id} joined thread ${threadId}`);
  });

  // Leave thread room
  socket.on("leave-thread", (threadId) => {
    socket.leave(threadId);
    console.log(`Socket ${socket.id} left thread ${threadId}`);
  });

  // Handle typing indicators
  socket.on("typing-start", async (data) => {
    try {
      const { threadId } = data;
      console.log(`typing-start received - socketId: ${socket.id}, threadId: ${threadId}, userId: ${socket.userId}`);

      if (!socket.userId) {
        console.warn("typing-start: No userId on socket");
        return;
      }

      // Get user info for display
      const user = await User.findOne({ githubId: socket.userId }).lean();
      const userName = user?.profile?.name || user?.handle || "Someone";

      console.log(`Broadcasting typing-start from user ${userName} (${socket.userId}) to thread ${threadId}`);

      // Broadcast to others in the room (excluding sender)
      socket.to(threadId).emit("user-typing", {
        threadId,
        userId: socket.userId,
        userName: userName,
        isTyping: true
      });
    } catch (err) {
      console.error("Error handling typing start:", err);
    }
  });

  socket.on("typing-stop", async (data) => {
    try {
      const { threadId } = data;
      console.log(`typing-stop received - socketId: ${socket.id}, threadId: ${threadId}, userId: ${socket.userId}`);

      if (!socket.userId) {
        console.warn("typing-stop: No userId on socket");
        return;
      }

      // Get user info for display
      const user = await User.findOne({ githubId: socket.userId }).lean();
      const userName = user?.profile?.name || user?.handle || "Someone";

      console.log(`Broadcasting typing-stop from user ${userName} (${socket.userId}) to thread ${threadId}`);

      socket.to(threadId).emit("user-typing", {
        threadId,
        userId: socket.userId,
        userName: userName,
        isTyping: false
      });
    } catch (err) {
      console.error("Error handling typing stop:", err);
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);

    // ✅ Remove socket from user tracking
    if (socket.userId && userSockets.has(socket.userId)) {
      userSockets.get(socket.userId).delete(socket.id);
      if (userSockets.get(socket.userId).size === 0) {
        userSockets.delete(socket.userId);
      }
    }
  });
});

// --- Public helpers ---
app.get("/", async (req, res) => {
  let user = null;

  if (req.session.user) {
    const dbUser = await User.findOne({ githubId: req.session.user.id }).lean();
    if (dbUser) {
      user = {
        id: String(req.session.user.id),
        name: dbUser.profile?.name || dbUser.handle,
        avatar: dbUser.profile?.avatar || ""
      };
    }
  }

  const initialData = {
    githubClientId: process.env.GITHUB_CLIENT_ID || "",
    user
  };

  if (req.headers.accept?.includes('application/json')) {
    return res.redirect(`${FRONTEND_ORIGIN}/`);
  }

  res.redirect(`${FRONTEND_ORIGIN}/?data=${encodeURIComponent(JSON.stringify(initialData))}`);
});

app.get("/logout", (req, res) => {
  if (!req.session) return res.redirect(`${FRONTEND_ORIGIN}/logged-out`);
  req.session.destroy(err => {
    if (err) {
      console.error("Logout error:", err);
      return res.status(500).send("Logout failed");
    }
    res.clearCookie("connect.sid", { path: "/" });
    return res.redirect(`${FRONTEND_ORIGIN}/logged-out`);
  });
});

// --- Lightweight API used by frontend ---
app.get("/api/initial-data", async (req, res) => {
  let user = null;

  if (req.session.user) {
    const dbUser = await User.findOne({ githubId: req.session.user.id }).lean();
    if (dbUser) {
      user = {
        id: String(req.session.user.id),
        name: dbUser.profile?.name || dbUser.handle,
        avatar: dbUser.profile?.avatar || ""
      };
    }
  }

  const initialData = {
    githubClientId: process.env.GITHUB_CLIENT_ID || "",
    user
  };
  res.json(initialData);
});

app.get("/api/github-client-id", (_req, res) => {
  res.json({ clientId: process.env.GITHUB_CLIENT_ID || "" });
});

app.get("/api/me", async (req, res) => {
  if (!req.session.user) return res.status(200).json({ user: null });

  const dbUser = await User.findOne({ githubId: req.session.user.id }).lean();
  if (!dbUser) return res.status(200).json({ user: null });

  res.json({
    user: {
      id: String(req.session.user.id),
      name: dbUser.profile?.name || dbUser.handle,
      avatar: dbUser.profile?.avatar || ""
    }
  });
});

app.get("/is-logged-in", (req, res) => {
  res.json({ loggedIn: !!req.session.user });
});

// --- GitHub OAuth ---
app.get("/auth/github", (req, res) => {
  const requestToken = req.query.code;
  axios({
    method: "post",
    url: `https://github.com/login/oauth/access_token?client_id=${process.env.GITHUB_CLIENT_ID}&client_secret=${process.env.GITHUB_CLIENT_SECRET}&code=${requestToken}`,
    headers: { accept: "application/json" },
  })
    .then(({ data }) => {
      req.session.github_access_token = data.access_token;
      res.redirect("/github/login");
    })
    .catch(err => {
      console.error("GitHub token error:", err);
      res.status(500).send("OAuth failed");
    });
});

app.get("/github/login", (req, res) => {
  axios({
    method: "get",
    url: `https://api.github.com/user`,
    headers: { Authorization: `token ${req.session.github_access_token}` },
  })
    .then(async ({ data }) => {
      req.session.user = data; // { id, login, avatar_url, bio, ... }
      const exists = await User.findOne({ githubId: data.id });
      if (!exists) {
        await new User({
          githubId: data.id,
          handle: data.login,
          profile: {
            description: data.bio,
            name: data.name,
            avatar: data.avatar_url
          },
          postIds: [],
        }).save();
      }
      res.redirect(FRONTEND_ORIGIN);
    })
    .catch(err => {
      console.error("GitHub profile error:", err);
      res.status(500).send("Login failed");
    });
});

// --- Posts ---
app.post("/posts/toggle-like", async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ message: "You need to be logged in" });
    }

    const { postId } = req.body;
    if (!postId) {
      return res.status(400).json({ message: "Missing post id" });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const userId = String(req.session.user.id);
    if (!post.likedBy) post.likedBy = [];

    const likedBySet = new Set(post.likedBy.map(String));
    const wasLiked = likedBySet.has(userId);

    if (wasLiked) {
      likedBySet.delete(userId);
      post.likedBy = Array.from(likedBySet);
      await User.updateOne({ githubId: userId }, { $pull: { likedPostIds: post._id } });
    } else {
      likedBySet.add(userId);
      post.likedBy = Array.from(likedBySet);
      await User.updateOne({ githubId: userId }, { $addToSet: { likedPostIds: post._id } });
    }

    await post.save();
    res.json({ liked: !wasLiked, likes: post.likedBy.length });
  } catch (err) {
    console.error("POST /posts/toggle-like failed:", err);
    return res.status(500).json({ message: "Failed to toggle like" });
  }
});

app.post("/posts/comments/create", async (req, res) => {
  try {
    if (!req.session.user) return res.status(401).json({ message: "You need to be logged in" });
    const postId = req.body.postId;
    const text = req.body.text;

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    post.comments.push({
      author: String(req.session.user.id),
      content: String(text),
      datePosted: new Date(),
      stats: {}
    });
    await post.save();

    const user = await User.findOne({ githubId: req.session.user.id }).lean();
    const currentUserInfo = user ? {
      id: req.session.user.id,
      handle: user.handle,
      name: user.profile?.name || user.handle,
      avatar: user.profile?.avatar || "",
      profile: user.profile
    } : null;

    return res.json({ message: "Comment added", currentUser: currentUserInfo });
  } catch (e) {
    console.error("POST /posts/comments/create failed:", e);
    return res.status(500).json({ message: "Failed to add comment" });
  }
});

app.get("/posts/getMedia", async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ message: "You need to be logged in" });
    }
    const user = await User.findOne({ githubId: req.session.user.id });
    if (!user) return res.status(404).json({ message: "User not found" });

    const postIds = user.postIds || [];
    if (!postIds.length) return res.json({ media: [] });

    const posts = await Post.find({ _id: { $in: postIds }, deleted: { $ne: true } }).lean();
    const media = [];
    for (const post of posts) {
      if (Array.isArray(post.urls)) {
        for (const url of post.urls) {
          const ext = url.split('.').pop()?.toLowerCase();
          const kind = ["mp4", "webm", "ogg", "mov"].includes(ext) ? "video" : "image";
          media.push({ kind, url });
        }
      }
      if (post.image) media.push({ kind: "image", url: post.image });
    }
    return res.json({ media });
  } catch (err) {
    console.error("Error fetching user media:", err);
    return res.status(500).json({ message: "Error fetching media" });
  }
});

app.post("/posts/delete", async (req, res) => {
  try {
    if (!req.session.user) return res.status(401).json({ message: "You need to be logged in to delete posts" });
    const postId = req.body.id || req.body.content?.id;
    if (!postId) return res.status(400).json({ message: "Missing post id" });

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: "Post not found" });
    if (String(post.author) !== String(req.session.user.id)) {
      return res.status(403).json({ message: "You can only delete your own posts" });
    }

    await Post.updateOne({ _id: postId }, { $set: { deleted: true } });
    return res.json({ message: "Post deleted successfully", postId });
  } catch (err) {
    console.error("POST /posts/delete failed:", err);
    return res.status(500).json({ message: "Failed to delete post" });
  }
});

app.post("/posts/create", async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ message: "You need to be logged in to post" });
    }

    const post = await Post.create({
      content: req.body.content,
      urls: Array.isArray(req.body.urls) ? req.body.urls : [],
      datePosted: req.body.datePosted ? new Date(req.body.datePosted) : new Date(),
      author: String(req.session.user.id),
    });

    await User.updateOne({ githubId: String(req.session.user.id) }, { $push: { postIds: post._id } });
    return res.status(201).json({ message: "Post created successfully!", postId: post._id });
  } catch (err) {
    console.error("POST /posts/create failed:", err);
    return res.status(500).json({ message: "Failed to create post" });
  }
});

app.get("/posts/get-all", async (req, res) => {
  try {
    const posts = await Post.find({ deleted: { $ne: true } }).lean();
    for (const p of posts) {
      try {
        const author = await User.findOne({ githubId: p.author }).lean();
        if (author) {
          p.authorInfo = {
            profile: author.profile,
            handle: author.handle,
            avatar: author.profile?.avatar,
            name: author.profile?.name,
            isCurrentUser: req.session.user ? (p.author === String(req.session.user.id)) : false
          };
        }
        p.authorId = p.author;
        p.createdAt = new Date(p.datePosted).getTime();

        p.likes = (p.likedBy || []).length;
        p.liked = !!(req.session.user && p.likedBy?.includes(String(req.session.user.id)));

        if (Array.isArray(p.comments)) {
          p.comments = await Promise.all(p.comments.map(async c => {
            const commenter = await User.findOne({ githubId: c.author }).lean();
            if (commenter) {
              return {
                ...c,
                authorInfo: {
                  profile: commenter.profile,
                  handle: commenter.handle,
                  avatar: commenter.profile?.avatar || "",
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
    console.error("Error fetching posts:", err);
    return res.status(500).json({ message: "Error fetching posts" });
  }
});

// --- Reels ---
app.post("/reels/create", async (req, res) => {
  try {
    if (!req.session.user) return res.status(401).json({ message: "You need to be logged in" });
    const { title = "", description = "", src } = req.body || {};
    if (!src) return res.status(400).json({ message: "Missing video src" });

    const reel = await Reel.create({
      author: String(req.session.user.id),
      title,
      description,
      src,
      datePosted: new Date()
    });

    return res.status(201).json({ message: "Reel created", reelId: reel._id });
  } catch (e) {
    console.error("POST /reels/create failed:", e);
    return res.status(500).json({ message: "Failed to create reel" });
  }
});

app.get("/reels/get-all", async (req, res) => {
  try {
    const reels = await Reel.find({ deleted: { $ne: true } }).sort({ datePosted: -1 }).lean();
    for (const r of reels) {
      const author = await User.findOne({ githubId: r.author }).lean();
      r.authorInfo = author ? {
        handle: author.handle,
        name: author.profile?.name || author.handle,
        avatar: author.profile?.avatar || "",
        isCurrentUser: req.session.user ? (r.author === String(req.session.user.id)) : false
      } : { handle: "unknown", name: "Unknown", avatar: "", isCurrentUser: false };

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
                avatar: commenter.profile?.avatar || "",
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
    console.error("GET /reels/get-all error:", e);
    res.status(500).json({ message: "Error fetching reels" });
  }
});

app.post("/reels/toggle-like", async (req, res) => {
  try {
    if (!req.session.user) return res.status(401).json({ message: "Login required" });
    const { id } = req.body || {};
    const uid = String(req.session.user.id);
    const reel = await Reel.findById(id);
    if (!reel) return res.status(404).json({ message: "Reel not found" });

    const set = new Set(reel.likedBy?.map(String) || []);
    set.has(uid) ? set.delete(uid) : set.add(uid);
    reel.likedBy = Array.from(set);
    await reel.save();
    res.json({ liked: set.has(uid), likes: reel.likedBy.length });
  } catch (e) {
    console.error("POST /reels/toggle-like error:", e);
    res.status(500).json({ message: "Failed" });
  }
});

app.post("/reels/toggle-save", async (req, res) => {
  try {
    if (!req.session.user) return res.status(401).json({ message: "Login required" });
    const { id } = req.body || {};
    const uid = String(req.session.user.id);
    const reel = await Reel.findById(id);
    if (!reel) return res.status(404).json({ message: "Reel not found" });

    const set = new Set(reel.savedBy?.map(String) || []);
    set.has(uid) ? set.delete(uid) : set.add(uid);
    reel.savedBy = Array.from(set);
    await reel.save();
    res.json({ saved: set.has(uid) });
  } catch (e) {
    console.error("POST /reels/toggle-save error:", e);
    res.status(500).json({ message: "Failed" });
  }
});

app.post("/reels/delete", async (req, res) => {
  try {
    if (!req.session.user) return res.status(401).json({ message: "Login required" });
    const { id } = req.body || {};
    const reel = await Reel.findById(id);
    if (!reel) return res.status(404).json({ message: "Reel not found" });
    if (String(reel.author) !== String(req.session.user.id)) return res.status(403).json({ message: "Not your reel" });
    await Reel.updateOne({ _id: id }, { $set: { deleted: true } });
    res.json({ message: "Reel deleted", id });
  } catch (e) {
    console.error("POST /reels/delete error:", e);
    res.status(500).json({ message: "Failed" });
  }
});

app.post("/reels/comments/create", async (req, res) => {
  try {
    if (!req.session.user) return res.status(401).json({ message: "You need to be logged in" });
    const { reelId, text } = req.body || {};
    if (!reelId || !text?.trim()) return res.status(400).json({ message: "Missing reelId or text" });

    const reel = await Reel.findById(reelId);
    if (!reel) return res.status(404).json({ message: "Reel not found" });

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
      avatar: user.profile?.avatar || "",
      profile: user.profile
    } : null;

    return res.json({ message: "Comment added", currentUser: currentUserInfo });
  } catch (e) {
    console.error("POST /reels/comments/create failed:", e);
    return res.status(500).json({ message: "Failed to add comment" });
  }
});

// --- User search for messages ---
app.get("/api/users/search", async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ message: "You need to be logged in" });
    }

    const query = req.query.q;
    if (!query || query.trim().length < 2) {
      return res.json({ users: [] });
    }

    const searchRegex = new RegExp(query.trim(), "i");
    const users = await User.find({
      $or: [
        { handle: searchRegex },
        { "profile.name": searchRegex }
      ]
    }).limit(20).lean();

    const results = users.map(u => ({
      id: u.githubId,
      githubId: u.githubId,
      name: u.profile?.name || u.handle,
      handle: u.handle,
      avatar: u.profile?.avatar || ""
    }));

    res.json({ users: results });
  } catch (err) {
    console.error("Error searching users:", err);
    return res.status(500).json({ message: "Error searching users" });
  }
});

// --- Messages/Threads endpoints ---
app.get("/api/messages/threads", async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ message: "You need to be logged in" });
    }

    const userId = String(req.session.user.id);

    // Find all chats where user is a member
    const chats = await Chat.find({
      members: userId
    }).sort({ lastMessageTs: -1 }).lean();

    // Get participant details for each chat
    const threadsWithParticipants = await Promise.all(chats.map(async (chat) => {
      const otherMemberIds = chat.members.filter(m => m !== userId);
      const participants = await User.find({
        githubId: { $in: otherMemberIds }
      }).lean();

      const participantData = participants.map(u => ({
        id: u.githubId,
        githubId: u.githubId,
        name: u.profile?.name || u.handle,
        handle: u.handle,
        avatar: u.profile?.avatar || ""
      }));

      // Get unread count for this user
      const unreadCount = chat.unreadCount?.get?.(userId) || 0;

      console.log("userid:" + userId)
      return {
        id: chat._id.toString(),
        participantIds: otherMemberIds,
        participants: participantData,
        last: chat.lastMessage || "",
        lastTs: chat.lastMessageTs ? new Date(chat.lastMessageTs).getTime() : Date.now(),
        messages: chat.messages.map(m => ({
          id: m._id.toString(),
          from: m.from === userId ? "me" : m.from,
          text: m.text || "",
          ts: new Date(m.ts).getTime(),
          attachments: m.attachments || [],
          read: m.read || false,
          edited: m.edited || false,
          reactions: m.reactions || []
        })),
        unread: unreadCount > 0,
        isGroup: chat.isGroup || false,
        groupName: chat.groupName,
        groupAvatar: chat.groupAvatar
      };
    }));

    res.json({ threads: threadsWithParticipants });
  } catch (err) {
    console.error("Error fetching threads:", err);
    return res.status(500).json({ message: "Error fetching threads" });
  }
});

app.get("/api/messages/threads/:threadId", async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ message: "You need to be logged in" });
    }

    const { threadId } = req.params;
    const userId = String(req.session.user.id);

    const chat = await Chat.findById(threadId).lean();
    if (!chat) {
      return res.status(404).json({ message: "Thread not found" });
    }

    // Verify user is a member
    if (!chat.members.includes(userId)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // Mark messages as read for this user
    await Chat.updateOne(
      { _id: threadId },
      {
        $set: {
          "messages.$[].read": true,
          [`unreadCount.${userId}`]: 0
        }
      }
    );

    const messages = chat.messages.map(m => ({
      id: m._id.toString(),
      from: m.from === userId ? "me" : m.from,
      text: m.text || "",
      ts: new Date(m.ts).getTime(),
      attachments: m.attachments || [],
      read: true,
      edited: m.edited || false,
      reactions: m.reactions || []
    }));

    res.json({ messages });
  } catch (err) {
    console.error("Error fetching thread messages:", err);
    return res.status(500).json({ message: "Error fetching messages" });
  }
});

app.post("/api/messages/send", async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ message: "You need to be logged in" });
    }

    const { threadId, text, attachments } = req.body;
    const userId = String(req.session.user.id);

    const chat = await Chat.findById(threadId);
    if (!chat) {
      return res.status(404).json({ message: "Thread not found" });
    }

    // Verify user is a member
    if (!chat.members.includes(userId)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // Create new message
    const newMessage = {
      from: userId,
      text: text || "",
      attachments: attachments || [],
      ts: new Date(),
      read: false,
      edited: false,
      reactions: []
    };

    chat.messages.push(newMessage);
    chat.lastMessage = text || `${(attachments || []).length} file${(attachments || []).length === 1 ? "" : "s"}`;
    chat.lastMessageTs = new Date();
    chat.updatedAt = new Date();

    // Increment unread count for other members
    chat.members.forEach(memberId => {
      if (memberId !== userId) {
        const currentCount = chat.unreadCount?.get(memberId) || 0;
        chat.unreadCount.set(memberId, currentCount + 1);
      }
    });

    await chat.save();

    // ✅ Get the saved message with its _id
    const savedMessage = chat.messages[chat.messages.length - 1];

    // ✅ Get sender info
    const sender = await User.findOne({ githubId: userId }).lean();

    // ✅ Emit real-time message to all OTHER clients in the thread (not sender)
    const messageData = {
      threadId,
      message: {
        id: savedMessage._id.toString(),
        from: userId,
        text: text || "",
        ts: new Date(savedMessage.ts).getTime(),
        attachments: attachments || [],
        read: false,
        edited: false,
        reactions: [],
        sender: {
          id: userId,
          name: sender?.profile?.name || sender?.handle || "Unknown",
          handle: sender?.handle || "unknown",
          avatar: sender?.profile?.avatar || ""
        }
      }
    };

    // Get all sockets in the room
    const socketsInRoom = await io.in(threadId).fetchSockets();

    // Emit to all sockets EXCEPT the sender's
    const senderSocketIds = userSockets.get(userId) || new Set();
    for (const socket of socketsInRoom) {
      if (!senderSocketIds.has(socket.id)) {
        socket.emit("new-message", messageData);
      }
    }

    res.json({
      message: "Message sent",
      messageId: savedMessage._id,
      attachments: attachments || []
    });
  } catch (err) {
    console.error("Error sending message:", err);
    return res.status(500).json({ message: "Error sending message" });
  }
});

app.post("/api/messages/threads/create", async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ message: "You need to be logged in" });
    }

    const { participantIds, isGroup, groupName, groupAvatar } = req.body;
    const userId = String(req.session.user.id);

    // Include current user in members
    const allMembers = [userId, ...participantIds];

    // Check if a chat already exists with these exact members (for non-group chats)
    if (!isGroup && participantIds.length === 1) {
      const existingChat = await Chat.findOne({
        members: { $all: allMembers, $size: allMembers.length },
        isGroup: false
      });

      if (existingChat) {
        // Return existing chat
        const participants = await User.find({
          githubId: { $in: participantIds }
        }).lean();

        const participantData = participants.map(u => ({
          id: u.githubId,
          githubId: u.githubId,
          name: u.profile?.name || u.handle,
          handle: u.handle,
          avatar: u.profile?.avatar || ""
        }));

        return res.json({
          threadId: existingChat._id.toString(),
          participants: participantData,
          existing: true
        });
      }
    }

    // Create new chat
    const newChat = new Chat({
      members: allMembers,
      messages: [],
      lastMessage: "",
      lastMessageTs: new Date(),
      isGroup: isGroup || false,
      groupName: groupName || null,
      groupAvatar: groupAvatar || null,
      unreadCount: new Map(),
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await newChat.save();

    // Fetch participant info
    const participants = await User.find({
      githubId: { $in: participantIds }
    }).lean();

    const participantData = participants.map(u => ({
      id: u.githubId,
      githubId: u.githubId,
      name: u.profile?.name || u.handle,
      handle: u.handle,
      avatar: u.profile?.avatar || ""
    }));

    res.json({
      threadId: newChat._id.toString(),
      participants: participantData,
      isGroup: newChat.isGroup,
      groupName: newChat.groupName,
      groupAvatar: newChat.groupAvatar
    });
  } catch (err) {
    console.error("Error creating thread:", err);
    return res.status(500).json({ message: "Error creating thread" });
  }
});

// Add reaction to a message
app.post("/api/messages/react", async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ message: "You need to be logged in" });
    }

    const { threadId, messageId, emoji } = req.body;
    const userId = String(req.session.user.id);

    const chat = await Chat.findById(threadId);
    if (!chat) {
      return res.status(404).json({ message: "Thread not found" });
    }

    if (!chat.members.includes(userId)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const message = chat.messages.id(messageId);
    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    // Check if user already reacted with this emoji
    const existingReaction = message.reactions.find(
      r => r.userId === userId && r.emoji === emoji
    );

    if (existingReaction) {
      // Remove reaction
      message.reactions = message.reactions.filter(
        r => !(r.userId === userId && r.emoji === emoji)
      );
    } else {
      // Add reaction
      message.reactions.push({ userId, emoji });
    }

    await chat.save();

    // ✅ Emit real-time reaction update
    io.to(threadId).emit("message-reaction", {
      threadId,
      messageId,
      reactions: message.reactions
    });

    res.json({ message: "Reaction updated", reactions: message.reactions });
  } catch (err) {
    console.error("Error reacting to message:", err);
    return res.status(500).json({ message: "Error reacting to message" });
  }
});

// Edit a message
app.post("/api/messages/edit", async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ message: "You need to be logged in" });
    }

    const { threadId, messageId, text } = req.body;
    const userId = String(req.session.user.id);

    const chat = await Chat.findById(threadId);
    if (!chat) {
      return res.status(404).json({ message: "Thread not found" });
    }

    const message = chat.messages.id(messageId);
    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    // Only allow editing own messages
    if (message.from !== userId) {
      return res.status(403).json({ message: "Can only edit your own messages" });
    }

    message.text = text;
    message.edited = true;
    chat.updatedAt = new Date();

    await chat.save();
    res.json({ message: "Message edited" });
  } catch (err) {
    console.error("Error editing message:", err);
    return res.status(500).json({ message: "Error editing message" });
  }
});

// Delete a message
app.post("/api/messages/delete", async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ message: "You need to be logged in" });
    }

    const { threadId, messageId } = req.body;
    const userId = String(req.session.user.id);

    const chat = await Chat.findById(threadId);
    if (!chat) {
      return res.status(404).json({ message: "Thread not found" });
    }

    const message = chat.messages.id(messageId);
    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    // Only allow deleting own messages
    if (message.from !== userId) {
      return res.status(403).json({ message: "Can only delete your own messages" });
    }

    message.remove();
    chat.updatedAt = new Date();

    // Update last message if this was the last one
    if (chat.messages.length > 0) {
      const lastMsg = chat.messages[chat.messages.length - 1];
      chat.lastMessage = lastMsg.text || `${(lastMsg.attachments || []).length} file${(lastMsg.attachments.length !== 1 ? "s" : "")}`;
      chat.lastMessageTs = lastMsg.ts;
    } else {
      chat.lastMessage = "";
      chat.lastMessageTs = new Date();
    }

    await chat.save();
    res.json({ message: "Message deleted" });
  } catch (err) {
    console.error("Error deleting message:", err);
    return res.status(500).json({ message: "Error deleting message" });
  }
});

// ---------- Start server AFTER DB is reachable ----------
(async () => {
  console.info("Connecting to MongoDB...");
  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 15000,
    });
    console.info("✅ MongoDB connected");
    server.listen(PORT, () => {
      console.info("Server is running on port " + PORT + ", started " + new Date().toLocaleTimeString());
    });
  } catch (err) {
    console.error("❌ MongoDB connect failed:", err?.message || err);
    console.error("Tip: set MONGODB_URI to the non-SRV 'mongodb://' string if your network blocks SRV lookups.");
    process.exit(1);
  }
})();

// User.updateMany(
//   { stats: { $exists: true } },
//   { $set: { stats: { visitors: [], visits: 0 } } },
//   { multi: true }
// ).then((oth) => {
//   console.log(oth);
// }).catch((err) => {
//   console.error(err);
// });
