const mongoose = require('mongoose');

const { v4: uuidv4 } = require('uuid');

const userSchema = new mongoose.Schema({
   uuid: { type: String, unique: true, default: uuidv4 },
   githubId: String,
   googleId: String,
   profile: {
      name: String,
      email: String,
      avatar: String
   },
   handle: String,
   stats: Object,
   postIds: [mongoose.Schema.Types.ObjectId],
   likedPostIds: [mongoose.Schema.Types.ObjectId],
   notifications: [{
      type: { type: String, enum: ['like', 'comment', 'message', 'reply'], required: true },
      from: { type: String, required: true }, // uuid of the person who triggered the notification
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
