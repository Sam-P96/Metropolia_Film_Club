const express = require("express");
const rateLimit = require("express-rate-limit");
const { getMachine, postCredits, postSpin, getCashOut, postCashOut } = require("../controllers/slotController");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// Spins: 60 a minute per member. A spin takes a couple of seconds to watch,
// so a person can't come near it; a script hammering the machine can.
// Counted per member rather than per address, so a whole flat behind one
// connection doesn't share a limit.
const spinLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 60,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => String(req.user._id),
    message: { error: "That's a lot of spins. Wait a moment and try again." },
});

// Everything needs a login: the machine holds their points.
router.get("/", requireAuth, getMachine);
router.post("/credits", requireAuth, postCredits);
router.post("/spins", requireAuth, spinLimiter, postSpin);
router.get("/cash-out", requireAuth, getCashOut);
router.post("/cash-out", requireAuth, postCashOut);

module.exports = router;
