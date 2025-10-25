const mongoose = require('mongoose');

const reelSchema = new mongoose.Schema({
   author: String,               // githubId
   title: String,
   description: String,
   src: String,                  // single video link (PictShare)
   datePosted: { type: Date, default: Date.now },
   likedBy: [String],            // githubId list
   savedBy: [String],            // githubId list
   deleted: { type: Boolean, default: false },
   comments: [{
      author: String,             // githubId
      content: String,
      datePosted: Date,
      stats: Object
   }]
});

module.exports = mongoose.models.VeyluReel || mongoose.model('VeyluReel', reelSchema);
