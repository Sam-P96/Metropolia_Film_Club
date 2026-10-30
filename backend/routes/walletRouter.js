const express = require("express");
const { getMyWallet, getMyHistory, sendGift, getLeaderboard, payNow } = require("../controllers/walletController");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

// The PP Leaderboard on the Games page, for anyone.
router.get("/leaderboard", getLeaderboard);

// The logged-in member's own PP and P-PP.
router.get("/", requireAuth, getMyWallet);
router.get("/history", requireAuth, getMyHistory);

// "Gift PP": some of their P-PP to another member, for a 1 point fee.
router.post("/gifts", requireAuth, sendGift);

// For testing the payout without waiting for lunch.
router.post("/payout", requireAuth, requireRole("admin"), payNow);

module.exports = router;