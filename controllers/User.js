const User = require("../models/User");
const bcrypt = require("bcryptjs");
const passport = require("passport");

const nodemailer = require("nodemailer");

const crypto = require("crypto");

exports.register_user = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const oldUser = await User.findOne({ email });

    if (oldUser) {
      return res.status(409).json({ err: "User already Exist" });
    }

    // Generate a verification token
    const token = crypto.randomBytes(20).toString("hex");

    // Encrypt user password
    encryptedPassword = await bcrypt.hash(password, 10);

    // Create user in our database
    const user = await User.create({
      fullname: name,
      email: email.toLowerCase(),
      password: encryptedPassword,
      role: "User",
      verificationToken: token, // store the token in the user document
    });

    // Send a verification email
    let transporter = nodemailer.createTransport({
      host: "mail.customadesign.info",
      port: 465,
      secure: true,
      auth: {
        user: "_mainaccount@customadesign.info",
        pass: "fj58T6V4kbaPLg4gfgKxaQEQ",
      },
    });

    const verificationLink = `http://localhost:8001/user/verify-email?token=${token}`; //change in production

    let mailOptions = {
      from: "_mainaccount@customadesign.info",
      to: email,
      subject: "Email Verification",
      text: `Please verify your email by clicking on the link: ${verificationLink}`,
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({
      data: user,
      message:
        "Register Complete. Please check your email to verify your account.",
    });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ err: "An error occurred while registering the user." });
  }
};

exports.verify_user = async (req, res) => {
  const { token } = req.query;

  // Find the user by the token
  const user = await User.findOne({ verificationToken: token });

  if (!user) {
    // Optionally, you can redirect to an error page
    return res.redirect("http://localhost:3000/error?message=Invalid token."); //change in production
  }

  // Mark the email as verified and clear the verification token
  user.emailVerified = true;
  user.verificationToken = undefined;
  await user.save();

  // Redirect to the Signin page
  res.redirect("http://localhost:3000/Signin"); //change in production
};

exports.login_user = async (req, res, next) => {
  try {
    passport.authenticate("local", (err, user, info) => {
      if (err) return next(err);
      if (!user)
        return res
          .status(401)
          .json({ message: info.message || "No user exists" });

      // Check if the email is verified
      if (!user.emailVerified) {
        return res
          .status(401)
          .json({ message: "Email not verified check your email to verify" });
      }

      req.login(user, {}, (err) => {
        if (err) return next(err);
        return res
          .status(200)
          .json({ user: req.user, message: "Login Success" });
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
