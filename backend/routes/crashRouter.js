const express = require("express");
const User = require("../models/userModel");
const Follow = require("../models/followModel");
const { requireAuth } = require("../middleware/auth");
const { requireDevTools } = require("../middleware/devTools");
const crash = require("../utils/crash");
const { parseOffset } = require("../utils/paging");
const { MEMBER_FIELDS, userSummary } = require("../utils/serialize");
const { crashDayReset, getCrashRooms } = require("../games/crash/live");

// How many friends Invite shows at a time.
const FRIENDS_PAGE = 5;

// Crash over HTTP (the game itself is live: games/crash/live.js), for
// logged-in members.
const router = express.Router();
router.use(requireAuth);

// Where they stand today: { dailyPp, maxBet, used, left, points, banned }.
router.get("/status", async (req, res) => {
    res.json(await crash.statusOf(req.user._id));
});

// ?skip=n. Invite, in a room: their friends (members they follow who follow
// them back), the most points first (PP and P-PP together), FRIENDS_PAGE at
// a time, like Farkle's "Challenge a friend". Each with `here` (in the room
// already) and `invited` (invited from it already). { friends, hasMore, next }.
router.get("/friends", async (req, res) => {
    const me = req.user._id;
    const skip = parseOffset(req.query.skip);
    const followed = await Follow.find({ follower: me }).distinct("following");
    const friendIds = await Follow.find({ following: me, follower: { $in: followed } }).distinct("follower");

    const ranked = await User.aggregate([
        { $match: { _id: { $in: friendIds } } },
        { $project: { username: 1, points: { $add: [{ $ifNull: ["$wallet.pp", 0] }, { $ifNull: ["$wallet.ppp", 0] }] } } },
        { $sort: { points: -1, username: 1, _id: 1 } },
        { $skip: skip },
        { $limit: FRIENDS_PAGE + 1 },
    ]);
    const page = ranked.slice(0, FRIENDS_PAGE);
    const members = await User.find({ _id: { $in: page.map((row) => row._id) } }).select(MEMBER_FIELDS).lean();
    const memberById = new Map(members.map((member) => [String(member._id), member]));
    const state = getCrashRooms()?.inviteState(String(me), page.map((row) => String(row._id)));

    res.json({
        friends: page.flatMap((row) => {
            const member = memberById.get(String(row._id));
            if (!member) return [];
            const id = String(row._id);
            return [{ ...userSummary(member), points: row.points, here: Boolean(state?.here.has(id)), invited: Boolean(state?.invited.has(id)) }];
        }),
        hasMore: ranked.length > FRIENDS_PAGE,
        next: skip + page.length,
    });
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
