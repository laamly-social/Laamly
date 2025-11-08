#!/usr/bin/env node
const express = require("express");
const axios = require("axios");
const mongoose = require("mongoose");
const session = require("express-session");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
require("dotenv").config();

const app = express();
const server = http.createServer(app);

// ---------- Networking & CORS ----------
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN;
const PORT = process.env.PORT || 8080;

app.set("trust proxy", 1);

const allowedOrigins = [
  "https://laamly.com",
  "https://laamly.hnasheralneam.dev",
  "http://localhost:5177",
];

const corsOptions = {
  origin: (origin, callback) => {
    if (allowedOrigins.includes(origin) || !origin) {
      callback(null, true);
    } else {
      callback(new Error("CORS- REJECTED! Nobody loves you"));
    }
  },
  credentials: true,
};

app.use(cors(corsOptions));

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
});

app.use(express.json());
app.use(express.static("public"));

const isProduction = process.env.NODE_ENV === "production";

const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || "dev-secret",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: isProduction, // true in production (HTTPS), false in dev (HTTP)
    sameSite: isProduction ? "none" : "lax", // "none" required for cross-site cookies in production
    httpOnly: true,
    maxAge: 1000 * 60 * 60, // 1h
    domain: isProduction ? process.env.COOKIE_DOMAIN : undefined, // e.g., ".laamly.com"
  },
  proxy: true, // Trust reverse proxy
});

app.use(sessionMiddleware);

// Share session with Socket.IO
const wrap = (middleware) => (socket, next) => middleware(socket.request, {}, next);
io.use(wrap(sessionMiddleware));
io.use((socket, next) => next());

