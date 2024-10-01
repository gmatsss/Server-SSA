const express = require("express");
const router = express.Router();
const {
  getAuthUrl,
  handleOAuth2Callback,
  checkNewPosts,
} = require("../controllers/gmb");

// Route to start the OAuth2 flow
router.get("/auth", getAuthUrl);

// Route to handle the OAuth2 callback (Google will redirect here)
router.get("/oauth2callback", handleOAuth2Callback);

// Route to check for new GMB posts
router.get("/check-new-posts", checkNewPosts);

module.exports = router;
