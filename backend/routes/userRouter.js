const express = require("express");
const router = express.Router();

const {loginUser, signupUser} = require("../controllers/userControllers");

// login route
router.post("/login", loginUser);

// signin route
router.post("/signup", signupUser);

module.exports = router;