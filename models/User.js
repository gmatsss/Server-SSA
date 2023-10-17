const mongoose = require("mongoose");

var User = new mongoose.Schema({
  fullname: String,
  email: String,
  password: String,
  phone: Number,
  role: String,
});

module.exports = mongoose.model("User", User);
