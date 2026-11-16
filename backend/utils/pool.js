const PoolMatch = require("../models/poolMatchModel");
const User = require("../models/userModel");
const Follow = require("../models/followModel");
const WalletTx = require("../models/walletTxModel");
const { WalletError, changeWallet, credit } = require("./wallet");
const { notePoolAnswer, notePoolOver, notePoolResult, forgetPoolMatch } = require("./notify");
const { GAME_FIELDS, forfeit, resign } = require("../games/pool/engine");
const { announcePool, poolPlayersAt } = require("../games/pool/live");
const { MEMBER_FIELDS, userSummary } = require("./serialize");
const { lookOf } = require("./poolShop");
const { SOLIDS, STRIPES, ballsLeft } = require("../../shared/pool/rules.js");

// 8 Ball Pool games in the database: saving a shot, paying the winner, and
// ending games and challenges nobody is answering any more. Works like
// Infinite Gomoku's (utils/gomoku.js), plus the crowd: members who follow a
// player can watch a game and bet on it (utils/poolBets.js). The game
// itself is in shared/pool/ (through games/pool/engine.js).

// Three days without a shot and the player whose turn it is loses.
const IDLE_LIMIT_MS = 3 * 24 * 60 * 60 * 1000;

// Three days without an answer and a challenge (or a counter) expires.
const CHALLENGE_LIMIT_MS = 3 * 24 * 60 * 60 * 1000;

// A game takes the stakes and starts within a second. One still "starting"
// after this never got going, so the sweep hands the stakes back.
const STUCK_STARTING_MS = 10 * 60 * 1000;

const OPEN = ["challenge", "starting", "active"];

// The game rules.js works on, out of a match.
function gameOf(match) {
    const game = {};
    for (const field of GAME_FIELDS) game[field] = match[field];
    return game;
}

// Which seat `userId` has in `match`, or -1.
function seatOf(match, userId) {
    return match.players.findIndex((player) => player.user && String(player.user) === String(userId));
}

// Two members' pairKey: the same whichever way round they're given.
function pairKeyOf(a, b) {
    return [String(a), String(b)].sort().join(":");
}

// A member's PP and P-PP together: what they can put up as a stake.
async function pointsOf(userId) {
    const user = await User.findById(userId).select("wallet").lean();
    return user ? (user.wallet?.pp ?? 0) + (user.wallet?.ppp ?? 0) : 0;
}

// Whether `userId` may watch `match` without playing in it: it's being
// played or over, and they follow one of its players.
async function canWatch(match, userId) {
    if (match.status !== "active" && match.status !== "over") return false;
    const players = match.players.map((player) => player.user).filter(Boolean);
    return Boolean(await Follow.exists({ follower: userId, following: { $in: players } }));
}

// Saves `game` (from engine.js) onto `match`, only if nobody has changed
// the match since it was read (the same version). `extra` is anything else
// to set. Returns the saved match, or null if it had moved on. Pages
// open on it hear about it straight away.
async function saveGame(match, game, extra = {}) {
    const set = { ...extra };
    for (const field of GAME_FIELDS) set[field] = game[field];
    const update = { $set: set, $inc: { version: 1 } };

    if (game.status === "over") {
        set.endedAt = new Date();
        // So they can play each other again.
        update.$unset = { pairKey: 1 };
    }

    const saved = await PoolMatch.findOneAndUpdate({ _id: match._id, version: match.version }, update, { returnDocument: "after" }).lean();
    if (saved) announcePool(saved);
    return saved;
}

// Hands `player` back what their stake took, PP as PP and P-PP as P-PP,
// once: a refund already on their receipts for this game isn't made again.
async function refundStake(matchId, player) {
    const paid = { pp: player.paid?.pp ?? 0, ppp: player.paid?.ppp ?? 0 };
    if (!player.user || (paid.pp <= 0 && paid.ppp <= 0)) return;
    if (await WalletTx.exists({ user: player.user, pool: matchId, reason: "poolRefund" })) return;
    try {
        await changeWallet(player.user, () => paid, { reason: "poolRefund", pool: matchId });
    } catch (error) {
        // An account that's been deleted can't be paid back.
        if (!(error instanceof WalletError && error.status === 404)) throw error;
    }
}

