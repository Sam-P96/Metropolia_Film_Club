const express = require("express");
const { getBotMatch, startBotMatch, getMatch, makeMove } = require("../controllers/farkleController");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// Against the bot: their open game, or a new one (which takes the stake).
router.get("/bot", requireAuth, getBotMatch);
router.post("/bot", requireAuth, startBotMatch);

// Any match they're playing in, and moves in it. The controller checks
// it's theirs and their turn.
router.get("/matches/:id", requireAuth, getMatch);
router.post("/matches/:id/moves", requireAuth, makeMove);

module.exports = router;
