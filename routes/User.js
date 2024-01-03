const express = require("express");

const router = express.Router();

//contorllers
const {
  register_user,
  login_user,
  get_user,
  logout_user,
  update_user,
  update_user_password,
} = require("../controllers/User");

router.post("/register", register_user);
router.post("/login", login_user);
router.get("/getuser", get_user);

router.post("/logoutuser", logout_user);
router.post("/update_user/:userId", update_user);
router.post("/update_user_password/:userId", update_user_password);

module.exports = router;
