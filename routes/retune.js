const express = require("express");
const router = express.Router();
const { apiProxy, dynamicChatProxy } = require("../controllers/retune");
const { dynamicSSAProxy } = require("../controllers/apiretune");

router.use("/api", apiProxy);
router.use("/dynamic-api", dynamicChatProxy);
router.use("/SSA/chat/:botId/new-thread", dynamicSSAProxy);
router.use("/SSA/chat/:botId/messages", dynamicSSAProxy);

module.exports = router;
