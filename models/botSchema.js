const mongoose = require("mongoose");

const agentDetailsSchema = new mongoose.Schema({
  agentType: String,
  toneOfVoice: String,
  serviceIndustry: String,
  otherServiceIndustry: String,
  SSAapikey: String,
  SSAApi: String,
  botStatus: {
    type: String,
    default: "In Progress",
  },
});

const agentSchema = new mongoose.Schema({
  verificationCodebotplan: String,
  agents: [agentDetailsSchema],
});

const channelDetailsSchema = new mongoose.Schema({
  channelName: String,
});

const channelSchema = new mongoose.Schema({
  verifchannelcode: String,
  channels: [channelDetailsSchema],
});

const paymentPlanSchema = new mongoose.Schema({
  customer_id: String,
});

const onboardingSchema = new mongoose.Schema({
  numberOfAgents: Number,
  agents: [agentSchema],
  additionalGuidelines: String,
  channels: [channelSchema],
  uploadedFiles: [String],
  openAPIKey: {
    OpenAI: String,
    OpenRouter: String,
    Claude: String,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  domainName: String,
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
  paymentplan: [paymentPlanSchema],
});

const Onboarding = mongoose.model("Onboarding", onboardingSchema);

module.exports = Onboarding;
