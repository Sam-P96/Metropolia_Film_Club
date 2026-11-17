const mongoose = require("mongoose");
const User = require("../models/userModel");
const Review = require("../models/reviewModel");
const CrashDay = require("../models/crashDayModel");
const CrashRound = require("../models/crashRoundModel");
const { WalletError, changeWallet, dailyPp, playDay, spend } = require("./wallet");
const { activeBansOf, banFor, banMessage } = require("./steal/moderation");
const { payoutFor } = require("../games/crash/engine");
const { CRASH_RULES, maxBetFor, playsLeft } = require("../../shared/crash/rules.js");

// Crash in the database: who can play and how much, the daily plays, bets,
// payouts, and the rounds kept for replays. The rooms and the live rounds
// are in games/crash/rooms.js; the multiplier in games/crash/engine.js.
//
// Every balance change goes through utils/wallet.js (changeWallet, spend):
// one atomic update of the wallet each, with its receipt.

// ---- Who can play ----

// Where a member stands today: { dailyPp, maxBet, used: { solo, total },
// left: { solo, total }, points, banned } (`banned`: the message, if an
// admin has banned them from games).
async function statusOf(userId, day = playDay()) {
    const [reviews, used, user, bans] = await Promise.all([
        Review.countDocuments({ user: userId }),
        CrashDay.findOne({ user: userId, day }).select("solo total").lean(),
        User.findById(userId).select("wallet").lean(),
        activeBansOf(userId),
    ]);
    const daily = dailyPp(reviews);
    const ban = banFor(bans, "games");
    const usage = { solo: used?.solo ?? 0, total: used?.total ?? 0 };
    return {
        dailyPp: daily,
        maxBet: maxBetFor(daily),
        used: usage,
        left: playsLeft(usage),
        points: (user?.wallet?.pp ?? 0) + (user?.wallet?.ppp ?? 0),
        banned: ban ? banMessage(ban, "games") : null,
    };
}

// Why a member can't ready up with `bet` in a room of `players` (counting
// them), or null if they can. `status` is statusOf's.
function blockedFor(status, bet, players) {
    if (!status) return "Checking your points…";
    if (status.banned) return status.banned;
    if (status.dailyPp < 1) return "Write a review to play: your daily PP comes from your reviews.";
    if (status.left.total < 1) return "No rounds left today. More at 12:00.";
    if (players < CRASH_RULES.bonusPlayers && status.left.solo < 1) return `No solo rounds left: wait for ${CRASH_RULES.bonusPlayers} players`;
    if (!Number.isInteger(bet) || bet < CRASH_RULES.minBet) return "Pick a bet first.";
    if (bet > status.maxBet) return `Bets go up to ${status.maxBet} for you (a quarter of your daily PP).`;
    if (status.points < bet) return "Not enough points for that bet.";
    return null;
}

// ---- The daily plays ----

// Takes one of today's plays for a round of `kind` ("solo" or "bonus"),
// atomically: it only counts if they still had one of that kind. Throws a
// WalletError if they hadn't.
async function claimPlay(userId, kind, day = playDay()) {
    const filter = { user: userId, day, total: { $lt: CRASH_RULES.roundsPerDay } };
    if (kind === "solo") filter.solo = { $lt: CRASH_RULES.soloPerDay };
    try {
        await CrashDay.updateOne(filter, { $inc: { total: 1, solo: kind === "solo" ? 1 : 0 } }, { upsert: true });
    } catch (error) {
        // The day exists, but the filter didn't match it: none left. The
        // upsert tried to make a second one, which the unique index stops.
        if (error.code === 11000) throw new WalletError(kind === "solo" ? "No solo rounds left today." : "No rounds left today.", 409);
        throw error;
    }
}

// Hands a play back (a round that couldn't start, or never finished).
function releasePlay(userId, kind, day) {
    return CrashDay.updateOne({ user: userId, day, total: { $gt: 0 } }, { $inc: { total: -1, solo: kind === "solo" ? -1 : 0 } });
}

// ---- Bets and payouts ----

// Takes `bet` from a member for round `roundId`: PP first, then P-PP.
// Resolves to how it was paid, { pp, ppp } (positive).
async function takeBet(userId, bet, roundId) {
    const taken = await spend(userId, bet, { reason: "crashBet", crash: roundId });
    return { pp: 0 - taken.pp, ppp: 0 - taken.ppp };
}

// Hands a bet back exactly as it was paid.
async function giveBack(userId, paid, roundId) {
    if (!userId || (paid.pp <= 0 && paid.ppp <= 0)) return;
    try {
        await changeWallet(userId, () => ({ pp: paid.pp, ppp: paid.ppp }), { reason: "crashRefund", crash: roundId });
    } catch (error) {
        if (!(error instanceof WalletError && error.status === 404)) throw error;
    }
}

// Pays a cash-out at `multiplier` for a bet paid as `paid`: the stake back
// in its own coins, profit in P-PP, whole points rounded down
// (games/crash/engine.js payoutFor). Resolves to { pp, ppp, total }.
async function payCashOut(userId, paid, multiplier, roundId) {
    const payout = payoutFor(paid, multiplier);
    if (payout.total > 0 && userId) {
        try {
            await changeWallet(userId, () => ({ pp: payout.pp, ppp: payout.ppp }), { reason: "crashWin", crash: roundId });
        } catch (error) {
            // A member who has just deleted their account can't be paid.
            if (!(error instanceof WalletError && error.status === 404)) throw error;
        }
    }
    return payout;
}

