const express = require("express");
const { getJackpot, getCurrentCard, postCard, postScratch, postCollect, getReveal } = require("../controllers/scratchController");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// The jackpot, for anyone.
router.get("/jackpot", getJackpot);

// Their card: the one to show, a new one, and what they do with it. The
// controller checks each card is theirs.
router.get("/card", requireAuth, getCurrentCard);
router.post("/cards", requireAuth, postCard);
router.post("/cards/:id/scratch", requireAuth, postScratch);
router.post("/cards/:id/collect", requireAuth, postCollect);
router.get("/cards/:id/reveal", requireAuth, getReveal);

module.exports = router;
