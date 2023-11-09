const express = require("express");

const router = express.Router();

//contorllers
const {
  get_clients,
  get_logged_in_user_bots,
  sendEmailtoclient,
  sendTicket,
  downloadFile,
  createEmailAccount,
  update_api_key,
  update_domain_name,
  post_dns_records,
  updateAgentDetails,
} = require("../controllers/Admin");

router.get("/get_clients", get_clients);
router.get("/downloadFile/:fileId", downloadFile);
router.get("/get_bots", get_logged_in_user_bots);
router.post("/sendEmailtoclient", sendEmailtoclient);
router.post("/sendticket", sendTicket);
router.post("/createemail", createEmailAccount);
router.post("/updateapikey", update_api_key);
router.post("/updatedomainname", update_domain_name);
router.post("/postdnsrecords", post_dns_records);
router.post("/updateAgentDetails", updateAgentDetails);

module.exports = router;
