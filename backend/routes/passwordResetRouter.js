const express = require("express");
const {
    requestReset,
    requestLocalReset,
    getResetStatus,
    completeReset,
    decideReset,
} = require("../controllers/passwordResetController");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

// "Forgot password?" on the login page, for anyone. Requesting a link, or
// a local reset, shares the login rate limit (app.js). The tokens travel in
// the body, not the URL.
router.post("/", requestReset);
router.post("/complete", completeReset);

// "Reset Locally": the request goes to the moderators and admins instead of
// an email, and the requester's page checks on it every few seconds.
router.post("/local", requestLocalReset);
router.post("/status", getResetStatus);

// Moderators and admins, from their Notifications: { decision: "approve" or
// "dismiss" }. The controller checks who may decide whose.
router.put("/:id", requireAuth, requireRole("moderator"), decideReset);

module.exports = router;
