const express = require("express");

const router = express.Router();

//contorllers
const {
  createOnboarding,
  additionalbot,
  updateLifetimeAccess,
} = require("../controllers/BotController");

router.post("/postinfo", createOnboarding);
router.post("/updateLifetimeAccess", updateLifetimeAccess);
router.post("/addbot", additionalbot);

module.exports = router;