// Pays out a finished game, once: the winner takes the pot. Games For Fun
// have nothing to pay. It claims the game first (settled: false -> true),
// so two requests can never both pay; if paying fails it lets go, and the
// sweep tries later.
async function settleMatch(matchId) {
    const match = await PoolMatch.findOneAndUpdate(
        { _id: matchId, status: "over", settled: false },
        { $set: { settled: true } },
        { returnDocument: "after" }
    ).lean();
    if (!match || !(match.stake > 0)) return;

    try {
        if (match.winner !== 0 && match.winner !== 1) {
            for (const player of match.players) await refundStake(match._id, player);
            return;
        }
        const winner = match.players[match.winner];
        if (!winner?.user) return;
        await credit(winner.user, match.prize, { reason: "poolWin", pool: match._id });
    } catch (error) {
        if (error instanceof WalletError && error.status === 404) return;
        await PoolMatch.updateOne({ _id: matchId }, { $set: { settled: false } });
        throw error;
    }
}

// A game just ended: pay it out, pay out or hand back the crowd's bets,
// tell both players, and (for a game played for points) whoever follows
// them. `skip` is a member who has just left the club. A payout that fails
// mustn't fail the shot that won it: the sweep tries again.
async function finishMatch(match, skip = null) {
    try {
        await settleMatch(match._id);
    } catch (error) {
        console.error(`Couldn't pay out pool game ${match._id} yet:`, error.message);
    }
    try {
        await require("./poolBets").settleBets(match);
    } catch (error) {
        console.error(`Couldn't settle the bets on pool game ${match._id} yet:`, error.message);
    }
    await notePoolOver(match, skip);
    await notePoolResult(match, skip);
}

// If `match` has gone three days without a shot, ends it now (the player
// whose turn it was loses). Returns the match as it is afterwards.
async function expireIfIdle(match, now = Date.now()) {
    if (match.status !== "active" || now - new Date(match.lastMoveAt).getTime() < IDLE_LIMIT_MS) return match;

    const saved = await saveGame(match, forfeit(gameOf(match)));
    if (!saved) return PoolMatch.findById(match._id).lean();

    await finishMatch(saved);
    return saved;
}

// Closes a challenge as `status` ("declined", "expired" or "withdrawn"),
// if it's still at `match.version`. Nothing was taken from anyone.
function closeChallenge(match, status) {
    return PoolMatch.findOneAndUpdate(
        { _id: match._id, version: match.version, status: "challenge" },
        { $set: { status, endedAt: new Date() }, $unset: { pairKey: 1 }, $inc: { version: 1 } },
        { returnDocument: "after" }
    ).lean();
}

// If a challenge's three days are up, it expires now, and whoever sent the
// terms hears nobody answered.
async function expireIfUnanswered(match, now = Date.now()) {
    if (match.status !== "challenge" || new Date(match.expiresAt).getTime() > now) return match;

    const closed = await closeChallenge(match, "expired");
    if (!closed) return PoolMatch.findById(match._id).lean();

    await notePoolAnswer(closed, "poolExpired", closed.offer.by, closed.offer.to);
    return closed;
}

// Both kinds of running out of time, for routes about to show or act on a match.
async function catchUp(match, now = Date.now()) {
    return expireIfUnanswered(await expireIfIdle(match, now), now);
}

// A game stuck "starting": hands back every stake taken for it, going by
// the receipts (bets, less anything already handed back). Deleting the
// game first is the claim, so two sweeps can't both refund it.
async function cancelStuckStart(matchId) {
    const claimed = await PoolMatch.findOneAndDelete({ _id: matchId, status: "starting" }).lean();
    if (!claimed) return;

    const receipts = await WalletTx.find({ pool: matchId, reason: { $in: ["poolBet", "poolRefund"] } }).lean();
    const owed = new Map();
    for (const tx of receipts) {
        const sum = owed.get(String(tx.user)) ?? { user: tx.user, pp: 0, ppp: 0 };
        sum.pp += tx.pp;
        sum.ppp += tx.ppp;
        owed.set(String(tx.user), sum);
    }

    for (const { user, pp, ppp } of owed.values()) {
        if (pp >= 0 && ppp >= 0) continue;
        const back = { pp: pp < 0 ? 0 - pp : 0, ppp: ppp < 0 ? 0 - ppp : 0 };
        await changeWallet(user, () => back, { reason: "poolRefund", pool: matchId });
    }
    await forgetPoolMatch(matchId);
}

