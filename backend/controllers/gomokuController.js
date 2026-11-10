const crypto = require("crypto");
const mongoose = require("mongoose");
const GomokuMatch = require("../models/gomokuMatchModel");
const User = require("../models/userModel");
const Follow = require("../models/followModel");
const { MEMBER_FIELDS, userSummary } = require("../utils/serialize");
const { parseOffset } = require("../utils/paging");
const { WalletError, changeWallet, spend } = require("../utils/wallet");
const { noteGomokuAnswer, noteGomokuChallenge } = require("../utils/notify");
const { MoveError, placeStone, resign } = require("../games/gomoku/engine");
const {
    CHALLENGE_LIMIT_MS,
    catchUp,
    closeChallenge,
    finishMatch,
    gameOf,
    matchView,
    matchViews,
    pairKeyOf,
    pointsOf,
    saveGame,
    seatOf,
} = require("../utils/gomoku");
const shop = require("../utils/gomokuShop");
const { BOARD_SIZES, FUN, boardOf, formatPoints, isOnBoard, pointIndex, prizeFor, stakeProblem } = require("../../shared/gomoku/rules.js");

// Infinite Gomoku between members (routes/gomokuRouter.js), played like
// Kino Farkle's games between members: a challenge with terms (the board,
// and the stake: 0 For Fun), answered with Accept, Decline or new terms
// (Counter), three days to answer and three days a move. Whoever accepts
// moves first, so the challenger moves second. Playing on one device
// (Play Local) is all in the browser, with nothing sent here.

// How many finished games and closed challenges the lobby lists.
const RECENT_SIZE = 10;

// A game the logged-in member is in, or null. Games still starting don't
// count: nobody can see or move in those yet.
async function findMine(id, userId) {
    if (!mongoose.isValidObjectId(id)) return null;
    return GomokuMatch.findOne({ _id: id, "players.user": userId, status: { $ne: "starting" } }).lean();
}

// A move or answer that came too late or twice: why, and the game as it
// is now, so the page can catch up.
async function refuseStale(res, match, userId, error) {
    res.status(409).json({ error, match: match ? await matchView(match, userId, { full: true }) : null });
}

function whyNotOpen(match) {
    if (match.status === "expired") return "This challenge expired: three days went by without an answer.";
    if (match.status === "declined") return "This challenge was turned down.";
    if (match.status === "withdrawn") return "This challenge was taken back.";
    return "This challenge was already accepted.";
}

// The terms from a request: { size, stake }. A missing stake is For Fun.
function termsFrom(body) {
    return { size: Number(body?.size), stake: body?.stake === undefined || body?.stake === null ? FUN : Number(body.stake) };
}

// What's wrong with terms between `me` and `them`, or null: one of the
// board sizes, and For Fun or a whole-number stake from MIN_STAKE up to
// what the poorer of the two has.
async function termsProblem({ size, stake }, me, them) {
    if (!BOARD_SIZES.includes(size)) return `Play on a ${BOARD_SIZES.map((n) => `${n} x ${n}`).join(" or ")} board.`;
    if (stake === FUN) return null;
    const max = Math.min(await pointsOf(me), await pointsOf(them));
    return stakeProblem(stake, max) || null;
}

const why = (match) =>
    match.status === "over"
        ? match.endedBy === "forfeit" ? "Time ran out: three days went by without a move." : "This game is over."
        : "This game hasn't started.";

// ---- The lobby ----

// Challenges waiting on them and sent by them, games being played (theirs
// to move first), and the last few finished games and closed challenges.
async function getLobby(req, res) {
    const me = req.user._id;

    const found = await GomokuMatch.find({ "players.user": me, status: { $in: ["challenge", "active"] } }).lean();
    const open = [];
    for (const match of found) open.push(await catchUp(match));

    const recent = await GomokuMatch.find({ "players.user": me, status: { $in: ["over", "declined", "expired", "withdrawn"] } })
        .sort({ endedAt: -1 })
        .limit(RECENT_SIZE)
        .lean();

    const views = await matchViews([...open, ...recent], me);
    const still = views.slice(0, open.length);
    const myTurnFirst = (a, b) => Number(b.current === b.mySeat) - Number(a.current === a.mySeat) || new Date(b.lastMoveAt) - new Date(a.lastMoveAt);

    res.json({
        incoming: still.filter((view) => view.status === "challenge" && view.myAnswer),
        outgoing: still.filter((view) => view.status === "challenge" && !view.myAnswer),
        games: still.filter((view) => view.status === "active").sort(myTurnFirst),
        recent: views.slice(open.length),
        myLook: views[0]?.myLook ?? (await shop.shopView(me)).equipped,
    });
}

