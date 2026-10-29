const express = require("express");
const {
    checkEmail,
    requestReset,
    getResetStatus,
    completeReset,
    decideReset,
} = require("../controllers/passwordResetController");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

// "Forgot password?" on the login page, for anyone. Checking an email and
// sending a request share the login rate limit (app.js). The token from the
// request is how the rest find it, so it goes in the body, not the URL.
router.post("/check", checkEmail);
router.post("/", requestReset);
router.post("/status", getResetStatus);
router.post("/complete", completeReset);

// Moderators and admins, from their Notifications: { decision: "approve" or
// "dismiss" }. The controller checks who may decide whose.
router.put("/:id", requireAuth, requireRole("moderator"), decideReset);

module.exports = router;
