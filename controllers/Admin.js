const User = require("../models/User");
const Onboarding = require("../models/botSchema");
const nodemailer = require("nodemailer");

exports.get_clients = async (req, res) => {
  try {
    // Fetch users with the role of "User"
    const users = await User.find({ role: "user" });

    if (!users || users.length === 0) {
      return res.status(404).json({ message: "No users found" });
    }

    // Fetch the onboarding details for each user and populate the 'agents' field
    const usersWithOnboarding = await Promise.all(
      users.map(async (user) => {
        const onboardingDetails = await Onboarding.findOne({
          user: user._id,
        }).populate("agents");
        return {
          ...user._doc,
          onboardingDetails: onboardingDetails,
        };
      })
    );

    // Return the list of users with their roles and the populated onboarding details
    res.json(usersWithOnboarding);
  } catch (error) {
    console.error(error);
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
    const text = `Greetings from SSA! We're happy to inform you that your bot is already configured. To test and run it, please login at https://supersmartagents.com/Signin. Your password is your first name: ${fname}.`;
    const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #e4e4e4;">
    <h2 style="color: #333; border-bottom: 1px solid #e4e4e4; padding-bottom: 10px;">Exciting News: Your Bot is Ready!</h2>
    <p style="font-size: 16px; line-height: 1.5; color: #555;">
        Hello from the SSA Team! 🎉 We're thrilled to share that your personalized bot has been meticulously configured and is now ready to roll!
    </p>
    <p style="font-size: 16px; line-height: 1.5; color: #555;">
        Dive right in and experience the magic. Simply <a href="https://supersmartagents.com/Signin" style="color: #007BFF; text-decoration: none;">click here to login</a> and get started.
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
