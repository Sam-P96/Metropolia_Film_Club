const FarkleMatch = require("../models/farkleMatchModel");
const User = require("../models/userModel");
const WalletTx = require("../models/walletTxModel");
const { WalletError, changeWallet, credit } = require("./wallet");
const { GAME_FIELDS, forfeit } = require("../games/farkle/engine");
const { BOT_NAME } = require("../../shared/farkle/rules.js");

// Farkle matches in the database: saving a move, paying the winner, and
// ending games nobody is playing any more. The game itself is in
// games/farkle/engine.js.

// Against the bot, the bot sits in seat 0 (it always rolls first) and the
// member in seat 1.
const BOT_SEAT = 0;
const MEMBER_SEAT = 1;

// Three days without a move and the player whose turn it is loses.
const IDLE_LIMIT_MS = 3 * 24 * 60 * 60 * 1000;

// A game takes the stake and starts within a second. One still "starting"
// after this never got going (the server stopped in between), so the
// sweep hands the stake back.
const STUCK_STARTING_MS = 10 * 60 * 1000;

// The game object engine.js works on, out of a match.
function gameOf(match) {
    const game = { target: match.target };
    for (const field of GAME_FIELDS) game[field] = match[field];
    return game;
}

// Which seat `userId` has in `match`, or -1 if they aren't playing.
function seatOf(match, userId) {
    return match.players.findIndex((player) => player.user && String(player.user) === String(userId));
}

// Saves `game` (from engine.js) onto `match`, but only if nobody has
// changed the match since it was read: the version in the database must
// still be `match.version`. That's what stops a double tap rolling twice:
// the second tap carries the same version, and by then it's out of date.
// `extra` is anything else to set. Returns the saved match, or null if the
// match had moved on.
async function saveGame(match, game, extra = {}) {
    const set = { ...extra };
    for (const field of GAME_FIELDS) set[field] = game[field];
    const update = { $set: set, $inc: { version: 1 } };

    if (game.status === "over") {
        set.endedAt = new Date();
        // So their next game against the bot can start.
        update.$unset = { openBotFor: 1 };
    }

    return FarkleMatch.findOneAndUpdate(
        { _id: match._id, version: match.version },
        update,
        { returnDocument: "after" }
    ).lean();
}

// Pays the winner of a finished game, once. It claims the game first
// (settled: false -> true), so two requests can never both pay. If paying
// fails it lets go again, and the sweep tries later.
async function settleMatch(matchId) {
    const match = await FarkleMatch.findOneAndUpdate(
        { _id: matchId, status: "over", settled: false },
        { $set: { settled: true } },
        { returnDocument: "after" }
    ).lean();
    if (!match) return;

    // The bot won: the stake was spent when the game started, so that's it.
    const winner = match.players[match.winner];
    if (!winner?.user) return;

    try {
        await credit(winner.user, match.prize, { reason: "win", match: match._id });
    } catch (error) {
        // An account that's been deleted can't be paid. Anything else
        // (the database busy, say) is worth trying again.
        if (error instanceof WalletError && error.status === 404) return;
        await FarkleMatch.updateOne({ _id: matchId }, { $set: { settled: false } });
        throw error;
    }
}

// For routes: a payout that fails mustn't fail the move that won it. The
// game is still over, and the sweep pays it.
async function settleSafely(matchId) {
    try {
        await settleMatch(matchId);
    } catch (error) {
        console.error(`Couldn't pay out Farkle match ${matchId} yet:`, error.message);
    }
}

// If `match` has gone three days without a move, ends it now (the player
// whose turn it was loses) and pays the winner. Returns the match as it is
// afterwards. Routes call this before showing or moving in a match, so
// nobody can sneak a move in after their time ran out, even if the sweep
// hasn't run yet.
async function expireIfIdle(match, now = Date.now()) {
    if (match.status !== "active" || now - new Date(match.lastMoveAt).getTime() < IDLE_LIMIT_MS) {
        return match;
    }

    const saved = await saveGame(match, forfeit(gameOf(match)));
    if (!saved) return FarkleMatch.findById(match._id).lean(); // someone else just ended it

    await settleSafely(saved._id);
    return saved;
}

