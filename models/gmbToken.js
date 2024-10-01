// models/gmbToken.js

const mongoose = require("mongoose");

const gmbtokenSchema = new mongoose.Schema({
  accountId: {
    type: String,
    required: true,
    unique: true,
  },
  locationId: {
    type: String,
    required: true,
  },
  refreshgmbToken: {
    type: String,
    required: true,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("GMBToken", gmbtokenSchema);
