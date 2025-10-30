const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
   githubId: String,
   googleId: String,
   profile: Object,
   handle: String,
   stats: Object,
   postIds: [mongoose.Schema.Types.ObjectId],
   likedPostIds: [mongoose.Schema.Types.ObjectId],
   notifications: [{
      type: { type: String, enum: ['like', 'comment', 'message', 'reply'], required: true },
      from: { type: String, required: true }, // githubId of the person who triggered the notification
      fromName: String,
      fromAvatar: String,
      contentId: String, // postId, reelId, or threadId
      contentType: { type: String, enum: ['post', 'reel', 'message', 'comment'] },
      message: String,
      read: { type: Boolean, default: false },
      createdAt: { type: Date, default: Date.now }
   }]
});

module.exports = mongoose.models.VeyluUser || mongoose.model('VeyluUser', userSchema);
