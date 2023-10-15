const express = require("express");
const router = express.Router();
const { moonClerkProxy } = require("../controllers/moonclerk");

router.use("/api", moonClerkProxy);

module.exports = router;
