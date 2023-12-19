const mongoose = require("mongoose");

// Roadmap Schema
const roadmapSchema = new mongoose.Schema({
  title: String,
  description: String,
  startDate: Date,
  endDate: Date,
  likedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // Array of user IDs who liked the roadmap
});

// Create model
const Roadmap = mongoose.model("Roadmap", roadmapSchema);

// Export the model
module.exports = Roadmap;
