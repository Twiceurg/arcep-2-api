const express = require("express");
const { login } = require("../controllers/authController/authController");
const authenticateToken = require("../middleware/authenticateToken");
const { getUserDetails } = require("../controllers/authController/userController");
const router = express.Router();
 
router.post("/login", login); 

router.get("/user-details", authenticateToken, getUserDetails);

module.exports = router;