// Every few minutes (jobs/poolSweep.js): ends games quiet for three days,
// expires challenges nobody answered, pays any game whose payout failed,
// refunds games stuck starting, and settles any bets left on finished
// games. Returns how many of each.
async function sweepMatches(now = Date.now()) {
    const counts = { forfeited: 0, expired: 0, paid: 0, refunded: 0, bets: 0 };

    const each = async (matches, job, label) => {
        for (const match of matches) {
            try {
                await job(match);
                counts[label] += 1;
            } catch (error) {
                console.error(`Pool sweep couldn't handle ${match._id}:`, error.message);
            }
        }
    };

    const idle = await PoolMatch.find({ status: "active", lastMoveAt: { $lt: new Date(now - IDLE_LIMIT_MS) } }).lean();
    await each(idle, (match) => expireIfIdle(match, now), "forfeited");

    const unanswered = await PoolMatch.find({ status: "challenge", expiresAt: { $lt: new Date(now) } }).lean();
    await each(unanswered, (match) => expireIfUnanswered(match, now), "expired");

    const unpaid = await PoolMatch.find({ status: "over", settled: false }).select("_id").lean();
    await each(unpaid, (match) => settleMatch(match._id), "paid");

    const stuck = await PoolMatch.find({ status: "starting", createdAt: { $lt: new Date(now - STUCK_STARTING_MS) } }).select("_id").lean();
    await each(stuck, (match) => cancelStuckStart(match._id), "refunded");

    try {
        counts.bets = await require("./poolBets").settleStrayBets();
    } catch (error) {
        console.error("Pool sweep couldn't settle bets:", error.message);
    }

    return counts;
}

