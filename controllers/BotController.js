const mongoose = require("mongoose");
const Onboarding = require("../models/botSchema"); // Assuming the model is in the models directory
const { MongoClient, GridFSBucket } = require("mongodb");
const User = require("../models/User");
const { sendEmail, sendAdminNotification } = require("../middleware/sendmail");
const Announcement = require("../models/announcement");
const axios = require("axios");
const VoiceAgentsSSA = require("../models/playaiSchema");

exports.createOnboarding = async (req, res, next) => {
  try {
    let {
      agents,
      customerID,
      paymentPlanID,
      botChannel,
      verificationCodebotplan,
      verifchannelcode,
    } = req.body;

    const { userId, numberOfAgents, additionalGuidelines } = req.body;

    let processedAgents = [];

    if (typeof agents === "string") {
      agents = JSON.parse(agents);

      // Remove the offer details
      const updatedAgents = agents.map((agent) => ({
        ...agent,
      }));

      processedAgents.push({
        verificationCodebotplan,
        agents: updatedAgents,
      });
    } else {
      console.log("Agents is not a string:", agents);
    }

    // Process channels
    let processedChannels = [];
    if (typeof botChannel === "string") {
      botChannel = JSON.parse(botChannel);
      processedChannels.push({
        verifchannelcode,
        channels: botChannel.map((channelName) => ({ channelName })),
      });
    }

    let paymentPlans = [];
    if (customerID) {
      paymentPlans.push({ customer_id: customerID });
    }
    if (paymentPlanID) {
      paymentPlans.push({ customer_id: paymentPlanID });
    }

    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).send("No files were uploaded.");
    }

    let uploadedFiles = [];

    // Handling multiple file uploads
    let files = [];
    if (req.files["uploadedFiles[0]"]) {
      files.push(req.files["uploadedFiles[0]"]);
      let index = 1;
      while (req.files[`uploadedFiles[${index}]`]) {
        files.push(req.files[`uploadedFiles[${index}]`]);
        index++;
      }
    }

    const db = mongoose.connection.db;
    const bucket = new GridFSBucket(db, { bucketName: "botfiles" });

    // Processing and uploading each file
    for (const file of files) {
      // Check for existing file and delete it
      const existingFile = await db.collection("botfiles.files").findOne({
        filename: file.name,
      });

      if (existingFile) {
        await bucket.delete(existingFile._id);
      }

      // Upload the new file
      const uploadStream = bucket.openUploadStream(file.name, {
        contentType: file.mimetype,
      });
      uploadStream.write(file.data);
      uploadStream.end();

      await new Promise((resolve, reject) => {
        uploadStream.on("finish", (uploadedFile) => {
          uploadedFiles.push(uploadedFile._id); // Store the GridFS file ID
          resolve();
        });
        uploadStream.on("error", reject);
      });
    }

    const newOnboarding = new Onboarding({
      numberOfAgents,
      agents: processedAgents,
      channels: processedChannels,
      guidelines: {
        additionalGuidelines,
        uploadedFiles,
      },
      user: userId,
      paymentplan: paymentPlans,
    });

    await newOnboarding.save();

    const user = await User.findById(userId);
    const recipientEmail = user.email;
    const recipientName = user.fullname;

    const names = recipientName.split(" ");
    const firstName = names[0];

    req.firstName = firstName;
    req.recipientEmail = recipientEmail;

    fetchFirstPromoterData(recipientEmail);

    res.status(200).json({
      data: newOnboarding,
      message: "Onboarding data saved successfully.",
    });

    sendEmail(req, res, next);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      err: "An error occurred while saving onboarding data.",
    });
  }
};

