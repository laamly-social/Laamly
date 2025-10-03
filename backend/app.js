#!/usr/bin/env node
const express = require("express");
const axios = require("axios");
const mongoose = require("mongoose");
const session = require("express-session");
const bodyParser = require("body-parser");

const app = express();
// Trust proxy for session cookies to work with Vite dev server
app.set('trust proxy', 1);
require("dotenv").config();
const PORT = process.env.PORT || 8080;

// Logout route
app.get("/logout", (req, res) => {
   // console.log("/logout: session before destroy", req.session);
      if (req.session) {
         req.session.destroy((err) => {
            if (err) {
               console.error("Logout error:", err);
               return res.status(500).send("Logout failed");
            }
            res.clearCookie("connect.sid", { path: "/" });
            console.log("/logout: session destroyed, cookie cleared");
            res.redirect("http://localhost:5173/logged-out");
         });
      } else {
         // No session to destroy; just redirect
         res.redirect("http://localhost:5173/logged-out");
      }
});


mongoose.connect(
   `mongodb+srv://vaylu:${process.env.MONGODB_PASSWORD}@cluster0.e1en0n4.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`,
);

const userSchema = new mongoose.Schema({
   githubId: String,
   profile: Object, /*
   {
      description: something // will check if exists, if not use github
   }
   */
   handle: String,
   stats: Object,
   postIds: Array /*{
      visitors: Array,
      visits: Number
   } */
});

const postSchemea = new mongoose.Schema({
   content: String,
   author: String, // author mongo id
   urls: Array,
   datePosted: Date,
   stats: Object // views, likes, etc
});

let User, Post;
try {
   User = mongoose.model("VeyluUser");
} catch (e) {
   User = mongoose.model("VeyluUser", userSchema);
}
try {
   Post = mongoose.model("VeyluPost");
} catch (e) {
   Post = mongoose.model("VeyluPost", postSchemea);
}

// Serve static files from the "public" folder
app.use(express.static("public"));
app.use(bodyParser.json());

app.use(
   session({
      secret: process.env.SESSION_SECRET,
      resave: false,
      saveUninitialized: true,
      cookie: {
         secure: false, // This will only work if you have https enabled!
         sameSite: "lax", // Allow session cookie to be sent from frontend (localhost:5173)
         httpOnly: false, // For local dev, allow JS to read cookie for debugging
         maxAge: 60000, // 1 min
      },
   })
);

// Add route to provide GitHub client ID to frontend
const githubClientIdRoute = require("./githubClientId");
app.use("/api", githubClientIdRoute);

// Add /api/me route for user info
const meRoute = require("./me");
app.use("/api", meRoute);

// Public routes
app.get("/", (req, res) => {
   res.redirect("http://localhost:5173/");
});

app.get("/posts", (req, res) => {
   res.redirect("http://localhost:5173/posts");
});

app.get("/my-posts", (req, res) => {
   if (!req.session.user) {
      return res.redirect("http://localhost:5173/logged-out");
   }
   res.redirect("http://localhost:5173/my-posts");
});


// GitHub OAuth
// Callback
app.get("/auth/github", (req, res) => {
   // The req.query object has the query params that were sent to this route.
   const requestToken = req.query.code;

   axios({
      method: "post",
      url: `https://github.com/login/oauth/access_token?client_id=${process.env.GITHUB_CLIENT_ID}&client_secret=${process.env.GITHUB_CLIENT_SECRET}&code=${requestToken}`,
      headers: {
         accept: "application/json",
      },
   }).then((response) => {
      req.session.github_access_token = response.data.access_token;
      res.redirect("/github/login");
   });
});

app.get("/github/login", (req, res) => {
   axios({
      method: "get",
      url: `https://api.github.com/user`,
      headers: {
         Authorization: "token " + req.session.github_access_token,
      },
   }).then((response) => {
      req.session.user = response.data;
      githubOAuthLogin(req, res);
   });
});

async function githubOAuthLogin(req, res) {
   // Redirect to React frontend home after login
   const reactHome = "http://localhost:5173/";
   let isAccount = await githubOAuthUserExists(req.session.user.id);
   if (isAccount) res.redirect(reactHome);
   else createGithubOAuthUser(req.session.user.id, req, res, reactHome);
}

function createGithubOAuthUser(githubId, req, res, reactHome) {
   // this shoudl also save the user name and profile picture url
   const user = new User({
      githubId: githubId,
      handle: req.session.user.login,
      profile: {
         description: req.session.user.bio
      }
   });
   user.save().then((result) => {
      res.redirect(reactHome);
   });
}

async function githubOAuthUserExists(githubId) {
   const user = await User.findOne({ githubId: githubId });
   return user !== null;
}

function isLoggedIn(req) {
   return req.session.user ? true : false;
}

// Get data
app.get("/is-logged-in", (req, res) => {
   res.json({ loggedIn: req.session.user ? true : false });
});



// Posts
app.post("/posts/create", (req, res) => {
   if (!req.session.user) {
      console.error("User not logged in");
      return res.status(401).json({ message: "You need to be logged in to post" });
   }
   const post = new Post({
      content: req.body.content,
      urls: req.body.urls,
      datePosted: req.body.datePosted,
      author: req.session.user.id
   });
   post.save().then(() => {
      res.json({ message: "Post created successfully!" });
   });
   User.findOne({ githubId: req.session.user.id })
      .then((user) => {
         if (user) {
            user.postIds.push(post._id);
            user.markModified("postIds");
            return user.save();
         } else {
            throw new Error("User not found");
         }
      })
      .then((savedUser) => {
         // console.log("Post ID added to user:", savedUser);
      })
      .catch((err) => {
         console.error(err);
      });
});

app.get("/posts/get-all", (req, res) => {
   Post.find({})
      .lean()
      .then(async (posts) => {
         for (const post of posts) {
            try {
               const author = await User.findOne({ githubId: post.author });

               if (author) {
                  post.authorName = author.name;
                  post.authorHandle = author.handle;
                  post.authorImage = author.profile;
               }
            } catch (err) {
               console.error(`Error fetching author for post ${post._id}:`, err);
            }
            post.authorId = post.author;
         }
         res.json({ posts: posts });
      })
      .catch((err) => {
         console.error("Error fetching posts:", err);
         res.status(500).json({ message: "Error fetching posts" });
      });
});

// Connect app
app.listen(PORT, () => {
   console.info("Server is running on port " + PORT);
});


// Add item to existing schema members - remember to add to sccd hema as well
// User.updateMany(
//    { stats: { $exists: true }},
//    { $set: { stats: { visitors: [], visits: 0 } }},
//    { multi: true }
// ).then((oth) => {
//    console.log(oth);
// }).catch((err) => {
//    console.error(err);
// });
