const User = require("../models/User");
const bcrypt = require("bcryptjs");
const passport = require("passport");

const nodemailer = require("nodemailer");
const crypto = require("crypto");

exports.register_user = async (req, res) => {
  console.log(req.body);
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
          ? "User registration complete. Proceed with onboarding."
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
      if (err) return next(err);
      if (!user)
        return res
          .status(401)
          .json({ message: info.message || "No user exists" });

      req.logIn(user, (err) => {
        if (err) {
          return next(err);
        }
        return res
          .status(200)
          .json({ message: "Login successful", user: req.user });
      });
    })(req, res, next);
  } catch (error) {
    console.log(error);
  }
};

exports.get_user = async (req, res) => {
  if (req.isAuthenticated()) {
    return res.status(200).json({ isLoggedIn: true, user: req.user });
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
