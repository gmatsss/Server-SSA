const express = require("express");
const router = express.Router();

//import controller
const { getTest } = require("../controllers/test");

//import middleware

//api
router.get("/", getTest);

module.exports = router;
