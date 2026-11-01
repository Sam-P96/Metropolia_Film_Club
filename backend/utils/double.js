const crypto = require("crypto");
const mongoose = require("mongoose");
const DoublePot = require("../models/doublePotModel");
const DoubleGame = require("../models/doubleGameModel");
const DoubleReset = require("../models/doubleResetModel");
const User = require("../models/userModel");
const Review = require("../models/reviewModel");
const WalletTx = require("../models/walletTxModel");
const Notification = require("../models/notificationModel");
const { DOUBLE } = require("../../shared/double/config.js");
const {
    THROWS,
    WIN,
    BAN,
    WAIT,
    DoubleError,
    roundResult,
    houseThrow,
    outcomeOf,
    seedFrom,
    resetSplit,
    bonusEligible,
    lastResetAt,
    nextResetAt,
    activeSince,
} = require("../games/double/engine");
const { spend, credit } = require("./wallet");
const { noteDoubleResult } = require("./notify");

// Double or Nothing, saved and paid out. The rules are in
// games/double/engine.js and the numbers in shared/double/config.js.
//
// One pot for the whole site (models/doublePotModel.js). Starting a game
// and playing a round each run as one MongoDB transaction: the Monday reset
// if one is due, finishing a game whose player ran out of time, the checks,
// the wallet, the game and the pot all happen together or not at all. So a
// crash halfway can't take a bet without starting the game, or pay a win
// without resetting the pot. Transactions need MongoDB running as a replica
// set (see the README).

const POT_ID = "current";
const FEED_SIZE = 10;
const ROUND_MS = DOUBLE.roundSeconds * 1000;

// Where the random numbers come from: crypto.randomInt, which can't be
// predicted. Only the tests swap it, to make the house throw what they need.
let randomInt = crypto.randomInt;
function useRandomSource(source) {
    randomInt = source ?? crypto.randomInt;
}

const same = (a, b) => a != null && b != null && String(a) === String(b);
const onList = (list, id) => list.some((entry) => same(entry, id));

// Runs `work(session)` as one transaction, trying it again if it clashed
// with another at the same moment. `work` can return refuse(error) to say
// no without undoing what came before it (like the Monday reset, or
// finishing a game whose time ran out); throwing undoes everything.
//
// What has to wait until it's all gone through, like telling followers how
// a game went, goes on `session.afterCommit` and runs after. The list starts
// empty on every try, so a try that clashed and ran again can't send
// anything twice, and nothing is sent for a transaction that was undone.
async function inTransaction(work) {
    const session = await mongoose.startSession();
    try {
        let result;
        await session.withTransaction(async () => {
            session.afterCommit = [];
            result = await work(session);
        });
        for (const job of session.afterCommit) {
            await job().catch((error) => console.error("Double or Nothing, after a game:", error.message));
        }
        if (result?.refused) throw result.refused;
        return result;
    } finally {
        await session.endSession();
    }
}
const refuse = (error) => ({ refused: error });

// The week's seed: the 75th percentile of what active members hold, PP and
// P-PP together. Active: posted a review in the last two months.
async function weekSeed(session, now) {
    const writers = await Review.distinct("user", { createdAt: { $gte: activeSince(now) } }).session(session);
    const members = await User.find({ _id: { $in: writers } }).select("wallet").session(session).lean();
    return seedFrom(members.map((member) => (member.wallet?.pp ?? 0) + (member.wallet?.ppp ?? 0)));
}

// Makes the pot the first time anyone opens the game, seeded for this
// week, and makes sure the collections exist (they can't be created inside
// a transaction on every MongoDB version). Two first visitors at once is
// fine: the second one's copy is refused, and it uses the first's.
let collectionsReady = null;
async function ensurePot(now = new Date()) {
    collectionsReady ??= Promise.all([DoublePot, DoubleGame, DoubleReset, WalletTx].map((model) => model.init()));
    await collectionsReady;

    if (await DoublePot.exists({ _id: POT_ID })) return;
    const seed = await weekSeed(null, now);
    try {
        await DoublePot.create({ _id: POT_ID, currentBet: seed, seed, weekStart: lastResetAt(now) });
    } catch (error) {
        if (error.code !== 11000) throw error;
    }
}

