const mongoose = require("mongoose");
const PoolBet = require("../models/poolBetModel");
const PoolMatch = require("../models/poolMatchModel");
const User = require("../models/userModel");
const { WalletError, changeWallet, credit, spend } = require("./wallet");
const { notePoolBet } = require("./notify");
const { announcePoolBets } = require("../games/pool/live");
const { MEMBER_FIELDS, userSummary } = require("./serialize");

// The crowd's bets on a game of 8 Ball Pool between two members. Anyone
// watching (a member who follows either player; never the players
// themselves) can offer a bet while the game is on: an amount on one of the
// players to win. It's taken from them straight away (PP first, then
// P-PP, like every bet) and shows on the game's page for everyone there.
// If someone else takes the other side, putting up the same, the bet is
// on: whoever backed the winner gets both amounts, in P-PP. Until someone
// does, the bettor can take it back; and if nobody has by the time the
// game ends, it's handed back exactly as it was paid.

// The biggest single bet, and how many offers one member can have waiting
// on one game.
const MAX_BET = 5000;
const MAX_OPEN = 3;

// How many bets a game's page lists.
const LIST_SIZE = 40;

// A bet that can't be made, with the HTTP status to answer it with.
class BetError extends Error {
    constructor(message, status = 400) {
        super(message);
        this.status = status;
    }
}

// Hands `paid` back to `userId`, PP as PP and P-PP as P-PP. A member who
// has left the club can't be paid back.
async function giveBack(userId, paid, bet) {
    const back = { pp: paid?.pp ?? 0, ppp: paid?.ppp ?? 0 };
    if (!userId || (back.pp <= 0 && back.ppp <= 0)) return;
    try {
        await changeWallet(userId, () => back, { reason: "poolSideRefund", pool: bet.match, poolBet: bet._id });
    } catch (error) {
        if (!(error instanceof WalletError && error.status === 404)) throw error;
    }
}

const paidOf = (taken) => ({ pp: 0 - taken.pp, ppp: 0 - taken.ppp });

// `match` (being played) as `userId` may bet on it, or a BetError: not its
// players, and only members watching it (utils/pool.js canWatch).
async function checkBettor(match, userId) {
    const { canWatch, seatOf } = require("./pool");
    if (!match || match.status !== "active") throw new BetError("Bets are only taken while the game is being played.", 409);
    if (seatOf(match, userId) >= 0) throw new BetError("You can't bet on a game you're playing in.", 403);
    if (!(await canWatch(match, userId))) throw new BetError("Only members who follow one of the players can bet on this game.", 403);
}

// Offers a bet: `amount` on the player in seat `side` to win `match`.
// Resolves to the bet.
async function placeBet(match, userId, side, amount) {
    await checkBettor(match, userId);
    if (side !== 0 && side !== 1) throw new BetError("Pick which player you're backing.");
    if (!Number.isInteger(amount) || amount < 1) throw new BetError("A bet is a whole number of points, at least 1.");
    if (amount > MAX_BET) throw new BetError(`Bets go up to ${MAX_BET.toLocaleString("en-US")}.`);
    if ((await PoolBet.countDocuments({ match: match._id, bettor: userId, status: "open" })) >= MAX_OPEN) {
        throw new BetError(`You have ${MAX_OPEN} bets waiting on this game already. Take one back first.`, 409);
    }

    const id = new mongoose.Types.ObjectId();
    let taken;
    try {
        taken = await spend(userId, amount, { reason: "poolSideBet", pool: match._id, poolBet: id });
    } catch (error) {
        if (error instanceof WalletError) throw new BetError(error.message, error.status);
        throw error;
    }

    let bet;
    try {
        bet = (await PoolBet.create({ _id: id, match: match._id, bettor: userId, side, amount, paid: paidOf(taken) })).toObject();
    } catch (error) {
        await giveBack(userId, paidOf(taken), { _id: id, match: match._id });
        throw error;
    }

    // The game ended in that moment: nobody can take it any more.
    const now = await PoolMatch.findById(match._id).select("status").lean();
    if (now?.status !== "active") {
        await closeOpen(bet, "refunded");
        throw new BetError("The game just ended, so your bet wasn't placed.", 409);
    }

    announcePoolBets(match._id);
    return bet;
}

