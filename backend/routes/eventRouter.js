const express = require("express");
const {
    getEvents,
    getEvent,
    createEvent,
    updateEvent,
    deleteEvent,
} = require("../controllers/eventController");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

router.get("/", getEvents);
router.get("/:id", getEvent);

// Moderators and admins. The frontend hides the buttons from everyone else,
// but these are the checks that count.
router.post("/", requireAuth, requireRole("moderator"), createEvent);
router.put("/:id", requireAuth, requireRole("moderator"), updateEvent);
router.delete("/:id", requireAuth, requireRole("moderator"), deleteEvent);

module.exports = router;
