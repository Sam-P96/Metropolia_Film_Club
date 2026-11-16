const express = require("express");
const {
    getLook,
    setLook,
    getLobby,
    getStakeLimit,
    getFriends,
    createChallenge,
    acceptChallenge,
    declineChallenge,
    counterChallenge,
    withdrawChallenge,
    getMatch,
    makeShot,
    markSeen,
    getBets,
    placeBet,
    takeBet,
    withdrawBet,
} = require("../controllers/poolController");
const { requireAuth } = require("../middleware/auth");

// 8 Ball Pool (controllers/poolController.js), for logged-in members.
const router = express.Router();
router.use(requireAuth);

// Everything on the game's page: challenges, games, games to watch,
// finished ones.
router.get("/lobby", getLobby);

// Their shockwave at 8 Ball Pool: one of Infinite Gomoku's they own.
router.get("/look", getLook);
router.put("/look", setLook);

// Against a member: the most they can play each other for, their friends
// (the most points first), and a new challenge. The answers are on the
// game; the controller checks whose turn it is to answer.
router.get("/limit/:userId", getStakeLimit);
router.get("/friends", getFriends);
router.post("/challenges", createChallenge);
router.post("/matches/:id/accept", acceptChallenge);
router.post("/matches/:id/decline", declineChallenge);
router.post("/matches/:id/counter", counterChallenge);
router.post("/matches/:id/withdraw", withdrawChallenge);

// A game they're in or can watch, shots in it, and how much of it they've seen.
router.get("/matches/:id", getMatch);
router.post("/matches/:id/shots", makeShot);
router.post("/matches/:id/seen", markSeen);

// The crowd's bets on a game: the list, a new one, and taking or taking
// back one.
router.get("/matches/:id/bets", getBets);
router.post("/matches/:id/bets", placeBet);
router.post("/bets/:betId/take", takeBet);
router.post("/bets/:betId/withdraw", withdrawBet);

module.exports = router;