// ---------- DB ----------
const MONGODB_URI =
  `mongodb+srv://vaylu:${encodeURIComponent(process.env.MONGODB_PASSWORD || "")}` +
  `@cluster0.e1en0n4.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const User = require("./models/User");
const Chat = require("./models/Chat");
const Feedback = require("./models/Feedback");

// Helper: Upload image from URL to Pictshare
async function uploadImageToPictshare(imageUrl) {
  try {
    // 1. Fetch the image from the URL
    const imageResponse = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 10000, // 10 second timeout
    });

    if (!imageResponse.data) {
      throw new Error('Failed to fetch image from URL');
    }

    // 2. Prepare form data for Pictshare upload
    const FormData = require('form-data');
    const formData = new FormData();

    // Determine file extension from URL or content-type
    const contentType = imageResponse.headers['content-type'] || 'image/jpeg';
    let extension = 'jpg';
    if (contentType.includes('png')) extension = 'png';
    else if (contentType.includes('gif')) extension = 'gif';
    else if (contentType.includes('webp')) extension = 'webp';

    formData.append('file', Buffer.from(imageResponse.data), {
      filename: `profile.${extension}`,
      contentType: contentType,
    });
    formData.append('upload_code', '5219dd95-5672-44ca-8423-970afa123633');

    // 3. Upload to Pictshare
    const uploadResponse = await axios.post(
      'https://pictshare.hnasheralneam.dev/api/upload.php',
      formData,
      {
        headers: formData.getHeaders(),
        timeout: 15000, // 15 second timeout
      }
    );

    if (uploadResponse.data && uploadResponse.data.status === 'ok') {
      const pictshareUrl = uploadResponse.data.url.replace(
        'http://',
        'https://pictshare.hnasheralneam.dev'
      );
      return pictshareUrl;
    } else {
      console.error('Pictshare upload failed:', uploadResponse.data);
      return imageUrl; // Fallback to original URL
    }
  } catch (error) {
    console.error('Error uploading image to Pictshare:', error.message);
    return imageUrl; // Fallback to original URL on error
  }
}

// Helper: find user for current session (supports both providers)
async function findDbUserBySession(req) {
  const uuid = String(req.session?.user?.uuid || "");
  if (!uuid) {
    console.warn("findDbUserBySession: No UUID found in session.", req.session);
    return null;
  }

  const user = await User.findOne({ uuid }).lean();
  if (!user) {
    console.warn(`findDbUserBySession: No user found for UUID: ${uuid}`);
  }

  return user;
}

// ---------- Socket.IO ----------
const userSockets = new Map(); // userId -> Set of socketIds
io.on("connection", (socket) => {
  const sess = socket.request.session;
  if (sess?.user?.uuid) {
    socket.userId = String(sess.user.uuid);
    if (!userSockets.has(socket.userId)) {
      userSockets.set(socket.userId, new Set());
    }
    userSockets.get(socket.userId).add(socket.id);
  }

  socket.on("join-thread", (threadId) => {
    socket.join(threadId);
  });

  socket.on("leave-thread", (threadId) => {
    socket.leave(threadId);
  });

  // typing indicators (provider-agnostic)
  socket.on("typing-start", async ({ threadId }) => {
    try {
      if (!socket.userId) return;

      const user = await User.findOne({ uuid: socket.userId }).lean();

      const userName = user?.profile?.name || user?.handle || "Someone";

      socket.to(threadId).emit("user-typing", {
        threadId,
        userId: socket.userId,
        userName,
        isTyping: true,
      });
    } catch (err) {
      console.error("Error handling typing start:", err);
    }
  });

  socket.on("typing-stop", async ({ threadId }) => {
    try {
      if (!socket.userId) return;

      const user = await User.findOne({ uuid: socket.userId }).lean();

      const userName = user?.profile?.name || user?.handle || "Someone";

      socket.to(threadId).emit("user-typing", {
        threadId,
        userId: socket.userId,
        userName,
        isTyping: false,
      });
    } catch (err) {
      console.error("Error handling typing stop:", err);
    }
  });

  socket.on("disconnect", () => {
    if (socket.userId && userSockets.has(socket.userId)) {
      userSockets.get(socket.userId).delete(socket.id);
      if (userSockets.get(socket.userId).size === 0) {
        userSockets.delete(socket.userId);
      }
    }
  });
});

// ---------- Public helpers ----------
app.get("/", async (req, res) => {
  let user = null;

  const dbUser = await findDbUserBySession(req);
  if (dbUser) {
    user = {
      id: dbUser.uuid,
      uuid: dbUser.uuid,
      name: dbUser.profile?.name || dbUser.handle,
      avatar: dbUser.profile?.avatar || "",
      email: dbUser.profile?.email || "",
      handle: dbUser.handle || "",
    };
  }

  const initialData = {
    githubClientId: process.env.GITHUB_CLIENT_ID || "",
    googleClientId: process.env.GOOGLE_CLIENT_ID || "",
    user,
  };

  if (req.headers.accept?.includes("application/json")) {
    return res.redirect(`${FRONTEND_ORIGIN}/`);
  }

  res.redirect(`${FRONTEND_ORIGIN}/?data=${encodeURIComponent(JSON.stringify(initialData))}`);
});

app.get("/logout", (req, res) => {
  if (!req.session) return res.redirect(`${FRONTEND_ORIGIN}/logged-out`);
  req.session.destroy((err) => {
    if (err) {
      console.error("Logout error:", err);
      return res.status(500).send("Logout failed");
    }
    res.clearCookie("connect.sid", { path: "/" });
    return res.redirect(`${FRONTEND_ORIGIN}/logged-out`);
  });
});

// ---------- Lightweight API used by frontend ----------
app.get("/api/initial-data", async (req, res) => {
  let user = null;

  const dbUser = await findDbUserBySession(req);
  if (dbUser) {
    user = {
      id: dbUser.uuid,
      uuid: dbUser.uuid,
      name: dbUser.profile?.name || dbUser.handle,
      avatar: dbUser.profile?.avatar || "",
      email: dbUser.profile?.email || "",
      handle: dbUser.handle || "",
    };
  }

  res.json({
    githubClientId: process.env.GITHUB_CLIENT_ID || "",
    googleClientId: process.env.GOOGLE_CLIENT_ID || "",
    user,
  });
});

app.get("/api/github-client-id", (_req, res) => {
  res.json({ clientId: process.env.GITHUB_CLIENT_ID || "" });
});

app.get("/api/me", async (req, res) => {
  try {
    if (!req.session || !req.session.user?.uuid) {
      return res.status(401).json({ error: "Not logged in" });
    }

    const user = await User.findOne({ uuid: req.session.user.uuid }).lean();

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      id: user.uuid,
      name: user.profile?.name,
      email: user.profile?.email,
      avatar: user.profile?.avatar,
      bio: user.profile?.bio,
      handle: user.handle,
      privilegeLevel: user.privilegeLevel,
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

// Update current user's profile
app.put("/api/me", async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ message: "You need to be logged in" });
    }

    const dbUser = await User.findOne({ uuid: req.session.user.uuid });
    if (!dbUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const { name, bio, avatar, handle } = req.body;

    // Update fields if provided
    if (name !== undefined && String(name).trim()) {
      if (!dbUser.profile) dbUser.profile = {};
      dbUser.profile.name = String(name).trim();
      dbUser.markModified('profile');
    }

    if (bio !== undefined) {
      if (!dbUser.profile) dbUser.profile = {};
      dbUser.profile.bio = String(bio).trim();
      dbUser.markModified('profile');
    }

    if (avatar !== undefined && String(avatar).trim()) {
      if (!dbUser.profile) dbUser.profile = {};
      dbUser.profile.avatar = String(avatar).trim();
      dbUser.markModified('profile');
    }

    if (handle !== undefined && String(handle).trim()) {
      // Check if handle is already taken by another user
      const existingUser = await User.findOne({
        handle: String(handle).trim(),
        uuid: { $ne: dbUser.uuid }
      });

      if (existingUser) {
        return res.status(400).json({ message: "Username already taken" });
      }

      dbUser.handle = String(handle).trim();
    }

    await dbUser.save();

    res.json({
      user: {
        id: dbUser.uuid,
        uuid: dbUser.uuid,
        name: dbUser.profile?.name || dbUser.handle,
        avatar: dbUser.profile?.avatar || "",
        email: dbUser.profile?.email || "",
        handle: dbUser.handle || "",
        bio: dbUser.profile?.bio || "",
      },
    });
  } catch (error) {
    console.error("Error updating user profile:", error);
    res.status(500).json({ message: "Failed to update profile" });
  }
});

// User search (must be before /api/users/:userId to avoid route collision)
app.get("/api/users/search", async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ message: "You need to be logged in" });
    }

    const query = req.query.q;
    if (!query || String(query).trim().length < 2) {
      return res.json({ users: [] });
    }

    const searchRegex = new RegExp(String(query).trim(), "i");
    const users = await User.find({
      $or: [{ handle: searchRegex }, { "profile.name": searchRegex }],
    })
      .limit(20)
      .lean();

    const results = users.map((u) => ({
      id: u.uuid,
      uuid: u.uuid,
      name: u.profile?.name || u.handle,
      handle: u.handle,
      avatar: u.profile?.avatar || "",
    }));

    res.json({ users: results });
  } catch (err) {
    console.error("Error searching users:", err);
    return res.status(500).json({ message: "Error searching users" });
  }
});

// Public endpoint to fetch any user's profile by their githubId or googleId
app.get("/api/users/:userId", async (req, res) => {
   try {
      const { userId } = req.params;

      // Use uuid as the main identifier
      const dbUser = await User.findOne({ uuid: userId }).lean();

      if (!dbUser) {
         return res.status(404).json({ error: "User not found" });
      }

    res.json({
      user: {
        id: dbUser.uuid,
        uuid: dbUser.uuid,
        name: dbUser.profile?.name || dbUser.handle,
        handle: dbUser.handle,
        avatar: dbUser.profile?.avatar || "",
        email: dbUser.profile?.email || "",
        bio: dbUser.profile?.bio || "",
        privilegeLevel: dbUser.privilegeLevel || "",
      }
    });
   } catch (error) {
      console.error("Error fetching user profile:", error);
      res.status(500).json({ error: "Failed to fetch user profile" });
   }
});

app.get("/is-logged-in", (req, res) => {
  res.json({ loggedIn: !!req.session.user });
});

// ---------- OAuth: GitHub ----------
app.get("/auth/github", (req, res) => {
  const requestToken = req.query.code;
  axios({
    method: "post",
    url: `https://github.com/login/oauth/access_token?client_id=${process.env.GITHUB_CLIENT_ID}&client_secret=${process.env.GITHUB_CLIENT_SECRET}&code=${requestToken}`,
    headers: { accept: "application/json" },
  })
    .then(({ data }) => {
      if (data.error) {
        console.error("GitHub OAuth error:", data.error, data.error_description);
        return res.status(400).send(`GitHub OAuth error: ${data.error_description || data.error}`);
      }

      if (!data.access_token) {
        console.error("No access token in response:", data);
        return res.status(500).send("Failed to get access token from GitHub");
      }

      req.session.github_access_token = data.access_token;
      res.redirect("/github/login");
    })
    .catch((err) => {
      console.error("GitHub token error:", err.message);
      console.error("Error response:", err.response?.data);
      res.status(500).send(`OAuth failed: ${err.message}`);
    });
});

