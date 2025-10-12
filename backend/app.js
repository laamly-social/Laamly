#!/usr/bin/env node
const express = require("express");
const axios = require("axios");
const mongoose = require("mongoose");
const session = require("express-session");
const cors = require("cors");
require("dotenv").config();

const app = express();

// --- Hardcode local ports/origins for dev ---
const FRONTEND_ORIGIN = "http://localhost:5173";
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
      avatar: u.avatar_url || "",
      verified: false,
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

app.get("/posts/get-all", async (_req, res) => {
  try {
    const posts = await Post.find({}).lean();
    for (const p of posts) {
      try {
        const author = await User.findOne({ githubId: p.author }).lean();
        if (author) {
          p.authorInfo = {
            profile: author.profile,
            handle: author.handle,
            avatar: author.profile.avatar,
            name: author.profile.name
          }
          console.error("loaded author, code is only kinda rubbish -> " + author.handle)
        }
        else {
          console.error("unable to load author, code is literal trash")
        }
        p.authorId = p.author;
        p.createdAt = new Date(p.datePosted).getTime(),
        p.comments = []
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

// --- Start ---
app.listen(PORT, () => {
  console.info("Server is running on port " + PORT);
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
