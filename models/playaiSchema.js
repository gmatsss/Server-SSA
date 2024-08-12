const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const agentVASchema = new Schema({
  agentGreeting: {
    type: String,
    required: true,
    default: "Hello, how can I assist you today?",
  },
  agentPrompt: {
    type: String,
    required: true,
    default:
      "You are an AI support agent. Your role is to assist users with their queries and provide accurate and helpful information. Ensure all responses are professional and user-focused.",
  },
  agentBehavior: {
    type: String,
    required: true,
    default: "Professional Use Case",
  },
  customKnowledge: {
    type: String,
    required: false,
  },
  phoneNumber: {
    type: String,
    required: true,
  },
});

const paymentPlanSchema = new Schema({
  customer_id: {
    type: String,
    required: true,
  },
  verificationCodebotplan: String,
});

const voiceAgentsSSASchema = new Schema({
  numberOfAgents: {
    type: Number,
    required: true,
  },
  vAgents: [agentVASchema],
  paymentPlan: [paymentPlanSchema],
});

const VoiceAgentsSSA = mongoose.model("VoiceAgentsSSA", voiceAgentsSSASchema);

module.exports = VoiceAgentsSSA;