// A game stuck "starting": hands back every stake taken for it, exactly as
// it was paid (PP as PP, P-PP as P-PP), going by the bet receipts. Deleting
// the game first is the claim, so two sweeps can't both refund it.
async function cancelStuckStart(matchId) {
    const claimed = await FarkleMatch.findOneAndDelete({ _id: matchId, status: "starting" }).lean();
    if (!claimed) return;

    const bets = await WalletTx.find({ match: matchId, reason: "bet" }).lean();
    for (const bet of bets) {
        await changeWallet(bet.user, () => ({ pp: 0 - bet.pp, ppp: 0 - bet.ppp }), { reason: "refund", match: matchId });
    }
}

// Every few minutes (jobs/farkleSweep.js): ends games quiet for three days,
// pays any winner whose payout failed, and refunds games stuck starting.
// One game's trouble doesn't stop the rest. Returns how many of each.
async function sweepMatches(now = Date.now()) {
    const counts = { forfeited: 0, paid: 0, refunded: 0 };

    const each = async (matches, job, label) => {
        for (const match of matches) {
            try {
                await job(match);
                counts[label] += 1;
            } catch (error) {
                console.error(`Farkle sweep couldn't handle ${match._id}:`, error.message);
            }
        }
    };

    const idle = await FarkleMatch.find({ status: "active", lastMoveAt: { $lt: new Date(now - IDLE_LIMIT_MS) } }).lean();
    await each(idle, (match) => expireIfIdle(match, now), "forfeited");

    const unpaid = await FarkleMatch.find({ status: "over", settled: false }).select("_id").lean();
    await each(unpaid, (match) => settleMatch(match._id), "paid");

    const stuck = await FarkleMatch.find({ status: "starting", createdAt: { $lt: new Date(now - STUCK_STARTING_MS) } })
        .select("_id")
        .lean();
    await each(stuck, (match) => cancelStuckStart(match._id), "refunded");

    return counts;
}

// A match as the game page gets it, for `viewerId`, who's playing in it.
// `mySeat` says which seat is theirs; the page turns everything round so
// it's always "you" first.
async function matchView(match, viewerId) {
    const ids = match.players.map((player) => player.user).filter(Boolean);
    const users = await User.find({ _id: { $in: ids } }).select("username").lean();
    const nameOf = (id) => users.find((user) => String(user._id) === String(id))?.username ?? "A former member";

    return {
        _id: match._id,
        mode: match.mode,
        status: match.status,
        version: match.version,
        target: match.target,
        stake: match.stake,
        prize: match.prize,
        mySeat: seatOf(match, viewerId),
        players: match.players.map((player) => ({
            _id: player.user,
            username: player.user ? nameOf(player.user) : BOT_NAME,
            bot: !player.user,
        })),
        scores: match.scores,
        current: match.current,
        turn: match.turn,
        phase: match.phase,
        dice: match.dice,
        kept: match.kept,
        turnPoints: match.turnPoints,
        hotDice: match.hotDice,
        lastTurns: match.lastTurns,
        log: match.log,
        winner: match.winner,
        endedBy: match.endedBy,
        lastMoveAt: match.lastMoveAt,
        forfeitAt: new Date(new Date(match.lastMoveAt).getTime() + IDLE_LIMIT_MS),
        endedAt: match.endedAt,
    };
}

// Account deletion (controllers/userControllers.js). A game against the bot
// has nobody else's points in it: the member's stake goes with them.
async function forgetFarklePlayer(userId) {
    await FarkleMatch.deleteMany({ mode: "bot", "players.user": userId });
}

module.exports = {
    BOT_SEAT,
    MEMBER_SEAT,
    IDLE_LIMIT_MS,
    STUCK_STARTING_MS,
    gameOf,
    seatOf,
    saveGame,
    settleMatch,
    settleSafely,
    expireIfIdle,
    cancelStuckStart,
    sweepMatches,
    matchView,
    forgetFarklePlayer,
};
