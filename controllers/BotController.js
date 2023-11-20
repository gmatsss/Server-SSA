const Onboarding = require("../models/botSchema"); // Assuming the model is in the models directory
const { MongoClient, GridFSBucket } = require("mongodb");
const User = require("../models/User");
const sendEmail = require("../middleware/sendmail");

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

    // Process agents
    let processedAgents = [];
    if (typeof agents === "string") {
      agents = JSON.parse(agents);
      processedAgents.push({
        verificationCodebotplan,
        agents,
      });
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

    // Process payment plans
    let paymentPlans = [];
    if (customerID) {
      paymentPlans.push({ customer_id: customerID });
    }
    if (paymentPlanID) {
      paymentPlans.push({ customer_id: paymentPlanID });
    }

    agents = agents.map((agent) => ({ ...agent, botStatus: "In Progress" }));

    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).send("No files were uploaded.");
    }

    let uploadedFiles = [];

    let files = [];

    if (req.files["uploadedFiles[0]"]) {
      files.push(req.files["uploadedFiles[0]"]);
    } else {
      // Handle the case where multiple files might be uploaded
      let index = 0;
      while (req.files[`uploadedFiles[${index}]`]) {
        files.push(req.files[`uploadedFiles[${index}]`]);
        index++;
      }
    }

    const conn = await MongoClient.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    const db = conn.db();

    // Create a new instance of GridFSBucket
    const bucket = new GridFSBucket(db, {
      bucketName: "botfiles",
    });

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

    req.recipientEmail = recipientEmail;

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
    console.log(req.files);
    const userId = req.user._id; // Assuming you have the user's ID

    // Extract and process agent data from the request
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

    // Map each bot to the agent schema structure
    let newAgentsData = [];
    bots.forEach((bot) => {
      newAgentsData.push({
        agentType: bot.agentType,
        serviceIndustry: bot.serviceIndustry,
        toneOfVoice: bot.toneOfVoice,
        botStatus: "In Progress", // Assuming default status
        // Add other necessary properties if any
      });
    });

    // Construct the agent group with a verification code
    let agentGroup = {
      verificationCodebotplan: req.body.verificationCodebotplan,
      agents: newAgentsData,
    };

    // Update the existing onboarding document
    const updatedOnboarding = await Onboarding.findOneAndUpdate(
      { user: userId },
      { $push: { agents: agentGroup } },
      { new: true }
    );

    if (!updatedOnboarding) {
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

    // Create a new channel group
    let newChannelGroup = {
      verifchannelcode: req.body.verifchannelcode,
      channels: channels.map((channelName) => ({ channelName })),
    };

    // Update the existing onboarding document
    const updatedOnboardingchannel = await Onboarding.findOneAndUpdate(
      { user: userId },
      { $push: { channels: newChannelGroup } },
      { new: true }
    );

    if (!updatedOnboardingchannel) {
      return res.status(404).json({ message: "Onboarding record not found" });
    }

    // Extract and process payment plan data from the request
    let paymentPlans = [];
    const customerID = req.body.customerID;
    const paymentPlanID = req.body.paymentPlanID;

    if (customerID) {
      paymentPlans.push({ customer_id: customerID });
    }
    if (paymentPlanID) {
      paymentPlans.push({ customer_id: paymentPlanID });
    }

    // Update the existing onboarding document for payment plans
    const updatedOnboardingpayment = await Onboarding.findOneAndUpdate(
      { user: userId },
      { $push: { paymentplan: { $each: paymentPlans } } },
      { new: true }
    );

    if (!updatedOnboardingpayment) {
      return res.status(404).json({ message: "Onboarding record not found" });
    }

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
    const conn = await MongoClient.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    const db = conn.db();
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

    const updatedOnboardingguide = await Onboarding.findOneAndUpdate(
      { user: userId },
      { $push: { guidelines: newGuidelines } },
      { new: true }
    );

    if (!updatedOnboardingguide) {
      return res.status(404).json({ message: "Onboarding record not found" });
    }

    res.status(200).json({
      data: updatedOnboarding,
      message: "Agent data added successfully to onboarding.",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      err: "An error occurred while updating the onboarding data.",
    });
  }
};
