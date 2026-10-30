const FarkleMatch = require("../models/farkleMatchModel");
const User = require("../models/userModel");
const WalletTx = require("../models/walletTxModel");
const { WalletError, changeWallet, credit } = require("./wallet");
const { noteFarkleAnswer, noteFarkleOver, noteFarkleResult, forgetFarkleMatch } = require("./notify");
const { GAME_FIELDS, applyMove, forfeit } = require("../games/farkle/engine");
const { announceMatch } = require("../games/farkle/live");
const { MEMBER_FIELDS, userSummary } = require("./serialize");
const { BOT_NAME } = require("../../shared/farkle/rules.js");

// Farkle matches in the database: saving a move, paying the winner, and
// ending games and challenges nobody is answering any more. The game itself
// is in games/farkle/engine.js.

// Against the bot, the bot sits in seat 0 (it always rolls first) and the
// member in seat 1. Between members, whoever accepted the challenge sits
// in seat 0, because they roll first.
const BOT_SEAT = 0;
const MEMBER_SEAT = 1;

// Three days without a move and the player whose turn it is loses.
const IDLE_LIMIT_MS = 3 * 24 * 60 * 60 * 1000;

// Three days without an answer and a challenge (or a counter) expires.
const CHALLENGE_LIMIT_MS = 3 * 24 * 60 * 60 * 1000;

// A game takes the stakes and starts within a second. One still "starting"
// after this never got going (the server stopped in between), so the
// sweep hands the stakes back.
const STUCK_STARTING_MS = 10 * 60 * 1000;

// Statuses where the match is still going, one way or another.
const OPEN = ["challenge", "starting", "active"];

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

// Two members' pairKey (models/farkleMatchModel.js): the same whichever way
// round they're given.
function pairKeyOf(a, b) {
    return [String(a), String(b)].sort().join(":");
}

// A member's PP and P-PP together: what they can put up as a stake.
async function pointsOf(userId) {
    const user = await User.findById(userId).select("wallet").lean();
    return user ? (user.wallet?.pp ?? 0) + (user.wallet?.ppp ?? 0) : 0;
}

// Saves `game` (from engine.js) onto `match`, but only if nobody has
// changed the match since it was read: the version in the database must
// still be `match.version`. That's what stops a double tap rolling twice:
// the second tap carries the same version, and by then it's out of date.
// `extra` is anything else to set. Returns the saved match, or null if the
// match had moved on. Pages playing it live hear about it straight away.
async function saveGame(match, game, extra = {}) {
    const set = { ...extra };
    for (const field of GAME_FIELDS) set[field] = game[field];
    const update = { $set: set, $inc: { version: 1 } };

    if (game.status === "over") {
        set.endedAt = new Date();
        // So their next game against the bot, or each other, can start.
        update.$unset = { openBotFor: 1, pairKey: 1 };
    }

    const saved = await FarkleMatch.findOneAndUpdate(
        { _id: match._id, version: match.version },
        update,
        { returnDocument: "after" }
    ).lean();

    if (saved) announceMatch(saved);
    return saved;
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

// A game just ended (saved as over): pay the winner, tell both players
// (between members), and tell whoever follows them how it went (against
// the bot too). `skip` is a member who has just left the club.
async function finishMatch(match, skip = null) {
    await settleSafely(match._id);
    if (match.mode === "pvp") await noteFarkleOver(match, skip);
    await noteFarkleResult(match, skip);
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

    await finishMatch(saved);
    return saved;
}

// Closes a challenge as `status` ("declined", "expired" or "withdrawn"),
// if it's still at `match.version`. Nothing was taken from anyone, so
// there's nothing to give back. Returns the closed match, or null.
function closeChallenge(match, status) {
    return FarkleMatch.findOneAndUpdate(
        { _id: match._id, version: match.version, status: "challenge" },
        { $set: { status, endedAt: new Date() }, $unset: { pairKey: 1 }, $inc: { version: 1 } },
        { returnDocument: "after" }
    ).lean();
}

// If a challenge's three days are up, it expires now, and whoever sent the
// terms hears nobody answered. Returns the match as it is afterwards.
async function expireIfUnanswered(match, now = Date.now()) {
    if (match.status !== "challenge" || new Date(match.expiresAt).getTime() > now) return match;

    const closed = await closeChallenge(match, "expired");
    if (!closed) return FarkleMatch.findById(match._id).lean();

    await noteFarkleAnswer(closed, "farkleExpired", closed.offer.by, closed.offer.to);
    return closed;
}

// Both kinds of running out of time, for routes about to show or act on a
// match.
async function catchUp(match, now = Date.now()) {
    return expireIfUnanswered(await expireIfIdle(match, now), now);
}

// A game stuck "starting": hands back every stake taken for it, exactly as
// it was paid (PP as PP, P-PP as P-PP), going by the receipts: each
// member's bets, less anything already handed back (an accept that failed
// halfway refunds the first stake itself). Deleting the game first is the
// claim, so two sweeps can't both refund it.
async function cancelStuckStart(matchId) {
    const claimed = await FarkleMatch.findOneAndDelete({ _id: matchId, status: "starting" }).lean();
    if (!claimed) return;

    const receipts = await WalletTx.find({ match: matchId, reason: { $in: ["bet", "refund"] } }).lean();
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
        await changeWallet(user, () => back, { reason: "refund", match: matchId });
    }
    await forgetFarkleMatch(matchId);
}

