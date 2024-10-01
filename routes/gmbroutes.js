const express = require("express");
const router = express.Router();
const {
  getAuthUrl,
  handleOAuth2Callback,
  checkNewPosts,
  ensureAuthenticated,
} = require("../controllers/gmb");

// Route to initiate the OAuth process
router.get("/auth", getAuthUrl);

// OAuth2 callback route
router.get("/oauth2callback", handleOAuth2Callback);

// Route to check new posts (ensures authentication first)
router.get("/check-new-posts", ensureAuthenticated, checkNewPosts);

module.exports = router;