// The most they can play the member in the URL for: { max }.
async function getStakeLimit(req, res) {
    const { userId } = req.params;
    if (!mongoose.isValidObjectId(userId)) return res.status(404).json({ error: "Member not found." });
    const [mine, theirs] = await Promise.all([pointsOf(req.user._id), pointsOf(userId)]);
    res.json({ max: Math.min(mine, theirs) });
}

const FRIENDS_PAGE = 5;

// ?skip=n. Their friends (members they follow who follow them back), the
// most points first, five at a time, each with the challenge or game the
// two of them already have going (`match`), or null. { friends, hasMore, next }.
async function getFriends(req, res) {
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

    const [members, open] = await Promise.all([
        User.find({ _id: { $in: page.map((row) => row._id) } }).select(MEMBER_FIELDS).lean(),
        GomokuMatch.find({ pairKey: { $in: page.map((row) => pairKeyOf(me, row._id)) } }).select("status pairKey").lean(),
    ]);
    const memberById = new Map(members.map((member) => [String(member._id), member]));
    const openByPair = new Map(open.map((match) => [match.pairKey, { _id: match._id, status: match.status }]));

    res.json({
        friends: page.flatMap((row) => {
            const member = memberById.get(String(row._id));
            if (!member) return [];
            return [{ ...userSummary(member), points: row.points, match: openByPair.get(pairKeyOf(me, row._id)) ?? null }];
        }),
        hasMore: ranked.length > FRIENDS_PAGE,
        next: skip + page.length,
    });
}

// ---- Challenges ----

// A challenge, { opponent, size, stake }: stake 0 (or none) is For Fun.
// Nothing is taken from anyone until it's accepted. They get a pinned
// notification with Accept, Decline and Counter, and three days to answer.
async function createChallenge(req, res) {
    const me = req.user._id;
    const opponentId = req.body?.opponent;
    if (!mongoose.isValidObjectId(opponentId) || String(opponentId) === String(me)) {
        return res.status(400).json({ error: "Pick another member to challenge." });
    }

    const opponent = await User.findById(opponentId).select("username").lean();
    if (!opponent) return res.status(404).json({ error: "Member not found." });

    const terms = termsFrom(req.body);
    const problem = await termsProblem(terms, me, opponent._id);
    if (problem) return res.status(400).json({ error: problem });

    const now = new Date();
    let match;
    try {
        match = await GomokuMatch.create({
            status: "challenge",
            players: [{ user: me }, { user: opponent._id }],
            size: terms.size,
            stake: terms.stake,
            prize: prizeFor(terms.stake),
            offer: { by: me, to: opponent._id, at: now },
            expiresAt: new Date(now.getTime() + CHALLENGE_LIMIT_MS),
            pairKey: pairKeyOf(me, opponent._id),
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ error: `You already have a challenge or a game going with ${opponent.username}.` });
        }
        throw error;
    }

    await noteGomokuChallenge(match);
    res.status(201).json(await matchView(match.toObject(), me, { full: true }));
}