// Every few minutes (jobs/farkleSweep.js): ends games quiet for three days,
// expires challenges nobody answered, pays any winner whose payout failed,
// and refunds games stuck starting. One match's trouble doesn't stop the
// rest. Returns how many of each.
async function sweepMatches(now = Date.now()) {
    const counts = { forfeited: 0, expired: 0, paid: 0, refunded: 0 };

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

    const unanswered = await FarkleMatch.find({ status: "challenge", expiresAt: { $lt: new Date(now) } }).lean();
    await each(unanswered, (match) => expireIfUnanswered(match, now), "expired");

    const unpaid = await FarkleMatch.find({ status: "over", settled: false }).select("_id").lean();
    await each(unpaid, (match) => settleMatch(match._id), "paid");

    const stuck = await FarkleMatch.find({ status: "starting", createdAt: { $lt: new Date(now - STUCK_STARTING_MS) } })
        .select("_id")
        .lean();
    await each(stuck, (match) => cancelStuckStart(match._id), "refunded");

    return counts;
}

// Matches as the game pages and the Notifications page get them, for
// `viewerId`, who's in each. `mySeat` says which seat is theirs; the page
// turns everything round so it's always "you" first. A challenge waiting on
// them also says what they'd play for if they accepted now (`acceptStake`:
// the stake, unless one of them has less) and the most they can counter
// with (`counterMax`). Each player comes with their avatar and review card
// banner, for the challenge cards and the scoreboard.
async function matchViews(matches, viewerId) {
    const ids = [...new Set(matches.flatMap((match) => match.players.map((player) => player.user)).filter(Boolean).map(String))];
    const users = await User.find({ _id: { $in: ids } }).select(`${MEMBER_FIELDS} wallet`).lean();
    const userById = new Map(users.map((user) => [String(user._id), user]));

    // A seat as the pages draw it: the bot, a member, or a member who has
    // since left the club.
    const playerView = (id) => {
        if (!id) return { _id: null, username: BOT_NAME, avatarUrl: null, reviewCardBanner: null, bot: true };
        const user = userById.get(String(id));
        if (!user) return { _id: id, username: "A former member", avatarUrl: null, reviewCardBanner: null, bot: false };
        const { username, avatarUrl, reviewCardBanner } = userSummary(user);
        return { _id: id, username, avatarUrl, reviewCardBanner, bot: false };
    };
    const pointsOfUser = (id) => {
        const wallet = userById.get(String(id))?.wallet;
        return (wallet?.pp ?? 0) + (wallet?.ppp ?? 0);
    };

    return matches.map((match) => {
        const mySeat = seatOf(match, viewerId);
        const other = match.players[1 - mySeat]?.user;
        const challenge = match.status === "challenge";
        const myAnswer = challenge && String(match.offer?.to) === String(viewerId);
        const counterMax = challenge ? Math.min(pointsOfUser(viewerId), pointsOfUser(other)) : null;

        return {
            _id: match._id,
            mode: match.mode,
            status: match.status,
            version: match.version,
            target: match.target,
            stake: match.stake,
            prize: match.prize,
            mySeat,
            players: match.players.map((player) => playerView(player.user)),
            ...(match.mode === "pvp" && {
                offer: match.offer,
                counters: match.counters,
                expiresAt: match.expiresAt,
                myAnswer,
                acceptStake: myAnswer ? Math.min(match.stake, counterMax) : null,
                counterMax,
            }),
            scores: match.scores,
            current: match.current,
            turn: match.turn,
            phase: match.phase,
            dice: match.dice,
            kept: match.kept,
            turnPoints: match.turnPoints,
            hotDice: match.hotDice,
            // This turn's rolls so far, so a page watching the other player
            // can show each roll as it comes (Play Live).
            steps: match.steps,
            lastTurns: match.lastTurns,
            log: match.log,
            winner: match.winner,
            endedBy: match.endedBy,
            lastMoveAt: match.lastMoveAt,
            forfeitAt: new Date(new Date(match.lastMoveAt).getTime() + IDLE_LIMIT_MS),
            endedAt: match.endedAt,
        };
    });
}

