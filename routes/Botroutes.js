const express = require("express");

const router = express.Router();

//contorllers
const {
  createOnboarding,
  additionalbot,
  updateLifetimeAccess,
  getNumberOfBotsRegistered,
} = require("../controllers/BotController");

const {
  createVoiceAgentSSA,
  getAllVAgentsByUser,
  updateCallDuration,
  checkMinutesLimit,
  setappointment,
} = require("../controllers/VAcontroller");

router.post("/postinfo", createOnboarding);
router.post("/updateLifetimeAccess", updateLifetimeAccess);
router.post("/addbot", additionalbot);
router.get("/getNumberOfBotsRegistered", getNumberOfBotsRegistered);

//VA agents
router.post("/updateCallDuration/:id", updateCallDuration);
router.get("/checkMinutesLimit/:agentId", checkMinutesLimit);

router.post("/createVoiceAgentSSA", createVoiceAgentSSA);
router.get("/getAllVAgentsByUser", getAllVAgentsByUser);

//VA agents appointment
router.get("/setappointment", setappointment);

module.exports = router;
