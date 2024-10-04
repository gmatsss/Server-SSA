const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Schema for individual agents
const VAagentSchema = new Schema({
  agentGreeting: {
    type: String,
    required: true,
  },
  agentPrompt: {
    type: String,
    required: true,
  },
  customKnowledge: {
    type: String,
    required: true,
  },
  limitations: {
    type: String,
    required: true,
  },
  voiceOfTheAgent: {
    type: String,
    required: true,
  },
  agentBehavior: {
    type: String,
    required: true,
  },
  botStatus: {
    type: String,
    required: true,
    default: "In Progress",
  },
  PlayagentId: {
    type: String,
  },
  phoneNumber: {
    type: String,
    default: "+18704104327",
  },
  MinutesUsed: {
    type: Number,
    required: true,
    default: 0,
  },
  _id: {
    type: Schema.Types.ObjectId,
    required: true,
    auto: true,
  },
});

const MinutesPlanSchema = new Schema({
  verificationCode: {
    type: String,
    required: true,
  },
  minutesAdded: {
    type: Number,
    required: true,
    default: 2500,
  },
  dateAdded: {
    type: Date,
    default: Date.now,
  },
  startDate: {
    type: Date,
    required: true, // Make it required if every plan must have a start date
    default: Date.now, // Default to the current date
  },
  endDate: {
    type: Date,
    required: false, // Optional, in case you don't always need an end date
  },
});

// Main schema
const voiceAgentsSSASchema = new Schema({
  numberOfAgents: {
    type: Number,
    required: true,
  },
  agents: [VAagentSchema], // Agents are now directly under this schema
  minutesPlans: [MinutesPlanSchema], // Track all minute purchases/allocations
  totalMinutesLimit: {
    type: Number,
    required: true,
    default: 2500, // Cumulative limit from all plans
  },
  totalMinutesUsed: {
    type: Number,
    required: true,
    default: 0, // Cumulative usage across all agents
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
});

const VoiceAgentsSSA = mongoose.model("VoiceAgentsSSA", voiceAgentsSSASchema);

module.exports = VoiceAgentsSSA;
