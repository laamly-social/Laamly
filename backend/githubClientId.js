// API route to provide GitHub client ID to frontend
const express = require('express');
const router = express.Router();

router.get('/github-client-id', (req, res) => {
  res.json({ clientId: process.env.GITHUB_CLIENT_ID });
});

module.exports = router;
