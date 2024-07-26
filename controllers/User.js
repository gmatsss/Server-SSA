const User = require("../models/User");
const bcrypt = require("bcryptjs");
const passport = require("passport");
const Onboarding = require("../models/botSchema");
const mongoose = require("mongoose");
const Announcement = require("../models/announcement");

exports.register_user = async (req, res) => {
  try {
    const { name, email, password, phone, role } = req.body;
    const oldUser = await User.findOne({ email: email.toLowerCase() }); // Ensure case-insensitive check

    if (oldUser) {
      return res
        .status(409)
        .json({ data: null, error: "User already exists." });
    }

    // Encrypt user password
    const encryptedPassword = await bcrypt.hash(password, 10);

    // Create user in our database
    const user = await User.create({
      fullname: name,
      email: email.toLowerCase(), // Save email in lowercase
      phone: phone,
      password: encryptedPassword,
      role: role,
    });

    // Prepare the response data
    const responseData = {
      userId: user._id,
      message:
        role === "user"
          ? "User registration complete"
          : "Registration complete.",
    };

    // Send a successful response
    res.status(200).json({ data: responseData, error: null });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      data: null,
      error: "An error occurred while registering the user.",
    });
  }
};

exports.login_user = async (req, res, next) => {
  try {
    passport.authenticate("local", (err, user, info) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        return res
          .status(401)
          .json({ message: info.message || "No user exists" });
      }

      req.logIn(user, async (err) => {
        if (err) {
          return next(err);
        }

        await User.findByIdAndUpdate(user._id, {
          $set: { lastLogin: Date.now() },
        });

        res.status(200).json({ message: "Login successful", user: req.user });
      });
    })(req, res, next);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.get_user = async (req, res) => {
  if (req.isAuthenticated()) {
    let userResponse = { isLoggedIn: true, user: req.user };

    if (req.user.role === "user") {
      try {
        const userId = new mongoose.Types.ObjectId(req.user._id);

        // Fetch agents where lifetimeAccess is false and offerEndDate has not expired
        const botsWithLifetimeAccess = await Onboarding.aggregate([
          { $match: { user: userId } },
          { $unwind: "$agents" },
          { $unwind: "$agents.agents" },
          { $match: { "agents.agents.lifetimeAccess": false } },
          { $match: { "agents.agents.offerEndDate": { $gte: new Date() } } },
          {
            $project: {
              agentType: "$agents.agents.agentType",
              toneOfVoice: "$agents.agents.toneOfVoice",
              serviceIndustry: "$agents.agents.serviceIndustry",
              lifetimeAccess: "$agents.agents.lifetimeAccess",
              offerValidityDays: "$agents.agents.offerValidityDays",
              offerStartDate: "$agents.agents.offerStartDate",
              offerEndDate: "$agents.agents.offerEndDate",
              botStatus: "$agents.agents.botStatus",
              verificationCodebotplan: "$agents.verificationCodebotplan",
              agentId: "$agents.agents._id", // Include the agent's unique _id
            },
          },
        ]);

        userResponse.botsWithLifetimeAccess = botsWithLifetimeAccess;
      } catch (error) {
        console.error("Error fetching bots with lifetime access:", error);
        return res
          .status(500)
          .json({ message: "Error fetching bots with lifetime access" });
      }
    }

    if (req.user.role === "Admin") {
      try {
        // Fetch announcements related to the admin user
        const announcements = await Announcement.find({ user: req.user._id });
        userResponse.announcements = announcements;
      } catch (error) {
        console.error("Error fetching announcements:", error);
        return res
          .status(500)
          .json({ message: "Error fetching announcements" });
      }
    }

    return res.status(200).json(userResponse);
  } else {
    return res.status(200).json({ isLoggedIn: false });
  }
};

exports.logout_user = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Error during logout:", err);
      return res
        .status(500)
        .json({ message: "Logout failed. Please try again." });
    }

    // Optionally, you can clear the user object if it's stored in the request
    req.user = null;

    res.status(200).json({ message: "Successfully logged out." });
  });
};

exports.update_user = async (req, res) => {
  try {
    const { userId } = req.params; // Get the user ID from the request parameters
    const { fullname, email, phone } = req.body; // Get the updated values from the request body

    // Optional: Check if the email is being updated to a new one and if it already exists
    if (email) {
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser && existingUser._id.toString() !== userId) {
        return res
          .status(409)
          .json({ data: null, error: "Email already in use." });
      }
    }

    // Find the user by ID and update their details
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        fullname: fullname,
        email: email ? email.toLowerCase() : undefined, // Update email if provided
        phone: phone,
      },
      { new: true } // This option returns the updated document
    );

    if (!updatedUser) {
      return res.status(404).json({ data: null, error: "User not found." });
    }

    res.status(200).json({ data: updatedUser, error: null });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({
      data: null,
      error: "An error occurred while updating the user.",
    });
  }
};

exports.update_user_password = async (req, res) => {
  try {
    const { userId } = req.params;
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ data: null, error: "User not found." });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);

    if (!isMatch) {
      return res
        .status(400)
        .json({ data: null, error: "Current password is incorrect." });
    }

    const encryptedPassword = await bcrypt.hash(newPassword, 10);

    user.password = encryptedPassword;
    await user.save();

    res.status(200).json({ data: { userId: user._id }, error: null });
  } catch (error) {
    console.error("Error updating password:", error);
    res.status(500).json({
      data: null,
      error: "An error occurred while updating the password.",
    });
  }
};
