const mongoose = require("mongoose");

var User = new mongoose.Schema({
  fullname: String,
  email: String,
  password: String,
  phone: Number,
  role: String,
  createdAt: { type: Date, default: Date.now },
  lastLogin: Date,
});

module.exports = mongoose.model("User", User);
