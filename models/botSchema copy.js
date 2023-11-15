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
  SSAapikey: {
    type: String,
  },
  SSAApi: {
    type: String,
  },
  botStatus: {
    type: String,
    enum: ["Active", "In Progress", "Cancelled"],
    default: "In Progress", // Set default value to "In Progress"
  },
});

const paymentPlanSchema = new mongoose.Schema({
  customer_id: {
    type: String,
  },
});

const onboardingSchema = new mongoose.Schema({
  numberOfAgents: {
    type: Number,
  },
  agents: [agentSchema],
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
      type: String,
    },
  ],
  verificationCode: {
    type: String,
  },
  openAPIKey: {
    OpenAI: {
      type: String,
      default: null,
    },
    OpenRouter: {
      type: String,
      default: null,
    },
    Claude: {
      type: String,
      default: null,
    },
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  domainName: {
    type: String,
  },
  dnsRecords: {
    aRecordType: String,
    aRecordName: String,
    aRecordValue: String,
    txtRecordType: String,
    txtRecordName: String,
    txtRecordValue: String,
    cnameRecordType: String,
    cnameRecordName: String,
    cnameRecordValue: String,
  },

  paymentplan: [paymentPlanSchema], // Array of payment plans
});

const Onboarding = mongoose.model("Onboarding", onboardingSchema);

module.exports = Onboarding;
