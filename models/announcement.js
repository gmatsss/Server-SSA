const mongoose = require("mongoose");

// Todo Sub-schema
const todoSchema = new mongoose.Schema({
  title: String,
  description: String,
  completed: Boolean,
});

// Roadmap Sub-schema
const roadmapSchema = new mongoose.Schema({
  milestone: String,
  estimatedCompletionDate: Date,
  status: String,
});

// Promotion Sub-schema
const promotionSchema = new mongoose.Schema({
  promotionDetails: String,
  startDate: Date,
  endDate: Date,
});

// Announcement Schema
const announcementSchema = new mongoose.Schema({
  message: String,
  date: Date,
  todos: [todoSchema],
  roadmaps: [roadmapSchema],
  promotions: [promotionSchema],
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
});

// Create model
const Announcement = mongoose.model("Announcement", announcementSchema);

// Export the model
module.exports = Announcement;
