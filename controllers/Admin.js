const User = require("../models/User");
const Onboarding = require("../models/botSchema");
const nodemailer = require("nodemailer");
const { MongoClient, GridFSBucket } = require("mongodb");
const { ObjectId } = require("mongodb");
const { default: mongoose } = require("mongoose");
const axios = require("axios");
const qs = require("qs");

exports.downloadFile = async (req, res) => {
  try {
    const fileId = new ObjectId(req.params.fileId);

    const conn = await MongoClient.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    const db = conn.db();

    // Create a new instance of GridFSBucket
    const bucket = new GridFSBucket(db, {
      bucketName: "botfiles",
    });

    const file = await bucket.find({ _id: fileId }).toArray();
    if (!file || file.length === 0) {
      return res.status(404).send("No file found");
    }

    res.setHeader(
      "Content-Disposition",
      'attachment; filename="' + file[0].filename + '"'
    );
    bucket.openDownloadStream(fileId).pipe(res);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error downloading the file");
  }
};

exports.get_clients = async (req, res) => {
  try {
    // Fetch users with the role of "User"
    const users = await User.find({ role: "user" });

    if (!users || users.length === 0) {
      return res.status(404).json({ message: "No users found" });
    }

    const conn = await MongoClient.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    const db = conn.db();

    // Fetch the onboarding details for each user and populate the 'agents' field
    const usersWithOnboarding = await Promise.all(
      users.map(async (user) => {
        const onboardingDetails = await Onboarding.findOne({
          user: user._id,
        }).populate("agents");

        // Fetch the files associated with the onboarding details
        const files = [];
        if (onboardingDetails && onboardingDetails.uploadedFiles) {
          for (const fileId of onboardingDetails.uploadedFiles) {
            const file = await db
              .collection("botfiles.files")
              .findOne({ _id: new ObjectId(fileId) });

            if (file) {
              files.push({ _id: file._id.toString(), filename: file.filename }); // Convert _id to string for logging
            }
          }
        }

        return {
          ...user._doc,
          onboardingDetails: {
            ...onboardingDetails._doc,
            files: files,
          },
        };
      })
    );

    // Return the list of users with their roles and the populated onboarding details
    res.json(usersWithOnboarding);
  } catch (error) {
    console.error("Error fetching clients:", error);
    res
      .status(500)
      .json({ message: "An error occurred while fetching the users" });
  }
};

exports.get_logged_in_user_bots = async (req, res) => {
  try {
    // Assuming you have a middleware that sets req.user to the logged-in user
    const userId = req.user._id;

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Fetch the onboarding details for the logged-in user and populate the 'agents' field
    const onboardingDetails = await Onboarding.findOne({
      user: userId,
    }).populate("agents");

    if (!onboardingDetails) {
      return res
        .status(404)
        .json({ message: "No onboarding details found for the user" });
    }

    // Return the onboarding details for the logged-in user
    res.json(onboardingDetails);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message:
        "An error occurred while fetching the bots for the logged-in user",
    });
  }
};

exports.update_api_key = async (req, res) => {
  try {
    const userId = req.user._id;
    const { openAI, claude, openRouter } = req.body; // Destructure all API keys from the request body

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const onboardingDetails = await Onboarding.findOne({ user: userId });
    if (!onboardingDetails) {
      return res
        .status(404)
        .json({ message: "No onboarding details found for the user" });
    }

    // Update the API keys
    if (openAI !== undefined) onboardingDetails.openAPIKey.OpenAI = openAI;
    if (claude !== undefined) onboardingDetails.openAPIKey.Claude = claude;
    if (openRouter !== undefined)
      onboardingDetails.openAPIKey.OpenRouter = openRouter;

    await onboardingDetails.save();

    res.json({
      message: "API keys updated successfully",
      onboardingDetails,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "An error occurred while updating the API keys",
    });
  }
};

exports.update_domain_name = async (req, res) => {
  try {
    // Assuming you have a middleware that sets req.user to the logged-in user
    const userId = req.user._id;
    const { domainName } = req.body; // Expecting 'domainName' in the request body

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Fetch the onboarding details for the logged-in user
    const onboardingDetails = await Onboarding.findOne({ user: userId });
    if (!onboardingDetails) {
      return res
        .status(404)
        .json({ message: "No onboarding details found for the user" });
    }

    // Update the domain name
    if (domainName) {
      onboardingDetails.domainName = domainName;
    } else {
      return res.status(400).json({ message: "Invalid domain name" });
    }

    // Save the updated onboarding details
    await onboardingDetails.save();

    // Return a success response
    res.json({
      message: "Domain name updated successfully",
      onboardingDetails,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "An error occurred while updating the domain name",
    });
  }
};

exports.post_dns_records = async (req, res) => {
  try {
    const { user, dnsRecords } = req.body;

    console.log(user);
    // Validate user
    if (!user) {
      return res.status(400).json({ message: "User ID is required" });
    }

    // Validate dnsRecords object
    if (!dnsRecords || Object.keys(dnsRecords).length === 0) {
      return res.status(400).json({ message: "Invalid DNS records" });
    }

    // Fetch the onboarding details for the user
    const onboardingDetails = await Onboarding.findOne({ user: user });
    if (!onboardingDetails) {
      return res
        .status(404)
        .json({ message: "Onboarding details not found for the user" });
    }

    // Update the DNS records
    onboardingDetails.dnsRecords = {
      ...onboardingDetails.dnsRecords,
      ...dnsRecords,
    };

    // Save the updated onboarding details
    await onboardingDetails.save();

    // Return a success response
    res.json({
      message: "DNS records updated successfully",
      onboardingDetails,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "An error occurred while updating DNS records",
      error: error.message,
    });
  }
};

