const User = require("../models/userModel");
const Review = require("../models/reviewModel");
const WalletTx = require("../models/walletTxModel");
const { dailyPp, ppCap } = require("../utils/wallet");
const { nextPayoutAt, runPayout } = require("../jobs/dailyPayout");

const HISTORY_SIZE = 30;

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

// Their newest wallet changes, newest first.
const getMyHistory = async (req, res) => {
    const rows = await WalletTx.find({ user: req.user._id })
        .sort({ at: -1 })
        .limit(HISTORY_SIZE)
        .select("reason pp ppp balance at")
        .lean();

    res.json(rows);
};

// Admins only: run the payout now instead of waiting for 12:00. It still
// pays each member once a day, so it only reaches members not paid today.
const payNow = async (req, res) => {
    await runPayout();
    res.json({ ok: true });
};

module.exports = { getMyWallet, getMyHistory, payNow };