async function matchView(match, viewerId) {
    const [view] = await matchViews([match], viewerId);
    return view;
}

// They left the club in the middle of a game: as if they'd given up, so
// the other player wins the pot. Tries again if a move lands at the same
// moment.
async function leaveGame(match, userId) {
    for (let attempt = 0; attempt < 5; attempt++) {
        const current = attempt === 0 ? match : await FarkleMatch.findById(match._id).lean();
        if (!current || current.status !== "active") return;

        const game = applyMove(gameOf(current), seatOf(current, userId), { type: "resign" });
        game.endedBy = "left";
        game.log[0].text = "Left the club";

        const saved = await saveGame(current, game);
        if (saved) {
            await finishMatch(saved, userId);
            return;
        }
    }
}

// Account deletion (controllers/userControllers.js), before the member and
// their wallet are deleted:
//   - games against the bot go: nobody else's points are in them
//   - challenges close, with nothing to give back (nothing was taken)
//   - a game still taking stakes is undone, and both stakes handed back
//   - a game being played is lost, as if they gave up: the other player
//     wins the whole pot
// Finished games between members stay, for the other player's history.
async function forgetFarklePlayer(userId) {
    await FarkleMatch.deleteMany({ mode: "bot", "players.user": userId });

    const open = await FarkleMatch.find({ mode: "pvp", "players.user": userId, status: { $in: OPEN } }).lean();

    for (const match of open) {
        if (match.status === "challenge") {
            const closed = await closeChallenge(match, "withdrawn");
            if (closed) await noteFarkleAnswer(closed);
        } else if (match.status === "starting") {
            await cancelStuckStart(match._id);
        } else {
            await leaveGame(match, userId);
        }
    }
}

module.exports = {
    BOT_SEAT,
    MEMBER_SEAT,
    IDLE_LIMIT_MS,
    CHALLENGE_LIMIT_MS,
    STUCK_STARTING_MS,
    gameOf,
    seatOf,
    pairKeyOf,
    pointsOf,
    saveGame,
    settleMatch,
    settleSafely,
    finishMatch,
    expireIfIdle,
    closeChallenge,
    expireIfUnanswered,
    catchUp,
    cancelStuckStart,
    sweepMatches,
    matchViews,
    matchView,
    forgetFarklePlayer,
};
