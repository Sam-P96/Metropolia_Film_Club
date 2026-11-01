// Double or Nothing tests: the game logic on its own, and the routes against
// a real MongoDB, including requests racing each other, running out of
// time, the bonus pot and the Monday reset.
//
// From backend/, with a MongoDB running as a replica set (transactions need
// one; see the README):
//   PowerShell:  $env:MONGO_TEST_URI="mongodb://127.0.0.1:27017/kino_test?replicaSet=rs0"; npm test
//   bash:        MONGO_TEST_URI="mongodb://127.0.0.1:27017/kino_test?replicaSet=rs0" npm test
// The database is wiped first, so its name has to end in "_test". Without
// MONGO_TEST_URI only the game logic tests run.
const { test, describe, before, after } = require("node:test");
const assert = require("node:assert/strict");

process.env.SECRET ??= "double-test-secret";
const mongoose = require("mongoose");
const express = require("express");
const jwt = require("jsonwebtoken");

const { DOUBLE } = require("../../shared/double/config.js");
const engine = require("../games/double/engine");

describe("the game logic", () => {
    test("all 9 throws against the house", () => {
        const expected = {
            "rock rock": "draw",
            "rock paper": "loss",
            "rock scissors": "win",
            "paper rock": "win",
            "paper paper": "draw",
            "paper scissors": "loss",
            "scissors rock": "loss",
            "scissors paper": "win",
            "scissors scissors": "draw",
        };
        for (const [pair, result] of Object.entries(expected)) {
            const [player, house] = pair.split(" ");
            assert.equal(engine.roundResult(player, house), result, pair);
        }
    });

    const letters = { W: "win", D: "draw", L: "loss" };
    const outcome = (sequence) => engine.outcomeOf([...sequence].map((letter) => letters[letter]));

    for (const sequence of ["WW", "WDW", "DWW"]) {
        test(`${sequence.split("").join(" ")} wins`, () => assert.equal(outcome(sequence), engine.WIN));
    }
    for (const sequence of ["DD", "WDD", "DWD"]) {
        test(`${sequence.split("").join(" ")} is the Waiting List`, () => assert.equal(outcome(sequence), engine.WAIT));
    }
    for (const sequence of ["L", "WL", "DL", "WDL", "DWL"]) {
        test(`${sequence.split("").join(" ")} is the Ban List`, () => assert.equal(outcome(sequence), engine.BAN));
    }
    test("undecided until it is", () => {
        for (const sequence of ["", "W", "D", "WD", "DW"]) assert.equal(outcome(sequence), null, sequence);
    });

    test("over all 27 equally likely 3-round sequences: never past 3 rounds, and 5/27 win, 5/27 wait, 17/27 ban", () => {
        const tally = { win: 0, wait: 0, ban: 0 };
        for (const a of "WDL") {
            for (const b of "WDL") {
                for (const c of "WDL") {
                    // Play rounds only until the game is decided.
                    const played = [];
                    let result = null;
                    for (const round of [a, b, c]) {
                        played.push(round);
                        result = outcome(played.join(""));
                        if (result) break;
                    }
                    assert.ok(result, `${a}${b}${c} is decided within 3 rounds`);
                    assert.ok(played.length <= DOUBLE.rounds);
                    tally[result] += 1;
                }
            }
        }
        assert.deepEqual(tally, { win: 5, wait: 5, ban: 17 });
    });

    test("the seed: the 75th percentile of the 12 wallet totals, interpolated, is 140", () => {
        assert.equal(engine.seedFrom([10, 15, 20, 25, 30, 40, 60, 80, 120, 200, 350, 900]), 140);
        // The order they come in doesn't matter.
        assert.equal(engine.seedFrom([900, 10, 350, 15, 200, 20, 120, 25, 80, 30, 60, 40]), 140);
    });

    test("the seed is kept between 20 and 500, and nobody active gives 20", () => {
        assert.equal(engine.seedFrom([1, 2, 3, 5, 8]), DOUBLE.seed.min);
        assert.equal(engine.seedFrom([5000, 9000, 20000]), DOUBLE.seed.max);
        assert.equal(engine.seedFrom([]), DOUBLE.seed.min);
        assert.equal(engine.seedFrom([137.4]), 137);
    });

    test("the reset: bets of 160 + 320 + 640 with 960 in the bonus pot: 560 in (1 520), 560 burned", () => {
        assert.deepEqual(engine.resetSplit(160 + 320 + 640, 960), { toBonus: 560, burned: 560, bonusPot: 1520 });
    });

    test("the reset: the bonus pot never goes past 3 000, the overflow is burned", () => {
        assert.deepEqual(engine.resetSplit(1120, 2800), { toBonus: 200, burned: 920, bonusPot: 3000 });
        assert.deepEqual(engine.resetSplit(1120, 3000), { toBonus: 0, burned: 1120, bonusPot: 3000 });
        // An odd point burns rather than being split.
        assert.deepEqual(engine.resetSplit(225, 0), { toBonus: 112, burned: 113, bonusPot: 112 });
    });

    test("the bonus pot comes with a win when the bet is at least 4x the seed", () => {
        assert.equal(engine.bonusEligible(80, 20), true);
        assert.equal(engine.bonusEligible(79, 20), false);
    });

    test("resets are Monday 12:00 in Helsinki, summer time and winter time", () => {
        // Summer (UTC+3): Monday 12:00 there is 09:00 UTC.
        assert.equal(engine.lastResetAt(new Date("2026-07-15T12:00:00Z")).toISOString(), "2026-07-13T09:00:00.000Z");
        // Winter (UTC+2): 10:00 UTC.
        assert.equal(engine.lastResetAt(new Date("2026-11-04T12:00:00Z")).toISOString(), "2026-11-02T10:00:00.000Z");
        // A minute before Monday 12:00 still belongs to last week.
        assert.equal(engine.lastResetAt(new Date("2026-11-02T09:59:00Z")).toISOString(), "2026-10-26T10:00:00.000Z");
        assert.equal(engine.lastResetAt(new Date("2026-11-02T10:00:00Z")).toISOString(), "2026-11-02T10:00:00.000Z");
        // The week the clocks go back (25 October 2026): the next Monday is in winter time.
        assert.equal(engine.nextResetAt(new Date("2026-10-21T12:00:00Z")).toISOString(), "2026-10-26T10:00:00.000Z");
    });
});

