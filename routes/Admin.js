const express = require("express");

const router = express.Router();

//contorllers
const {
  get_clients,
  get_logged_in_user_bots,
  sendEmailtoclient,
} = require("../controllers/Admin");

router.get("/get_clients", get_clients);
router.get("/get_bots", get_logged_in_user_bots);
router.post("/sendEmailtoclient", sendEmailtoclient);

module.exports = router;
