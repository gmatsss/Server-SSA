const User = require("../models/User");
const Onboarding = require("../models/botSchema");
const nodemailer = require("nodemailer");
const { MongoClient, GridFSBucket } = require("mongodb");
const { ObjectId } = require("mongodb");
const axios = require("axios");
const qs = require("qs");
const sendEmail = require("../middleware/mailer");
const cron = require("node-cron");
const Announcement = require("../models/announcement");
const mongoose = require("mongoose");
const VoiceAgentsSSA = require("../models/playaiSchema");

exports.downloadFile = async (req, res) => {
  try {
    const fileId = new ObjectId(req.params.fileId);

    const db = mongoose.connection.db;
    const bucket = new GridFSBucket(db, { bucketName: "botfiles" });

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
    const users = await User.find({ role: "user" });

    if (!users || users.length === 0) {
      return res.status(404).json({ message: "No users found" });
    }

    const usersWithDetails = await Promise.all(
      users.map(async (user) => {
        let userDetails = { ...user._doc };

        let hasOnboardingDetails = false;
        let hasVoiceAgentsSSA = false;

        const onboardingDetails = await Onboarding.findOne({
          user: user._id,
        }).populate({
          path: "agents.agents",
          strictPopulate: false,
        });

        if (onboardingDetails) {
          hasOnboardingDetails = true;

          const files = [];
          if (onboardingDetails.uploadedFiles) {
            for (const fileId of onboardingDetails.uploadedFiles) {
              const file = await mongoose.connection.db
                .collection("botfiles.files")
                .findOne({ _id: new ObjectId(fileId) });

              if (file) {
                files.push({
                  _id: file._id.toString(),
                  filename: file.filename,
                });
              }
            }
          }

          let isModified = false;

          for (const agent of onboardingDetails.agents) {
            for (const innerAgent of agent.agents) {
              if (!innerAgent.lifetimeAccess) {
                const subscriptionStatus = await getMoonClerkSubscriptionStatus(
                  agent.verificationCodebotplan
                );

                if (
                  subscriptionStatus &&
                  innerAgent.botStatus !== "In Progress" &&
                  innerAgent.botStatus !== subscriptionStatus
                ) {
                  innerAgent.botStatus = subscriptionStatus;
                  isModified = true;
                }
              }
            }
          }

          if (isModified) {
            try {
              await onboardingDetails.save();
            } catch (saveError) {
              console.error("Error saving onboarding details:", saveError);
            }
          }

          userDetails.onboardingDetails = {
            ...onboardingDetails._doc,
            files: files,
          };
        }

        // If no Onboarding details, fetch VoiceAgentsSSA details
        if (!hasOnboardingDetails) {
          const voiceAgentsSSA = await VoiceAgentsSSA.findOne({
            user: user._id,
          });

          if (voiceAgentsSSA) {
            hasVoiceAgentsSSA = true;
            let isModified = false;

            const verificationCodeToMatch =
              voiceAgentsSSA.paymentPlan?.verificationCodebotplan ||
              voiceAgentsSSA.minutesPlans?.[0]?.verificationCode;

            // Loop through each agent and check the subscription status
            for (const agent of voiceAgentsSSA.agents) {
              if (!agent.lifetimeAccess) {
                const minutesPlan = voiceAgentsSSA.minutesPlans.find(
                  (plan) => plan.verificationCode === verificationCodeToMatch
                );

                const subscriptionStatus = minutesPlan
                  ? await getMoonClerkSubscriptionStatus(
                      minutesPlan.verificationCode
                    )
                  : null;

                if (
                  subscriptionStatus &&
                  agent.botStatus !== "In Progress" &&
                  agent.botStatus !== subscriptionStatus
                ) {
                  agent.botStatus = subscriptionStatus;
                  isModified = true;
                }
              }
            }

            if (isModified) {
              try {
                await voiceAgentsSSA.save();
              } catch (saveError) {
                console.error(
                  "Error saving voice agents SSA details:",
                  saveError
                );
              }
            }

            userDetails.voiceAgentsSSA = voiceAgentsSSA;
          }
        }

        return userDetails;
      })
    );

    res.json(usersWithDetails);
  } catch (error) {
    console.error("Error fetching clients:", error);
    res.status(500).json({
      message: "An error occurred while fetching the users",
    });
  }
};

