const express = require("express");
const {
    getLobby,
    getStakeLimit,
    getFriends,
    createChallenge,
    acceptChallenge,
    declineChallenge,
    counterChallenge,
    withdrawChallenge,
    getMatch,
    makeMove,
    markSeen,
    getShop,
    buyItem,
    equipItem,
    devStatus,
    devAccept,
    devTheirMove,
    devUnsee,
    devRefundShop,
} = require("../controllers/gomokuController");
const { requireAuth } = require("../middleware/auth");
const { requireDevTools } = require("../middleware/devTools");

// Infinite Gomoku (controllers/gomokuController.js), for logged-in members.
const router = express.Router();

// The developer tools: a 404 unless the server runs on your own computer
// with GOMOKU_DEV_TOOLS=true (middleware/devTools.js). Checked before the
// login, so on the live site they don't exist at all.
router.use("/dev", requireDevTools);

router.use(requireAuth);

// Everything on the game's page: challenges, games, finished ones.
router.get("/lobby", getLobby);

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

// A game they're in, moves in it, and how much of it they've seen.
router.get("/matches/:id", getMatch);
router.post("/matches/:id/moves", makeMove);
router.post("/matches/:id/seen", markSeen);

// The shop: what they own and have on; { itemId } to buy;
// { kind, itemId | null } to put something on or go back to the default.
router.get("/shop", getShop);
router.post("/shop/buy", buyItem);
router.put("/shop/equip", equipItem);

// Developer tools, For Fun games only (see above).
router.get("/dev", devStatus);
router.post("/dev/matches/:id/accept", devAccept);
router.post("/dev/matches/:id/their-move", devTheirMove);
router.post("/dev/matches/:id/unsee", devUnsee);
router.post("/dev/shop/refund", devRefundShop);

module.exports = router;
