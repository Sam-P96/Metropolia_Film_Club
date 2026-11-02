// Slot Machine tests: paylines and pays, bets, the weight tables and the
// luck system, the 12:00 day, the cash-out cap and rounding, and the routes
// against a real MongoDB (double taps, retries, the cap, announcements).
//
// From backend/, with MongoDB running as a replica set (transactions need
// one, see the README):
//   PowerShell:  $env:MONGO_TEST_URI="mongodb://127.0.0.1:27017/kino_test?replicaSet=rs0"; npm test
//   bash:        MONGO_TEST_URI="mongodb://127.0.0.1:27017/kino_test?replicaSet=rs0" npm test
// The database is wiped first, so its name has to end in "_test". Without
// MONGO_TEST_URI only the logic tests run.
const { test, describe, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");

process.env.SECRET ??= "slots-test-secret";
const mongoose = require("mongoose");
const express = require("express");
const jwt = require("jsonwebtoken");

const { SLOTS } = require("../../shared/slots/config.js");
const engine = require("../games/slots/engine");
const { rtpOf } = require("../games/slots/rtp");
const { BASE_WEIGHTS, keepsRarityOrder } = require("../games/slots/weights");
const { LUCK, BUCKETS, TABLES, targetRtp, tableFor } = require("../games/slots/luck");

// A grid of one symbol everywhere, or with chosen symbols in chosen cells.
const fill = (key) => Array.from({ length: SLOTS.reels }, () => Array(SLOTS.rows).fill(key));
function gridWith(base, cells) {
    const grid = fill(base);
    for (const [reel, row, key] of cells) grid[reel][row] = key;
    return grid;
}
// Every cell different along its reel's neighbours: no line has 3 in a row.
const LOSING = [["ticket", "popcorn", "clapper"], ["film", "map", "ring"], ["gauntlet", "ticket", "popcorn"], ["clapper", "film", "map"], ["ring", "gauntlet", "ticket"]];

describe("paylines and pays", () => {
    test("the five lines are the three rows, the V and the inverted V", () => {
        assert.deepEqual(SLOTS.paylines.map((line) => line.rows), [
            [0, 0, 0, 0, 0],
            [1, 1, 1, 1, 1],
            [2, 2, 2, 2, 2],
            [0, 1, 2, 1, 0],
            [2, 1, 0, 1, 2],
        ]);
    });

    test("no line in a mixed grid pays", () => {
        const result = engine.evaluate(LOSING, 1000);
        assert.deepEqual(result, { lines: [], multiplier: 0, win: 0, jackpot: false });
    });

    test("two in a row pays nothing", () => {
        const grid = gridWith("ticket", [[2, 0, "popcorn"], [2, 1, "popcorn"], [2, 2, "popcorn"]]);
        assert.equal(engine.evaluate(grid, 1000).win, 0);
    });

    test("one symbol everywhere: every line pays its 5 in a row, added together", () => {
        const result = engine.evaluate(fill("clapper"), 1000);
        assert.equal(result.lines.length, 5);
        assert.ok(result.lines.every((line) => line.count === 5 && line.multiplier === 40));
        assert.equal(result.win, 5 * 40 * 1000);
    });

    test("several lines winning at once are each paid", () => {
        // Top row: 3 tickets then a break. Bottom row: 4 popcorns. The middle
        // row and both Vs break after two.
        const grid = [
            ["ticket", "map", "popcorn"],
            ["ticket", "ring", "popcorn"],
            ["ticket", "gauntlet", "popcorn"],
            ["film", "clapper", "popcorn"],
            ["film", "clapper", "film"],
        ];
        const result = engine.evaluate(grid, 1000);
        const byLine = Object.fromEntries(result.lines.map((line) => [SLOTS.paylines[line.line].key, line]));
        assert.deepEqual(Object.keys(byLine).sort(), ["bottom", "top"]);
        assert.deepEqual([byLine.top.symbol, byLine.top.count, byLine.top.multiplier], ["ticket", 3, 2]);
        assert.deepEqual([byLine.bottom.symbol, byLine.bottom.count, byLine.bottom.multiplier], ["popcorn", 4, 8]);
        assert.deepEqual(byLine.top.cells, [[0, 0], [1, 0], [2, 0]]);
        assert.equal(result.win, (2 + 8) * 1000);
    });

    test("the V and the inverted V follow their shape", () => {
        const v = gridWith("ticket", [[0, 0, "ring"], [1, 1, "ring"], [2, 2, "ring"], [3, 1, "ring"], [4, 0, "ring"]]);
        const vLine = engine.evaluate(v, 100).lines.find((line) => line.symbol === "ring");
        assert.equal(SLOTS.paylines[vLine.line].key, "v");
        assert.deepEqual(vLine.cells, [[0, 0], [1, 1], [2, 2], [3, 1], [4, 0]]);
        assert.equal(vLine.multiplier, 400);

        const inverted = gridWith("ticket", [[0, 2, "map"], [1, 1, "map"], [2, 0, "map"]]);
        const invLine = engine.evaluate(inverted, 100).lines.find((line) => line.symbol === "map");
        assert.equal(SLOTS.paylines[invLine.line].key, "invertedV");
        assert.equal(invLine.count, 3);
    });

    test("5 logos on a line is the jackpot; 3 and 4 pay their own", () => {
        const middle = gridWith("ticket", [0, 1, 2, 3, 4].map((reel) => [reel, 1, "logo"]));
        const result = engine.evaluate(middle, 100);
        const jackpotLine = result.lines.find((line) => line.symbol === "logo");
        assert.equal(jackpotLine.multiplier, SLOTS.jackpotMultiplier);
        assert.equal(result.jackpot, true);

        const four = gridWith("ticket", [0, 1, 2, 3].map((reel) => [reel, 1, "logo"]));
        assert.equal(engine.evaluate(four, 100).lines.find((line) => line.symbol === "logo").multiplier, 100);
        assert.equal(engine.evaluate(four, 100).jackpot, false);
    });

    test("pays are the paytable to the cent: a half cent from 2.5x is dropped", () => {
        // Popcorn on the first three reels, a map on the fourth: every line
        // is 3 popcorns, 2.5x each.
        const cells = [0, 1, 2].flatMap((reel) => [0, 1, 2].map((row) => [reel, row, "popcorn"]));
        const grid = gridWith("map", cells);
        const result = engine.evaluate(gridWith("ticket", [...cells, [3, 0, "map"], [3, 1, "map"], [3, 2, "map"]]), 101);
        assert.ok(result.lines.every((line) => line.symbol === "popcorn" && line.count === 3 && line.multiplier === 2.5));
        assert.equal(result.win, 1262); // 5 x 2.5 x 101 cents = 1262.5
        assert.equal(engine.evaluate(grid, 100).win, 5 * 250);
    });

    test("drawing follows the weights: the bottom of the range is the first symbol, the top the last", () => {
        const table = TABLES[100];
        assert.deepEqual(engine.drawGrid(table, () => 0), fill("ticket"));
        assert.deepEqual(engine.drawGrid(table, (max) => max - 1), fill("logo"));
    });
});

describe("bets", () => {
    test("whole PP from the minimum, up to what the machine holds", () => {
        assert.equal(engine.checkBet(1, 500), 100);
        assert.equal(engine.checkBet(5, 500), 500);
        assert.throws(() => engine.checkBet(6, 500), /more than the machine holds/);
        assert.throws(() => engine.checkBet(1, 0), /Add credits first/);
    });

    test("anything else but everything in the machine (MAX) is refused", () => {
        assert.equal(engine.checkBet(7.5, 750), 750);
        assert.equal(engine.checkBet(0.42, 42), 42);
        assert.throws(() => engine.checkBet(2.5, 750), /whole PP/);
        assert.throws(() => engine.checkBet(0.5, 750), /whole PP/);
        for (const bad of [0, -1, NaN, Infinity, "5", null, undefined, 1.234]) {
            assert.throws(() => engine.checkBet(bad, 100000), engine.SlotError);
        }
    });

    test("bets take PP first, then P-PP", () => {
        assert.deepEqual(engine.splitBet({ pp: 300, ppp: 900 }, 500), { pp: 300, ppp: 200 });
        assert.deepEqual(engine.splitBet({ pp: 800, ppp: 900 }, 500), { pp: 500, ppp: 0 });
    });
});

describe("weight tables and luck", () => {
    test("the base table is about 101%", () => {
        assert.ok(Math.abs(rtpOf(BASE_WEIGHTS) - 1.01) < 0.01, `${rtpOf(BASE_WEIGHTS)}`);
    });

    test("there's a table for every 1% from 88% to 114%", () => {
        assert.deepEqual(BUCKETS, Array.from({ length: 27 }, (_, i) => 88 + i));
    });

    for (const bucket of Object.keys(TABLES)) {
        test(`the ${bucket}% table is within 0.3% of it and keeps the order of rarity`, () => {
            const weights = TABLES[bucket];
            assert.ok(Math.abs(rtpOf(weights) - Number(bucket) / 100) <= 0.003, `${rtpOf(weights)}`);
            assert.ok(keepsRarityOrder(weights));
            assert.deepEqual(Object.keys(weights).sort(), SLOTS.symbols.map((symbol) => symbol.key).sort());
        });
    }

    test("rank to RTP: richest active 95%, poorest active 103%, a straight line between", () => {
        assert.equal(targetRtp({ active: true, rank: 1, count: 5 }), LUCK.richestRtp);
        assert.equal(targetRtp({ active: true, rank: 5, count: 5 }), LUCK.poorestRtp);
        assert.ok(Math.abs(targetRtp({ active: true, rank: 3, count: 5 }) - 0.99) < 1e-12);
        assert.ok(Math.abs(targetRtp({ active: true, rank: 2, count: 5 }) - 0.97) < 1e-12);
        assert.equal(LUCK.richestRtp, 0.95);
        assert.equal(LUCK.poorestRtp, 1.03);
    });

    test("the only active player gets 101%, and inactive players 95%", () => {
        assert.equal(targetRtp({ active: true, rank: 1, count: 1 }), 1.01);
        assert.equal(targetRtp({ active: false }), 0.95);
    });

    test("a spin uses the nearest table", () => {
        assert.equal(tableFor(0.954).bucket, 95);
        assert.equal(tableFor(0.956).bucket, 96);
        assert.equal(tableFor(1.0349).bucket, 103);
        assert.equal(tableFor(0.5).bucket, 88);
        assert.equal(tableFor(2).bucket, 114);
        assert.equal(tableFor(1.03).weights, TABLES[103]);
    });
});

// The day and the cap need utils/slots.js, which pulls in the models; it
// doesn't need a database for these.
const slots = require("../utils/slots");

describe("the 12:00 day", () => {
    test("before 12:00 Helsinki time it's still yesterday's day", () => {
        assert.equal(slots.slotDay(new Date("2026-11-02T09:59:00Z")), "2026-11-01"); // 11:59 winter time
        assert.equal(slots.slotDay(new Date("2026-11-02T10:00:00Z")), "2026-11-02"); // 12:00
        assert.equal(slots.slotDay(new Date("2026-07-01T08:59:00Z")), "2026-06-30"); // 11:59 summer time
        assert.equal(slots.slotDay(new Date("2026-07-01T09:00:00Z")), "2026-07-01");
        assert.equal(slots.slotDay(new Date("2026-01-01T09:00:00Z")), "2025-12-31"); // over the new year
    });

    test("the days the clocks change", () => {
        assert.equal(slots.slotDay(new Date("2026-03-29T08:59:00Z")), "2026-03-28"); // spring forward
        assert.equal(slots.slotDay(new Date("2026-03-29T09:00:00Z")), "2026-03-29");
        assert.equal(slots.slotDay(new Date("2026-10-25T09:59:00Z")), "2026-10-24"); // fall back
        assert.equal(slots.slotDay(new Date("2026-10-25T10:00:00Z")), "2026-10-25");
    });
});

describe("cashing out", () => {
    const day = "2026-11-02";
    const machine = (pp, ppp, counts = {}) => ({ pp, ppp, capDay: day, pppAddedToday: 0, pppOutToday: 0, ...counts });

    test("each currency is rounded down; the fractions stay", () => {
        const quote = slots.cashOutQuote(machine(1250, 3399), 1000, day);
        assert.deepEqual([quote.pp, quote.ppp, quote.stays, quote.overCap], [1200, 3300, 149, 0]);
    });

    test("P-PP over 3x the richest total waits in the machine", () => {
        const quote = slots.cashOutQuote(machine(0, 50000), 100, day);
        assert.deepEqual([quote.ppp, quote.overCap, quote.stays, quote.capLeft, quote.capLeftAfter], [30000, 20000, 20000, 30000, 0]);
    });

    test("P-PP added today raises today's cap by as much, so it can always go back", () => {
        const quote = slots.cashOutQuote(machine(0, 50000, { pppAddedToday: 5000 }), 100, day);
        assert.equal(quote.ppp, 35000);
        const none = slots.cashOutQuote(machine(0, 4000, { pppAddedToday: 4000 }), 0, day);
        assert.equal(none.ppp, 4000);
    });

    test("what's been cashed out today counts; a new day starts again", () => {
        const today = slots.cashOutQuote(machine(0, 50000, { pppOutToday: 30000 }), 100, day);
        assert.equal(today.ppp, 0);
        const tomorrow = slots.cashOutQuote(machine(0, 50000, { pppOutToday: 30000 }), 100, "2026-11-03");
        assert.equal(tomorrow.ppp, 30000);
    });

    test("PP is never capped", () => {
        assert.equal(slots.cashOutQuote(machine(99999, 0), 0, day).pp, 99900);
    });
});

const uri = process.env.MONGO_TEST_URI;
const dbName = uri ? new URL(uri).pathname.slice(1) : "";

describe("the slot routes", { skip: !uri ? "set MONGO_TEST_URI to run these" : !dbName.endsWith("_test") ? "MONGO_TEST_URI's database must end in _test" : false }, () => {
    let base;
    let server;
    let replicaSet = false;
    let User;
    let Review;
    let SlotMachine;
    let SlotSpin;
    let SlotSnapshot;
    let WalletTx;
    let Notification;
    const tokens = new Map();

    before(async () => {
        await mongoose.connect(uri);
        await mongoose.connection.dropDatabase();
        replicaSet = Boolean((await mongoose.connection.db.admin().command({ hello: 1 })).setName);
        User = require("../models/userModel");
        Review = require("../models/reviewModel");
        SlotMachine = require("../models/slotMachineModel");
        SlotSpin = require("../models/slotSpinModel");
        SlotSnapshot = require("../models/slotSnapshotModel");
        WalletTx = require("../models/walletTxModel");
        Notification = require("../models/notificationModel");
        await Promise.all([User, Review, SlotMachine, SlotSpin, SlotSnapshot, WalletTx, Notification].map((model) => model.syncIndexes()));

        const app = express();
        app.use(express.json());
        app.use("/api/slots", require("../routes/slotRouter"));
        app.use((error, req, res, next) => {
            console.error(error);
            res.status(500).json({ error: "Something went wrong" });
        });
        server = app.listen(0);
        base = `http://127.0.0.1:${server.address().port}/api/slots`;
    });

    after(async () => {
        slots.useRandomSource(null);
        server?.close();
        await mongoose.disconnect();
    });

    // Every test starts from today's snapshot with the richest at 100, so
    // the cap is 300 P-PP.
    beforeEach(async () => {
        if (!replicaSet) return;
        slots.useRandomSource(null);
        await SlotSnapshot.deleteMany({});
        await SlotSnapshot.create({ _id: slots.slotDay(), takenAt: new Date(), order: [], richest: 100 });
    });

    const routeTest = (name, fn) =>
        test(name, async (t) => {
            if (!replicaSet) return t.skip("MongoDB isn't a replica set, so it can't run transactions (see the README)");
            await fn(t);
        });

    let count = 0;
    async function member(pp = 0, ppp = 0) {
        count += 1;
        const user = await User.create({ username: `slotter${count}`, email: `slot${count}@test.invalid`, password: "x", wallet: { pp, ppp } });
        tokens.set(String(user._id), jwt.sign({ _id: user._id }, process.env.SECRET));
        return user;
    }
    async function call(user, method, path, body) {
        const response = await fetch(base + path, {
            method,
            headers: { Authorization: `Bearer ${tokens.get(String(user._id))}`, "Content-Type": "application/json" },
            body: body === undefined ? undefined : JSON.stringify(body),
        });
        return { status: response.status, body: await response.json().catch(() => null), text: "" };
    }
    let spins = 0;
    const spinOf = (user, bet, spinId = `spin-${++spins}-${Date.now()}`) => call(user, "POST", "/spins", { spinId, bet });
    const walletOf = async (user) => {
        const { wallet } = await User.findById(user._id).select("wallet").lean();
        return { pp: wallet.pp, ppp: wallet.ppp };
    };
    const machineOf = (user) => SlotMachine.findOne({ user: user._id }).lean();

    // Random sources that land a chosen grid, whatever the player's table:
    // a point well inside each symbol's share in every table.
    const INSIDE = { ticket: 0.1, popcorn: 0.35, clapper: 0.54, film: 0.68, map: 0.78, ring: 0.85, gauntlet: 0.905, logo: 0.97 };
    const everywhere = (key) => (max) => Math.floor(max * INSIDE[key]);
    function landing(grid) {
        const cells = grid.flat();
        let i = 0;
        return (max) => Math.floor(max * INSIDE[cells[i++ % cells.length]]);
    }

    routeTest("a new machine is empty, and Add credits takes PP first, then P-PP, with receipts", async () => {
        const user = await member(30, 100);
        assert.deepEqual((await call(user, "GET", "/")).body, { machine: { balance: 0, lastWin: 0 } });

        const { status, body } = await call(user, "POST", "/credits", { amount: 50 });
        assert.equal(status, 200);
        assert.equal(body.machine.balance, 50);
        assert.deepEqual(await walletOf(user), { pp: 0, ppp: 80 });
        const machine = await machineOf(user);
        assert.deepEqual([machine.pp, machine.ppp, machine.sessionInput, machine.pppAddedToday], [3000, 2000, 5000, 2000]);
        const receipt = await WalletTx.findOne({ user: user._id, reason: "slotCredits" }).lean();
        assert.deepEqual([receipt.pp, receipt.ppp], [-30, -20]);

        // It's still there when they come back.
        assert.equal((await call(user, "GET", "/")).body.machine.balance, 50);
    });

    routeTest("Add credits refuses fractions, nothing, and more than the wallet holds", async () => {
        const user = await member(5, 5);
        for (const amount of [0, -3, 2.5, "10", undefined]) {
            assert.equal((await call(user, "POST", "/credits", { amount })).status, 400);
        }
        const tooMuch = await call(user, "POST", "/credits", { amount: 11 });
        assert.equal(tooMuch.status, 400);
        assert.deepEqual(await walletOf(user), { pp: 5, ppp: 5 });
        assert.equal((await machineOf(user)).pp, 0);
    });

    routeTest("a spin: the bet comes off PP first, wins go on as P-PP, and the answer carries no luck", async () => {
        const user = await member(10, 10);
        await call(user, "POST", "/credits", { amount: 20 });
        slots.useRandomSource(everywhere("ticket"));

        const { status, body } = await spinOf(user, 15);
        assert.equal(status, 200);
        assert.deepEqual(body.grid, fill("ticket"));
        assert.equal(body.lines.length, 5);
        assert.equal(body.win, 5 * 15 * 15);
        assert.equal(body.balance, 20 - 15 + 5 * 15 * 15);
        assert.equal(body.bigWin, true);
        assert.doesNotMatch(JSON.stringify(body), /rtp|bucket|weight|luck/i);

        const machine = await machineOf(user);
        assert.deepEqual([machine.pp, machine.ppp], [0, 500 + 5 * 15 * 15 * 100]);
        const logged = await SlotSpin.findOne({ user: user._id }).lean();
        assert.ok(BUCKETS.includes(logged.rtpBucket));
        assert.equal((await call(user, "GET", "/")).body.machine.lastWin, 5 * 15 * 15);
    });

    routeTest("the same spin sent twice is played once", async () => {
        const user = await member(10);
        await call(user, "POST", "/credits", { amount: 10 });
        slots.useRandomSource(landing(LOSING));

        const [first, again] = await Promise.all([spinOf(user, 1, "same-spin-1234"), spinOf(user, 1, "same-spin-1234")]);
        assert.equal(first.status, 200);
        assert.equal(again.status, 200);
        assert.deepEqual(first.body, again.body);
        const later = await spinOf(user, 1, "same-spin-1234");
        assert.deepEqual(later.body, first.body);
        assert.equal((await machineOf(user)).pp, 900);
        assert.equal(await SlotSpin.countDocuments({ user: user._id }), 1);
    });

    routeTest("spins at the same moment can't spend the same credits", async () => {
        const user = await member(10);
        await call(user, "POST", "/credits", { amount: 10 });
        slots.useRandomSource(landing(LOSING));

        const results = await Promise.all([spinOf(user, 10), spinOf(user, 10), spinOf(user, 10)]);
        assert.deepEqual(results.map((r) => r.status).sort(), [200, 400, 400]);
        const machine = await machineOf(user);
        assert.deepEqual([machine.pp, machine.ppp], [0, 0]);
        assert.equal(await SlotSpin.countDocuments({ user: user._id }), 1);
    });

    routeTest("bets: whole PP or everything in the machine; never more", async () => {
        const user = await member(0);
        await SlotMachine.create({ user: user._id, pp: 0, ppp: 750, sessionInput: 750 });
        slots.useRandomSource(landing(LOSING));

        assert.equal((await spinOf(user, 8)).status, 400);
        assert.equal((await spinOf(user, 7.4)).status, 400);
        const allIn = await spinOf(user, 7.5);
        assert.equal(allIn.status, 200);
        assert.equal(allIn.body.balance, 0);
        // Empty ends the session.
        assert.equal((await machineOf(user)).sessionInput, 0);
        assert.equal((await spinOf(user, 1)).status, 400);
        assert.equal((await call(user, "POST", "/spins", { bet: 1 })).status, 400);
    });

    routeTest("tripling the session's credits is announced to every member, once", async () => {
        const player = await member(10);
        await member();
        await call(player, "POST", "/credits", { amount: 10 });
        slots.useRandomSource(everywhere("ticket"));

        await spinOf(player, 1);
        const members = await User.countDocuments();
        const notes = await Notification.find({ type: "slotTriple", actors: player._id }).lean();
        assert.equal(notes.length, members);

        await spinOf(player, 1);
        assert.equal(await Notification.countDocuments({ type: "slotTriple", actors: player._id }), members);
    });

    routeTest("the jackpot pays 28,500 times the bet on each line, and everyone hears", async () => {
        const player = await member(1);
        await call(player, "POST", "/credits", { amount: 1 });
        slots.useRandomSource(everywhere("logo"));

        const { body } = await spinOf(player, 1);
        assert.equal(body.jackpot, true);
        assert.equal(body.win, 5 * SLOTS.jackpotMultiplier);
        const notes = await Notification.find({ type: "slotJackpot", actors: player._id }).lean();
        assert.equal(notes.length, await User.countDocuments());
        assert.equal(notes[0].amount, 5 * SLOTS.jackpotMultiplier);
    });

    routeTest("cash out rounds each currency down and leaves the fractions", async () => {
        const user = await member(0);
        await SlotMachine.create({ user: user._id, pp: 1250, ppp: 3399, sessionInput: 4649 });

        const preview = (await call(user, "GET", "/cash-out")).body;
        assert.deepEqual(preview, { pp: 12, ppp: 33, stays: 1.49, overCap: 0, capLeft: 300 });

        const { status, body } = await call(user, "POST", "/cash-out");
        assert.equal(status, 200);
        assert.deepEqual(body.paid, { pp: 12, ppp: 33 });
        assert.equal(body.machine.balance, 1.49);
        assert.deepEqual(await walletOf(user), { pp: 12, ppp: 33 });
        // Only fractions left: the session's over.
        assert.equal((await machineOf(user)).sessionInput, 0);
        assert.equal((await call(user, "POST", "/cash-out")).status, 409);
    });

    routeTest("the daily cap keeps P-PP over it in the machine for another day", async () => {
        const user = await member(0);
        await SlotMachine.create({ user: user._id, pp: 0, ppp: 50000, sessionInput: 1000 });

        const { body } = await call(user, "POST", "/cash-out");
        assert.deepEqual(body.paid, { pp: 0, ppp: 300 });
        assert.equal(body.machine.balance, 200);
        assert.equal((await call(user, "GET", "/cash-out")).body.capLeft, 0);
        const again = await call(user, "POST", "/cash-out");
        assert.equal(again.status, 409);
        assert.match(again.body.error, /cap/);
        assert.deepEqual(await walletOf(user), { pp: 0, ppp: 300 });

        // Tomorrow's cap: as if today's counts were yesterday's.
        await SlotMachine.updateOne({ user: user._id }, { $set: { capDay: "2000-01-01" } });
        assert.deepEqual((await call(user, "POST", "/cash-out")).body.paid, { pp: 0, ppp: 200 });
    });

    routeTest("P-PP added today can always come back out, over the cap", async () => {
        const user = await member(0, 500);
        await call(user, "POST", "/credits", { amount: 500 });
        const { body } = await call(user, "POST", "/cash-out");
        assert.deepEqual(body.paid, { pp: 0, ppp: 500 });
        assert.deepEqual(await walletOf(user), { pp: 0, ppp: 500 });
    });

    routeTest("luck follows today's snapshot among active players; new accounts by what they hold", async () => {
        const [rich, middle, poor, idle, fresh] = await Promise.all([member(900), member(500), member(100), member(800), member(300)]);
        const review = (user) => Review.create({ user: user._id, tmdbId: 1, filmTitle: "Alien", rating: 4, text: "Good." });
        await Promise.all([rich, middle, poor].map(review));

        await SlotSnapshot.deleteMany({});
        await slots.takeSnapshot(slots.slotDay());
        // Snapshot order holds all day, whatever they hold later.
        await User.updateOne({ _id: poor._id }, { $set: { "wallet.pp": 5000 } });

        // Other members from earlier tests may be active too, so compare by rank.
        const rtp = (user) => slots.targetRtpFor(user._id);
        assert.equal(await rtp(idle), LUCK.inactiveRtp);
        const [r1, r2, r3] = [await rtp(rich), await rtp(middle), await rtp(poor)];
        assert.ok(r1 < r2 && r2 < r3, `${r1} ${r2} ${r3}`);

        // A review makes them active straight away; not in the snapshot, the
        // new account is placed by what it holds now (300: between 500 and 100).
        await review(fresh);
        await SlotSnapshot.updateOne({ _id: slots.slotDay() }, { $pull: { order: { user: fresh._id } } });
        const r4 = await rtp(fresh);
        assert.ok(r2 < r4 && r4 < r3, `${r2} ${r4} ${r3}`);
    });
});
