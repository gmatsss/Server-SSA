const express = require("express");
const router = express.Router();
const { apiProxy, dynamicChatProxy } = require("../controllers/retune");

router.use("/api", apiProxy);
router.use("/dynamic-api", dynamicChatProxy);

module.exports = router;
