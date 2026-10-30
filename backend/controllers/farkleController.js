const mongoose = require("mongoose");
const FarkleMatch = require("../models/farkleMatchModel");
const User = require("../models/userModel");
const { WalletError, changeWallet, spend } = require("../utils/wallet");
const { noteFarkleAnswer, noteFarkleChallenge, noteFarkleTurn } = require("../utils/notify");
const { MoveError, applyMove, newGame, playBot } = require("../games/farkle/engine");
const {
    BOT_SEAT,
    CHALLENGE_LIMIT_MS,
    MEMBER_SEAT,
    catchUp,
    closeChallenge,
    expireIfIdle,
    finishMatch,
    gameOf,
    matchView,
    matchViews,
    pairKeyOf,
    pointsOf,
    saveGame,
    seatOf,
} = require("../utils/farkle");
const {
    BOT_NAME,
    BOT_STAKE,
    PVP_MIN_STAKE,
    WINNING_SCORES,
    botPrize,
    formatPoints,
    pvpPrize,
} = require("../../shared/farkle/rules.js");

// How many finished games and closed challenges the lobby lists.
const RECENT_SIZE = 10;

// A match the logged-in member is in, or null. Games still starting don't
// count: nobody can see or move in those yet.
async function findMyMatch(id, userId) {
    if (!mongoose.isValidObjectId(id)) return null;
    return FarkleMatch.findOne({ _id: id, "players.user": userId, status: { $ne: "starting" } }).lean();
}

// A move or answer that came too late or twice: why, and the match as it
// is now, so the page can catch up.
async function refuseStale(res, match, userId, error) {
    res.status(409).json({ error, match: await matchView(match, userId) });
}

// Why a match can't be acted on as a challenge any more.
function whyNotOpen(match) {
    if (match.status === "expired") return "This challenge expired: three days went by without an answer.";
    if (match.status === "declined") return "This challenge was turned down.";
    if (match.status === "withdrawn") return "This challenge was taken back.";
    return "This challenge was already accepted.";
}

// Terms for a challenge or counter between `me` and `them`: one of the
// winning scores, and a whole-number stake from PVP_MIN_STAKE up to what
// the poorer of the two has (nobody can bet points they don't have).
// Returns what's wrong with them, or null.
async function termsProblem(target, stake, me, them) {
    if (!WINNING_SCORES.includes(target)) return `Play to ${WINNING_SCORES.map(formatPoints).join(", ")}.`;
    if (!Number.isInteger(stake) || stake < PVP_MIN_STAKE) {
        return `A stake is a whole number of points, at least ${PVP_MIN_STAKE}.`;
    }

    const max = Math.min(await pointsOf(me), await pointsOf(them));
    if (max < PVP_MIN_STAKE) return `One of you has fewer than ${PVP_MIN_STAKE} points, so there's nothing to play for yet.`;
    if (stake > max) return `The most you two can play for right now is ${formatPoints(max)}.`;
    return null;
}

// ---- Against the bot ----

// Their open game against the bot: { match }, null if they have none.
async function getBotMatch(req, res) {
    const open = await FarkleMatch.findOne({ openBotFor: req.user._id, status: "active" }).lean();
    const match = open && (await expireIfIdle(open));

    res.json({ match: match ? await matchView(match, req.user._id) : null });
}

