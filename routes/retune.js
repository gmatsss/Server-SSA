const express = require("express");
const router = express.Router();
const { apiProxy } = require("../controllers/retune");

router.use("/api", apiProxy);

module.exports = router;