// Matches as the pages get them, for `viewerId`: a player of each, or
// someone watching (`mySeat` -1). `mySeat` says which seat is theirs; the
// page turns everything round so it's always "you" first. `full` adds the
// table itself and the last shot (the game page); lists get only the
// score (`left`: how many balls each seat still has to pocket).
async function matchViews(matches, viewerId, { full = false } = {}) {
    if (matches.length === 0) return [];
    const ids = [...new Set(matches.flatMap((match) => match.players.map((player) => player.user)).filter(Boolean).map(String))];
    if (!ids.includes(String(viewerId))) ids.push(String(viewerId));
    const users = await User.find({ _id: { $in: ids } }).select(`${MEMBER_FIELDS} wallet pool`).lean();
    const userById = new Map(users.map((user) => [String(user._id), user]));

    const playerView = (id) => {
        const user = id && userById.get(String(id));
        if (!user) return { _id: null, username: "A former member", avatarUrl: null, reviewCardBanner: null, look: lookOf(null) };
        const { username, avatarUrl, reviewCardBanner, cosmetics } = userSummary(user);
        // The cue they shoot with and their Ignition, for everyone at the
        // table to see.
        return { _id: id, username, avatarUrl, reviewCardBanner, cosmetics, look: lookOf(user) };
    };
    const pointsOfUser = (id) => {
        const wallet = userById.get(String(id))?.wallet;
        return (wallet?.pp ?? 0) + (wallet?.ppp ?? 0);
    };

    // Who has each game being played open right now (Play Live).
    const hereById = new Map(
        await Promise.all(
            matches.filter((match) => match.status === "active").map(async (match) => [String(match._id), await poolPlayersAt(match._id)])
        )
    );

    return matches.map((match) => {
        const mySeat = seatOf(match, viewerId);
        const other = mySeat >= 0 ? match.players[1 - mySeat]?.user : null;
        const challenge = match.status === "challenge";
        const myAnswer = challenge && String(match.offer?.to) === String(viewerId);
        const counterMax = challenge && mySeat >= 0 ? Math.min(pointsOfUser(viewerId), pointsOfUser(other)) : null;
        const balls = match.balls ?? [];
        const groupLeft = (seat) => {
            if (match.solids !== 0 && match.solids !== 1) return 7;
            return ballsLeft(balls, match.solids === seat ? SOLIDS : STRIPES);
        };

        return {
            _id: match._id,
            status: match.status,
            version: match.version,
            stake: match.stake,
            prize: match.prize,
            forFun: !(match.stake > 0),
            mySeat,
            watching: mySeat < 0,
            players: match.players.map((player) => playerView(player.user)),
            offer: match.offer,
            counters: match.counters,
            expiresAt: match.expiresAt,
            myAnswer,
            acceptStake: myAnswer ? (match.stake > 0 ? Math.min(match.stake, counterMax) : 0) : null,
            counterMax,
            here: hereById.get(String(match._id)) ?? [],
            shots: match.shots ?? 0,
            // How many shots the viewer had seen before this, so the page can
            // play the other player's newest shot in front of them.
            seen: mySeat >= 0 ? (match.players[mySeat].seen ?? 0) : (match.shots ?? 0),
            current: match.current,
            solids: match.solids ?? null,
            breakShot: Boolean(match.breakShot),
            hand: match.hand ?? null,
            left: [groupLeft(0), groupLeft(1)],
            ...(full && { balls: balls.map(({ id, x, y, on }) => ({ id, x, y, on })), lastShot: match.lastShot ?? null }),
            winner: match.winner,
            endedBy: match.endedBy,
            lastMoveAt: match.lastMoveAt,
            forfeitAt: new Date(new Date(match.lastMoveAt).getTime() + IDLE_LIMIT_MS),
            endedAt: match.endedAt,
        };
    });
}

async function matchView(match, viewerId, options) {
    const [view] = await matchViews([match], viewerId, options);
    return view;
}

// They left the club in the middle of a game: as if they'd given up.
async function leaveGame(match, userId) {
    for (let attempt = 0; attempt < 5; attempt++) {
        const current = attempt === 0 ? match : await PoolMatch.findById(match._id).lean();
        if (!current || current.status !== "active") return;

        const saved = await saveGame(current, resign(gameOf(current), seatOf(current, userId), "left"));
        if (saved) {
            await finishMatch(saved, userId);
            return;
        }
    }
}

// Account deletion (controllers/userControllers.js), before the member and
// their wallet go: challenges close, a game still taking stakes is undone
// (stakes back), a game being played is lost, as if they gave up, and
// their bets nobody took are closed. Finished games stay, for the other
// player's history.
async function forgetPoolPlayer(userId) {
    const open = await PoolMatch.find({ "players.user": userId, status: { $in: OPEN } }).lean();
    for (const match of open) {
        if (match.status === "challenge") {
            const closed = await closeChallenge(match, "withdrawn");
            if (closed) await notePoolAnswer(closed);
        } else if (match.status === "starting") {
            await cancelStuckStart(match._id);
        } else {
            await leaveGame(match, userId);
        }
    }
    await require("./poolBets").forgetPoolBettor(userId);
}

// Their games (without every ball of every table), for their data export.
function poolGamesOf(userId) {
    return PoolMatch.find({ "players.user": userId }).select("-balls -lastShot").sort({ createdAt: -1 }).lean();
}

module.exports = {
    IDLE_LIMIT_MS,
    CHALLENGE_LIMIT_MS,
    STUCK_STARTING_MS,
    gameOf,
    seatOf,
    pairKeyOf,
    pointsOf,
    canWatch,
    saveGame,
    settleMatch,
    finishMatch,
    expireIfIdle,
    closeChallenge,
    expireIfUnanswered,
    catchUp,
    cancelStuckStart,
    sweepMatches,
    matchViews,
    matchView,
    forgetPoolPlayer,
    poolGamesOf,
};
