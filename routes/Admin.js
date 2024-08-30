const express = require("express");

const router = express.Router();

//contorllers
const {
  get_clients,
  get_bots,
  sendEmailtoclient,
  sendTicket,
  downloadFile,
  createEmailAccount,
  update_api_key,
  update_domain_name,
  post_dns_records,
  updateAgentDetails,
  get_user_payment_plans,
  updateTodoCompletion,
  sendCustomEmailtoclient,
  getUserStatistics,
} = require("../controllers/Admin");

const {
  createRoadmap,
  likeRoadmap,
  getAllRoadmaps,
  deleteRoadmap,
} = require("../controllers/roadmap");

const {
  createNotice,
  getAllNotices,
  deleteNotice,
} = require("../controllers/notice");

router.get("/get_clients", get_clients);
router.get("/downloadFile/:fileId", downloadFile);
router.get("/get_bots", get_bots);
router.get("/getuserpaymentplans", get_user_payment_plans);
router.post("/sendEmailtoclient", sendEmailtoclient);
router.post("/sendCustomEmailtoclient", sendCustomEmailtoclient);
router.post("/sendticket", sendTicket);
router.post("/createemail", createEmailAccount);
router.post("/updateapikey", update_api_key);
router.post("/updatedomainname", update_domain_name);
router.post("/postdnsrecords", post_dns_records);
router.post("/updateAgentDetails", updateAgentDetails);
router.post("/updateTodoCompletion/:todoId", updateTodoCompletion);
router.get("/getUserStatistics", getUserStatistics);
//roadmap
router.post("/createRoadmap", createRoadmap);
router.post("/likeRoadmap", likeRoadmap);
router.get("/getAllRoadmaps", getAllRoadmaps);
router.delete("/deleteRoadmap/:id", deleteRoadmap);

//notice
router.post("/createNotice", createNotice);
router.get("/getAllNotices", getAllNotices);
router.delete("/deleteNotice/:noticeId", deleteNotice);

module.exports = router;
