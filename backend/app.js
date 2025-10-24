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
}

app.use(cors(corsOptions));

//app.use(
//  cors({
//    origin: FRONTEND_ORIGIN,
//    credentials: true,
//  })
//);



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

const messageSchema = new mongoose.Schema({
  members: [String], // userid
  messages: [String]
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
  deleted: { type: Boolean, default: false }
});

let User, Post, Reel;
try { User = mongoose.model("VeyluUser"); } catch { User = mongoose.model("VeyluUser", userSchema); }
try { Post = mongoose.model("VeyluPost"); } catch { Post = mongoose.model("VeyluPost", postSchema); }
try { Reel = mongoose.model("VeyluReel"); } catch { Reel = mongoose.model("VeyluReel", reelSchema); }
// --- Public helpers ---
app.get("/", async (req, res) => {
  // Embed initial data in the HTML response
  let user = null;

  if (req.session.user) {
    // Fetch user data from MongoDB
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

  // If this is an API request, redirect to frontend
  if (req.headers.accept?.includes('application/json')) {
    return res.redirect(`${FRONTEND_ORIGIN}/`);
  }

  // Otherwise, serve with initial data
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
    // Fetch user data from MongoDB
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

  // Fetch user data from MongoDB
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
// Toggle post like
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

    // Initialize likedBy array if it doesn't exist
    if (!post.likedBy) {
      post.likedBy = [];
    }

    const likedBySet = new Set(post.likedBy.map(String));
    const wasLiked = likedBySet.has(userId);

    if (wasLiked) {
      // Unlike: remove from post
      likedBySet.delete(userId);
      post.likedBy = Array.from(likedBySet);

      // Remove from user's liked posts
      await User.updateOne(
        { githubId: userId },
        { $pull: { likedPostIds: post._id } }
      );
    } else {
      // Like: add to post
      likedBySet.add(userId);
      post.likedBy = Array.from(likedBySet);

      // Add to user's liked posts
      await User.updateOne(
        { githubId: userId },
        { $addToSet: { likedPostIds: post._id } }
      );
    }

    await post.save();

    res.json({
      liked: !wasLiked,
      likes: post.likedBy.length
    });
  } catch (err) {
    console.error("POST /posts/toggle-like failed:", err);
    return res.status(500).json({ message: "Failed to toggle like" });
  }
});

// Get all media from posts by the logged-in user
app.post("/posts/comments/create", async (req, res) => {
  try {
    if (!req.session.user) return res.status(401).json({ message: "You need to be logged in" });
    const postId = req.body.postId;
    const text = req.body.text;

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    console.log(post)
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

        // Add like information
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
              return {
                ...c,
                authorInfo: { deleted: true }
              };
            }
          }));
        } else {
          p.comments = [];
        }
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



// --- Reels ---
// Create a reel (expects a PictShare URL already uploaded from frontend)
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

// All reels (decorate with author info)
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
    }
    res.json({ reels });
  } catch (e) {
    console.error("GET /reels/get-all error:", e);
    res.status(500).json({ message: "Error fetching reels" });
  }
});

// Toggle like
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

// Toggle save
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

// Delete reel (owner only)
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