exports.additionalbot = async (req, res, next) => {
  try {
    console.log("found");
    const userId = req.user._id;

    let onboarding = await Onboarding.findOne({ user: userId });

    if (!onboarding) {
      onboarding = new Onboarding({ user: userId });
      await onboarding.save();
    }

    let bots = [];
    const botKeys = Object.keys(req.body).filter((key) =>
      key.startsWith("bots[")
    );
    botKeys.forEach((key) => {
      const match = key.match(/bots\[(\d+)\]\[(\w+)\]/);
      if (match) {
        const index = parseInt(match[1]);
        const property = match[2];
        bots[index] = bots[index] || {};
        bots[index][property] = req.body[key];
      }
    });

    let newAgentsData = [];
    bots.forEach((bot) => {
      newAgentsData.push({
        agentType: bot.agentType,
        serviceIndustry: bot.serviceIndustry,
        toneOfVoice: bot.toneOfVoice,
        botStatus: "In Progress", // Assuming default status
      });
    });

    let agentGroup = {
      verificationCodebotplan: req.body.verificationCodebotplan,
      agents: newAgentsData,
    };

    onboarding = await Onboarding.findOneAndUpdate(
      { user: userId },
      { $push: { agents: agentGroup } },
      { new: true }
    );

    if (!onboarding) {
      return res.status(404).json({ message: "Onboarding record not found" });
    }

    // Process channel data
    let channels = [];
    const channelKeys = Object.keys(req.body).filter((key) =>
      key.startsWith("channels[")
    );
    channelKeys.forEach((key) => {
      const match = key.match(/channels\[(\d+)\]/);
      if (match) {
        channels.push(req.body[key]);
      }
    });

    let newChannelGroup = {
      verifchannelcode: req.body.verifchannelcode,
      channels: channels.map((channelName) => ({ channelName })),
    };

    onboarding = await Onboarding.findOneAndUpdate(
      { user: userId },
      { $push: { channels: newChannelGroup } },
      { new: true }
    );

    if (!onboarding) {
      return res.status(404).json({ message: "Onboarding record not found" });
    }

    let paymentPlans = [];
    const customerID = req.body.customerID;
    const paymentPlanID = req.body.paymentPlanID;

    if (customerID) {
      paymentPlans.push({ customer_id: customerID });
    }
    if (paymentPlanID) {
      paymentPlans.push({ customer_id: paymentPlanID });
    }

    onboarding = await Onboarding.findOneAndUpdate(
      { user: userId },
      { $push: { paymentplan: { $each: paymentPlans } } },
      { new: true }
    );

    if (!onboarding) {
      return res.status(404).json({ message: "Onboarding record not found" });
    }

    // Check if there are files to upload
    if (req.files && Object.keys(req.files).length > 0) {
      let uploadedFiles = [];
      let files = [];

      // Handling multiple file uploads
      if (req.files["files[0]"]) {
        files.push(req.files["files[0]"]);
        let index = 1;
        while (req.files[`files[${index}]`]) {
          files.push(req.files[`files[${index}]`]);
          index++;
        }
      }

      // MongoDB connection and GridFSBucket setup
      const db = mongoose.connection.db;
      const bucket = new GridFSBucket(db, { bucketName: "botfiles" });

      // Processing and uploading each file
      for (const file of files) {
        // Check for existing file and delete it
        const existingFile = await db.collection("botfiles.files").findOne({
          filename: file.name,
        });

        if (existingFile) {
          await bucket.delete(existingFile._id);
        }

        // Upload the new file
        const uploadStream = bucket.openUploadStream(file.name, {
          contentType: file.mimetype,
        });
        uploadStream.write(file.data);
        uploadStream.end();

        await new Promise((resolve, reject) => {
          uploadStream.on("finish", (uploadedFile) => {
            uploadedFiles.push(uploadedFile._id); // Store the GridFS file ID
            resolve();
          });
          uploadStream.on("error", reject);
        });
      }

      // Update the existing onboarding document with new guidelines
      let newGuidelines = {
        additionalGuidelines: req.body.additionalInfo,
        uploadedFiles: uploadedFiles,
      };

      onboarding = await Onboarding.findOneAndUpdate(
        { user: userId },
        { $push: { guidelines: newGuidelines } },
        { new: true }
      );

      if (!onboarding) {
        return res.status(404).json({ message: "Onboarding record not found" });
      }
    }

    res.status(200).json({
      data: onboarding,
      message: "Agent data added successfully to onboarding.",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      err: "An error occurred while updating the onboarding data.",
    });
  }
};

