const mongoose = require('mongoose');

const reelSchema = new mongoose.Schema({
   author: String,               // uuid
   title: String,
   description: String,
   src: String,                  // single video link (PictShare)
   datePosted: { type: Date, default: Date.now },
   likedBy: [String],            // uuid list
   savedBy: [String],            // uuid list
   viewedBy: [String],           // uuid list - tracks who viewed this reel
   deleted: { type: Boolean, default: false },
   comments: [{
      _id: { type: mongoose.Schema.Types.ObjectId, default: () => new mongoose.Types.ObjectId() },
      author: String,             // uuid
      content: String,
      datePosted: Date,
      stats: Object,
      likedBy: [String]           // uuid list - who liked this comment
   }]
});

module.exports = mongoose.models.VeyluReel || mongoose.model('VeyluReel', reelSchema);
