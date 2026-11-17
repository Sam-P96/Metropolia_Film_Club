const express = require("express");
const { requireAuth } = require("../middleware/auth");
const { requireDevTools } = require("../middleware/devTools");
const crash = require("../utils/crash");
const { crashDayReset } = require("../games/crash/live");

// Crash over HTTP (the game itself is live: games/crash/live.js), for
// logged-in members.
const router = express.Router();
router.use(requireAuth);

// Where they stand today: { dailyPp, maxBet, used, left, points, banned }.
router.get("/status", async (req, res) => {
    res.json(await crash.statusOf(req.user._id));
});

// A round they played, with its whole path (replays).
router.get("/rounds/:id", async (req, res) => {
    const round = await crash.roundFor(req.params.id, req.user._id);
    if (!round) return res.status(404).json({ error: "Round not found." });
    res.json(round);
});

// Developer tool only (middleware/devTools.js: on your own computer, with
// GOMOKU_DEV_TOOLS=true; a 404 anywhere else): today's rounds back to none.
router.post("/dev/reset-day", requireDevTools, async (req, res) => {
    await crash.resetDay(req.user._id);
    await crashDayReset(req.user._id);
    res.json(await crash.statusOf(req.user._id));
});

module.exports = router;