// exports.updateLifetimeAccess = async (req, res, next) => {
//   try {
//     const userId = req.user._id;
//     const agentSubscriptions = req.body.agentSubscriptions;

//     // Check if agentSubscriptions is an array and has elements
//     if (!Array.isArray(agentSubscriptions) || agentSubscriptions.length === 0) {
//       return res.status(400).json({ message: "Invalid payload" });
//     }

//     // Process each agentSubscription
//     const updates = agentSubscriptions.map(({ agentId }) => {
//       return Onboarding.findOneAndUpdate(
//         { user: userId, "agents.agents._id": agentId },
//         {
//           $set: {
//             "agents.$[outer].agents.$[inner].lifetimeAccess": true,
//             "agents.$[outer].agents.$[inner].offerValidityDays": null,
//             "agents.$[outer].agents.$[inner].offerStartDate": null,
//             "agents.$[outer].agents.$[inner].offerEndDate": null,
//           },
//         },
//         {
//           new: true,
//           arrayFilters: [
//             { "outer.agents._id": agentId },
//             { "inner._id": agentId },
//           ],
//         }
//       );
//     });

//     // Execute all update operations
//     const results = await Promise.all(updates);

//     // Check if updates were successful
//     if (results.some((result) => result !== null)) {
//       // Fetch user details
//       const user = await User.findById(userId);

//       // Fetch parent bot details
//       const parentBot = await getParentBotDetails(
//         agentSubscriptions.map(({ agentId }) => agentId)
//       );

//       let newTodo;

//       if (parentBot && parentBot.verificationCodebotplan) {
//         // Create a new todo for cases where parent bot's verification code is available
//         newTodo = {
//           title:
//             "Disable recurring Plan for Lifetime Access - " + user.fullname,
//           description:
//             "This task involves disabling the plan for a user who has been granted Lifetime Access." +
//             "\n· Verify that Lifetime Access has been granted to the user. User Details: " +
//             user.fullname +
//             " (" +
//             user.email +
//             ")." +
//             "\n· Use MoonClerk to find the user's subscription. Search Criteria: User's name or email." +
//             "\n· Subscription Details: " +
//             agentSubscriptions
//               .map(
//                 (sub) =>
//                   `Verification Code for Confirmation: ${parentBot.verificationCodebotplan} - Type: ${sub.subscriptionType}`
//               )
//               .join("; ") +
//             "\n· Once the subscription is located, suspend any ongoing charges. This prevents future billing." +
//             "\n· Ensure that the correct plan is suspended. Confirm that both verifications match and are correct.",
//           completed: false,
//         };
//       } else {
//         // Create a different new todo for cases where parent bot's verification code is not available
//         newTodo = {
//           title: "Lifetime Access for Bot",
//           description:
//             `${user.fullname} (${user.email}) has bought lifetime access for bots. Details: ` +
//             agentSubscriptions
//               .map(
//                 (sub) =>
//                   `Bot ID: ${sub.agentId}, Subscription: ${sub.subscriptionType}`
//               )
//               .join("; ") +
//             ".",
//           completed: false,
//         };
//       }

//       const adminUsers = await postAnnouncementToAdmins(newTodo);

//       // Send email to each admin
//       for (const adminUser of adminUsers) {
//         sendAdminNotification(adminUser.email, newTodo).catch(console.error); // Log error but do not halt execution
//       }