app.get("/github/login", (req, res) => {
  const accessToken = req.session.github_access_token;

  if (!accessToken) {
    console.error("No access token in session");
    return res.status(401).send("No access token. Please try logging in again.");
  }

  // Fetch user data and emails in parallel
  Promise.all([
    axios({
      method: "get",
      url: `https://api.github.com/user`,
      headers: {
        Authorization: `token ${accessToken}`,
        "User-Agent": "Laamly-App",
        Accept: "application/json"
      },
      timeout: 10000
    }),
    axios({
      method: "get",
      url: `https://api.github.com/user/emails`,
      headers: {
        Authorization: `token ${accessToken}`,
        "User-Agent": "Laamly-App",
        Accept: "application/json"
      },
      timeout: 10000
    })
  ])
    .then(async ([userData, emailsData]) => {
      const data = userData.data;
      const emails = emailsData.data;

      // Find the primary email or use the first verified email
      const primaryEmail = emails.find(e => e.primary && e.verified)?.email
                        || emails.find(e => e.verified)?.email
                        || data.email
                        || "";

      // Find existing user first
      let user = await User.findOne({ githubId: data.id });

      // Determine which avatar to use
      let avatarUrl = data.avatar_url;

      if (user && user.profile?.avatar) {
        // Check if user already has a Pictshare avatar
        const existingAvatar = user.profile.avatar;
        const isPictshareUrl = existingAvatar.includes('pictshare');

        if (isPictshareUrl) {
          // Keep the existing Pictshare avatar
          console.log('Keeping existing Pictshare avatar:', existingAvatar);
          avatarUrl = existingAvatar;
        } else {
          // Upload GitHub avatar to Pictshare
          console.log('Uploading GitHub avatar to Pictshare...');
          avatarUrl = await uploadImageToPictshare(data.avatar_url);
          console.log('New Pictshare URL:', avatarUrl);
        }
      } else {
        // New user - upload GitHub avatar to Pictshare
        console.log('New user - uploading GitHub avatar to Pictshare...');
        avatarUrl = await uploadImageToPictshare(data.avatar_url);
        console.log('Pictshare URL:', avatarUrl);
      }

      // Create user if doesn't exist
      if (!user) {
        user = await new User({
          githubId: data.id,
          handle: data.login,
          profile: {
            description: data.bio,
            name: data.name,
            avatar: avatarUrl,
            email: primaryEmail,
          },
          postIds: [],
        }).save();
      } else {
        // Update user info but preserve Pictshare avatar
        await User.updateOne(
          { githubId: data.id },
          {
            $set: {
              'profile.avatar': avatarUrl,
              'profile.name': data.name,
              'profile.email': primaryEmail,
              'profile.description': data.bio,
            }
          }
        );
      }

      req.session.user = {
        uuid: user.uuid,
        id: String(data.id),
        provider: "github",
        login: data.login,
        name: data.name,
        avatar: avatarUrl,
        email: primaryEmail,
      };

      res.redirect(FRONTEND_ORIGIN);
    })
    .catch((err) => {
      console.error("GitHub profile error:", err.message);
      console.error("Error details:", err.response?.data || err);
      res.status(500).send(`Login failed: ${err.message}`);
    });
});

