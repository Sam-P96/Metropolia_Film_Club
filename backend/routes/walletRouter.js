const express = require("express");
const { getMyWallet, getMyHistory, payNow } = require("../controllers/walletController");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

// The logged-in member's own PP and P-PP.
router.get("/", requireAuth, getMyWallet);
router.get("/history", requireAuth, getMyHistory);

// For testing the payout without waiting for lunch.
router.post("/payout", requireAuth, requireRole("admin"), payNow);

module.exports = router;