exports.get_bots = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Fetch Onboarding details only if they exist
    const onboardingDetails = await Onboarding.findOne({ user: userId });

    if (!onboardingDetails) {
      return res
        .status(404)
        .json({ message: "No onboarding details found for the user" });
    }

    // Populate only if agents exist
    if (onboardingDetails.agents && onboardingDetails.agents.length > 0) {
      await onboardingDetails.populate("agents");
    }

    // Populate only if payment plans exist
    if (
      onboardingDetails.paymentplan &&
      onboardingDetails.paymentplan.length > 0
    ) {
      await onboardingDetails.populate("paymentplan");
    }

    const moonClerkResponse = await axios.get(
      "http://localhost:8001/moonclerk/api/customers",
      {
        headers: {
          Authorization: "Bearer 08bf9295738475d4afc3362ba53678df",
          Accept: "application/vnd.moonclerk+json;version=1",
        },
      }
    );

    let isModified = false;

    // Update botStatus if necessary
    onboardingDetails.agents.forEach((outerAgent) => {
      outerAgent.agents.forEach((innerAgent) => {
        if (innerAgent.lifetimeAccess) {
          return;
        }

        const verificationCode = outerAgent.verificationCodebotplan;

        const matchedCustomer = findCustomerByVerificationCode(
          moonClerkResponse.data,
          verificationCode
        );

        if (matchedCustomer && matchedCustomer.subscription) {
          if (innerAgent.botStatus !== "In Progress") {
            innerAgent.botStatus = matchedCustomer.subscription.status;
            isModified = true;
          }
        }
      });
    });

    if (isModified) {
      onboardingDetails.markModified("agents");
      await onboardingDetails.save();
    }

    const combinedData = {
      onboardingDetails,
      customers: onboardingDetails.agents
        .map((outerAgent) =>
          outerAgent.agents.map((innerAgent) =>
            findCustomerByVerificationCode(
              moonClerkResponse.data,
              outerAgent.verificationCodebotplan
            )
          )
        )
        .flat(),
    };

    res.json(combinedData);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message:
        "An error occurred while fetching the bots for the logged-in user",
    });
  }
};

function findCustomerByVerificationCode(moonClerkData, verificationCode) {
  return moonClerkData.customers.find((customer) => {
    const customerVerificationCode =
      customer.custom_fields.verification_code.response;
    return customerVerificationCode === verificationCode;
  });
}

exports.update_api_key = async (req, res) => {
  try {
    const userId = req.user._id;
    const { openAI, claude, openRouter } = req.body; // Destructure all API keys from the request body
    const updatedKeys = [];

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
    if (openAI) {
      onboardingDetails.openAPIKey.OpenAI = openAI;
      updatedKeys.push("OpenAI");
    }
    if (claude) {
      onboardingDetails.openAPIKey.Claude = claude;
      updatedKeys.push("Claude");
    }
    if (openRouter) {
      onboardingDetails.openAPIKey.OpenRouter = openRouter;
      updatedKeys.push("OpenRouter");
    }

    await onboardingDetails.save();

    // If any keys were updated, send an email notification
    if (updatedKeys.length > 0) {
      const emailContent = {
        to: "pat@supersmartagents.com, gabriel.maturan@linkage.ph",
        subject: "API Key Update Notification for SuperSmartAgents",
        html: `
        <div style="font-family: 'Arial', sans-serif; color: #333;">
          <h1 style="color: #4F81BD;">API Key Update Alert</h1>
          <p>API keys have been updated for the account associated with the email: <strong>${
            user.email
          }</strong></p>
          <p>The following API keys have been updated:</p>
          <ul>
            ${updatedKeys.map((key) => `<li>${key}</li>`).join("")}
          </ul>
          <p>Please visit the <a href="https://dashboard.supersmartagents.com" target="_blank" style="color: #005A9C; text-decoration: none;">admin dashboard</a> to review the updates.</p>
          <p>Best Regards,</p>
          <p><strong>The SuperSmartAgents Support Team</strong></p>
        </div>
      `,
      };

      await sendEmail(emailContent);
      res.json({ message: "API keys updated successfully", onboardingDetails });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "An error occurred while updating the API keys",
    });
  }
};

