const mongoose = require("mongoose");
const Schema = mongoose.Schema;

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
  lifetimeAccess: {
    type: Boolean,

    default: false,
  },
  offerValidityDays: {
    type: Number,
  },
  offerStartDate: {
    type: Date,
  },
  offerEndDate: {
    type: Date,
  },

  inboundMinutesLimit: {
    type: Number,
    required: true,
    default: 2500,
  },
  inboundMinutesUsed: {
    type: Number,
    required: true,
    default: 0,
  },
  phoneNumber: {
    type: String,
    default: "+18704104327", //deb
  },
  _id: {
    type: Schema.Types.ObjectId,
    required: true,
    auto: true,
  },
});

const VAagentGroupSchema = new Schema({
  verificationCodebotplan: {
    type: String,
    required: true,
  },
  agents: [VAagentSchema],
});

const voiceAgentsSSASchema = new Schema({
  numberOfAgents: {
    type: Number,
    required: true,
  },
  VAagentsGroup: [VAagentGroupSchema],
  paymentPlan: {
    customer_id: {
      type: String,
      required: true,
    },
    verificationCodebotplan: String,
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
});

const VoiceAgentsSSA = mongoose.model("VoiceAgentsSSA", voiceAgentsSSASchema);

module.exports = VoiceAgentsSSA;
