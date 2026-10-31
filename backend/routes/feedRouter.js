const express = require("express");
const { getFeed, getUnread, markSeen } = require("../controllers/feedController");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// The logged-in member's own notifications.
router.get("/", requireAuth, getFeed);
// Whether any are unread, for the bell in the nav, and marking them seen.
router.get("/unread", requireAuth, getUnread);
router.post("/seen", requireAuth, markSeen);

module.exports = router;