// ---------- OAuth: Google ----------
app.get("/google/login", async (req, res) => {
  try {
    const { data } = await axios({
      method: "get",
      url: `https://www.googleapis.com/oauth2/v2/userinfo`,
      headers: { Authorization: `Bearer ${req.session.google_access_token}` },
    });

    // Find existing user first
    let user = await User.findOne({ googleId: data.id });

    // Determine which avatar to use
    let avatarUrl = data.picture;

    if (user && user.profile?.avatar) {
      // Check if user already has a Pictshare avatar
      const existingAvatar = user.profile.avatar;
      const isPictshareUrl = existingAvatar.includes('pictshare'); // true if account exists
      // const newAccount = !isPictshareUrl;

      if (isPictshareUrl) {
        // Keep the existing Pictshare avatar
        console.log('Keeping existing Pictshare avatar:', existingAvatar);
        avatarUrl = existingAvatar;
      } else {
        // Upload Google profile picture to Pictshare
        console.log('Uploading Google profile picture to Pictshare...');
        avatarUrl = await uploadImageToPictshare(data.picture);
        console.log('New Pictshare URL:', avatarUrl);
      }
    } else {
      // New user - upload Google avatar to Pictshare
      console.log('New user - uploading Google profile picture to Pictshare...');
      avatarUrl = await uploadImageToPictshare(data.picture);
      console.log('Pictshare URL:', avatarUrl);
    }

    // Create user if doesn't exist
    if (!user) {
      user = await new User({
        googleId: data.id,
        handle: (data.email || "").split("@")[0],
        profile: {
          name: data.name,
          avatar: avatarUrl,
          email: data.email,
        },
        postIds: [],
      }).save();
    } else {
      // Update user info but preserve Pictshare avatar
      await User.updateOne(
        { googleId: data.id },
        {
          $set: {
            'profile.avatar': avatarUrl
          }
        }
      );
    }

    req.session.user = {
      uuid: user.uuid,
      id: String(data.id),
      provider: "google",
      login: (data.email || "").split("@")[0],
      name: data.name,
      avatar: avatarUrl,
      email: data.email,
    };

    res.redirect(FRONTEND_ORIGIN);
  } catch (err) {
    console.error("Google profile error:", err);
    res.status(500).send("Login failed");
  }
});

