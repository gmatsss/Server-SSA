const express = require("express");

const router = express.Router();

//contorllers
const { createOnboarding } = require("../controllers/BotController");

router.post("/postinfo", createOnboarding);

module.exports = router;