exports.sendEmailtoclient = async (req, res, next) => {
  try {
    // Create a transporter object using the default SMTP transport
    const transporter = nodemailer.createTransport({
      host: "mail.supersmartagents.com",
      port: 465,
      secure: true, // true for 465, false for other ports
      auth: {
        user: "billing@supersmartagents.com",
        pass: "4Sgr3;;I83SmrJ", // Replace with the email account's password
      },
    });

    const { email, fname } = req.body;

    // Construct the email message
    const subject = "Bot Configuration Complete";
    const text = `Greetings from SSA! We're happy to inform you that your bot is already configured. To test and run it, please login at https://dashboard.supersmartagents.com/. Your password is your first name: ${fname}.`;
    const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #e4e4e4;">
    <h2 style="color: #333; border-bottom: 1px solid #e4e4e4; padding-bottom: 10px;">Exciting News: Your Bot is Ready!</h2>
    <p style="font-size: 16px; line-height: 1.5; color: #555;">
        Hello from the SSA Team! 🎉 We're thrilled to share that your personalized bot has been meticulously configured and is now ready to roll!
    </p>
    <p style="font-size: 16px; line-height: 1.5; color: #555;">
        Dive right in and experience the magic. Simply <a href="https://dashboard.supersmartagents.com/" style="color: #007BFF; text-decoration: none;">click here to login</a> and get started.
    </p>
    
    <p style="font-size: 16px; line-height: 1.5; color: #555;">
    Quick tip: Your password is your first name, which is: <strong>${fname}</strong>. And remember, the email you'll use to log in is the one you registered during onboarding: <strong>${email}</strong>. Keep this information secure!
    </p>

    <p style="font-size: 16px; line-height: 1.5; color: #555;">
        We're always here to support you. If you have any questions or need assistance, don't hesitate to reach out. Here's to achieving great things together!
    </p>
    <p style="font-size: 16px; line-height: 1.5; color: #555;">
        Cheers to new beginnings! 🚀<br>
        With warm regards,<br>
        The Super Smart Agents Team
    </p>
</div>

`;

    // Send the email
    await transporter.sendMail({
      from: '"Super Smart Agents" <billing@supersmartagents.com>',
      to: email,
      subject: subject,
      text: text,
      html: html,
    });

    res.status(200).send({ message: "Email sent successfully!" }); // Send a success response
  } catch (error) {
    console.error("Error sending email:", error);
    next(error); // Pass the error to the next middleware or error handler
  }
};

exports.sendTicket = async (req, res, next) => {
  try {
    // Create a transporter object using SendGrid's SMTP transport
    const transporter = nodemailer.createTransport({
      host: "smtp.sendgrid.net",
      port: 587, // or 465 for SSL
      secure: false, // true for 465, false for other ports
      auth: {
        user: "apikey", // SendGrid user for SMTP
        pass: "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", // Replace with your actual SendGrid API key
      },
    });

    const { email, subject, text, html } = req.body;

    // Ensure all required fields are provided
    if (!email || !subject || !text || !html) {
      return res.status(400).send({ message: "Missing required fields." });
    }

    await transporter.sendMail({
      from: `"Ticket to SSA" <sendticket@supersmartagents.com>`, // Replace with your verified SendGrid email
      replyTo: "tickets@super-smart-agents.p.tawk.email",
      to: email,
      // to: "tickets@super-smart-agents.p.tawk.email",
      subject: subject,
      text: text,
      html: html,
    });

    // await transporter.sendMail({
    //   sender: email, // User's email address
    //   from: "sendticket@supersmartagents.com", // Your authenticated domain email address
    //   to: "tickets@super-smart-agents.p.tawk.email",
    //   subject: subject,
    //   text: text,
    //   html: html,
    // });

    res.status(200).send({ message: "Email sent successfully!" }); // Send a success response
  } catch (error) {
    console.error("Error sending email:", error);
    next(error); // Pass the error to the next middleware or error handler
  }
};

exports.createEmailAccount = async (req, res) => {
  const cPanelUrl = "https://supersmartagents.com:2083/execute/Email/add_pop";
  const username = "supersma"; // Replace with your cPanel username
  const apiToken = "N4ZD9FA3XSV16QS5JKY4RIZC2WQY7957"; // Replace with your actual API token

  const email = req.body.email; // Replace with the desired username for the new email account
  const password = req.body.password; // Replace with the desired password for the new email account
  const domain = "supersmartagents.com"; // Replace with your domain
  const quota = 0; // Mailbox quota (0 for unlimited)

  const data = {
    email,
    password,
    domain,
    quota,
    skip_update_db: 1,
  };

  try {
    const response = await axios.post(cPanelUrl, qs.stringify(data), {
      headers: {
        Authorization: `cpanel ${username}:${apiToken}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    if (response.data.status) {
      res.status(200).json({ message: "Email account created successfully" });
    } else {
      res.status(400).json({
        message: "Failed to create email account",
        error: response.data.errors,
      });
    }
  } catch (error) {
    console.error("Error creating email account:", error);
    res
      .status(500)
      .json({ message: "Error creating email account", error: error.message });
  }
};
