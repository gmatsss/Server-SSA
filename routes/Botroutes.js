const express = require("express");

const router = express.Router();

//contorllers
const {
  createOnboarding,
  additionalbot,
} = require("../controllers/BotController");

router.post("/postinfo", createOnboarding);
router.post("/addbot", additionalbot);

module.exports = router;
