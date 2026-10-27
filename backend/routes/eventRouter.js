const express = require("express");
const {
    getEvents,
    getEvent,
    setEventRsvp,
    setMySeat,
    removeSeat,
    setEventOfficial,
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

// Any logged-in member. Seats are for members attending a theatre screening;
// the controller checks that.
router.put("/:id/rsvp", requireAuth, setEventRsvp);
router.put("/:id/seat", requireAuth, setMySeat);

// Moderators and admins: remove anyone's seat entry.
router.delete("/:id/seats/:userId", requireAuth, requireRole("moderator"), removeSeat);

// Any logged-in member can make an event (a member screening). Who may edit
// or delete one depends on the event, so the controller checks that. The
// frontend hides the buttons, but these are the checks that count.
router.post("/", requireAuth, createEvent);
router.put("/:id", requireAuth, updateEvent);
router.delete("/:id", requireAuth, deleteEvent);

// Moderators and admins: promote to official, or demote to member screening.
router.put("/:id/official", requireAuth, requireRole("moderator"), setEventOfficial);

module.exports = router;