// Saves `changes` to the pot as read (`pot`), adding 1 to its version.
// Inside a transaction someone else changing it first is a clash that
// tries again, so not finding it means something's badly wrong: undo all.
async function savePot(session, pot, changes) {
    const saved = await DoublePot.findOneAndUpdate(
        { _id: POT_ID, version: pot.version },
        { $set: changes, $inc: { version: 1 } },
        { session, returnDocument: "after", lean: true }
    );
    if (!saved) throw new DoubleError("POT_CHANGED", 409, "Someone just played! Have another look.");
    return saved;
}

// The Monday reset: what's left in the pot splits between the bonus pot
// (up to its cap) and being burned, the week gets a new seed, the pot
// starts over at it, and both lists clear. Logged for the recent plays.
async function resetPot(session, pot, now) {
    const { toBonus, burned, bonusPot } = resetSplit(pot.totalLost, pot.bonusPot);
    const seed = await weekSeed(session, now);
    await DoubleReset.create([{ at: now, lost: pot.totalLost, toBonus, burned, seed }], { session });
    return savePot(session, pot, {
        seed,
        currentBet: seed,
        totalLost: 0,
        bonusPot,
        banList: [],
        waitingUserId: null,
        weekStart: lastResetAt(now),
    });
}

const resetDue = (pot, now) => lastResetAt(now) > pot.weekStart;

// One round: the player's throw, then the house's, picked only now.
function newRound(playerThrow, auto) {
    const house = houseThrow(randomInt);
    return { playerThrow, houseThrow: house, result: roundResult(playerThrow, house), auto };
}

// Ends `game` with `rounds` (which decide it). Saves the game, but only if
// it still has the rounds it was read with, so a round sent twice is only
// ever played once. Then pays a win (twice the bet, plus the bonus pot if
// the bet was big enough), and moves the pot on:
//   win   back to the week's seed, both lists cleared, the bonus pot
//         emptied if it was won
//   ban   doubled, the bet stays in it, the player onto the Ban List
//   wait  doubled, the bet stays in it, the player onto the Waiting List
// Every finished game clears the Waiting List first, so whoever was on it
// can play again. If a Monday reset came due while it was being played, it
// happens straight after. Once it's all gone through, the player's
// followers hear how it went (everyone, for a win). Returns { game, pot }.
async function finishGame(session, pot, game, rounds, now) {
    const outcome = outcomeOf(rounds.map((round) => round.result));
    let payout = 0;
    let bonusWon = 0;
    let changes;

    if (outcome === WIN) {
        payout = 2 * game.bet;
        bonusWon = bonusEligible(game.bet, game.seed) ? pot.bonusPot : 0;
        changes = { currentBet: pot.seed, totalLost: 0, banList: [], waitingUserId: null, ...(bonusWon > 0 && { bonusPot: 0 }) };
    } else {
        changes = {
            currentBet: pot.currentBet * 2,
            totalLost: pot.totalLost + game.bet,
            waitingUserId: outcome === WAIT ? game.userId : null,
            banList: outcome === BAN && !onList(pot.banList, game.userId) ? [...pot.banList, game.userId] : pot.banList,
        };
    }
    changes.activeGameId = null;

    const finished = await DoubleGame.findOneAndUpdate(
        { _id: game._id, status: "in_progress", rounds: { $size: game.rounds.length } },
        {
            $set: {
                rounds,
                status: "finished",
                outcome,
                payout,
                bonusWon,
                newBet: changes.currentBet,
                finishedAt: now,
            },
        },
        { session, returnDocument: "after", lean: true }
    );
    if (!finished) throw new DoubleError("ROUND_ALREADY_PLAYED", 409, "That round was already played.");

    if (payout > 0) await credit(game.userId, payout, { reason: "doubleWin", game: game._id, session });
    if (bonusWon > 0) await credit(game.userId, bonusWon, { reason: "doubleBonus", game: game._id, session });
    session.afterCommit.push(() => noteDoubleResult(finished));

    let saved = await savePot(session, pot, changes);
    if (resetDue(saved, now)) saved = await resetPot(session, saved, now);
    return { game: finished, pot: saved };
}