const uri = process.env.MONGO_TEST_URI;
const dbName = uri ? new URL(uri).pathname.slice(1) : "";

describe("the Double or Nothing routes", { skip: !uri ? "set MONGO_TEST_URI to run these" : !dbName.endsWith("_test") ? "MONGO_TEST_URI's database must end in _test" : false }, () => {
    let base;
    let server;
    let replicaSet = false;
    let User;
    let Review;
    let DoublePot;
    let DoubleGame;
    let DoubleReset;
    let WalletTx;
    let Notification;
    let Follow;
    let double;
    const tokens = new Map();

    before(async () => {
        await mongoose.connect(uri);
        await mongoose.connection.dropDatabase();
        replicaSet = Boolean((await mongoose.connection.db.admin().command({ hello: 1 })).setName);
        User = require("../models/userModel");
        Review = require("../models/reviewModel");
        DoublePot = require("../models/doublePotModel");
        DoubleGame = require("../models/doubleGameModel");
        DoubleReset = require("../models/doubleResetModel");
        WalletTx = require("../models/walletTxModel");
        Notification = require("../models/notificationModel");
        Follow = require("../models/followModel");
        double = require("../utils/double");
        await Promise.all([User, Review, DoublePot, DoubleGame, DoubleReset, WalletTx, Notification, Follow].map((model) => model.syncIndexes()));

        const app = express();
        app.use(express.json());
        app.use("/api/double-or-nothing", require("../routes/doubleRouter"));
        app.use((error, req, res, next) => {
            console.error(error);
            res.status(500).json({ error: "Something went wrong" });
        });
        server = app.listen(0);
        base = `http://127.0.0.1:${server.address().port}/api/double-or-nothing`;
    });

    after(async () => {
        double?.useRandomSource(null);
        server?.close();
        await mongoose.disconnect();
    });

    // Transactions need a replica set: on a standalone server, say so and skip.
    const routeTest = (name, fn) =>
        test(name, async (t) => {
            if (!replicaSet) return t.skip("MongoDB isn't a replica set, so it can't run transactions (see the README)");
            await fn(t);
        });

    let count = 0;
    async function member(pp = 0, ppp = 0) {
        count += 1;
        const user = await User.create({ username: `player${count}`, email: `p${count}@test.invalid`, password: "x", wallet: { pp, ppp } });
        tokens.set(String(user._id), jwt.sign({ _id: user._id }, process.env.SECRET));
        return user;
    }
    async function call(user, method, path, body) {
        const response = await fetch(base + path, {
            method,
            headers: { ...(user && { Authorization: `Bearer ${tokens.get(String(user._id))}` }), "Content-Type": "application/json" },
            body: body === undefined ? undefined : JSON.stringify(body),
        });
        return { status: response.status, body: await response.json().catch(() => null) };
    }
    const status = (user) => call(user, "GET", "/status");
    const start = (user, expectedBet) => call(user, "POST", "/start", { expectedBet });
    const throwIt = (user, gameId, hand = "rock", round) => call(user, "POST", "/round", { gameId, throw: hand, round });
    const walletOf = async (user) => {
        const { pp, ppp } = (await User.findById(user._id).select("wallet").lean()).wallet;
        return { pp, ppp };
    };
    const pot = () => DoublePot.findById("current").lean();

    // A fresh pot as a test needs it, with no games.
    async function setPot(fields = {}) {
        await DoubleGame.deleteMany({});
        await DoublePot.deleteMany({});
        await DoublePot.create({
            _id: "current",
            currentBet: 20,
            seed: 20,
            totalLost: 0,
            bonusPot: 0,
            banList: [],
            waitingUserId: null,
            activeGameId: null,
            weekStart: engine.lastResetAt(new Date()),
            version: 0,
            ...fields,
        });
    }

    // The house's next throws, as indexes into rock, paper, scissors. Against
    // the player's rock: 2 (scissors) is a win, 0 (rock) a draw, 1 (paper) a
    // loss. When an out-of-time player's rounds are thrown for them, each
    // round takes two: theirs, then the house's.
    const WIN = 2;
    const DRAW = 0;
    const LOSS = 1;
    function house(...queue) {
        double.useRandomSource(() => (queue.length > 0 ? queue.shift() : DRAW));
    }

    // Plays rounds with rock until the game is decided; returns the last answer.
    async function play(user, gameId, rounds) {
        let answer;
        for (let round = 1; round <= rounds; round++) answer = await throwIt(user, gameId, "rock", round);
        return answer;
    }

    routeTest("the first visit seeds the pot: the 75th percentile of members with a review in the last 2 months", async () => {
        await DoublePot.deleteMany({});
        const totals = [10, 15, 20, 25, 30, 40, 60, 80, 120, 200, 350, 900];
        for (const [i, total] of totals.entries()) {
            const writer = await member(Math.floor(total / 2), total - Math.floor(total / 2));
            await Review.create({ user: writer._id, tmdbId: 500 + i, filmTitle: "A Film", rating: 3, text: "Fine." });
        }
        // Not active: their only review is three months old, and the other never wrote one.
        const quiet = await member(0, 90000);
        const old = await Review.create({ user: quiet._id, tmdbId: 999, filmTitle: "Old Film", rating: 3, text: "Old." });
        await Review.collection.updateOne({ _id: old._id }, { $set: { createdAt: new Date(Date.now() - 92 * 86400000) } });
        await member(50000);

        const { status: code, body } = await status(await member());
        assert.equal(code, 200);
        assert.equal(body.seed, 140);
        assert.equal(body.currentBet, 140);
        assert.equal(body.possibleWin, 280);
        assert.equal(body.bonusUnlocksAt, 560);
        assert.equal(body.bonusEligible, false);
        assert.equal(body.bonusCap, 3000);
    });

    routeTest("status: where they stand, their wallet, whether they can afford it, and when the next reset is", async () => {
        await setPot({ currentBet: 50 });
        const user = await member(30, 25);
        const { body } = await status(user);
        assert.equal(body.status, "AVAILABLE");
        assert.deepEqual(body.wallet, { pp: 30, ppp: 25 });
        assert.equal(body.canAfford, true);
        assert.equal(body.potInUse, null);
        assert.equal(body.game, null);
        assert.equal(new Date(body.nextResetAt).toISOString(), engine.nextResetAt(new Date()).toISOString());
        assert.equal((await status(await member(10, 10))).body.canAfford, false);
    });

    routeTest("start takes the bet (PP first), makes the game and locks the pot; others see who's playing", async () => {
        await setPot({ currentBet: 150 });
        const [player, other] = [await member(100, 100), await member(500)];
        const { status: code, body } = await start(player, 150);
        assert.equal(code, 201);
        assert.equal(body.bet, 150);
        assert.ok(new Date(body.roundDeadline) > new Date());
        assert.deepEqual(await walletOf(player), { pp: 0, ppp: 50 });
        const receipt = await WalletTx.findOne({ user: player._id, reason: "doubleBet" }).lean();
        assert.deepEqual([receipt.pp, receipt.ppp, String(receipt.game)], [-100, -50, String(body.gameId)]);
        assert.equal(String((await pot()).activeGameId), String(body.gameId));

        const refused = await start(other, 150);
        assert.equal(refused.status, 409);
        assert.equal(refused.body.code, "POT_IN_USE");
        assert.equal(refused.body.playing, player.username);
        assert.deepEqual((await status(other)).body.potInUse, { name: player.username });
        // Their own page picks the game up again.
        assert.equal(String((await status(player)).body.game._id), String(body.gameId));
    });

    routeTest("the user id is never taken from the request", async () => {
        await setPot({ currentBet: 20 });
        const [player, other] = [await member(100), await member(100)];
        const { body } = await call(player, "POST", "/start", { expectedBet: 20, userId: String(other._id) });
        assert.equal(String((await DoubleGame.findById(body.gameId).lean()).userId), String(player._id));
        assert.deepEqual(await walletOf(other), { pp: 100, ppp: 0 });
    });

    routeTest("refusals: the wrong bet (409 POT_CHANGED), too few points (400), a bad throw (400), logged out (401)", async () => {
        await setPot({ currentBet: 80 });
        const changed = await start(await member(500), 40);
        assert.equal(changed.status, 409);
        assert.equal(changed.body.code, "POT_CHANGED");
        assert.equal(changed.body.currentBet, 80);

        const poor = await member(30, 40);
        const short = await start(poor, 80);
        assert.equal(short.status, 400);
        assert.equal(short.body.code, "NOT_ENOUGH_POINTS");
        assert.deepEqual(await walletOf(poor), { pp: 30, ppp: 40 });
        assert.equal(await DoubleGame.countDocuments(), 0);

        const player = await member(500);
        const { body } = await start(player, 80);
        for (const hand of ["lizard", "", null, 2, "ROCK"]) {
            const bad = await throwIt(player, body.gameId, hand);
            assert.equal(bad.status, 400);
            assert.equal(bad.body.code, "INVALID_THROW");
        }
        assert.equal((await throwIt(await member(), body.gameId)).status, 404);
        assert.equal((await call(null, "GET", "/status")).status, 401);
    });

    routeTest("10 members pressing Start at once: exactly one gets the pot, and only they pay", async () => {
        await setPot({ currentBet: 40 });
        const players = [];
        for (let i = 0; i < 10; i++) players.push(await member(100));
        const answers = await Promise.all(players.map((player) => start(player, 40)));

        assert.equal(answers.filter((answer) => answer.status === 201).length, 1);
        for (const answer of answers.filter((a) => a.status !== 201)) {
            assert.equal(answer.status, 409);
            assert.ok(["POT_CHANGED", "POT_IN_USE"].includes(answer.body.code), answer.body.code);
        }
        assert.equal(await DoubleGame.countDocuments(), 1);
        const wallets = await Promise.all(players.map(walletOf));
        assert.equal(wallets.filter((wallet) => wallet.pp === 60).length, 1);
        assert.equal(wallets.filter((wallet) => wallet.pp === 100).length, 9);
        assert.equal(await WalletTx.countDocuments({ reason: "doubleBet", user: { $in: players.map((p) => p._id) } }), 1);
    });

    routeTest("a round sent twice at once is only played once", async () => {
        await setPot({ currentBet: 20 });
        house(DRAW, DRAW, DRAW, DRAW);
        const player = await member(100);
        const { body } = await start(player, 20);
        const answers = await Promise.all([throwIt(player, body.gameId, "rock", 1), throwIt(player, body.gameId, "rock", 1)]);
        assert.deepEqual(answers.map((a) => a.status).sort(), [200, 409]);
        assert.equal(answers.find((a) => a.status === 409).body.code, "ROUND_ALREADY_PLAYED");
        assert.equal((await DoubleGame.findById(body.gameId).lean()).rounds.length, 1);

        // Even without saying which round, the same throw twice plays once.
        const again = await Promise.all([throwIt(player, body.gameId, "paper"), throwIt(player, body.gameId, "paper")]);
        assert.deepEqual(again.map((a) => a.status).sort(), [200, 409]);
        assert.equal((await DoubleGame.findById(body.gameId).lean()).rounds.length, 2);
    });

    routeTest("W W: a win pays twice the bet in P-PP, the pot goes back to the seed, and both lists clear", async () => {
        const [banned, waiting] = [await member(), await member()];
        await setPot({ currentBet: 40, seed: 20, totalLost: 20, banList: [banned._id], waitingUserId: waiting._id });
        house(WIN, WIN);
        const player = await member(40);
        const { body } = await start(player, 40);
        const first = await throwIt(player, body.gameId, "rock", 1);
        assert.equal(first.body.round.result, "win");
        assert.equal(first.body.outcome, null);
        const last = await throwIt(player, body.gameId, "rock", 2);
        assert.equal(last.status, 200);
        assert.equal(last.body.outcome, "win");
        assert.equal(last.body.payout, 80);
        assert.equal(last.body.bonusWon, 0);
        assert.equal(last.body.newBet, 20);
        assert.equal(last.body.rounds.length, 2);
        assert.deepEqual(await walletOf(player), { pp: 0, ppp: 80 });

        const after = await pot();
        assert.deepEqual([after.currentBet, after.totalLost, after.banList.length, after.waitingUserId, after.activeGameId], [20, 0, 0, null, null]);
        assert.equal((await status(banned)).body.status, "AVAILABLE");
    });

    routeTest("W D W also wins", async () => {
        await setPot({ currentBet: 20 });
        house(WIN, DRAW, WIN);
        const player = await member(20);
        const { body } = await start(player, 20);
        assert.equal((await play(player, body.gameId, 3)).body.outcome, "win");
    });

    routeTest("W L: the Ban List. The bet stays, the pot doubles, and they can't play again", async () => {
        await setPot({ currentBet: 40, totalLost: 20 });
        house(WIN, LOSS);
        const player = await member(100);
        const { body } = await start(player, 40);
        const last = await play(player, body.gameId, 2);
        assert.equal(last.body.outcome, "ban");
        assert.equal(last.body.payout, 0);
        assert.equal(last.body.newBet, 80);
        assert.deepEqual(await walletOf(player), { pp: 60, ppp: 0 });

        const after = await pot();
        assert.deepEqual([after.currentBet, after.totalLost], [80, 60]);
        assert.equal((await status(player)).body.status, "BANNED");
        const refused = await start(player, 80);
        assert.equal(refused.status, 403);
        assert.equal(refused.body.code, "BANNED");
    });

    routeTest("D D: the Waiting List, until anyone else finishes a game", async () => {
        await setPot({ currentBet: 20 });
        house(DRAW, DRAW);
        const waiter = await member(500);
        const first = await start(waiter, 20);
        assert.equal((await play(waiter, first.body.gameId, 2)).body.outcome, "wait");
        assert.equal((await status(waiter)).body.status, "IN QUEUE");
        const refused = await start(waiter, 40);
        assert.equal(refused.status, 403);
        assert.equal(refused.body.code, "IN_QUEUE");

        // Someone else plays and loses: the waiter is free again, at the doubled bet.
        house(LOSS);
        const next = await member(500);
        const second = await start(next, 40);
        assert.equal((await throwIt(next, second.body.gameId, "rock", 1)).body.outcome, "ban");
        const freed = (await status(waiter)).body;
        assert.equal(freed.status, "AVAILABLE");
        assert.equal(freed.currentBet, 80);
        assert.equal((await pot()).waitingUserId, null);
    });

    routeTest("out of time: the next request plays it out for them, the bet isn't refunded, and they land on the right list", async () => {
        await setPot({ currentBet: 30 });
        const player = await member(100);
        const { body } = await start(player, 30);
        await DoubleGame.updateOne({ _id: body.gameId }, { $set: { roundDeadline: new Date(Date.now() - 1000) } });

        // Thrown for them: rock (0) against paper (1), a loss.
        house(0, 1);
        const seen = await status(await member());
        assert.equal(seen.body.potInUse, null);
        const game = await DoubleGame.findById(body.gameId).lean();
        assert.equal(game.status, "finished");
        assert.equal(game.outcome, "ban");
        assert.ok(game.rounds.every((round) => round.auto));
        assert.deepEqual(await walletOf(player), { pp: 70, ppp: 0 });
        assert.equal(await WalletTx.countDocuments({ user: player._id, reason: { $ne: "doubleBet" } }), 0);
        assert.equal((await status(player)).body.status, "BANNED");

        // Their late throw is told what happened.
        const late = await throwIt(player, body.gameId, "rock", 1);
        assert.equal(late.status, 409);
        assert.equal(late.body.code, "TIMED_OUT");
        assert.equal(late.body.game.outcome, "ban");
    });

    routeTest("out of time after a draw, with two more draws thrown for them: the Waiting List", async () => {
        await setPot({ currentBet: 30 });
        house(DRAW);
        const player = await member(100);
        const { body } = await start(player, 30);
        await throwIt(player, body.gameId, "rock", 1);
        await DoubleGame.updateOne({ _id: body.gameId }, { $set: { roundDeadline: new Date(Date.now() - 1000) } });

        house(0, 0);
        const late = await throwIt(player, body.gameId, "rock", 2);
        assert.equal(late.body.code, "TIMED_OUT");
        assert.equal(late.body.game.outcome, "wait");
        assert.deepEqual(late.body.game.rounds.map((round) => round.auto), [false, true]);
        assert.equal((await status(player)).body.status, "IN QUEUE");
    });

    routeTest("the bonus pot: won with a win at 4x the seed or more, and emptied", async () => {
        await setPot({ currentBet: 80, seed: 20, bonusPot: 900 });
        house(WIN, WIN);
        const player = await member(80);
        assert.equal((await status(player)).body.bonusEligible, true);
        const { body } = await start(player, 80);
        const last = await play(player, body.gameId, 2);
        assert.equal(last.body.payout, 160);
        assert.equal(last.body.bonusWon, 900);
        assert.deepEqual(await walletOf(player), { pp: 0, ppp: 1060 });
        assert.equal((await pot()).bonusPot, 0);
        assert.equal(await WalletTx.countDocuments({ user: player._id, reason: "doubleBonus", ppp: 900 }), 1);
    });

    routeTest("the bonus pot: a win below 4x the seed doesn't touch it", async () => {
        await setPot({ currentBet: 40, seed: 20, bonusPot: 900 });
        house(WIN, WIN);
        const player = await member(40);
        const { body } = await start(player, 40);
        const last = await play(player, body.gameId, 2);
        assert.equal(last.body.payout, 80);
        assert.equal(last.body.bonusWon, 0);
        assert.equal((await pot()).bonusPot, 900);
    });

    routeTest("the Monday reset happens on the next request: half the pot to the bonus, half burned, a new seed, lists cleared", async () => {
        const [banned, waiting] = [await member(), await member()];
        const lastWeek = new Date(engine.lastResetAt(new Date()).getTime() - 7 * 86400000);
        await DoubleReset.deleteMany({});
        await setPot({ currentBet: 1280, seed: 160, totalLost: 160 + 320 + 640, bonusPot: 960, banList: [banned._id], waitingUserId: waiting._id, weekStart: lastWeek });

        const { body } = await status(banned);
        const reset = await DoubleReset.findOne().lean();
        assert.deepEqual([reset.lost, reset.toBonus, reset.burned], [1120, 560, 560]);
        const after = await pot();
        assert.equal(after.bonusPot, 1520);
        assert.equal(after.totalLost, 0);
        assert.equal(after.seed, 140); // from the members with reviews, as in the first test
        assert.equal(after.currentBet, 140);
        assert.deepEqual([after.banList.length, after.waitingUserId], [0, null]);
        assert.equal(after.weekStart.toISOString(), engine.lastResetAt(new Date()).toISOString());
        assert.equal(body.status, "AVAILABLE");
        assert.deepEqual(body.recent[0], { type: "reset", _id: String(reset._id), at: reset.at.toISOString(), lost: 1120, toBonus: 560, burned: 560, seed: 140 });

        // Only once.
        await status(banned);
        assert.equal(await DoubleReset.countDocuments(), 1);
    });

    routeTest("a game being played when Monday comes finishes first, then the reset follows straight after", async () => {
        await DoubleReset.deleteMany({});
        await setPot({ currentBet: 40, seed: 20, totalLost: 20 });
        house(DRAW, LOSS);
        const player = await member(100);
        const { body } = await start(player, 40);
        await throwIt(player, body.gameId, "rock", 1);
        // Monday 12:00 passes mid-game.
        await DoublePot.updateOne({ _id: "current" }, { $set: { weekStart: new Date(engine.lastResetAt(new Date()).getTime() - 7 * 86400000) } });

        assert.equal(String((await status(await member())).body.game ?? ""), "");
        assert.equal(await DoubleReset.countDocuments(), 0, "no reset while the game is still going");

        const last = await throwIt(player, body.gameId, "rock", 2);
        assert.equal(last.body.outcome, "ban");
        const reset = await DoubleReset.findOne().lean();
        assert.equal(reset.lost, 20 + 40);
        const after = await pot();
        assert.deepEqual([after.currentBet, after.totalLost, after.banList.length], [140, 0, 0]);
        assert.equal((await status(player)).body.status, "AVAILABLE");
    });

    routeTest("a game that isn't won goes to the player's followers; a win goes to every member", async () => {
        await setPot({ currentBet: 20 });
        const [player, fan, stranger] = [await member(100), await member(), await member()];
        await Follow.create({ follower: fan._id, following: player._id });

        house(LOSS);
        const lost = await start(player, 20);
        await throwIt(player, lost.body.gameId, "rock", 1);
        const plays = await Notification.find({ type: "doublePlay", doubleGame: lost.body.gameId }).lean();
        assert.deepEqual(plays.map((n) => String(n.recipient)), [String(fan._id)]);
        assert.deepEqual(plays[0].actors.map(String), [String(player._id)]);

        house(WIN, WIN);
        const winner = await member(100);
        await Follow.create({ follower: fan._id, following: winner._id });
        const won = await start(winner, 40);
        await play(winner, won.body.gameId, 2);
        const wins = await Notification.find({ type: "doubleWin", doubleGame: won.body.gameId }).lean();
        assert.equal(wins.length, await User.countDocuments());
        for (const who of [winner, fan, stranger]) assert.ok(wins.some((n) => String(n.recipient) === String(who._id)), who.username);
        assert.equal(wins[0].amount, 80);
        // A follower hears about the win once, not twice.
        assert.equal(await Notification.countDocuments({ recipient: fan._id, doubleGame: won.body.gameId }), 1);
    });

    routeTest("a game the server finished because time ran out tells followers too", async () => {
        await setPot({ currentBet: 20 });
        const [player, fan] = [await member(100), await member()];
        await Follow.create({ follower: fan._id, following: player._id });
        const { body } = await start(player, 20);
        await DoubleGame.updateOne({ _id: body.gameId }, { $set: { roundDeadline: new Date(Date.now() - 1000) } });
        house(0, 1);
        await status(await member());
        assert.equal(await Notification.countDocuments({ recipient: fan._id, type: "doublePlay", doubleGame: body.gameId }), 1);
    });

    routeTest("recent plays: finished games with names and results, newest first", async () => {
        await setPot({ currentBet: 20 });
        house(WIN, DRAW, DRAW);
        const player = await member(100);
        const { body } = await start(player, 20);
        await play(player, body.gameId, 3);
        const [latest] = (await status(player)).body.recent;
        assert.equal(latest.type, "game");
        assert.equal(latest.name, player.username);
        assert.deepEqual(latest.results, ["win", "draw", "draw"]);
        assert.deepEqual([latest.bet, latest.outcome, latest.newBet], [20, "wait", 40]);
    });
});