// Takes the other side of an open bet: the same amount on the other
// player. Resolves to the bet, now matched.
async function takeBet(betId, userId) {
    const bet = mongoose.isValidObjectId(betId) ? await PoolBet.findById(betId).lean() : null;
    if (!bet) throw new BetError("Bet not found.", 404);
    if (bet.status !== "open") throw new BetError("That bet isn't open any more.", 409);
    if (String(bet.bettor) === String(userId)) throw new BetError("That's your own bet: someone else has to take it.", 403);

    await checkBettor(await PoolMatch.findById(bet.match).lean(), userId);

    let taken;
    try {
        taken = await spend(userId, bet.amount, { reason: "poolSideBet", pool: bet.match, poolBet: bet._id });
    } catch (error) {
        if (error instanceof WalletError) throw new BetError(error.message, error.status);
        throw error;
    }

    // Claimed only if it's still open: two members taking it at once can't
    // both have it. `matchedAt` is checked against when the game ended
    // (settleBets), so a bet taken after the last shot never counts.
    const matched = await PoolBet.findOneAndUpdate(
        { _id: bet._id, status: "open" },
        { $set: { status: "matched", taker: userId, takerPaid: paidOf(taken), matchedAt: new Date() } },
        { returnDocument: "after" }
    ).lean();
    if (!matched) {
        await giveBack(userId, paidOf(taken), bet);
        throw new BetError("Someone else just took that bet, or it was taken back.", 409);
    }

    await notePoolBet("poolBetTaken", matched.bettor, matched.match, matched.amount, userId);
    announcePoolBets(matched.match);
    return matched;
}

// Closes a bet nobody took, as "withdrawn" or "refunded", and hands it
// back. Null if it wasn't open any more.
async function closeOpen(bet, status) {
    const closed = await PoolBet.findOneAndUpdate(
        { _id: bet._id, status: "open" },
        { $set: { status, closedAt: new Date() } },
        { returnDocument: "after" }
    ).lean();
    if (!closed) return null;

    try {
        await giveBack(closed.bettor, closed.paid, closed);
    } catch (error) {
        // Couldn't pay it back just now: open again, to be tried later.
        await PoolBet.updateOne({ _id: closed._id }, { $set: { status: "open", closedAt: null } });
        throw error;
    }
    return closed;
}

// The bettor takes back a bet nobody has taken yet.
async function withdrawBet(betId, userId) {
    const bet = mongoose.isValidObjectId(betId) ? await PoolBet.findById(betId).lean() : null;
    if (!bet || String(bet.bettor) !== String(userId)) throw new BetError("Bet not found.", 404);
    const closed = bet.status === "open" ? await closeOpen(bet, "withdrawn") : null;
    if (!closed) throw new BetError(bet.status === "matched" ? "Someone took that bet: it's on now." : "That bet isn't open any more.", 409);

    announcePoolBets(closed.match);
    return closed;
}

// A matched bet on a finished game: whoever backed the winner gets both
// amounts, in P-PP. One matched after the game had ended (or on a game
// with no winner) goes back to both.
async function settleMatched(bet, match) {
    const late = !match.endedAt || !bet.matchedAt || new Date(bet.matchedAt) >= new Date(match.endedAt);
    const noWinner = match.winner !== 0 && match.winner !== 1;
    const voided = late || noWinner;
    const won = voided ? null : bet.side === match.winner ? "bettor" : "taker";

    const claimed = await PoolBet.findOneAndUpdate(
        { _id: bet._id, status: "matched" },
        { $set: { status: voided ? "refunded" : "settled", won, closedAt: new Date() } },
        { returnDocument: "after" }
    ).lean();
    if (!claimed) return;

    try {
        if (voided) {
            await giveBack(claimed.bettor, claimed.paid, claimed);
            await giveBack(claimed.taker, claimed.takerPaid, claimed);
            return;
        }
        const winner = won === "bettor" ? claimed.bettor : claimed.taker;
        const loser = won === "bettor" ? claimed.taker : claimed.bettor;
        try {
            await credit(winner, claimed.amount * 2, { reason: "poolSideWin", pool: claimed.match, poolBet: claimed._id });
            await notePoolBet("poolBetWon", winner, claimed.match, claimed.amount * 2, loser);
        } catch (error) {
            // A winner who has left the club can't be paid.
            if (!(error instanceof WalletError && error.status === 404)) throw error;
        }
        if (await User.exists({ _id: loser })) await notePoolBet("poolBetLost", loser, claimed.match, claimed.amount, winner);
    } catch (error) {
        await PoolBet.updateOne({ _id: claimed._id }, { $set: { status: "matched", won: null, closedAt: null } });
        throw error;
    }
}

