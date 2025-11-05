const mongoose = require('mongoose');

const reelSchema = new mongoose.Schema({
   author: String,               // uuid
   title: String,
   description: String,
   src: String,                  // single video link (PictShare)
   datePosted: { type: Date, default: Date.now },
   likedBy: [String],            // uuid list
   savedBy: [String],            // uuid list
   deleted: { type: Boolean, default: false },
   comments: [{
   author: String,             // uuid
      content: String,
      datePosted: Date,
      stats: Object
   }]
});

module.exports = mongoose.models.VeyluReel || mongoose.model('VeyluReel', reelSchema);