// Their time ran out: the server throws for them, at random, until the
// game is decided (each such round marked `auto`). The bet is never handed
// back, so closing the tab can't dodge a loss.
async function playOutForThem(session, pot, game, now) {
    const rounds = [...game.rounds];
    while (!outcomeOf(rounds.map((round) => round.result))) {
        rounds.push(newRound(THROWS[randomInt(THROWS.length)], true));
    }
    return finishGame(session, pot, game, rounds, now);
}

// Brings the pot up to date before anything else happens: finishes the
// game being played if its player ran out of time, then does the Monday
// reset if one is due. A game still being played when Monday 12:00 comes
// keeps the old week until it ends (a few minutes at most), and the reset
// follows straight after it (finishGame).
async function settle(session, now) {
    let pot = await DoublePot.findById(POT_ID).session(session).lean();

    if (pot.activeGameId) {
        const game = await DoubleGame.findById(pot.activeGameId).session(session).lean();
        if (!game || game.status !== "in_progress") {
            pot = await savePot(session, pot, { activeGameId: null });
        } else if (game.roundDeadline <= now) {
            ({ pot } = await playOutForThem(session, pot, game, now));
        }
    }

    if (!pot.activeGameId && resetDue(pot, now)) pot = await resetPot(session, pot, now);
    return pot;
}

// Whether settle has anything to do, checked without a transaction, so the
// page asking for the status every few seconds costs only a read or two.
async function needsSettling(pot, now) {
    if (pot.activeGameId) {
        const game = await DoubleGame.findById(pot.activeGameId).select("status roundDeadline").lean();
        return !game || game.status !== "in_progress" || game.roundDeadline <= now;
    }
    return resetDue(pot, now);
}

// A game as the page gets it. Nothing in it is secret: each house throw
// was only picked after the player's.
function gameView(game) {
    return {
        _id: game._id,
        bet: game.bet,
        seed: game.seed,
        rounds: game.rounds.map(({ playerThrow, houseThrow: house, result, auto }) => ({
            playerThrow,
            houseThrow: house,
            result,
            auto: Boolean(auto),
        })),
        status: game.status,
        outcome: game.outcome,
        payout: game.payout,
        bonusWon: game.bonusWon,
        newBet: game.newBet,
        roundDeadline: game.roundDeadline,
    };
}

// What someone refused at the start is told about the pot: who's playing.
async function playingNow(pot, session = null) {
    const game = await DoubleGame.findById(pot.activeGameId).select("userId").populate("userId", "username").session(session).lean();
    return { name: game?.userId?.username ?? "Someone", userId: game?.userId?._id ?? null };
}

// Starting a game at `expectedBet`, the bet the page showed them. Refused
// if they're on a list (403), if someone's playing or the bet has moved on
// (409), or if they can't cover it (400). Otherwise the bet is taken (PP
// first), the game made, and the pot locked to them, all at once. The pot
// is only locked if it's still the version read and nobody holds it, so of
// ten members pressing Start together, exactly one gets it.
async function startGame(userId, expectedBet) {
    await ensurePot();

    return inTransaction(async (session) => {
        const now = new Date();
        const pot = await settle(session, now);

        if (onList(pot.banList, userId)) {
            return refuse(new DoubleError("BANNED", 403, "You're on the Ban List until someone wins the pot or Monday's reset."));
        }
        if (same(pot.waitingUserId, userId)) {
            return refuse(new DoubleError("IN_QUEUE", 403, "You're on the Waiting List until another player finishes a game."));
        }
        if (pot.activeGameId) {
            const playing = await playingNow(pot, session);
            const mine = same(playing.userId, userId);
            return refuse(
                new DoubleError("POT_IN_USE", 409, mine ? "You already have a game going." : `${playing.name} is playing…`, {
                    playing: playing.name,
                    mine,
                })
            );
        }
        if (expectedBet !== pot.currentBet) {
            return refuse(
                new DoubleError("POT_CHANGED", 409, `Someone just played! The bet is now ${pot.currentBet}.`, { currentBet: pot.currentBet })
            );
        }

        const user = await User.findById(userId).select("wallet").session(session).lean();
        const total = (user?.wallet?.pp ?? 0) + (user?.wallet?.ppp ?? 0);
        if (total < pot.currentBet) {
            return refuse(
                new DoubleError("NOT_ENOUGH_POINTS", 400, `The bet is ${pot.currentBet} points, and you have ${total}.`, {
                    currentBet: pot.currentBet,
                })
            );
        }

        const [game] = await DoubleGame.create(
            [{ userId, bet: pot.currentBet, seed: pot.seed, roundDeadline: new Date(now.getTime() + ROUND_MS) }],
            { session }
        );
        const locked = await DoublePot.updateOne(
            { _id: POT_ID, version: pot.version, activeGameId: null },
            { $set: { activeGameId: game._id }, $inc: { version: 1 } },
            { session }
        );
        if (locked.matchedCount === 0) throw new DoubleError("POT_CHANGED", 409, "Someone just played! Have another look.");

        await spend(userId, game.bet, { reason: "doubleBet", game: game._id, session });

        return { gameId: game._id, bet: game.bet, roundDeadline: game.roundDeadline, game: gameView(game), serverNow: now };
    });
}

