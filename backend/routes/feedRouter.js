const express = require("express");
const { getFeed } = require("../controllers/feedController");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// The logged-in member's own notifications.
router.get("/", requireAuth, getFeed);

module.exports = router;
