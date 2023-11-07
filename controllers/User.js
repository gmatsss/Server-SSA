const User = require("../models/User");
const bcrypt = require("bcryptjs");
const passport = require("passport");

const nodemailer = require("nodemailer");
const crypto = require("crypto");

exports.register_user = async (req, res) => {
  try {
    const { name, email, password, phone, role } = req.body;
    const oldUser = await User.findOne({ email });

    if (oldUser) {
      return res.status(409).json({ err: "User already Exist" });
    }

    // Encrypt user password
    const encryptedPassword = await bcrypt.hash(password, 10);

    // Create user in our database
    const user = await User.create({
      fullname: name,
      email: email.toLowerCase(),
      phone: phone,
      password: encryptedPassword,
      role: role,
    });

    if (role === "user") {
      // If the role is 'user', send back the user's ID for onboarding
      res.status(200).json({
        userId: user._id, // Send back the user's ID
        message: "User registration complete. Proceed with onboarding.",
      });
    } else {
      // If the role is 'admin' or any other, just send a success message
      res.status(200).json({
        message: "Registration complete.",
      });
    }
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ err: "An error occurred while registering the user." });
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
