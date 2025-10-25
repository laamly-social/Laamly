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


// Networking and CORS
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN;
const PORT = process.env.PORT || 8080;

app.set("trust proxy", 1);

const allowedOrigins = [
   "https://laamly.com",
   "https://laamly.hnasheralneam.dev",
   "http://localhost:5177"
];

const corsOptions = {
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



const io = new Server(server, {
   cors: {
      origin: allowedOrigins,
      credentials: true
   }
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
      domain: isProduction ? process.env.COOKIE_DOMAIN : undefined, // e.g., ".laamly.com" to share across subdomains
   },
   proxy: true, // Trust the reverse proxy (required for secure cookies behind proxy)
});

app.use(sessionMiddleware);

// ✅ Share session with Socket.IO - Wrap middleware for Socket.IO compatibility
const wrap = middleware => (socket, next) => middleware(socket.request, {}, next);
io.use(wrap(sessionMiddleware));

// Add logging for Socket.IO connections
io.use((socket, next) => next());

const MONGODB_URI = `mongodb+srv://vaylu:${encodeURIComponent(process.env.MONGODB_PASSWORD || "")}` + `@cluster0.e1en0n4.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// --- Models ---
const User = require('./models/User');
const Chat = require('./models/Chat');

// Socket.io
const userSockets = new Map(); // userId -> Set of socketIds
io.on("connection", (socket) => {
   const session = socket.request.session;
   if (session?.user?.id) {
      socket.userId = String(session.user.id);

      // Track this socket for this user
      if (!userSockets.has(socket.userId)) {
         userSockets.set(socket.userId, new Set());
      }
      userSockets.get(socket.userId).add(socket.id);
   }

   // Join thread room
   socket.on("join-thread", (threadId) => {
      socket.join(threadId);
   });

   // Leave thread room
   socket.on("leave-thread", (threadId) => {
      socket.leave(threadId);
   });

   // Handle typing indicators
   socket.on("typing-start", async (data) => {
      try {
         const { threadId } = data;

         if (!socket.userId) return;

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

         if (!socket.userId) return;

         // Get user info for display
         const user = await User.findOne({ githubId: socket.userId }).lean();
         const userName = user?.profile?.name || user?.handle || "Someone";

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

// Mount posts routes
const postsRouter = require('./routes/posts');
app.use('/posts', postsRouter);

// --- Reels ---
// Mount reels routes
const reelsRouter = require('./routes/reels');
app.use('/reels', reelsRouter);

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

// Mount messages routes (moved to separate file)
const messagesRouter = require('./routes/messages')(io, userSockets);
app.use('/api/messages', messagesRouter);

// ---------- Start server AFTER DB is reachable ----------
(async () => {
   console.info("Connecting to MongoDB...");
   try {
      await mongoose.connect(MONGODB_URI, {
         serverSelectionTimeoutMS: 15000,
      });
      server.listen(PORT, () => {
         console.info("Server is running on port " + PORT + ", started " + new Date().toLocaleTimeString());
      });
   } catch (err) {
      console.error("MongoDB connect failed:", err?.message || err);
      process.exit(1);
   }
})();
