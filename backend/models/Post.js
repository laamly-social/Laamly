const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
   content: String,
   author: String, // githubId
   urls: [String], // LINKS ONLY
   datePosted: Date,
   stats: Object,
   deleted: { type: Boolean, default: false },
   likedBy: [String], // Array of githubIds who liked this post
   viewedBy: [String], // Array of githubIds/uuids who viewed this post
   tags: [String], // AI-generated tags
   isHalal: { type: Boolean, default: true }, // AI-determined halal status
   comments: [{
      _id: { type: mongoose.Schema.Types.ObjectId, default: () => new mongoose.Types.ObjectId() },
      author: String,
      content: String,
      datePosted: Date,
      stats: Object
   }]
});

module.exports = mongoose.models.VeyluPost || mongoose.model('VeyluPost', postSchema);
