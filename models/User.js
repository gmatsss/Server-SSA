const mongoose = require("mongoose");

var User = new mongoose.Schema({
  fullname: String,
  email: String,
  password: String,
  role: String,
  emailVerified: Boolean,
  verificationToken: String,
});

module.exports = mongoose.model("User", User);
