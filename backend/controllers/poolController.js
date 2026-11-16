const mongoose = require("mongoose");
const PoolMatch = require("../models/poolMatchModel");
const User = require("../models/userModel");
const Follow = require("../models/followModel");
const { MEMBER_FIELDS, userSummary } = require("../utils/serialize");
const { parseOffset } = require("../utils/paging");
const { WalletError, changeWallet, spend } = require("../utils/wallet");
const { notePoolAnswer, notePoolChallenge, notePoolLive } = require("../utils/notify");
const { ShotError, freshGame, resign, shoot } = require("../games/pool/engine");
const {
    CHALLENGE_LIMIT_MS,
    canWatch,
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
} = require("../utils/pool");
const bets = require("../utils/poolBets");
const shop = require("../utils/poolShop");
const { FUN, prizeFor, stakeProblem } = require("../../shared/pool/rules.js");

// 8 Ball Pool between members (routes/poolRouter.js), played like Infinite
// Gomoku's games between members: a challenge with a stake (0: For Fun),
// answered with Accept, Decline or new terms (Counter), three days to
// answer and three days a shot. Whoever accepts breaks. vs Clanker is all
// in the browser, with nothing sent here. Members who follow either player
// can watch a game being played, and bet on it (utils/poolBets.js).

// How many finished games and closed challenges the lobby lists.
const RECENT_SIZE = 10;
// How many games being played by members they follow the lobby lists.
const WATCH_SIZE = 10;

// A game `userId` is in, or can watch, or null. Games still starting don't
// count: nobody can see or shoot in those yet.
async function findVisible(id, userId) {
    if (!mongoose.isValidObjectId(id)) return null;
    const match = await PoolMatch.findOne({ _id: id, status: { $ne: "starting" } }).lean();
    if (!match) return null;
    if (seatOf(match, userId) >= 0) return match;
    return (await canWatch(match, userId)) ? match : null;
}

async function findMine(id, userId) {
    if (!mongoose.isValidObjectId(id)) return null;
    return PoolMatch.findOne({ _id: id, "players.user": userId, status: { $ne: "starting" } }).lean();
}

// A shot or answer that came too late or twice: why, and the game as it is
// now, so the page can catch up.
async function refuseStale(res, match, userId, error) {
    res.status(409).json({ error, match: match ? await matchView(match, userId, { full: true }) : null });
}

function whyNotOpen(match) {
    if (match.status === "expired") return "This challenge expired: three days went by without an answer.";
    if (match.status === "declined") return "This challenge was turned down.";
    if (match.status === "withdrawn") return "This challenge was taken back.";
    return "This challenge was already accepted.";
}

// The stake from a request: missing is For Fun.
const stakeFrom = (body) => (body?.stake === undefined || body?.stake === null ? FUN : Number(body.stake));

// What's wrong with a stake between `me` and `them`, or null.
async function stakeProblemFor(stake, me, them) {
    if (stake === FUN) return null;
    const max = Math.min(await pointsOf(me), await pointsOf(them));
    return stakeProblem(stake, max) || null;
}

const why = (match) =>
    match.status === "over"
        ? match.endedBy === "forfeit" ? "Time ran out: three days went by without a shot." : "This game is over."
        : "This game hasn't started.";

// ---- The lobby ----