// A new game against the bot, { target, stake }. The stake is taken now,
// PP first and then P-PP, and the bot plays its first turn straight away,
// because the bot always rolls first. Beating it pays botPrize(stake) P-PP.
async function startBotMatch(req, res) {
    const userId = req.user._id;
    const target = Number(req.body?.target);
    const stake = Number(req.body?.stake);

    if (!WINNING_SCORES.includes(target)) {
        return res.status(400).json({ error: `Play to ${WINNING_SCORES.map(formatPoints).join(", ")}.` });
    }
    if (!Number.isInteger(stake) || stake < BOT_STAKE.min || stake > BOT_STAKE.max) {
        return res.status(400).json({ error: `Stakes against ${BOT_NAME} are ${BOT_STAKE.min} to ${BOT_STAKE.max} points.` });
    }

    // The game is saved before the stake is taken, as "starting". If the
    // server stopped right after taking the stake, the sweep would find
    // the game and hand the stake back (utils/farkle.js cancelStuckStart).
    let match;
    try {
        match = await FarkleMatch.create({
            mode: "bot",
            players: [{ user: null }, { user: userId }],
            target,
            stake,
            prize: botPrize(stake),
            openBotFor: userId,
        });
    } catch (error) {
        // openBotFor is unique: they already have one going.
        if (error.code === 11000) {
            return res.status(409).json({ error: `You already have a game going against ${BOT_NAME}. Finish it or give up first.` });
        }
        throw error;
    }

    let paid;
    try {
        paid = await spend(userId, stake, { reason: "bet", match: match._id });
    } catch (error) {
        await FarkleMatch.deleteOne({ _id: match._id });
        if (error instanceof WalletError) {
            return res.status(error.status).json({ error: error.message });
        }
        throw error;
    }

    const game = playBot(newGame({ target, first: BOT_SEAT }), BOT_SEAT);
    const saved = await saveGame(match, game, {
        [`players.${MEMBER_SEAT}.paid`]: { pp: 0 - paid.pp, ppp: 0 - paid.ppp },
        lastMoveAt: new Date(),
    });
    if (!saved) throw new Error(`Farkle match ${match._id} changed before it started`);

    // The bot can win on its very first turn when playing to 2,000.
    if (saved.status === "over") await finishMatch(saved);

    res.status(201).json(await matchView(saved, userId));
}

// ---- Any match ----

// One match, for the members in it.
async function getMatch(req, res) {
    const found = await findMyMatch(req.params.id, req.user._id);
    if (!found) {
        return res.status(404).json({ error: "Game not found." });
    }

    res.json(await matchView(await catchUp(found), req.user._id));
}

// A move, { version, type, keep }: type is "roll", "bank" or "resign", and
// keep the positions of the dice to set aside. `version` is the match
// version the page made it on. Against the bot, the bot's turn is played
// straight after and comes back in `lastTurns` for the page to replay.
// Between members, the other player gets a pinned "your turn" when the
// dice pass to them.
async function makeMove(req, res) {
    const userId = req.user._id;
    const found = await findMyMatch(req.params.id, userId);
    if (!found) {
        return res.status(404).json({ error: "Game not found." });
    }

    const match = await catchUp(found);
    if (match.status !== "active") {
        const why = match.status === "over"
            ? match.endedBy === "forfeit" ? "Time ran out: three days went by without a move." : "This game is over."
            : "This game hasn't started.";
        return refuseStale(res, match, userId, why);
    }
    if (req.body?.version !== match.version) {
        return refuseStale(res, match, userId, "The game had already moved on. Here it is now.");
    }

    let game;
    try {
        const move = { type: req.body?.type, keep: req.body?.keep ?? [] };
        game = applyMove(gameOf(match), seatOf(match, userId), move);
        if (match.mode === "bot") game = playBot(game, BOT_SEAT);
    } catch (error) {
        if (error instanceof MoveError) {
            return res.status(error.status).json({ error: error.message });
        }
        throw error;
    }

    const saved = await saveGame(match, game, { lastMoveAt: new Date() });
    if (!saved) {
        // Another move landed between reading the match and saving this one.
        return refuseStale(res, await FarkleMatch.findById(match._id).lean(), userId, "The game had already moved on. Here it is now.");
    }

    if (saved.status === "over") await finishMatch(saved);
    else if (saved.mode === "pvp" && saved.current !== match.current) await noteFarkleTurn(saved);

    res.json(await matchView(saved, userId));
}

// ---- Between members ----

// The Farkle lobby: their open game against the bot, challenges waiting on
// them and sent by them, games with other members (theirs to move first),
// and the last few finished games and closed challenges.
async function getLobby(req, res) {
    const me = req.user._id;

    const found = await FarkleMatch.find({ "players.user": me, status: { $in: ["challenge", "active"] } }).lean();
    const open = [];
    for (const match of found) open.push(await catchUp(match));

    const recent = await FarkleMatch.find({ "players.user": me, status: { $in: ["over", "declined", "expired", "withdrawn"] } })
        .sort({ endedAt: -1 })
        .limit(RECENT_SIZE)
        .lean();

    const views = await matchViews([...open, ...recent], me);
    const still = views.slice(0, open.length);
    const myTurnFirst = (a, b) => Number(b.current === b.mySeat) - Number(a.current === a.mySeat)
        || new Date(b.lastMoveAt) - new Date(a.lastMoveAt);

    res.json({
        bot: still.find((view) => view.mode === "bot" && view.status === "active") ?? null,
        incoming: still.filter((view) => view.status === "challenge" && view.myAnswer),
        outgoing: still.filter((view) => view.status === "challenge" && !view.myAnswer),
        games: still.filter((view) => view.mode === "pvp" && view.status === "active").sort(myTurnFirst),
        recent: views.slice(open.length),
    });
}

