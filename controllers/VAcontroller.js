const axios = require("axios");
const { sendEmail, sendAdminNotification } = require("../middleware/sendmail");
const VoiceAgentsSSA = require("../models/playaiSchema");
const User = require("../models/User");
const moment = require("moment-timezone");

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

//update
const getOffsetForTimeZone = (zone) => {
  const offsetMinutes = moment.tz(zone).utcOffset();
  const hours = Math.abs(Math.floor(offsetMinutes / 60));
  const minutes = Math.abs(offsetMinutes % 60);
  return `${offsetMinutes >= 0 ? "+" : "-"}${String(hours).padStart(
    2,
    "0"
  )}:${String(minutes).padStart(2, "0")}`;
};

// Helper function to parse the time in multiple formats
const parseTime = (time) => {
  const formats = ["HH:mm", "h:mm A", "H:mm", "hh:mm A"]; // Accepting 24-hour and 12-hour formats with AM/PM
  let parsedTime = null;

  for (const format of formats) {
    parsedTime = moment(time, format, true);
    if (parsedTime.isValid()) {
      return parsedTime;
    }
  }

  return null; // Return null if none of the formats match
};

// Helper function to parse natural language date input
const parseDate = (dateString) => {
  const parsedDate = moment(
    dateString,
    [
      "MMMM D, YYYY", // "October 7, 2024"
      "MMMM Do, YYYY", // "October 7th, 2024"
      "MMMM D, YYYY", // "October seventh, two thousand twenty-four"
      "YYYY-MM-DD", // "2024-10-07"
    ],
    true
  );

  if (!parsedDate.isValid()) {
    return null;
  }

  return parsedDate;
};

exports.setappointment = async (req, res) => {
  try {
    const { date, time, fname, lname, email, phone, Fname } = req.body;
    console.log(req.body);
    console.log(Fname);
    console.log("Received Data:", { date, time, fname, lname, email, phone });

    const selectedTimezone = "America/Chicago";

    if (!date || !time || !fname || !lname || !email || !phone) {
      return res.status(400).json({
        message: "Missing required fields: date, time, name, email, or phone",
      });
    }

    // Log the raw input data
    console.log(`Raw date input: ${date}`);
    console.log(`Raw time input: ${time}`);

    // Parse the natural language date
    const fullDate = parseDate(date);
    if (!fullDate) {
      console.log("Date parsing failed");
      return res.status(400).json({
        message:
          "Invalid date format. Please use formats like 'MMMM D, YYYY' or 'YYYY-MM-DD'.",
      });
    }
    console.log(`Parsed date: ${fullDate.format("YYYY-MM-DD")}`);

    // Parse the time using the helper function
    const parsedTime = parseTime(time);

    if (!parsedTime) {
      console.log("Time parsing failed");
      return res.status(400).json({
        message:
          "Invalid time format. Please use a valid time format like '10:00', '10:30 AM', '9 AM', etc.",
      });
    }
    console.log(`Parsed time: ${parsedTime.format("HH:mm:ss")}`);

    const timeZoneOffset = getOffsetForTimeZone(selectedTimezone);

    // Format time to 'HH:mm:ss'
    const formattedTime = parsedTime.format("HH:mm:ss");
    const selectedSlot = `${fullDate.format(
      "YYYY-MM-DD"
    )}T${formattedTime}${timeZoneOffset}`;

    // Log the final converted values
    console.log("Formatted Date-Time:", { selectedSlot, selectedTimezone });

    const appointmentData = {
      calendarId: "tYBftnzoLm0YUHCGfGfD",
      selectedTimezone,
      selectedSlot,
      email,
      phone,
      firstName: fname,
      lastName: lname,
    };

    console.log("Final Payload:", appointmentData);

    const response = await axios.post(
      "https://rest.gohighlevel.com/v1/appointments/",
      appointmentData,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization:
            "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJsb2NhdGlvbl9pZCI6Inc4aHVUREQ1QzhxQVB0RmJZNW5rIiwiY29tcGFueV9pZCI6IkkxTFUyYW1aSHpQWWo2YUdXMlRCIiwidmVyc2lvbiI6MSwiaWF0IjoxNjk1ODk0NzA2ODMwLCJzdWIiOiJ1c2VyX2lkIn0.wtUxGmmuzSI4V8V3ofam4fWatNsa_0HitDUcE-GSUbM",
        },
      }
    );

    if (response.status === 200) {
      res.status(200).json({
        message: "Appointment set successfully!",
        appointmentDetails: response.data,
      });
    } else {
      res.status(response.status).json({
        message: "Error setting appointment",
        error: response.data,
      });
    }
  } catch (error) {
    console.error("Error setting appointment:", error);
    res.status(500).json({
      message: "Internal server error while setting appointment",
      error: error.message,
    });
  }
};