// The challenge in the URL, if it's still open and `req.user` is the one
// to act on it: `role` "to" to answer it, "by" to take it back. Sends the
// refusal itself and returns null otherwise.
async function openChallenge(req, res, role) {
    const userId = req.user._id;
    const found = await findMine(req.params.id, userId);
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

// Starts the game: `accepter` takes seat 0 and moves first. For points,
// both stakes are taken now and held in the game until it ends; if either
// of them has less than the stake by now, it drops to what they have. A
// refusal comes back as { status, error }; the started game as { game }.
async function startGame(match, accepter, extra = {}) {
    const other = match.offer.by;
    let stake = match.stake;
    if (stake > 0) {
        const [mine, theirs] = await Promise.all([pointsOf(accepter), pointsOf(other)]);
        stake = Math.min(match.stake, mine, theirs);
        if (stake < 1) return { status: 400, error: mine < 1 ? "You have no points to put up right now." : "They have no points to put up right now." };
    }

    // Claimed first, as "starting", so nobody can answer or take it back
    // while the stakes are being taken.
    const claimed = await GomokuMatch.findOneAndUpdate(
        { _id: match._id, version: match.version, status: "challenge" },
        { $set: { status: "starting", stake, prize: prizeFor(stake), players: [{ user: accepter }, { user: other }], ...extra }, $inc: { version: 1 } },
        { returnDocument: "after" }
    ).lean();
    if (!claimed) return { status: 409, error: "The challenge changed. Here it is now." };

    const paid = [];
    if (stake > 0) {
        try {
            paid.push(await spend(accepter, stake, { reason: "gomokuBet", gomoku: match._id }));
            paid.push(await spend(other, stake, { reason: "gomokuBet", gomoku: match._id }));
        } catch (error) {
            if (paid.length) {
                await changeWallet(accepter, () => ({ pp: 0 - paid[0].pp, ppp: 0 - paid[0].ppp }), { reason: "gomokuRefund", gomoku: match._id });
            }
            await GomokuMatch.updateOne(
                { _id: match._id, status: "starting" },
                { $set: { status: "challenge", stake: match.stake, prize: match.prize, players: match.players }, $inc: { version: 1 } }
            );
            if (error instanceof WalletError) {
                return { status: 409, error: paid.length ? "Their points changed just now, so the game couldn't start. Try again." : error.message };
            }
            throw error;
        }
    }

    const back = (i) => ({ pp: paid[i] ? 0 - paid[i].pp : 0, ppp: paid[i] ? 0 - paid[i].ppp : 0 });
    const game = { size: claimed.size, moves: [], current: 0, status: "active", winner: null, winLine: [], endedBy: null };
    const saved = await saveGame(claimed, game, {
        "players.0.paid": back(0),
        "players.1.paid": back(1),
        lastMoveAt: new Date(),
        expiresAt: null,
    });
    if (!saved) throw new Error(`Gomoku game ${match._id} changed while it was starting`);
    return { game: saved };
}

async function acceptChallenge(req, res) {
    const match = await openChallenge(req, res, "to");
    if (!match) return;

    const me = req.user._id;
    const started = await startGame(match, me);
    if (started.error) {
        if (started.status === 409 && started.error.startsWith("The challenge changed")) {
            return refuseStale(res, await GomokuMatch.findById(match._id).lean(), me, started.error);
        }
        return res.status(started.status).json({ error: started.error });
    }

    await noteGomokuAnswer(started.game, "gomokuAccepted", match.offer.by, me);
    res.json(await matchView(started.game, me, { full: true }));
}

async function declineChallenge(req, res) {
    const match = await openChallenge(req, res, "to");
    if (!match) return;

    const closed = await closeChallenge(match, "declined");
    if (!closed) return refuseStale(res, await GomokuMatch.findById(match._id).lean(), req.user._id, "The challenge changed. Here it is now.");

    await noteGomokuAnswer(closed, "gomokuDeclined", closed.offer.by, req.user._id);
    res.json(await matchView(closed, req.user._id, { full: true }));
}

// New terms back, { size, stake }: the other player now has three days to
// accept, decline or counter again. As many times as they like.
async function counterChallenge(req, res) {
    const match = await openChallenge(req, res, "to");
    if (!match) return;

    const me = req.user._id;
    const other = match.offer.by;
    const terms = termsFrom(req.body);
    if (terms.size === match.size && terms.stake === match.stake) {
        return res.status(400).json({ error: "Those are the terms on the table already: accept them instead." });
    }
    const problem = await termsProblem(terms, me, other);
    if (problem) return res.status(400).json({ error: problem });

    const now = new Date();
    const saved = await GomokuMatch.findOneAndUpdate(
        { _id: match._id, version: match.version, status: "challenge" },
        {
            $set: {
                size: terms.size,
                stake: terms.stake,
                prize: prizeFor(terms.stake),
                offer: { by: me, to: other, at: now },
                expiresAt: new Date(now.getTime() + CHALLENGE_LIMIT_MS),
            },
            $inc: { version: 1, counters: 1 },
        },
        { returnDocument: "after" }
    ).lean();
    if (!saved) return refuseStale(res, await GomokuMatch.findById(match._id).lean(), me, "The challenge changed. Here it is now.");

    await noteGomokuChallenge(saved);
    res.json(await matchView(saved, me, { full: true }));
}

async function withdrawChallenge(req, res) {
    const match = await openChallenge(req, res, "by");
    if (!match) return;

    const closed = await closeChallenge(match, "withdrawn");
    if (!closed) return refuseStale(res, await GomokuMatch.findById(match._id).lean(), req.user._id, "The challenge changed. Here it is now.");

    await noteGomokuAnswer(closed);
    res.json(await matchView(closed, req.user._id, { full: true }));
}

// ---- The game ----

async function getMatch(req, res) {
    const found = await findMine(req.params.id, req.user._id);
    if (!found) return res.status(404).json({ error: "Game not found." });
    res.json(await matchView(await catchUp(found), req.user._id, { full: true }));
}

// A move, { version, type: "place", x, y } or { version, type: "resign" }.
// `version` is the game version the page made it on.
async function makeMove(req, res) {
    const me = req.user._id;
    const found = await findMine(req.params.id, me);
    if (!found) return res.status(404).json({ error: "Game not found." });

    const match = await catchUp(found);
    if (match.status !== "active") return refuseStale(res, match, me, why(match));
    if (req.body?.version !== match.version) return refuseStale(res, match, me, "The game had already moved on. Here it is now.");

    const seat = seatOf(match, me);
    let game;
    try {
        game = req.body?.type === "resign" ? resign(gameOf(match), seat) : placeStone(gameOf(match), seat, req.body?.x, req.body?.y);
    } catch (error) {
        if (error instanceof MoveError) return res.status(error.status).json({ error: error.message });
        throw error;
    }

    // They've seen their own move.
    const saved = await saveGame(match, game, { lastMoveAt: new Date(), [`players.${seat}.seen`]: game.moves.length });
    if (!saved) return refuseStale(res, await GomokuMatch.findById(match._id).lean(), me, "The game had already moved on. Here it is now.");

    if (saved.status === "over") await finishMatch(saved);
    res.json(await matchView(saved, me, { full: true }));
}

// { moves }: they've seen the game up to that many moves (the other
// player's newest stone has landed in front of them), so it won't land
// again next time. Never goes backwards.
async function markSeen(req, res) {
    const found = await findMine(req.params.id, req.user._id);
    if (!found) return res.status(404).json({ error: "Game not found." });

    const seat = seatOf(found, req.user._id);
    const upTo = Math.max(0, Math.min(Math.floor(Number(req.body?.moves) || 0), found.moves.length));
    await GomokuMatch.updateOne({ _id: found._id }, { $max: { [`players.${seat}.seen`]: upTo } }, { timestamps: false });
    res.json({ seen: Math.max(upTo, found.players[seat].seen ?? 0) });
}

// ---- The shop ----

async function handleShop(res, work) {
    try {
        await work();
    } catch (error) {
        if (!(error instanceof shop.GomokuShopError) && !(error instanceof WalletError)) throw error;
        res.status(error.status).json({ error: error.message });
    }
}

const getShop = (req, res) => handleShop(res, async () => res.json(await shop.shopView(req.user._id)));

const buyItem = (req, res) =>
    handleShop(res, async () => {
        const done = await shop.buyItem(req.user._id, req.body?.itemId);
        res.status(201).json({ done, view: await shop.shopView(req.user._id) });
    });

const equipItem = (req, res) =>
    handleShop(res, async () => {
        const done = await shop.equipItem(req.user._id, req.body?.kind, req.body?.itemId ?? null);
        res.json({ done, view: await shop.shopView(req.user._id) });
    });

// ---- Developer tools (middleware/devTools.js: your own computer only) ----

const devStatus = (req, res) => res.json({ on: true });

// A game For Fun the developer is in, or a refusal. Games for points are
// left alone, even here.
async function devGame(req, res, status) {
    const found = await findMine(req.params.id, req.user._id);
    if (!found) {
        res.status(404).json({ error: "Game not found." });
        return null;
    }
    const match = await catchUp(found);
    if (match.stake > 0) {
        res.status(403).json({ error: "The developer tools only touch games For Fun, never games for points." });
        return null;
    }
    if (match.status !== status) {
        res.status(409).json({ error: status === "challenge" ? "That's not a challenge waiting on them." : "That game isn't being played." });
        return null;
    }
    return match;
}

// Accepts your own For Fun challenge as the member you sent it to: the
// game starts, with them moving first.
async function devAccept(req, res) {
    const match = await devGame(req, res, "challenge");
    if (!match) return;
    if (String(match.offer.by) !== String(req.user._id)) return res.status(409).json({ error: "It's waiting on you: answer it yourself." });

    const started = await startGame(match, match.offer.to, { devPlayed: true });
    if (started.error) return res.status(started.status).json({ error: started.error });
    await noteGomokuAnswer(started.game, "gomokuAccepted", req.user._id, match.offer.to);
    res.json(await matchView(started.game, req.user._id, { full: true }));
}

// A point for the other player's stone: (x, y) if it's free, else a random
// empty point next to a stone already down (the middle on an empty board).
function devPoint(match, x, y) {
    const board = boardOf(match.size, match.moves);
    const free = (px, py) => isOnBoard(match.size, px, py) && board[pointIndex(match.size, px, py)] === null;
    if (free(x, y)) return [x, y];
    if (match.moves.length === 0) return [(match.size - 1) / 2, (match.size - 1) / 2];

    const near = new Map();
    for (const move of match.moves) {
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                if (free(move.x + dx, move.y + dy)) near.set(`${move.x + dx},${move.y + dy}`, [move.x + dx, move.y + dy]);
            }
        }
    }
    const options = near.size ? [...near.values()] : board.flatMap((point, i) => (point === null ? [[i % match.size, Math.floor(i / match.size)]] : []));
    return options[crypto.randomInt(options.length)];
}