app.get("/auth/google", (req, res) => {
  const requestToken = req.query.code;
  axios({
    method: "post",
    url: `https://oauth2.googleapis.com/token`,
    headers: { accept: "application/json" },
    data: {
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      code: requestToken,
      grant_type: "authorization_code",
      redirect_uri: `${process.env.BACKEND_URL}/auth/google`, // must match authorize step
    },
  })
    .then(({ data }) => {
      req.session.google_access_token = data.access_token;
      res.redirect("/google/login");
    })
    .catch((err) => {
      console.error("Google token error:", err.response?.data || err.message);
       res.status(500).send("OAuth failed: " + JSON.stringify((err.response?.data || err.message)));
    });
});

// ---------- Feature routes ----------
const postsRouter = require("./routes/posts")(io, userSockets);
app.use("/posts", postsRouter);

const reelsRouter = require("./routes/reels")(io, userSockets);
app.use("/reels", reelsRouter);

const messagesRouter = require("./routes/messages")(io, userSockets);
app.use("/api/messages", messagesRouter);

const notificationsRouter = require("./routes/notifications");
app.use("/api/notifications", notificationsRouter);


// Admin middleware
const isAdmin = async (req, res, next) => {
  try {
    if (!req.session?.user?.uuid) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const user = await User.findOne({ uuid: req.session.user.uuid });
    if (!user || user.privilegeLevel !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    next();
  } catch (error) {
    console.error("Admin check error:", error);
    res.status(500).json({ error: "Authorization check failed" });
  }
};

// Feedback endpoints
app.post("/api/feedback", async (req, res) => {
  try {
    const { type, subject, message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: "Message is required" });
    }

    let userId = null;
    if (req.session?.user?.uuid) {
      const user = await User.findOne({ uuid: req.session.user.uuid });
      userId = user?._id || null;
    }

    const feedback = new Feedback({
      userId: userId,
      type: type || "general",
      subject: subject?.trim() || undefined,
      message: message.trim(),
    });

    await feedback.save();

    res.status(201).json({
      success: true,
      message: "Feedback submitted successfully"
    });
  } catch (error) {
    console.error("Error submitting feedback:", error);
    res.status(500).json({ error: "Failed to submit feedback" });
  }
});

