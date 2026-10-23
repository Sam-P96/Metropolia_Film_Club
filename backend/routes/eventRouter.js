const express = require("express");
const {
    getEvents,
    getEvent,
    setEventRsvp,
    createEvent,
    updateEvent,
    deleteEvent,
} = require("../controllers/eventController");
const { requireAuth, optionalAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

router.get("/", getEvents);
// optionalAuth: a logged-in member learns their own RSVP, and sees themselves
// in the lists even with a private profile.
router.get("/:id", optionalAuth, getEvent);

// Any logged-in member.
router.put("/:id/rsvp", requireAuth, setEventRsvp);

// Moderators and admins. The frontend hides the buttons from everyone else,
// but these are the checks that count.
router.post("/", requireAuth, requireRole("moderator"), createEvent);
router.put("/:id", requireAuth, requireRole("moderator"), updateEvent);
router.delete("/:id", requireAuth, requireRole("moderator"), deleteEvent);

module.exports = router;