// Plays the other player's turn in your For Fun game, { x, y } or anywhere
// sensible, so a game can be tried out alone.
async function devTheirMove(req, res) {
    const match = await devGame(req, res, "active");
    if (!match) return;
    const mySeat = seatOf(match, req.user._id);
    if (match.current === mySeat) return res.status(409).json({ error: "It's your turn: play it on the board." });

    const [x, y] = devPoint(match, req.body?.x, req.body?.y);
    const game = placeStone(gameOf(match), 1 - mySeat, x, y);
    const saved = await saveGame(match, game, { lastMoveAt: new Date(), devPlayed: true });
    if (!saved) return refuseStale(res, await GomokuMatch.findById(match._id).lean(), req.user._id, "The game had already moved on. Here it is now.");

    if (saved.status === "over") await finishMatch(saved);
    res.json(await matchView(saved, req.user._id, { full: true }));
}

// Forgets that you saw the newest stone, so it lands again next time you
// open the game (as for a player who wasn't there when it was played).
async function devUnsee(req, res) {
    const found = await findMine(req.params.id, req.user._id);
    if (!found) return res.status(404).json({ error: "Game not found." });
    const seat = seatOf(found, req.user._id);
    const seen = Math.max(0, found.moves.length - 1);
    await GomokuMatch.updateOne({ _id: found._id }, { $set: { [`players.${seat}.seen`]: seen } }, { timestamps: false });
    res.json({ seen });
}

// Everything you bought in the shop goes, and its points come back.
const devRefundShop = (req, res) =>
    handleShop(res, async () => {
        const done = await shop.refundShop(req.user._id);
        res.json({ done, view: await shop.shopView(req.user._id), message: `${done.items} item${done.items === 1 ? "" : "s"} gone; ${formatPoints(done.pp)} PP and ${formatPoints(done.ppp)} P-PP back.` });
    });

module.exports = {
    getLobby,
    getStakeLimit,
    getFriends,
    createChallenge,
    acceptChallenge,
    declineChallenge,
    counterChallenge,
    withdrawChallenge,
    getMatch,
    makeMove,
    markSeen,
    getShop,
    buyItem,
    equipItem,
    devStatus,
    devAccept,
    devTheirMove,
    devUnsee,
    devRefundShop,
};