// Challenges waiting on them and sent by them, games being played (theirs
// to shoot first), games being played by members they follow (to watch
// and bet on), and the last few finished games and closed challenges.
async function getLobby(req, res) {
    const me = req.user._id;

    const found = await PoolMatch.find({ "players.user": me, status: { $in: ["challenge", "active"] } }).lean();
    const open = [];
    for (const match of found) open.push(await catchUp(match));

    const recent = await PoolMatch.find({ "players.user": me, status: { $in: ["over", "declined", "expired", "withdrawn"] } })
        .sort({ endedAt: -1 })
        .limit(RECENT_SIZE)
        .lean();

    const following = await Follow.find({ follower: me }).distinct("following");
    const watchable = following.length
        ? await PoolMatch.find({ status: "active", "players.user": { $in: following, $ne: me } }).sort({ lastMoveAt: -1 }).limit(WATCH_SIZE).lean()
        : [];

    const views = await matchViews([...open, ...recent, ...watchable], me);
    const still = views.slice(0, open.length);
    const myTurnFirst = (a, b) => Number(b.current === b.mySeat) - Number(a.current === a.mySeat) || new Date(b.lastMoveAt) - new Date(a.lastMoveAt);

    res.json({
        incoming: still.filter((view) => view.status === "challenge" && view.myAnswer),
        outgoing: still.filter((view) => view.status === "challenge" && !view.myAnswer),
        games: still.filter((view) => view.status === "active").sort(myTurnFirst),
        recent: views.slice(open.length, open.length + recent.length),
        watch: views.slice(open.length + recent.length),
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
// two of them already have going (`match`), or null.
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
        PoolMatch.find({ pairKey: { $in: page.map((row) => pairKeyOf(me, row._id)) } }).select("status pairKey").lean(),
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

// A challenge, { opponent, stake }: stake 0 (or none) is For Fun. Nothing
// is taken from anyone until it's accepted.
async function createChallenge(req, res) {
    const me = req.user._id;
    const opponentId = req.body?.opponent;
    if (!mongoose.isValidObjectId(opponentId) || String(opponentId) === String(me)) {
        return res.status(400).json({ error: "Pick another member to challenge." });
    }

    const opponent = await User.findById(opponentId).select("username").lean();
    if (!opponent) return res.status(404).json({ error: "Member not found." });

    const stake = stakeFrom(req.body);
    const problem = await stakeProblemFor(stake, me, opponent._id);
    if (problem) return res.status(400).json({ error: problem });

    const now = new Date();
    let match;
    try {
        match = await PoolMatch.create({
            status: "challenge",
            players: [{ user: me }, { user: opponent._id }],
            stake,
            prize: prizeFor(stake),
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

    await notePoolChallenge(match);
    res.status(201).json(await matchView(match.toObject(), me, { full: true }));
}

// The challenge in the URL, if it's still open and `req.user` is the one
// to act on it: `role` "to" to answer it, "by" to take it back.
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

// Starts the game: `accepter` takes seat 0 and breaks. For points, both
// stakes are taken now and held in the game until it ends; if either of
// them has less than the stake by now, it drops to what they have.
async function startGame(match, accepter) {
    const other = match.offer.by;
    let stake = match.stake;
    if (stake > 0) {
        const [mine, theirs] = await Promise.all([pointsOf(accepter), pointsOf(other)]);
        stake = Math.min(match.stake, mine, theirs);
        if (stake < 1) return { status: 400, error: mine < 1 ? "You have no points to put up right now." : "They have no points to put up right now." };
    }

    const claimed = await PoolMatch.findOneAndUpdate(
        { _id: match._id, version: match.version, status: "challenge" },
        { $set: { status: "starting", stake, prize: prizeFor(stake), players: [{ user: accepter }, { user: other }] }, $inc: { version: 1 } },
        { returnDocument: "after" }
    ).lean();
    if (!claimed) return { status: 409, error: "The challenge changed. Here it is now." };

    const paid = [];
    if (stake > 0) {
        try {
            paid.push(await spend(accepter, stake, { reason: "poolBet", pool: match._id }));
            paid.push(await spend(other, stake, { reason: "poolBet", pool: match._id }));
        } catch (error) {
            if (paid.length) {
                await changeWallet(accepter, () => ({ pp: 0 - paid[0].pp, ppp: 0 - paid[0].ppp }), { reason: "poolRefund", pool: match._id });
            }
            await PoolMatch.updateOne(
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
    const saved = await saveGame(claimed, freshGame(), {
        "players.0.paid": back(0),
        "players.1.paid": back(1),
        lastMoveAt: new Date(),
        expiresAt: null,
    });
    if (!saved) throw new Error(`Pool game ${match._id} changed while it was starting`);
    return { game: saved };
}

async function acceptChallenge(req, res) {
    const match = await openChallenge(req, res, "to");
    if (!match) return;

    const me = req.user._id;
    const started = await startGame(match, me);
    if (started.error) {
        if (started.status === 409 && started.error.startsWith("The challenge changed")) {
            return refuseStale(res, await PoolMatch.findById(match._id).lean(), me, started.error);
        }
        return res.status(started.status).json({ error: started.error });
    }

    await notePoolAnswer(started.game, "poolAccepted", match.offer.by, me);
    await notePoolLive(started.game);
    res.json(await matchView(started.game, me, { full: true }));
}

async function declineChallenge(req, res) {
    const match = await openChallenge(req, res, "to");
    if (!match) return;

    const closed = await closeChallenge(match, "declined");
    if (!closed) return refuseStale(res, await PoolMatch.findById(match._id).lean(), req.user._id, "The challenge changed. Here it is now.");

    await notePoolAnswer(closed, "poolDeclined", closed.offer.by, req.user._id);
    res.json(await matchView(closed, req.user._id, { full: true }));
}

// New terms back, { stake }: the other player now has three days to
// accept, decline or counter again.
async function counterChallenge(req, res) {
    const match = await openChallenge(req, res, "to");
    if (!match) return;

    const me = req.user._id;
    const other = match.offer.by;
    const stake = stakeFrom(req.body);
    if (stake === match.stake) return res.status(400).json({ error: "Those are the terms on the table already: accept them instead." });
    const problem = await stakeProblemFor(stake, me, other);
    if (problem) return res.status(400).json({ error: problem });

    const now = new Date();
    const saved = await PoolMatch.findOneAndUpdate(
        { _id: match._id, version: match.version, status: "challenge" },
        {
            $set: { stake, prize: prizeFor(stake), offer: { by: me, to: other, at: now }, expiresAt: new Date(now.getTime() + CHALLENGE_LIMIT_MS) },
            $inc: { version: 1, counters: 1 },
        },
        { returnDocument: "after" }
    ).lean();
    if (!saved) return refuseStale(res, await PoolMatch.findById(match._id).lean(), me, "The challenge changed. Here it is now.");

    await notePoolChallenge(saved);
    res.json(await matchView(saved, me, { full: true }));
}

async function withdrawChallenge(req, res) {
    const match = await openChallenge(req, res, "by");
    if (!match) return;

    const closed = await closeChallenge(match, "withdrawn");
    if (!closed) return refuseStale(res, await PoolMatch.findById(match._id).lean(), req.user._id, "The challenge changed. Here it is now.");

    await notePoolAnswer(closed);
    res.json(await matchView(closed, req.user._id, { full: true }));
}

// ---- The game ----

async function getMatch(req, res) {
    const found = await findVisible(req.params.id, req.user._id);
    if (!found) return res.status(404).json({ error: "Game not found." });
    res.json(await matchView(await catchUp(found), req.user._id, { full: true }));
}

// A shot, { version, type: "shot", angle, power, cue } or { version, type:
// "resign" }. `version` is the game version the page made it on.
async function makeShot(req, res) {
    const me = req.user._id;
    const found = await findMine(req.params.id, me);
    if (!found) return res.status(404).json({ error: "Game not found." });

    const match = await catchUp(found);
    if (match.status !== "active") return refuseStale(res, match, me, why(match));
    if (req.body?.version !== match.version) return refuseStale(res, match, me, "The game had already moved on. Here it is now.");

    const seat = seatOf(match, me);
    let game;
    try {
        game = req.body?.type === "resign" ? resign(gameOf(match), seat) : shoot(gameOf(match), seat, req.body ?? {});
    } catch (error) {
        if (error instanceof ShotError) return res.status(error.status).json({ error: error.message });
        throw error;
    }

    // They've seen their own shot.
    const saved = await saveGame(match, game, { lastMoveAt: new Date(), [`players.${seat}.seen`]: game.shots });
    if (!saved) return refuseStale(res, await PoolMatch.findById(match._id).lean(), me, "The game had already moved on. Here it is now.");

    if (saved.status === "over") await finishMatch(saved);
    res.json(await matchView(saved, me, { full: true }));
}

// { shots }: they've seen the game up to that many shots, so the newest
// won't be played in front of them again. Never goes backwards.
async function markSeen(req, res) {
    const found = await findMine(req.params.id, req.user._id);
    if (!found) return res.status(404).json({ error: "Game not found." });

    const seat = seatOf(found, req.user._id);
    const upTo = Math.max(0, Math.min(Math.floor(Number(req.body?.shots) || 0), found.shots ?? 0));
    await PoolMatch.updateOne({ _id: found._id }, { $max: { [`players.${seat}.seen`]: upTo } }, { timestamps: false });
    res.json({ seen: Math.max(upTo, found.players[seat].seen ?? 0) });
}

// ---- The crowd's bets ----

async function handleBet(res, work) {
    try {
        await work();
    } catch (error) {
        if (!(error instanceof bets.BetError)) throw error;
        res.status(error.status).json({ error: error.message });
    }
}

// The bets on a game: { bets, canBet, maxBet }.
async function getBets(req, res) {
    const me = req.user._id;
    const found = await findVisible(req.params.id, me);
    if (!found) return res.status(404).json({ error: "Game not found." });
    res.json({
        bets: await bets.betViews(found._id, me),
        canBet: found.status === "active" && seatOf(found, me) < 0,
        maxBet: bets.MAX_BET,
    });
}

const betsAnswer = async (res, matchId, me, status = 200) => {
    const found = await PoolMatch.findById(matchId).lean();
    res.status(status).json({ bets: await bets.betViews(matchId, me), canBet: found?.status === "active" && seatOf(found, me) < 0, maxBet: bets.MAX_BET });
};

// { side, amount }: a bet on the player in seat `side`.
const placeBet = (req, res) =>
    handleBet(res, async () => {
        const me = req.user._id;
        const found = await findVisible(req.params.id, me);
        if (!found) return res.status(404).json({ error: "Game not found." });
        await bets.placeBet(found, me, Number(req.body?.side), Number(req.body?.amount));
        await betsAnswer(res, found._id, me, 201);
    });

const takeBet = (req, res) =>
    handleBet(res, async () => {
        const bet = await bets.takeBet(req.params.betId, req.user._id);
        await betsAnswer(res, bet.match, req.user._id);
    });

const withdrawBet = (req, res) =>
    handleBet(res, async () => {
        const bet = await bets.withdrawBet(req.params.betId, req.user._id);
        await betsAnswer(res, bet.match, req.user._id);
    });

// ---- The shop: cues and Ignitions ----

async function handleShop(res, work) {
    try {
        await work();
    } catch (error) {
        if (!(error instanceof shop.PoolShopError)) throw error;
        res.status(error.status).json({ error: error.message });
    }
}

// { pp, ppp, points, owned, cue, ignition }.
const getShop = (req, res) => handleShop(res, async () => res.json(await shop.shopView(req.user._id)));

// { itemId }: buys a cue or an Ignition. Answers { done, view }.
const buyItem = (req, res) =>
    handleShop(res, async () => {
        const done = await shop.buyItem(req.user._id, req.body?.itemId);
        res.status(201).json({ done, view: await shop.shopView(req.user._id) });
    });

// { kind, itemId }: the cue or Ignition to use (null: the free one).
// Answers { view }.
const equipItem = (req, res) =>
    handleShop(res, async () => {
        await shop.equipItem(req.user._id, req.body?.kind, req.body?.itemId ?? null);
        res.json({ view: await shop.shopView(req.user._id) });
    });

module.exports = {
    getShop,
    buyItem,
    equipItem,
    getLobby,
    getStakeLimit,
    getFriends,
    createChallenge,
    acceptChallenge,
    declineChallenge,
    counterChallenge,
    withdrawChallenge,
    getMatch,
    makeShot,
    markSeen,
    getBets,
    placeBet,
    takeBet,
    withdrawBet,
};