// The game is over: every bet on it is paid out or handed back, once. Safe
// to run again (each bet is claimed before it's paid), which the sweep
// does for anything that failed.
async function settleBets(match) {
    if (!match || match.status !== "over") return;
    const bets = await PoolBet.find({ match: match._id, status: { $in: ["open", "matched"] } }).lean();
    for (const bet of bets) {
        if (bet.status === "open") {
            const closed = await closeOpen(bet, "refunded");
            if (closed) await notePoolBet("poolBetBack", closed.bettor, closed.match, closed.amount);
        } else {
            await settleMatched(bet, match);
        }
    }
    await PoolMatch.updateOne({ _id: match._id }, { $set: { betsSettled: true } }, { timestamps: false });
    if (bets.length > 0) announcePoolBets(match._id);
}

// For the sweep: bets still open or matched on games that are over (a
// payout that failed, or a bet that slipped in as the game ended), or on
// games that no longer exist. Returns how many games it went through.
async function settleStrayBets() {
    const matchIds = await PoolBet.distinct("match", { status: { $in: ["open", "matched"] } });
    if (matchIds.length === 0) return 0;
    const matches = await PoolMatch.find({ _id: { $in: matchIds } }).lean();
    const known = new Set(matches.map((match) => String(match._id)));

    let settled = 0;
    for (const match of matches) {
        if (match.status !== "over") continue;
        await settleBets(match);
        settled += 1;
    }
    // A game that was deleted (it never got going): everything goes back.
    for (const id of matchIds) {
        if (known.has(String(id))) continue;
        await settleBets({ _id: id, status: "over", winner: null, endedAt: null });
        settled += 1;
    }
    return settled;
}

// The bets on a game, for its page: the ones waiting first, then the ones
// that are on, then how the rest ended. `mine` says which side of each the
// viewer is on ("bettor", "taker" or null).
async function betViews(matchId, viewerId) {
    const bets = await PoolBet.find({ match: matchId, status: { $ne: "withdrawn" } }).sort({ createdAt: -1 }).limit(LIST_SIZE).lean();
    if (bets.length === 0) return [];

    const ids = [...new Set(bets.flatMap((bet) => [bet.bettor, bet.taker]).filter(Boolean).map(String))];
    const users = await User.find({ _id: { $in: ids } }).select(MEMBER_FIELDS).lean();
    const byId = new Map(users.map((user) => [String(user._id), userSummary(user)]));
    const member = (id) => (id ? (byId.get(String(id)) ?? { _id: null, username: "A former member", avatarUrl: null }) : null);
    const order = { open: 0, matched: 1, settled: 2, refunded: 3 };

    return bets
        .map((bet) => ({
            _id: bet._id,
            side: bet.side,
            amount: bet.amount,
            status: bet.status,
            won: bet.won,
            bettor: member(bet.bettor),
            taker: member(bet.taker),
            mine: String(bet.bettor) === String(viewerId) ? "bettor" : bet.taker && String(bet.taker) === String(viewerId) ? "taker" : null,
            at: bet.createdAt,
        }))
        .sort((a, b) => order[a.status] - order[b.status] || new Date(b.at) - new Date(a.at));
}

// Account deletion, before the member and their wallet go: bets nobody
// took are closed. Bets that are on stay: the other side can still win.
async function forgetPoolBettor(userId) {
    const open = await PoolBet.find({ bettor: userId, status: "open" }).lean();
    for (const bet of open) {
        const closed = await closeOpen(bet, "withdrawn");
        if (closed) announcePoolBets(closed.match);
    }
}

// Their bets, for their data export.
function poolBetsOf(userId) {
    return PoolBet.find({ $or: [{ bettor: userId }, { taker: userId }] }).sort({ createdAt: -1 }).lean();
}

module.exports = { MAX_BET, MAX_OPEN, BetError, placeBet, takeBet, withdrawBet, settleBets, settleStrayBets, betViews, forgetPoolBettor, poolBetsOf };
