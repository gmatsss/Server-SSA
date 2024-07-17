const express = require("express");
const router = express.Router();
const {
  checkCredentials,
  validateApiKey,
  generateVoiceToken,
} = require("../controllers/twilio");

router.get("/validate", checkCredentials);
router.get("/validateApiKey", validateApiKey);
router.get("/generateVoiceToken", generateVoiceToken);
// router.post("/call", generateToken);

module.exports = router;
