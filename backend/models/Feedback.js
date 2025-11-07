const mongoose = require("mongoose");

const feedbackSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "VeyluUser",
    required: false,
  },
  type: {
    type: String,
    enum: ["bug", "feature", "general"],
    default: "general",
  },
  subject: {
    type: String,
    maxlength: 100,
  },
  message: {
    type: String,
    required: true,
    maxlength: 2000,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String,
    enum: ["new", "reviewing", "resolved", "archived"],
    default: "new",
  },
});

module.exports = mongoose.model("Feedback", feedbackSchema);