//       res.status(200).json({
//         success: true, // Add this line
//         message: "Lifetime access updated and admin notified successfully.",
//       });
//     } else {
//       return res
//         .status(404)
//         .json({ message: "No matching agents or onboarding records found" });
//     }
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({
//       err: "An error occurred while updating the agents' lifetime access.",
//     });
//   }
// };

const postAnnouncementToAdmins = async (newTodo) => {
  try {
    // Create a new ObjectId for the todo
    const todoId = new mongoose.Types.ObjectId();
    const todoWithId = { ...newTodo, _id: todoId };

    // Find all users with the role of 'Admin'
    const adminUsers = await User.find({ role: "Admin" });

    // Update the Announcement collection for each admin user
    const updatePromises = adminUsers.map((adminUser) => {
      return Announcement.findOneAndUpdate(
        { user: adminUser._id },
        { $push: { todos: todoWithId } },
        { new: true, upsert: true }
      );
    });

    // Wait for all updates to complete
    await Promise.all(updatePromises);
    return adminUsers;
  } catch (error) {
    console.error("Error updating announcements for admins:", error);
    throw error; // propagate the error
  }
};

const getParentBotDetails = async (agentIds) => {
  try {
    const agentIdsAsObjectIds = agentIds.map(
      (agentId) => new mongoose.Types.ObjectId(agentId)
    );

    // Find the onboarding document containing the agent
    const onboardingDoc = await Onboarding.findOne({
      "agents.agents._id": { $in: agentIdsAsObjectIds },
    });

    if (onboardingDoc) {
      for (const agentGroup of onboardingDoc.agents) {
        // Check if the agent group contains any of the specified agents
        const containsSpecifiedAgent = agentGroup.agents.some((agent) =>
          agentIdsAsObjectIds.some((id) => id.equals(agent._id))
        );

        if (containsSpecifiedAgent) {
          // Check if all agents in this group have lifetime access
          const allAgentsLifetimeAccess = agentGroup.agents.every(
            (agent) => agent.lifetimeAccess
          );

          if (allAgentsLifetimeAccess) {
            // Return the verification code of the parent bot if all agents have lifetime access
            return {
              verificationCodebotplan: agentGroup.verificationCodebotplan,
            };
          } else {
            console.log(
              `Not all agents in verification code plan ${agentGroup.verificationCodebotplan} have lifetime access.`
            );
            return null; // or some default value
          }
        }
      }
    }

    // Return null or some default value if no matching agent is found
    return null;
  } catch (error) {
    console.error("Error fetching parent bot details:", error);
    return null;
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

    // Find the promoter with the specified email
    const foundPromoter = promoters.find(
      (promoter) => promoter.email === email
    );

    if (foundPromoter) {
      await movePromoterToNewCampaign(foundPromoter.id, "22054"); // Replace '5399' with your destination campaign ID
    } else {
      console.log("No promoter found with email:", email);
    }
  } catch (error) {
    console.log("Error with FirstPromoter request:", error);
  }
};

const movePromoterToNewCampaign = async (promoterId, destinationCampaignId) => {
  const config = {
    method: "post",
    url: "https://firstpromoter.com/api/v1/promoters/move_to_campaign",
    headers: {
      "x-api-key": "4450bd7ad1136ceebcd94195f7cd6787",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    data: new URLSearchParams({
      id: promoterId,
      destination_campaign_id: destinationCampaignId,
    }).toString(),
  };

  try {
    const response = await axios(config);
    console.log("Promoter moved successfully:");
  } catch (error) {
    console.error("Error moving promoter:", error);
  }
};

exports.getNumberOfBotsRegistered = async (req, res) => {
  try {
    const userId = req.user._id;

    // Fetch onboarding information to get the number of bots
    const onboarding = await Onboarding.findOne({ user: userId });
    if (!onboarding) {
      return res.status(404).json({
        success: false,
        message: "No onboarding information found for this user",
      });
    }

    const totalBots = onboarding.agents.reduce(
      (sum, agent) => sum + agent.agents.length,
      0
    );

    // Fetch voice agents information to get the number of VAs
    const voiceAgentsRecord = await VoiceAgentsSSA.findOne({ user: userId });
    const totalVoiceAgents = voiceAgentsRecord
      ? voiceAgentsRecord.agents.length
      : 0;

    // Respond with both counts
    res.status(200).json({
      success: true,
      numberOfBots: totalBots,
      numberOfVoiceAgents: totalVoiceAgents,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};
