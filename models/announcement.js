const mongoose = require("mongoose");

// Todo Sub-schema
const todoSchema = new mongoose.Schema({
  title: String,
  description: String,
  completed: Boolean,
});

// Announcement Schema
const announcementSchema = new mongoose.Schema({
  message: String,
  date: Date,
  todos: [todoSchema],
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
});

// Create model
const Announcement = mongoose.model("Announcement", announcementSchema);

// Export the model
module.exports = Announcement;