// ---- Rounds ----

// A new round's record, as it starts: bets taken, nothing played yet.
// `roundId`: the id its bets' receipts already carry.
function startRound({ room, isPrivate, kind, day }, players, roundId) {
    return CrashRound.create({
        _id: roundId,
        room,
        private: isPrivate,
        kind,
        day,
        status: "playing",
        players: players.map((player) => ({ user: player.userId, bet: player.bet, paid: player.paid, autoAt: player.autoAt })),
        path: [],
    });
}

// A round over: its whole path, how it ended, and how each player came out.
function finishRound(roundId, { path, ticks, endedBy, players }) {
    return CrashRound.updateOne(
        { _id: roundId },
        {
            $set: {
                status: "over",
                path,
                ticks,
                endedBy,
                endedAt: new Date(),
                players: players.map((player) => ({
                    user: player.userId,
                    bet: player.bet,
                    paid: player.paid,
                    autoAt: player.autoAt,
                    cashedAt: player.cashedAt,
                    cashedTick: player.cashedTick,
                    auto: player.auto,
                    payout: { pp: player.payout?.pp ?? 0, ppp: player.payout?.ppp ?? 0 },
                })),
            },
        }
    );
}

// Rounds the server stopped in the middle of (it restarted): bets still
// riding are handed back, and so are their plays, and the round is void.
// Players who'd cashed out were paid then. Run once the database is up
// (app.js). Returns how many rounds it put right.
async function recoverRounds() {
    const stuck = await CrashRound.find({ status: "playing" }).lean();
    for (const round of stuck) {
        for (const player of round.players) {
            if (player.cashedAt !== null && player.cashedAt !== undefined) continue;
            await giveBack(player.user, player.paid, round._id);
            if (player.user) await releasePlay(player.user, round.kind, round.day);
        }
        await CrashRound.updateOne({ _id: round._id, status: "playing" }, { $set: { status: "void", endedBy: "void", endedAt: new Date() } });
    }
    return stuck.length;
}

// A round, for one of its players: everything but other members' wallets.
async function roundFor(roundId, userId) {
    if (!mongoose.isValidObjectId(roundId)) return null;
    const round = await CrashRound.findOne({ _id: roundId, "players.user": userId }).lean();
    if (!round) return null;
    const users = await User.find({ _id: { $in: round.players.map((player) => player.user).filter(Boolean) } }).select("username avatarUrl").lean();
    const byId = new Map(users.map((user) => [String(user._id), user]));
    return {
        _id: round._id,
        kind: round.kind,
        startedAt: round.startedAt,
        endedAt: round.endedAt,
        endedBy: round.endedBy,
        ticks: round.ticks,
        path: round.path,
        players: round.players.map((player) => ({
            user: player.user ? { _id: player.user, username: byId.get(String(player.user))?.username ?? "A former member", avatarUrl: byId.get(String(player.user))?.avatarUrl ?? null } : null,
            bet: player.bet,
            autoAt: player.autoAt,
            cashedAt: player.cashedAt,
            cashedTick: player.cashedTick,
            payout: (player.payout?.pp ?? 0) + (player.payout?.ppp ?? 0),
        })),
    };
}

// ---- Their data, and leaving ----

// Download my data: their rounds (their own part of each) and daily plays.
async function crashDataOf(userId) {
    const [rounds, days] = await Promise.all([
        CrashRound.find({ "players.user": userId }).sort({ startedAt: -1 }).lean(),
        CrashDay.find({ user: userId }).sort({ day: -1 }).select("day solo total -_id").lean(),
    ]);
    return {
        rounds: rounds.map((round) => {
            const mine = round.players.find((player) => String(player.user) === String(userId));
            return {
                startedAt: round.startedAt,
                kind: round.kind,
                endedBy: round.endedBy,
                players: round.players.length,
                bet: mine?.bet,
                paid: mine?.paid,
                autoAt: mine?.autoAt,
                cashedAt: mine?.cashedAt,
                payout: mine?.payout,
            };
        }),
        days,
    };
}

// An account is being deleted: their daily plays go, and their place in
// rounds others played becomes "a former member".
async function forgetCrashPlayer(userId) {
    await CrashDay.deleteMany({ user: userId });
    await CrashRound.updateMany({ "players.user": userId }, { $set: { "players.$[me].user": null } }, { arrayFilters: [{ "me.user": userId }] });
}

// Developer tool only (routes/crashRouter.js): today's plays back to none.
function resetDay(userId, day = playDay()) {
    return CrashDay.deleteOne({ user: userId, day });
}

module.exports = {
    statusOf,
    blockedFor,
    claimPlay,
    releasePlay,
    takeBet,
    giveBack,
    payCashOut,
    startRound,
    finishRound,
    recoverRounds,
    roundFor,
    crashDataOf,
    forgetCrashPlayer,
    resetDay,
};
