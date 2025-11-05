// API route to get the current logged-in user's info from MongoDB
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

let User;
try {
  User = mongoose.model('VeyluUser');
} catch (e) {
  User = mongoose.model('VeyluUser', new mongoose.Schema({})); // fallback, should not happen
}

router.get('/me', async (req, res) => {
  try {
    if (!req.session || !req.session.user) {
      return res.json({ user: null });
    }
    const githubId = req.session.user.id;
    const user = await User.findOne({ githubId });
    if (!user) {
      return res.json({ user: null });
    }
    res.json({
      user: {
        id: user.githubId,
        name: user.handle, // use handle as display name
        avatar: req.session.user.avatar_url || ''
      }
    });
  } catch (e) {
    console.error("/api/me error", e);
    res.status(200).json({ user: null });
  }
});

module.exports = router;
