const mongoose = require("mongoose");

const noticeSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  content: {
    type: String,
    required: true,
  },
  datePosted: {
    type: Date,
    default: Date.now,
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User", // Assuming you have a User model
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  // Additional fields can be added as needed
});

const Notice = mongoose.model("Notice", noticeSchema);

module.exports = Notice;
