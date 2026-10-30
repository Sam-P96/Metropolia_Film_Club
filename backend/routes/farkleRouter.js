const express = require("express");
const {
    getBotMatch,
    startBotMatch,
    getMatch,
    makeMove,
    getLobby,
    getStakeLimit,
    createChallenge,
    acceptChallenge,
    declineChallenge,
    counterChallenge,
    withdrawChallenge,
} = require("../controllers/farkleController");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// Everything on the Farkle lobby page.
router.get("/lobby", requireAuth, getLobby);

// Against the bot: their open game, or a new one (which takes the stake).
router.get("/bot", requireAuth, getBotMatch);
router.post("/bot", requireAuth, startBotMatch);

// Against a member: the most they can play each other for, and a new
// challenge. The answers are on the match; the controller checks whose
// turn it is to answer.
router.get("/limit/:userId", requireAuth, getStakeLimit);
router.post("/challenges", requireAuth, createChallenge);
router.post("/matches/:id/accept", requireAuth, acceptChallenge);
router.post("/matches/:id/decline", requireAuth, declineChallenge);
router.post("/matches/:id/counter", requireAuth, counterChallenge);
router.post("/matches/:id/withdraw", requireAuth, withdrawChallenge);

// Any match they're in, and moves in it. The controller checks it's theirs
// and their turn.
router.get("/matches/:id", requireAuth, getMatch);
router.post("/matches/:id/moves", requireAuth, makeMove);

module.exports = router;
