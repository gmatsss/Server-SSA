const Onboarding = require("../models/botSchema"); // Assuming the model is in the models directory
const { MongoClient, GridFSBucket } = require("mongodb");
const User = require("../models/User");
const sendEmail = require("../middleware/sendmail");

exports.createOnboarding = async (req, res, next) => {
  try {
    let { agents } = req.body;
    const {
      userId,
      numberOfAgents,
      additionalGuidelines,
      botChannel,
      verificationCode,
    } = req.body;

    if (typeof agents === "string") {
      agents = JSON.parse(agents);
    }

    console.log(req.body);
    console.log(req.files);

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
      agents,
      additionalGuidelines,
      botChannel,
      uploadedFiles,
      verificationCode,
      user: userId, // Save the user's ID
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
