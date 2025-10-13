#!/usr/bin/env node
const express = require("express");
const axios = require("axios");
const mongoose = require("mongoose");
const session = require("express-session");
const cors = require("cors");
require("dotenv").config();

const app = express();

// --- Hardcode local ports/origins for dev ---
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN;
const PORT = 8080; // hardcoded

app.set("trust proxy", 1);

// --- Core middleware ---
app.use(
  cors({
    origin: FRONTEND_ORIGIN,
    credentials: true,
  })
);
app.use(express.json());
app.use(express.static("public"));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "dev-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      sameSite: "lax",
      httpOnly: true,
      maxAge: 1000 * 60 * 60, // 1h
    },
  })
);

// --- Mongo ---
mongoose.connect(
  `mongodb+srv://vaylu:${process.env.MONGODB_PASSWORD}@cluster0.e1en0n4.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`
);

// --- Schemas/Models ---
const userSchema = new mongoose.Schema({
  githubId: String,
  profile: Object,
  handle: String,
  stats: Object,
  postIds: [mongoose.Schema.Types.ObjectId],
});

const postSchema = new mongoose.Schema({
  content: String,
  author: String, // githubId
  urls: [String], // LINKS ONLY
  datePosted: Date,
  stats: Object,
  deleted: { type: Boolean, default: false }
});

const messageSchema = new mongoose.Schema({
  members: [String], // userid
  messages: [String]
});

let User, Post;
try { User = mongoose.model("VeyluUser"); } catch { User = mongoose.model("VeyluUser", userSchema); }
try { Post = mongoose.model("VeyluPost"); } catch { Post = mongoose.model("VeyluPost", postSchema); }

// --- Public helpers ---
app.get("/", (_, res) => res.redirect(`${FRONTEND_ORIGIN}/`));

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
app.get("/api/github-client-id", (_req, res) => {
  res.json({ clientId: process.env.GITHUB_CLIENT_ID || "" });
});

app.get("/api/me", (req, res) => {
  if (!req.session.user) return res.status(200).json({ user: null });
  const u = req.session.user; // { id, login, avatar_url, ... }
  res.json({
    user: {
      id: String(u.id),
      name: u.login,
      avatar: u.avatar_url || ""
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
// Get all media from posts by the logged-in user
app.get("/posts/getMedia", async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ message: "You need to be logged in" });
    }
    const user = await User.findOne({ githubId: req.session.user.id });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const postIds = user.postIds || [];
    if (!postIds.length) {
      return res.json({ media: [] });
    }
    const posts = await Post.find({ _id: { $in: postIds }, deleted: { $ne: true } }).lean();
    // Collect all media items from posts
    const media = [];
    for (const post of posts) {
      if (Array.isArray(post.urls)) {
        for (const url of post.urls) {
          // Guess kind by extension
          const ext = url.split('.').pop()?.toLowerCase();
          const kind = ["mp4", "webm", "ogg", "mov"].includes(ext) ? "video" : "image";
          media.push({ kind, url });
        }
      }
      if (post.image) {
        media.push({ kind: "image", url: post.image });
      }
    }
    return res.json({ media });
  } catch (err) {
    console.error("Error fetching user media:", err);
    return res.status(500).json({ message: "Error fetching media" });
  }
});


app.post("/posts/delete", async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ message: "You need to be logged in to delete posts" });
    }
    const postId = req.body.id || req.body.content?.id;
    if (!postId) {
      return res.status(400).json({ message: "Missing post id" });
    }
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }
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
      author: String(req.session.user.id), // store githubId
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
            avatar: author.profile.avatar,
            name: author.profile.name,
            isCurrentUser: req.session.user ? (p.author === String(req.session.user.id)) : false
          }
        }
        p.authorId = p.author;
        p.createdAt = new Date(p.datePosted).getTime();
        p.comments = [];
      } catch (e) {
        console.error(`Author fetch error for ${p._id}:`, e);
      }
    }
    console.log(JSON.stringify(req.session))
    return res.json({ posts });
  } catch (err) {
    console.error("Error fetching posts:", err);
    return res.status(500).json({ message: "Error fetching posts" });
  }
});

// --- Start ---
app.listen(PORT, () => {
  console.info("Server is running on port " + PORT + ", started " + new Date().toLocaleTimeString());
});

// User.updateMany(
//   { stats: { $exists: true } },
//   { $set: { stats: { visitors: [], visits: 0 } } },
//   { multi: true }
// ).then((oth) => {
//   console.log(oth);
// }).catch((err) => {
//   console.error(err);
// });
