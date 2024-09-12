const axios = require("axios");
const { sendEmail, sendAdminNotification } = require("../middleware/sendmail");
const VoiceAgentsSSA = require("../models/playaiSchema");
const User = require("../models/User");

exports.createVoiceAgentSSA = async (req, res, next) => {
  try {
    const { numberOfAgents, VAagentsGroup, paymentPlan, userId } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const newVoiceAgentSSA = new VoiceAgentsSSA({
      numberOfAgents: Number(numberOfAgents),
      agents: VAagentsGroup[0].agents.map((agent) => ({
        agentGreeting: agent.agentGreeting,
        agentPrompt: agent.agentPrompt,
        customKnowledge: agent.customKnowledge,
        limitations: agent.limitations,
        voiceOfTheAgent: agent.voiceOfTheAgent,
        agentBehavior: agent.agentBehavior,
        botStatus: agent.botStatus || "In Progress",
        phoneNumber: agent.phoneNumber || "+18704104327",
      })),
      minutesPlans: [
        {
          verificationCode: VAagentsGroup[0].verificationCodebotplan,
          minutesAdded: VAagentsGroup[0].inboundMinutesLimit || 2500,
        },
      ],
      totalMinutesLimit: VAagentsGroup[0].inboundMinutesLimit || 2500,
      totalMinutesUsed: 0,
      paymentPlan: {
        customer_id: paymentPlan.customer_id,
        verificationCodebotplan: VAagentsGroup[0].verificationCodebotplan,
      },
      user: userId,
    });

    const savedVoiceAgentSSA = await newVoiceAgentSSA.save();

    const recipientEmail = user.email;
    const recipientName = user.fullname;
    const firstName = recipientName.split(" ")[0];

    req.firstName = firstName;
    req.recipientEmail = recipientEmail;

    fetchFirstPromoterData(recipientEmail);

    res.status(201).json({
      data: savedVoiceAgentSSA,
      message:
        "Voice Agent SSA created and First Promoter integration successful.",
    });

    sendEmail(req, res, next);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "An error occurred while creating the Voice Agent SSA.",
    });
  }
};

exports.getAllVAgentsByUser = async (req, res) => {
  try {
    const userId = req.user._id;

    const voiceAgentsSSA = await VoiceAgentsSSA.find({ user: userId });

    if (!voiceAgentsSSA || voiceAgentsSSA.length === 0) {
      return res
        .status(404)
        .json({ message: "No VA agents found for this user." });
    }

    const allAgents = voiceAgentsSSA.flatMap((voiceAgent) => voiceAgent.agents);

    res.status(200).json({ agents: allAgents });
  } catch (error) {
    console.error("Error fetching VA agents:", error);
    res
      .status(500)
      .json({ message: "An error occurred while fetching VA agents." });
  }
};

exports.updateCallDuration = async (req, res) => {
  try {
    const { id } = req.params;
    const { callDurationInMinutes } = req.body;

    const voiceAgent = await VoiceAgentsSSA.findOne({
      "agents._id": id,
    });

    if (!voiceAgent) {
      return res.status(404).json({ message: "Voice Agent not found." });
    }

    const agent = voiceAgent.agents.id(id);

    if (!agent) {
      return res.status(404).json({ message: "Agent not found." });
    }

    agent.MinutesUsed += callDurationInMinutes;
    voiceAgent.totalMinutesUsed += callDurationInMinutes;

    await voiceAgent.save();

    return res.status(200).json({ message: "Call duration updated." });
  } catch (error) {
    console.error("Error updating call duration:", error);
    res.status(500).json({ message: "Error updating call duration." });
  }
};

exports.checkMinutesLimit = async (req, res) => {
  try {
    const { agentId } = req.params;

    const voiceAgent = await VoiceAgentsSSA.findOne({
      "agents._id": agentId,
    });

    if (!voiceAgent) {
      return res.status(404).json({ message: "Voice Agent not found." });
    }

    if (voiceAgent.totalMinutesUsed >= voiceAgent.totalMinutesLimit) {
      return res.status(403).json({
        message: "Total minutes limit reached. Cannot initiate a call.",
      });
    }

    return res.status(200).json({
      message: "Call can be initiated.",
    });
  } catch (error) {
    console.error("Error checking minutes limit:", error);
    res.status(500).json({ message: "Error checking minutes limit." });
  }
};

exports.setappointment = async (req, res) => {
  try {
    console.log(req.body);
  } catch (error) {
    console.error("Error  limit:", error);
  }
};

const fetchFirstPromoterData = async (email) => {
  const config = {
    method: "get",
    url: "https://firstpromoter.com/api/v1/promoters/list?campaign_id=22048",
    headers: {
      "x-api-key": "4450bd7ad1136ceebcd94195f7cd6787",
    },
  };

  try {
    const response = await axios(config);
    const promoters = response.data;

    const foundPromoter = promoters.find(
      (promoter) => promoter.email === email
    );

    if (foundPromoter) {
      await movePromoterToNewCampaign(foundPromoter.id, "22054");
    } else {
      console.log("No promoter found with email:", email);
    }
  } catch (error) {
    console.log("Error with FirstPromoter request:", error);
  }
};
