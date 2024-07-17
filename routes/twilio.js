const express = require("express");
const router = express.Router();
const { generateToken } = require("../controllers/twilio");

router.post("/token", generateToken);
// router.post("/call", generateToken);

module.exports = router;
