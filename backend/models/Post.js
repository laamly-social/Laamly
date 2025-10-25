const mongoose = require('mongoose');

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

module.exports = mongoose.models.VeyluPost || mongoose.model('VeyluPost', postSchema);
