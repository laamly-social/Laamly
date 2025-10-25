const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
   githubId: String,
   profile: Object,
   handle: String,
   stats: Object,
   postIds: [mongoose.Schema.Types.ObjectId],
   likedPostIds: [mongoose.Schema.Types.ObjectId],
});

module.exports = mongoose.models.VeyluUser || mongoose.model('VeyluUser', userSchema);
