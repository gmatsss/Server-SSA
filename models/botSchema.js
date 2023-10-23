const mongoose = require("mongoose");

const agentSchema = new mongoose.Schema({
  agentType: {
    type: String,
  },
  toneOfVoice: {
    type: String,
  },
  serviceIndustry: {
    type: String,
  },
  otherServiceIndustry: {
    type: String,
  },
});

const onboardingSchema = new mongoose.Schema({
  numberOfAgents: {
    type: Number,
  },
  agents: [agentSchema], // Array of agent details
  additionalGuidelines: {
    type: String,
  },
  botChannel: [
    {
      type: String,
    },
  ],
  uploadedFiles: [
    {
      type: String, // Assuming you'll store file paths or URLs
    },
  ],
  verificationCode: {
    type: String,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
});

const Onboarding = mongoose.model("Onboarding", onboardingSchema);

module.exports = Onboarding;
