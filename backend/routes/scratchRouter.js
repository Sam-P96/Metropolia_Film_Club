const express = require("express");
const { getJackpot, getHours, getCurrentCard, postCard, postScratch, postCollect, getReveal } = require("../controllers/scratchController");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// The jackpots, and which ticket types are on sale now, for anyone.
router.get("/jackpot", getJackpot);
router.get("/hours", getHours);

// Their card: the one to show, a new one, and what they do with it. The
// controller checks each card is theirs.
router.get("/card", requireAuth, getCurrentCard);
router.post("/cards", requireAuth, postCard);
router.post("/cards/:id/scratch", requireAuth, postScratch);
router.post("/cards/:id/collect", requireAuth, postCollect);
router.get("/cards/:id/reveal", requireAuth, getReveal);

module.exports = router;
