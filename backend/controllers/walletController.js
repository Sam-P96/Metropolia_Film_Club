const mongoose = require("mongoose");
const User = require("../models/userModel");
const Review = require("../models/reviewModel");
const WalletTx = require("../models/walletTxModel");
const { WalletError, dailyPp, giftPpp, leaderboardStages, ppCap } = require("../utils/wallet");
const { nextPayoutAt, runPayout } = require("../jobs/dailyPayout");
const { MEMBER_FIELDS, userSummary } = require("../utils/serialize");
const { parseOffset } = require("../utils/paging");

const HISTORY_SIZE = 30;
// The PP Leaderboard: 10 at a time, down to the top 100.
const LEADERBOARD_PAGE = 10;
const LEADERBOARD_MAX = 100;

// The logged-in member's wallet: both balances, what they get each day,
// their PP cap, and when the next payout is.
const getMyWallet = async (req, res) => {
    const [user, reviews] = await Promise.all([
        User.findById(req.user._id).select("wallet").lean(),
        Review.countDocuments({ user: req.user._id }),
    ]);

    res.json({
        pp: user?.wallet?.pp ?? 0,
        ppp: user?.wallet?.ppp ?? 0,
        dailyPp: dailyPp(reviews),
        ppCap: ppCap(reviews),
        nextPayoutAt: nextPayoutAt(),
    });
};

// Their newest wallet changes, newest first. A gift says who it went to or
// came from (`other`: { _id, username }, null if they've left the club).
const getMyHistory = async (req, res) => {
    const rows = await WalletTx.find({ user: req.user._id })
        .sort({ at: -1 })
        .limit(HISTORY_SIZE)
        .select("reason pp ppp balance at other")
        .populate("other", "username")
        .lean();

    res.json(rows);
};

// "Gift PP", { to, amount }: `amount` P-PP to another member, for a 1 point
// fee (utils/wallet.js giftPpp). They get a notification.
const sendGift = async (req, res) => {
    const to = req.body?.to;
    if (!mongoose.isValidObjectId(to)) {
        return res.status(400).json({ error: "Pick a member to gift." });
    }

    try {
        const taken = await giftPpp(req.user._id, to, Number(req.body?.amount));
        res.status(201).json(taken);
    } catch (error) {
        if (error instanceof WalletError) {
            return res.status(error.status).json({ error: error.message });
        }
        throw error;
    }
};

// ?skip=n. The PP Leaderboard on the Games page, for anyone: the members
// with the most points, PP and P-PP added together and shown as one PP
// total, ties A to Z, 10 at a time down to the top 100. Members with no
// points at all aren't ranked; members in debt (below 0, from a Steal and
// Defend fine) are, at the bottom. { leaders, hasMore, next }.
const getLeaderboard = async (req, res) => {
    const skip = Math.min(parseOffset(req.query.skip), LEADERBOARD_MAX);
    const limit = Math.min(LEADERBOARD_PAGE, LEADERBOARD_MAX - skip);
    const fields = Object.fromEntries(MEMBER_FIELDS.split(" ").map((field) => [field, 1]));
    const rows = limit > 0
        ? await User.aggregate([
            ...leaderboardStages(fields),
            { $match: { pp: { $ne: 0 } } },
            { $skip: skip },
            { $limit: limit + 1 },
        ])
        : [];
    const page = rows.slice(0, limit);

    res.json({
        leaders: page.map((row) => ({ user: userSummary(row), pp: row.pp })),
        hasMore: rows.length > limit && skip + page.length < LEADERBOARD_MAX,
        next: skip + page.length,
    });
};

// Admins only: run the payout now instead of waiting for 12:00. It still
// pays each member once a day, so it only reaches members not paid today.
const payNow = async (req, res) => {
    await runPayout();
    res.json({ ok: true });
};

module.exports = { getMyWallet, getMyHistory, sendGift, getLeaderboard, payNow };