const express = require("express");

const router = express.Router();

//contorllers
const {
  createOnboarding,
  additionalbot,
  updateLifetimeAccess,
  getNumberOfBotsRegistered,
} = require("../controllers/BotController");

router.post("/postinfo", createOnboarding);
router.post("/updateLifetimeAccess", updateLifetimeAccess);
router.post("/addbot", additionalbot);
router.get("/getNumberOfBotsRegistered", getNumberOfBotsRegistered);

module.exports = router;
