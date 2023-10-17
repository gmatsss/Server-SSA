const mongoose = require("mongoose");

const botSchema = new mongoose.Schema({
  agentType: {
    type: String,
    required: true,
  },
  serviceIndustry: {
    type: String,
    required: true,
  },
  uploadedFiles: [
    {
      type: String, // Assuming you'll store file paths or URLs
    },
  ],
  toneOfVoice: {
    type: String,
    required: true,
  },
  additionalGuidelines: {
    type: String,
  },
  otherServiceIndustry: {
    type: String,
  },
  botChannel: [
    {
      type: String,
      required: true,
    },
  ],
});

const Bot = mongoose.model("Bot", botSchema);

module.exports = Bot;