// One round of their game: their throw ("rock", "paper" or "scissors"), for
// round `roundNumber` (1 to 3) if the page says which. Refused if the game
// isn't theirs (404), or if that round has already been played or the game
// is over (409, with the game as it is). If their time had already run
// out, the server has thrown for them instead: 409, with how it ended.
// Otherwise answers with the round, every round so far, and once the game
// is decided, how it ended.
async function playRound(userId, gameId, playerThrow, roundNumber) {
    if (!THROWS.includes(playerThrow)) {
        throw new DoubleError("INVALID_THROW", 400, "Throw rock, paper or scissors.");
    }
    if (!mongoose.isValidObjectId(gameId)) throw new DoubleError("GAME_NOT_FOUND", 404, "That game doesn't exist.");

    // Which round this throw is for: as the page says, or else the next one
    // as the game stands right now, read before the transaction. Either
    // way, if the same throw arrives twice and the first one plays the
    // round, the second finds that round gone and is refused, instead of
    // playing the round after.
    const before = await DoubleGame.findById(gameId).select("userId rounds").lean();
    if (!before || !same(before.userId, userId)) throw new DoubleError("GAME_NOT_FOUND", 404, "That game doesn't exist.");
    const playedBefore = Number.isInteger(roundNumber) ? roundNumber - 1 : before.rounds.length;

    await ensurePot();

    return inTransaction(async (session) => {
        const now = new Date();
        let pot = await settle(session, now);
        const game = await DoubleGame.findById(gameId).session(session).lean();
        if (!game) return refuse(new DoubleError("GAME_NOT_FOUND", 404, "That game doesn't exist."));

        if (game.status !== "in_progress") {
            const timedOut = game.rounds.some((round) => round.auto);
            return refuse(
                new DoubleError(
                    timedOut ? "TIMED_OUT" : "GAME_FINISHED",
                    409,
                    timedOut ? "Time ran out, so the server threw for you." : "That game's already over.",
                    { game: gameView(game) }
                )
            );
        }
        if (game.rounds.length !== playedBefore) {
            return refuse(new DoubleError("ROUND_ALREADY_PLAYED", 409, "That round was already played.", { game: gameView(game) }));
        }

        const rounds = [...game.rounds, newRound(playerThrow, false)];
        let saved;
        if (outcomeOf(rounds.map((round) => round.result))) {
            ({ game: saved, pot } = await finishGame(session, pot, game, rounds, now));
        } else {
            saved = await DoubleGame.findOneAndUpdate(
                { _id: game._id, status: "in_progress", rounds: { $size: game.rounds.length } },
                { $set: { rounds, roundDeadline: new Date(now.getTime() + ROUND_MS) } },
                { session, returnDocument: "after", lean: true }
            );
            if (!saved) throw new DoubleError("ROUND_ALREADY_PLAYED", 409, "That round was already played.");
        }

        const view = gameView(saved);
        return {
            round: view.rounds[view.rounds.length - 1],
            rounds: view.rounds,
            game: view,
            outcome: view.outcome,
            payout: view.payout,
            bonusWon: view.bonusWon,
            newBet: view.newBet,
            serverNow: now,
        };
    });
}