// The most they can challenge the member in the URL for: what the poorer
// of the two has. { max }.
async function getStakeLimit(req, res) {
    const { userId } = req.params;
    if (!mongoose.isValidObjectId(userId)) {
        return res.status(404).json({ error: "Member not found." });
    }

    const [mine, theirs] = await Promise.all([pointsOf(req.user._id), pointsOf(userId)]);
    res.json({ max: Math.min(mine, theirs) });
}

// A challenge, { opponent, target, stake }. Nothing is taken from anyone
// until it's accepted. They get a pinned notification with Accept, Decline
// and Counter, and three days to answer. Any member can be challenged, PvP
// setting or not, but two members can only have one challenge or game
// going with each other at a time.
async function createChallenge(req, res) {
    const me = req.user._id;
    const opponentId = req.body?.opponent;

    if (!mongoose.isValidObjectId(opponentId) || String(opponentId) === String(me)) {
        return res.status(400).json({ error: "Pick another member to challenge." });
    }

    const opponent = await User.findById(opponentId).select("username").lean();
    if (!opponent) {
        return res.status(404).json({ error: "Member not found." });
    }

    const target = Number(req.body?.target);
    const stake = Number(req.body?.stake);
    const problem = await termsProblem(target, stake, me, opponent._id);
    if (problem) {
        return res.status(400).json({ error: problem });
    }

    const now = new Date();
    let match;
    try {
        match = await FarkleMatch.create({
            mode: "pvp",
            status: "challenge",
            players: [{ user: me }, { user: opponent._id }],
            target,
            stake,
            prize: pvpPrize(stake),
            offer: { by: me, to: opponent._id, at: now },
            expiresAt: new Date(now.getTime() + CHALLENGE_LIMIT_MS),
            pairKey: pairKeyOf(me, opponent._id),
        });
    } catch (error) {
        // pairKey is unique: these two already have something going.
        if (error.code === 11000) {
            return res.status(409).json({ error: `You already have a challenge or a game going with ${opponent.username}.` });
        }
        throw error;
    }

    await noteFarkleChallenge(match);
    res.status(201).json(await matchView(match.toObject(), me));
}

// The challenge in the URL, if it's still open and `req.user` is the one to
// act on it: `role` "to" to answer it, "by" to take it back. The page must
// have seen the current terms (`version`). Sends the refusal itself and
// returns null otherwise.
async function openChallenge(req, res, role) {
    const userId = req.user._id;
    const found = await findMyMatch(req.params.id, userId);
    if (!found) {
        res.status(404).json({ error: "Challenge not found." });
        return null;
    }

    const match = await catchUp(found);
    if (match.status !== "challenge") {
        await refuseStale(res, match, userId, whyNotOpen(match));
        return null;
    }
    if (String(match.offer[role]) !== String(userId)) {
        res.status(403).json({ error: role === "to" ? "It's the other player's turn to answer." : "Only whoever offered these terms can take them back." });
        return null;
    }
    if (req.body?.version !== match.version) {
        await refuseStale(res, match, userId, "The challenge changed. Here it is now.");
        return null;
    }

    return match;
}

