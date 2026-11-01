const express = require("express");
const rateLimit = require("express-rate-limit");
const { getStatus, postStart, postRound } = require("../controllers/doubleController");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// Starting games and throwing: 20 a minute per member, plenty for a person
// (a game is at most 4 requests) and useless for a script hammering the pot.
// Counted per member rather than per address, so a whole flat behind one
// connection doesn't share a limit.
const playLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => String(req.user._id),
    message: { error: "That's a lot of throws. Wait a moment and try again.", code: "TOO_MANY_REQUESTS" },
});

// Everything needs a login: the game is played for points.
router.get("/status", requireAuth, getStatus);
router.post("/start", requireAuth, playLimiter, postStart);
router.post("/round", requireAuth, playLimiter, postRound);

module.exports = router;