// The recent plays: the newest finished games and Monday resets together,
// newest first, each game with its player's name.
async function recentPlays() {
    const [games, resets] = await Promise.all([
        DoubleGame.find({ status: "finished" })
            .sort({ finishedAt: -1 })
            .limit(FEED_SIZE)
            .populate("userId", "username avatarUrl")
            .lean(),
        DoubleReset.find().sort({ at: -1 }).limit(FEED_SIZE).lean(),
    ]);

    return [
        ...games.map((game) => ({
            type: "game",
            _id: game._id,
            at: game.finishedAt,
            name: game.userId?.username ?? "A former member",
            avatarUrl: game.userId?.avatarUrl ?? null,
            bet: game.bet,
            results: game.rounds.map((round) => round.result),
            auto: game.rounds.some((round) => round.auto),
            outcome: game.outcome,
            payout: game.payout,
            bonusWon: game.bonusWon,
            newBet: game.newBet,
        })),
        ...resets.map((reset) => ({
            type: "reset",
            _id: reset._id,
            at: reset.at,
            lost: reset.lost,
            toBonus: reset.toBonus,
            burned: reset.burned,
            seed: reset.seed,
        })),
    ]
        .sort((a, b) => new Date(b.at) - new Date(a.at))
        .slice(0, FEED_SIZE);
}

// Everything the page shows, for `userId`: the bet and what it wins, the
// bonus pot, when the next reset is, their wallet and where they stand
// ("AVAILABLE", "IN QUEUE" or "BANNED"), who's playing if someone is, their
// own game if they're mid-game (so a refresh picks it up), and the recent
// plays. Finishes a game whose time ran out, and does a due Monday reset,
// first.
async function potStatus(userId) {
    await ensurePot();
    const now = new Date();
    let pot = await DoublePot.findById(POT_ID).lean();
    if (await needsSettling(pot, now)) pot = await inTransaction((session) => settle(session, now));

    const [user, active, recent] = await Promise.all([
        User.findById(userId).select("wallet").lean(),
        pot.activeGameId ? DoubleGame.findById(pot.activeGameId).populate("userId", "username").lean() : null,
        recentPlays(),
    ]);
    const wallet = { pp: user?.wallet?.pp ?? 0, ppp: user?.wallet?.ppp ?? 0 };
    const mine = active && same(active.userId?._id, userId);

    return {
        currentBet: pot.currentBet,
        possibleWin: 2 * pot.currentBet,
        seed: pot.seed,
        bonusPot: pot.bonusPot,
        bonusCap: DOUBLE.bonus.cap,
        bonusEligible: bonusEligible(pot.currentBet, pot.seed),
        bonusUnlocksAt: DOUBLE.bonus.betMultiple * pot.seed,
        nextResetAt: nextResetAt(now),
        roundSeconds: DOUBLE.roundSeconds,
        serverNow: now,
        wallet,
        status: onList(pot.banList, userId) ? "BANNED" : same(pot.waitingUserId, userId) ? "IN QUEUE" : "AVAILABLE",
        canAfford: wallet.pp + wallet.ppp >= pot.currentBet,
        potInUse: active && !mine ? { name: active.userId?.username ?? "Someone" } : null,
        game: mine ? gameView(active) : null,
        recent,
    };
}

// A member is leaving the club: their games go, with the notifications
// about them, and they come off both lists. A game they were in the middle
// of releases the pot (the bet was already taken, and goes with them).
async function forgetDoublePlayer(userId) {
    const games = await DoubleGame.find({ userId }).distinct("_id");
    await Notification.deleteMany({ doubleGame: { $in: games } });
    const playing = await DoubleGame.find({ userId, status: "in_progress" }).distinct("_id");
    await DoublePot.updateOne({ _id: POT_ID }, { $pull: { banList: userId }, $inc: { version: 1 } });
    await DoublePot.updateOne({ _id: POT_ID, waitingUserId: userId }, { $set: { waitingUserId: null }, $inc: { version: 1 } });
    if (playing.length > 0) {
        await DoublePot.updateOne({ _id: POT_ID, activeGameId: { $in: playing } }, { $set: { activeGameId: null }, $inc: { version: 1 } });
    }
    await DoubleGame.deleteMany({ userId });
}

// Their games, for "Download my data".
async function doubleGamesOf(userId) {
    return DoubleGame.find({ userId }).sort({ createdAt: -1 }).lean();
}

module.exports = {
    POT_ID,
    useRandomSource,
    ensurePot,
    startGame,
    playRound,
    potStatus,
    forgetDoublePlayer,
    doubleGamesOf,
};
