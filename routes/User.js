const express = require("express");

const router = express.Router();

//contorllers
const {
  register_user,
  login_user,
  get_user,
  logout_user,
  verify_user,
} = require("../controllers/User");

router.post("/register", register_user);
router.post("/login", login_user);
router.get("/getuser", get_user);
router.get("/verify-email", verify_user);
router.post("/logoutuser", logout_user);

module.exports = router;
