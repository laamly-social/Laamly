const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
   members: [String], // githubId array
   messages: [{
      from: String,     // githubId of sender
      text: String,
      attachments: [String], // URLs to uploaded files
      ts: { type: Date, default: Date.now },
      read: { type: Boolean, default: false },
      edited: { type: Boolean, default: false },
      reactions: [{
         userId: String,
         emoji: String
      }]
   }],
   lastMessage: String,
   lastMessageTs: Date,
   isGroup: { type: Boolean, default: false },
   groupName: String,
   groupAvatar: String,
   unreadCount: {
      type: Map,
      of: Number,
      default: {}
   }, // Map of userId -> unread count
   createdAt: { type: Date, default: Date.now },
   updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.LaamlyChat || mongoose.model('LaamlyChat', chatSchema);