app.get("/api/feedback", isAdmin, async (req, res) => {
  try {
    const feedbackList = await Feedback.find()
      .populate("userId", "profile.name profile.avatar")
      .sort({ createdAt: -1 })
      .lean();

    res.json(feedbackList);
  } catch (error) {
    console.error("Error fetching feedback:", error);
    res.status(500).json({ error: "Failed to fetch feedback" });
  }
});

app.patch("/api/feedback/:id/status", isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["new", "reviewing", "resolved", "archived"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const feedback = await Feedback.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!feedback) {
      return res.status(404).json({ error: "Feedback not found" });
    }

    res.json({ success: true, feedback });
  } catch (error) {
    console.error("Error updating feedback status:", error);
    res.status(500).json({ error: "Failed to update feedback status" });
  }
});

// ---------- Start server AFTER DB is reachable ----------
(async () => {
  console.info("Connecting to MongoDB...");
  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 15000,
    });
    console.info("MongoDB connected successfully");

    // Migrate all existing individual chats to group chats
    console.info("Running chat migration...");
    try {
      const individualChats = await Chat.find({
        $or: [
          { isGroup: false },
          { isGroup: { $exists: false } }
        ]
      });

      if (individualChats.length > 0) {
        console.info(`Found ${individualChats.length} individual chats to migrate`);

        let migrated = 0;
        for (const chat of individualChats) {
          try {
            // Get member details to generate a group name
            const memberUsers = await User.find({
              $or: [
                { uuid: { $in: chat.members } },
                { githubId: { $in: chat.members } }
              ]
            }).lean();

            // Generate a default group name from members
            const groupName = memberUsers
              .map(u => u.profile?.name || u.handle)
              .filter(Boolean)
              .join(", ") || "Unnamed Chat";

            // Update the chat
            await Chat.updateOne(
              { _id: chat._id },
              {
                $set: {
                  isGroup: true,
                  groupName: groupName
                }
              }
            );

            migrated++;
          } catch (err) {
            console.error(`Error migrating chat ${chat._id}:`, err.message);
          }
        }
        console.info(`Migration complete! Migrated ${migrated} out of ${individualChats.length} chats.`);
      } else {
        console.info("No chats need migration");
      }
    } catch (migrationErr) {
      console.error("Migration error (non-fatal):", migrationErr.message);
    }

    server.listen(PORT, () => {
      console.info(
        "Server is running on port " + PORT + ", started " + new Date().toLocaleTimeString()
      );
    });
  } catch (err) {
    console.error("MongoDB connect failed:", err?.message || err);
    process.exit(1);
  }

})();
