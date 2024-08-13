const axios = require("axios");
const { sendEmail, sendAdminNotification } = require("../middleware/sendmail");
const VoiceAgentsSSA = require("../models/playaiSchema");
const User = require("../models/User");

exports.createVoiceAgentSSA = async (req, res, next) => {
  try {
    const { numberOfAgents, VAagentsGroup, paymentPlan, userId } = req.body;

    // Find the user by ID to ensure the user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Construct the VoiceAgentsSSA document
    const newVoiceAgentSSA = new VoiceAgentsSSA({
      numberOfAgents: Number(numberOfAgents),
      VAagentsGroup: VAagentsGroup.map((group) => ({
        verificationCodebotplan: group.verificationCodebotplan,
        agents: group.agents.map((agent) => ({
          agentGreeting: agent.agentGreeting,
          agentPrompt: agent.agentPrompt,
          customKnowledge: agent.customKnowledge,
          limitations: agent.limitations,
          voiceOfTheAgent: agent.voiceOfTheAgent,
          agentBehavior: agent.agentBehavior,
          botStatus: agent.botStatus || "In Progress",
          lifetimeAccess: agent.lifetimeAccess || false,
          offerValidityDays: agent.offerValidityDays,
          offerStartDate: new Date(agent.offerStartDate),
          offerEndDate: new Date(agent.offerEndDate),
        })),
      })),
      paymentPlan: {
        customer_id: paymentPlan.customer_id,
        verificationCodebotplan: paymentPlan.verificationCodebotplan,
      },
      user: userId,
    });

    // Save the VoiceAgentsSSA document
    const savedVoiceAgentSSA = await newVoiceAgentSSA.save();

    // Prepare email data
    const recipientEmail = user.email;
    const recipientName = user.fullname;
    const firstName = recipientName.split(" ")[0];

    req.firstName = firstName;
    req.recipientEmail = recipientEmail;

    // Call the First Promoter data fetching utility function
    fetchFirstPromoterData(recipientEmail);

    // Send the response back to the client
    res.status(201).json({
      data: savedVoiceAgentSSA,
      message:
        "Voice Agent SSA created and First Promoter integration successful.",
    });

    // Optionally send an email notification
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

    // Find all Voice Agents SSA documents associated with the userId
    const voiceAgents = await VoiceAgentsSSA.find({ user: userId });

    if (!voiceAgents || voiceAgents.length === 0) {
      return res
        .status(404)
        .json({ message: "No VA agents found for this user." });
    }

    // Extract all VA agents from the groups
    const allAgents = voiceAgents.flatMap((voiceAgent) =>
      voiceAgent.VAagentsGroup.flatMap((group) => group.agents)
    );

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
    console.log("hello");
    const { id } = req.params;
    const { callDurationInMinutes } = req.body;

    const voiceAgent = await VoiceAgentsSSA.findOne({
      "VAagentsGroup.agents._id": id,
    });

    if (!voiceAgent) {
      return res.status(404).json({ message: "Voice Agent not found." });
    }

    for (const group of voiceAgent.VAagentsGroup) {
      for (const agent of group.agents) {
        if (String(agent._id) === id) {
          agent.inboundMinutesUsed += callDurationInMinutes;
          await voiceAgent.save();
          return res.status(200).json({ message: "Call duration updated." });
        }
      }
    }

    res.status(404).json({ message: "Agent not found." });
  } catch (error) {
    console.error("Error updating call duration:", error);
    res.status(500).json({ message: "Error updating call duration." });
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
