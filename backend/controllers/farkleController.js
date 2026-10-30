const mongoose = require("mongoose");
const FarkleMatch = require("../models/farkleMatchModel");
const { WalletError, spend } = require("../utils/wallet");
const { MoveError, applyMove, newGame, playBot } = require("../games/farkle/engine");
const {
    BOT_SEAT,
    MEMBER_SEAT,
    expireIfIdle,
    gameOf,
    matchView,
    saveGame,
    seatOf,
    settleSafely,
} = require("../utils/farkle");
const { BOT_NAME, BOT_STAKE, WINNING_SCORES, botPrize, formatPoints } = require("../../shared/farkle/rules.js");

// A match the logged-in member is playing in, or null. Games still
// starting don't count: nobody can see or move in those yet.
async function findMyMatch(id, userId) {
    if (!mongoose.isValidObjectId(id)) return null;
    return FarkleMatch.findOne({ _id: id, "players.user": userId, status: { $ne: "starting" } }).lean();
}

// A move that came too late or twice: why, and the game as it is now, so
// the page can catch up.
async function refuseStale(res, match, userId, error) {
    res.status(409).json({ error, match: await matchView(match, userId) });
}

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
    if (saved.status === "over") await settleSafely(saved._id);

    res.status(201).json(await matchView(saved, userId));
}

// One match, for the members playing it.
async function getMatch(req, res) {
    const found = await findMyMatch(req.params.id, req.user._id);
    if (!found) {
        return res.status(404).json({ error: "Game not found." });
    }

    res.json(await matchView(await expireIfIdle(found), req.user._id));
}

// A move, { version, type, keep }: type is "roll", "bank" or "resign", and
// keep the positions of the dice to set aside. `version` is the match
// version the page made it on. Against the bot, the bot's turn is played
// straight after and comes back in `lastTurns` for the page to replay.
async function makeMove(req, res) {
    const userId = req.user._id;
    const found = await findMyMatch(req.params.id, userId);
    if (!found) {
        return res.status(404).json({ error: "Game not found." });
    }

    const match = await expireIfIdle(found);
    if (match.status !== "active") {
        const why = match.endedBy === "forfeit" ? "Time ran out: three days went by without a move." : "This game is over.";
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

    if (saved.status === "over") await settleSafely(saved._id);

    res.json(await matchView(saved, userId));
}

module.exports = { getBotMatch, startBotMatch, getMatch, makeMove };
