const express = require("express");
const router = express.Router();
const {
  checkCredentials,
  validateApiKey,
  generateVoiceToken,
  handleVoiceRequest,
} = require("../controllers/twilio");

router.get("/validate", checkCredentials);
router.get("/validateApiKey", validateApiKey);
router.get("/generateVoiceToken", generateVoiceToken);
router.post("/voice/:To", handleVoiceRequest);
// router.post("/call", generateToken);

module.exports = router;