// Accepting: both stakes are taken now and held in the game (escrow), and
// the game starts with whoever accepted rolling first. If either of them
// has less than the stake by now, the stake drops to what they have, as
// long as that's more than 0. Winning pays the whole pot.
async function acceptChallenge(req, res) {
    const match = await openChallenge(req, res, "to");
    if (!match) return;

    const me = req.user._id;
    const other = match.offer.by;

    const [mine, theirs] = await Promise.all([pointsOf(me), pointsOf(other)]);
    const stake = Math.min(match.stake, mine, theirs);
    if (stake < 1) {
        return res.status(400).json({ error: mine < 1 ? "You have no points to put up right now." : "They have no points to put up right now." });
    }

    // Claimed first, as "starting", so nobody can answer or take it back
    // while the stakes are being taken. The accepter sits in seat 0.
    const claimed = await FarkleMatch.findOneAndUpdate(
        { _id: match._id, version: match.version, status: "challenge" },
        {
            $set: { status: "starting", stake, prize: pvpPrize(stake), players: [{ user: me }, { user: other }] },
            $inc: { version: 1 },
        },
        { returnDocument: "after" }
    ).lean();
    if (!claimed) {
        return refuseStale(res, await FarkleMatch.findById(match._id).lean(), me, "The challenge changed. Here it is now.");
    }

    const paid = [];
    try {
        paid.push(await spend(me, stake, { reason: "bet", match: match._id }));
        paid.push(await spend(other, stake, { reason: "bet", match: match._id }));
    } catch (error) {
        // Hand back whatever was taken, and put the challenge back as it was.
        if (paid.length) {
            await changeWallet(me, () => ({ pp: 0 - paid[0].pp, ppp: 0 - paid[0].ppp }), { reason: "refund", match: match._id });
        }
        await FarkleMatch.updateOne(
            { _id: match._id, status: "starting" },
            { $set: { status: "challenge", stake: match.stake, prize: match.prize, players: match.players }, $inc: { version: 1 } }
        );

        if (error instanceof WalletError) {
            const why = paid.length ? "Their points changed just now, so the game couldn't start. Try again." : error.message;
            return res.status(409).json({ error: why });
        }
        throw error;
    }

    const saved = await saveGame(claimed, newGame({ target: claimed.target, first: 0 }), {
        "players.0.paid": { pp: 0 - paid[0].pp, ppp: 0 - paid[0].ppp },
        "players.1.paid": { pp: 0 - paid[1].pp, ppp: 0 - paid[1].ppp },
        lastMoveAt: new Date(),
        expiresAt: null,
    });
    if (!saved) throw new Error(`Farkle match ${match._id} changed while it was starting`);

    await noteFarkleAnswer(saved, "farkleAccepted", other, me);
    await noteFarkleTurn(saved);

    res.json(await matchView(saved, me));
}

// Turning it down. Nothing was taken, so there's nothing to give back.
async function declineChallenge(req, res) {
    const match = await openChallenge(req, res, "to");
    if (!match) return;

    const closed = await closeChallenge(match, "declined");
    if (!closed) {
        return refuseStale(res, await FarkleMatch.findById(match._id).lean(), req.user._id, "The challenge changed. Here it is now.");
    }

    await noteFarkleAnswer(closed, "farkleDeclined", closed.offer.by, req.user._id);
    res.json(await matchView(closed, req.user._id));
}

// New terms back, { target, stake }: the other player now has three days
// to accept, decline or counter again. As many times as they like.
async function counterChallenge(req, res) {
    const match = await openChallenge(req, res, "to");
    if (!match) return;

    const me = req.user._id;
    const other = match.offer.by;
    const target = Number(req.body?.target);
    const stake = Number(req.body?.stake);

    if (target === match.target && stake === match.stake) {
        return res.status(400).json({ error: "Those are the terms on the table already: accept them instead." });
    }
    const problem = await termsProblem(target, stake, me, other);
    if (problem) {
        return res.status(400).json({ error: problem });
    }

    const now = new Date();
    const saved = await FarkleMatch.findOneAndUpdate(
        { _id: match._id, version: match.version, status: "challenge" },
        {
            $set: {
                target,
                stake,
                prize: pvpPrize(stake),
                offer: { by: me, to: other, at: now },
                expiresAt: new Date(now.getTime() + CHALLENGE_LIMIT_MS),
            },
            $inc: { version: 1, counters: 1 },
        },
        { returnDocument: "after" }
    ).lean();
    if (!saved) {
        return refuseStale(res, await FarkleMatch.findById(match._id).lean(), me, "The challenge changed. Here it is now.");
    }

    await noteFarkleChallenge(saved);
    res.json(await matchView(saved, me));
}

// Taking back terms you offered, before they're answered.
async function withdrawChallenge(req, res) {
    const match = await openChallenge(req, res, "by");
    if (!match) return;

    const closed = await closeChallenge(match, "withdrawn");
    if (!closed) {
        return refuseStale(res, await FarkleMatch.findById(match._id).lean(), req.user._id, "The challenge changed. Here it is now.");
    }

    await noteFarkleAnswer(closed);
    res.json(await matchView(closed, req.user._id));
}

module.exports = {
    getBotMatch,
    startBotMatch,
    getMatch,
    makeMove,
    getLobby,
    getStakeLimit,
    createChallenge,
    acceptChallenge,
    declineChallenge,
    counterChallenge,
    withdrawChallenge,
};