exports.update_domain_name = async (req, res) => {
  try {
    const userId = req.user._id;
    const { domainName } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const onboardingDetails = await Onboarding.findOne({ user: userId });
    if (!onboardingDetails) {
      return res.status(404).json({ message: "Onboarding details not found" });
    }

    if (domainName) {
      onboardingDetails.domainName = domainName;
      await onboardingDetails.save();

      const emailContent = {
        to: "pat@supersmartagents.com, gabriel.maturan@linkage.ph",
        subject: "Domain Name Update Notification",
        html: `
        <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.5;">
          <h1 style="color: #4F81BD;">Domain Name Update Alert</h1>
          <p>This email is to inform you that the user with the email: <strong>${user.email}</strong> has updated their domain name to: <strong>${domainName}</strong>.</p>
          <p>Kindly proceed to the admin dashboard to confirm the new domain settings and perform any necessary updates:</p>
          <p style="margin-bottom: 2em;">
            <a href="https://dashboard.supersmartagents.com" target="_blank" style="color: blue padding: 10px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">Visit Admin Dashboard</a>
          </p>
          <p>Thank you</p>
          <br>
          <p>Warm regards,</p>
          <p><strong>The SuperSmartAgents Support Team</strong></p>
        </div>
      `,
      };

      await sendEmail(emailContent);
      res.json({
        message: "Domain name updated successfully",
        onboardingDetails,
      });
    } else {
      res.status(400).json({ message: "Invalid domain name" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "An error occurred while updating the domain name",
    });
  }
};

exports.post_dns_records = async (req, res) => {
  try {
    const { user, dnsRecords, email } = req.body;

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

    const userNotificationContent = {
      to: email,
      subject: "DNS Settings Update",
      html: `
        <h1>DNS Settings Updated</h1>
        <p>Hello,</p>
        <p>Your DNS settings have been successfully updated. To ensure that your domain functions correctly, please follow the DNS configuration steps provided in your dashboard.</p>
        <p><a href="https://dashboard.supersmartagents.com" target="_blank">Click here to go to your DNS settings dashboard</a></p>
        <p>If you need any assistance, our support team is here to help.</p>
        <p>Best Regards,</p>
        <p>SSA Support Team</p>
      `,
    };

    await sendEmail(userNotificationContent);
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
        user: "support@supersmartagents.com",
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
      from: '"Super Smart Agents" <support@supersmartagents.com>',
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

exports.sendCustomEmailtoclient = async (req, res, next) => {
  try {
    // Create a transporter object using the default SMTP transport
    const transporter = nodemailer.createTransport({
      host: "mail.supersmartagents.com",
      port: 465,
      secure: true, // true for 465, false for other ports
      auth: {
        user: "support@supersmartagents.com",
        pass: "4Sgr3;;I83SmrJ", // Replace with the email account's password
      },
    });

    const { email, message } = req.body; // Include 'message' from the request body

    // Use the provided 'message' for the email body
    const subject = "Custom Message from SSA";
    const text = message; // Use the custom message text
    const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #e4e4e4;">
      <h2 style="color: #333; border-bottom: 1px solid #e4e4e4; padding-bottom: 10px;">Message from SSA</h2>
      <p style="font-size: 16px; line-height: 1.5; color: #555;">
          ${message} <!-- Use the custom message here -->
      </p>
      <p style="font-size: 16px; line-height: 1.5; color: #555;">
          If you have any questions or need assistance, feel free to reach out to us.
      </p>
      <p style="font-size: 16px; line-height: 1.5; color: #555;">
          Cheers,<br>
          The Super Smart Agents Team
      </p>
    </div>
    `;

    // Send the email
    await transporter.sendMail({
      from: '"Super Smart Agents" <support@supersmartagents.com>',
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
    const transporter = nodemailer.createTransport({
      host: "smtp.sendgrid.net",
      port: 587,
      secure: false,
      auth: {
        user: "apikey",
        pass: "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",
      },
    });

    const { email, subject, text, html } = req.body;

    if (!email || !subject || !text || !html) {
      return res.status(400).send({ message: "Missing required fields." });
    }

    await transporter.sendMail({
      from: `"Ticket to SSA" <sendticket@supersmartagents.com>`,
      replyTo: "tickets@super-smart-agents.p.tawk.email",
      to: email,
      subject: subject,
      text: text,
      html: html,
    });

    res.status(200).send({ message: "Email sent successfully!" });
  } catch (error) {
    console.error("Error sending email:", error);
    next(error);
  }
};

exports.createEmailAccount = async (req, res) => {
  const cPanelUrl = "https://supersmartagents.com:2083/execute/Email/add_pop";
  const username = "supersma";
  const apiToken = "N4ZD9FA3XSV16QS5JKY4RIZC2WQY7957";

  const email = req.body.email;
  const password = req.body.password;
  const domain = "supersmartagents.com";
  const quota = 0;

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

exports.updateAgentDetails = async (req, res) => {
  const { userId, agentId, agentDetails } = req.body;

  try {
    const onboarding = await Onboarding.findOne({ user: userId });

    if (!onboarding) {
      return res
        .status(404)
        .json({ message: "Onboarding document not found." });
    }

    let agentFound = false;
    for (let agentGroup of onboarding.agents) {
      const agentIndex = agentGroup.agents.findIndex(
        (agent) => agent._id.toString() === agentId
      );

      if (agentIndex !== -1) {
        Object.keys(agentDetails).forEach((key) => {
          agentGroup.agents[agentIndex][key] = agentDetails[key];
        });
        agentFound = true;
        break;
      }
    }

    if (!agentFound) {
      return res.status(404).json({ message: "Agent not found." });
    }

    await onboarding.save();

    res
      .status(200)
      .json({ message: "Agent updated successfully.", onboarding });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

exports.get_user_payment_plans = async (req, res) => {
  try {
    const userId = req.user._id;

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

    // Extract the payment plan IDs, filtering out any null or undefined customer_id
    const paymentPlanIds = onboardingDetails.paymentplan
      .filter((plan) => plan.customer_id) // Add this line to filter out plans without customer_id
      .map((plan) => plan.customer_id);

    res.json({ paymentPlanIds });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message:
        "An error occurred while fetching the payment plans for the logged-in user",
    });
  }
};

// Function to fetch MoonClerk data
async function fetchMoonClerkData() {
  try {
    const response = await axios.get(
      "http://localhost:8001/moonclerk/api/customers",
      {
        headers: {
          Authorization: "Bearer 08bf9295738475d4afc3362ba53678df",
          Accept: "application/vnd.moonclerk+json;version=1",
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching MoonClerk data:", error);
    return null;
  }
}

// Function to update bot status in the database
async function updateBotStatus() {
  const moonClerkData = await fetchMoonClerkData();
  if (!moonClerkData) {
    return;
  }

  const onboardings = await Onboarding.find().populate("agents");
  onboardings.forEach(async (onboarding) => {
    let isModified = false;
    onboarding.agents.forEach((outerAgent) => {
      outerAgent.agents.forEach((innerAgent) => {
        // Skip updating status if lifetimeAccess is true
        if (innerAgent.lifetimeAccess) {
          return;
        }

        if (innerAgent.botStatus !== "In Progress") {
          const matchedCustomer = findCustomerByVerificationCode(
            moonClerkData,
            outerAgent.verificationCodebotplan
          );

          if (matchedCustomer && matchedCustomer.subscription) {
            innerAgent.botStatus = matchedCustomer.subscription.status;
            isModified = true;
          }
        }
      });
    });

    if (isModified) {
      onboarding.markModified("agents");
      await onboarding.save();
    }
  });
}

async function updateVoiceAgentData() {
  try {
    const moonClerkData = await fetchMoonClerkData();
    if (!moonClerkData) {
      console.error("No MoonClerk data found.");
      return;
    }

    const voiceAgents = await VoiceAgentsSSA.find();

    voiceAgents.forEach(async (voiceAgentSSA) => {
      let isModified = false;

      voiceAgentSSA.agents.forEach((VAagent) => {
        if (VAagent.lifetimeAccess) {
          return;
        }

        if (VAagent.botStatus !== "Active") {
          const matchedCustomer = findCustomerByVerificationCode(
            moonClerkData,
            voiceAgentSSA.verificationCodebotplan
          );

          if (matchedCustomer && matchedCustomer.subscription) {
            VAagent.botStatus = matchedCustomer.subscription.status;
            isModified = true;
          }
        }
      });

      if (isModified) {
        try {
          await voiceAgentSSA.save();
          console.log(`Voice Agent SSA with ID ${voiceAgentSSA._id} updated.`);
        } catch (saveError) {
          console.error(
            `Error saving Voice Agent SSA with ID ${voiceAgentSSA._id}:`,
            saveError
          );
        }
      }
    });
  } catch (error) {
    console.error("Error updating voice agent data:", error);
  }
}

cron.schedule("0 */12 * * *", () => {
  try {
    updateBotStatus();
    updateVoiceAgentData();
  } catch (cronError) {
    console.error("Error in scheduled task:", cronError);
  }
});

// cron.schedule("*/1 * * * *", () => {
//   updateBotStatus();
//   updateVoiceAgentData();
// });

exports.updateTodoCompletion = async (req, res) => {
  try {
    const todoId = req.params.todoId; // ID of the todo to update

    // Convert todoId to ObjectId
    const objectId = new mongoose.Types.ObjectId(todoId);

    // Update the completed status of the specific todo in all announcements
    const result = await Announcement.updateMany(
      { "todos._id": objectId },
      { $set: { "todos.$.completed": true } }
    );

    if (result.nModified === 0) {
      return res
        .status(404)
        .json({ message: "No todo found with the given ID" });
    }

    res
      .status(200)
      .json({ message: "Todo updated successfully across all announcements" });
  } catch (error) {
    console.error("Error updating todo:", error);
    res.status(500).json({ err: "An error occurred while updating the todo." });
  }
};

exports.getUserStatistics = async (req, res) => {
  try {
    const now = new Date();
    const oneDayAgo = new Date(now.setDate(now.getDate() - 1));
    const thirtyDaysAgo = new Date(now.setDate(now.getDate() - 29));

    const userRoleFilter = { role: "user" };

    const activeUsersCount = await User.countDocuments({
      ...userRoleFilter,
      lastLogin: { $gte: thirtyDaysAgo },
    });

    const newSignUpsCount = await User.countDocuments({
      ...userRoleFilter,
      createdAt: { $gte: oneDayAgo },
    });

    const totalUsersCount = await User.countDocuments(userRoleFilter);

    const engagedUsersCount = activeUsersCount;

    const engagementRate = (
      (engagedUsersCount / totalUsersCount) *
      100
    ).toFixed(2);

    res.json({
      success: true,
      data: {
        activeUsers: activeUsersCount,
        newSignUps: newSignUpsCount,
        engagementRate: engagementRate + "%",
      },
    });
  } catch (err) {
    console.error("Error fetching user statistics:", err); // Log error details
    res.status(500).send({
      success: false,
      message: "Failed to retrieve user statistics",
      error: err.message,
    });
  }
};

const getMoonClerkSubscriptionStatus = async (verificationCode) => {
  try {
    const moonClerkResponse = await axios.get(
      "http://localhost:8001/moonclerk/api/customers",
      {
        headers: {
          Authorization: "Bearer 08bf9295738475d4afc3362ba53678df",
          Accept: "application/vnd.moonclerk+json;version=1",
        },
      }
    );

    // Ensure that the data is an array
    const customers = moonClerkResponse.data.customers;
    if (!Array.isArray(customers)) {
      throw new Error("Expected an array in MoonClerk response data.");
    }

    // Function to find the customer by verification code
    const findCustomerByVerificationCode = (customers, verificationCode) => {
      return customers.find((customer) => {
        return (
          customer.custom_fields &&
          customer.custom_fields.verification_code &&
          customer.custom_fields.verification_code.response === verificationCode
        );
      });
    };

    const matchedCustomer = findCustomerByVerificationCode(
      customers,
      verificationCode
    );

    return matchedCustomer && matchedCustomer.subscription
      ? matchedCustomer.subscription.status
      : null;
  } catch (error) {
    console.error("Error fetching MoonClerk subscription status:", error);
    return null;
  }
};
