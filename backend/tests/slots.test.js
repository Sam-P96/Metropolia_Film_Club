// Slot Machine tests: paylines and pays, the Gauntlet link, bets, the exact
// RTP, the weight tables and the luck system, the 12:00 day, the cash-out cap and rounding, and the routes
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

const { SLOTS, SYMBOL_BY_KEY } = require("../../shared/slots/config.js");
const engine = require("../games/slots/engine");
const { rtpOf } = require("../games/slots/rtp");
const { BASE_WEIGHTS, keepsRarityOrder, rarityOrder } = require("../games/slots/weights");
const { LUCK, BUCKETS, TABLES, targetRtp, tableFor } = require("../games/slots/luck");

// A grid of one symbol everywhere, or with chosen symbols in chosen cells.
const fill = (key) => Array.from({ length: SLOTS.reels }, () => Array(SLOTS.rows).fill(key));
function gridWith(base, cells) {
    const grid = fill(base);
    for (const [reel, row, key] of cells) grid[reel][row] = key;
    return grid;
}
// Every cell different along its reel's neighbours: no line has 3 in a row,
// and every line starts on a Common or Uncommon symbol, so none links.
const LOSING = [["ticket", "popcorn", "clapper"], ["logo", "map", "ring"], ["gauntlet", "ticket", "popcorn"], ["clapper", "logo", "map"], ["ring", "gauntlet", "ticket"]];

// The winning line on payline `key`, if there is one.
const lineNamed = (result, key) => result.lines.find((won) => SLOTS.paylines[won.line].key === key);
// Every line's pays added up, in hundredths, then times the bet: what the
// win has to be.
const sumOfLines = (result, betCents) => Math.floor((result.lines.reduce((sum, won) => sum + Math.round(won.multiplier * 100), 0) * betCents) / 100);

describe("paylines and pays", () => {
    test("the eleven lines", () => {
        assert.deepEqual(SLOTS.paylines.map((line) => line.rows), [
            [0, 0, 0, 0, 0],
            [1, 1, 1, 1, 1],
            [2, 2, 2, 2, 2],
            [0, 1, 2, 1, 0],
            [2, 1, 0, 1, 2],
            [0, 0, 1, 2, 2],
            [2, 2, 1, 0, 0],
            [1, 1, 0, 1, 1],
            [1, 1, 2, 1, 1],
            [0, 1, 1, 1, 0],
            [2, 1, 1, 1, 2],
        ]);
        assert.equal(new Set(SLOTS.paylines.map((line) => line.key)).size, 11);
        assert.ok(SLOTS.paylines.every((line) => line.name));
    });

    test("no line in a mixed grid pays", () => {
        const result = engine.evaluate(LOSING, 1000);
        assert.deepEqual(result, { lines: [], multiplier: 0, win: 0, jackpot: false });
    });

    test("two in a row pays nothing", () => {
        assert.equal(engine.readLine(["popcorn", "popcorn", "ticket", "clapper", "map"]), null);
    });

    test("one symbol everywhere: every line pays its 5 in a row, added together", () => {
        const result = engine.evaluate(fill("clapper"), 1000);
        assert.equal(result.lines.length, 11);
        assert.ok(result.lines.every((line) => line.count === 5 && line.multiplier === 4));
        assert.equal(result.win, 11 * 4 * 1000);
    });

    test("several lines winning at once are each paid", () => {
        const grid = [
            ["ticket", "logo", "popcorn"],
            ["ticket", "clapper", "popcorn"],
            ["ticket", "ticket", "popcorn"],
            ["map", "clapper", "popcorn"],
            ["ring", "clapper", "logo"],
        ];
        const result = engine.evaluate(grid, 1000);
        assert.deepEqual(result.lines.map((won) => SLOTS.paylines[won.line].key).sort(), ["bottom", "slideDown", "top"]);
        assert.deepEqual([lineNamed(result, "top").symbol, lineNamed(result, "top").count, lineNamed(result, "top").multiplier], ["ticket", 3, 1.2]);
        assert.deepEqual([lineNamed(result, "bottom").symbol, lineNamed(result, "bottom").count, lineNamed(result, "bottom").multiplier], ["popcorn", 4, 1.8]);
        assert.deepEqual(lineNamed(result, "slideDown").cells, [[0, 0], [1, 0], [2, 1]]);
        assert.equal(result.win, 4200); // (1.2 + 1.8 + 1.2) x 1000
        assert.equal(result.win, sumOfLines(result, 1000));
    });

    for (const payline of SLOTS.paylines) {
        test(`the ${payline.name} line follows its shape`, () => {
            const grid = LOSING.map((rows) => [...rows]);
            payline.rows.forEach((row, reel) => (grid[reel][row] = "ring"));
            const won = lineNamed(engine.evaluate(grid, 100), payline.key);
            assert.deepEqual(won.cells, payline.rows.map((row, reel) => [reel, row]));
            assert.deepEqual([won.symbol, won.count, won.multiplier, won.effect, won.text], ["ring", 5, 6, null, null]);
        });
    }

    test("5 logos on a line is the jackpot; 3 and 4 pay their own", () => {
        assert.deepEqual(engine.readLine(["logo", "logo", "logo", "logo", "logo"]), {
            symbol: "logo", count: 5, multiplier: SLOTS.jackpotMultiplier, effect: null, text: null, jackpot: true,
        });
        assert.equal(SLOTS.jackpotMultiplier, 2000);
        const four = engine.readLine(["logo", "logo", "logo", "logo", "ticket"]);
        assert.deepEqual([four.multiplier, four.jackpot], [5, false]);
        const middle = gridWith("ticket", [0, 1, 2, 3, 4].map((reel) => [reel, 1, "logo"]));
        assert.equal(engine.evaluate(middle, 100).jackpot, true);
    });

    test("no win pays less than the bet", () => {
        for (const symbol of SLOTS.symbols) {
            for (const pay of symbol.pays.filter((p) => p !== null)) assert.ok(pay >= 1, `${symbol.key} ${pay}`);
        }
    });

    // Every line 3 of `key` from the left, then a ticket (a popcorn, for
    // tickets) to stop them.
    const threeOf = (key) => gridWith(key === "ticket" ? "popcorn" : "ticket", [0, 1, 2].flatMap((reel) => [0, 1, 2].map((row) => [reel, row, key])));

    for (const [key, pay] of [["ticket", 1.2], ["popcorn", 1.3], ["clapper", 1.4], ["map", 1.5], ["ring", 1.6], ["logo", 2.5]]) {
        test(`pays are exact to the cent: 11 lines of ${pay}x`, () => {
            const result = engine.evaluate(threeOf(key), 100);
            assert.equal(result.lines.length, 11);
            assert.ok(result.lines.every((won) => won.symbol === key && won.count === 3 && won.multiplier === pay));
            assert.equal(result.win, Math.round(11 * pay * 100));
            assert.equal(result.multiplier, Math.round(11 * pay * 100) / 100);
        });
    }

    test("a bet with cents drops only the fraction of a cent", () => {
        // 11 x 1.2 = 13.2, which floating point would make 13.199999...
        assert.equal(engine.evaluate(threeOf("ticket"), 101).win, 1333); // 13.2 x 101 = 1333.2
        assert.equal(engine.evaluate(threeOf("clapper"), 101).win, 1555); // 15.4 x 101 = 1555.4
        assert.equal(engine.evaluate(threeOf("ring"), 33).win, 580); // 17.6 x 33 = 580.8
    });

    test("drawing follows the weights: the bottom of the range is the first symbol, the top the last", () => {
        const table = TABLES[100];
        assert.deepEqual(engine.drawGrid(table, () => 0), fill("ticket"));
        assert.deepEqual(engine.drawGrid(table, (max) => max - 1), fill("logo"));
    });
});

describe("the Gauntlet link", () => {
    // A coin that mustn't be needed: only mixed lines flip.
    const never = () => {
        throw new Error("no coin should be flipped here");
    };
    const read = (symbols, flip = never) => engine.readLine(symbols, flip);
    const summary = (reading) => reading && [reading.symbol, reading.count, reading.multiplier, reading.effect, reading.text];

    test("Maps and Gauntlets pay as Maps of that length, with fireworks", () => {
        assert.deepEqual(summary(read(["map", "gauntlet", "map", "ticket", "ticket"])), ["map", 3, 1.5, "fireworks", null]);
        assert.deepEqual(summary(read(["gauntlet", "map", "gauntlet", "map", "popcorn"])), ["map", 4, 2.5, "fireworks", null]);
        assert.deepEqual(summary(read(["gauntlet", "gauntlet", "map", "map", "map"])), ["map", 5, 5, "fireworks", null]);
    });

    test("Rings and Gauntlets pay as Rings of that length, with lightning", () => {
        assert.deepEqual(summary(read(["ring", "ring", "gauntlet", "ring", "popcorn"])), ["ring", 4, 3, "lightning", null]);
        assert.deepEqual(summary(read(["gauntlet", "ring", "gauntlet", "logo", "ring"])), ["ring", 3, 1.6, "lightning", null]);
    });

    test("Maps without a Gauntlet are just Maps: no link, no effect", () => {
        assert.deepEqual(summary(read(["map", "map", "map", "ticket", "ticket"])), ["map", 3, 1.5, null, null]);
        assert.equal(read(["map", "ring", "map", "ticket", "ticket"]), null);
    });

    test("Maps and Rings together flip the coin: Maps with fireworks, or Rings with lightning and a CRITICAL HIT!", () => {
        const mixed = ["map", "gauntlet", "ring", "ticket", "ticket"];
        let flips = 0;
        const asMap = read(mixed, () => {
            flips += 1;
            return "map";
        });
        assert.deepEqual(summary(asMap), ["map", 3, 1.5, "fireworks", null]);
        assert.equal(flips, 1);
        assert.deepEqual(summary(read(mixed, () => "ring")), ["ring", 3, 1.6, "lightning", "CRITICAL HIT!"]);
        assert.deepEqual(summary(read(["ring", "map", "gauntlet", "ring", "map"], () => "ring")), ["ring", 5, 6, "lightning", "CRITICAL HIT!"]);
        assert.deepEqual(summary(read(["ring", "map", "gauntlet", "ring", "map"], () => "map")), ["map", 5, 5, "fireworks", null]);
    });

    test("Gauntlets on their own are INFINITY: their own pays, with lightning", () => {
        assert.deepEqual(summary(read(["gauntlet", "gauntlet", "gauntlet", "ticket", "map"])), ["gauntlet", 3, 2, "lightning", "INFINITY"]);
        assert.deepEqual(summary(read(["gauntlet", "gauntlet", "gauntlet", "gauntlet", "logo"])), ["gauntlet", 4, 4, "lightning", "INFINITY"]);
        assert.deepEqual(summary(read(["gauntlet", "gauntlet", "gauntlet", "gauntlet", "gauntlet"])), ["gauntlet", 5, 12, "lightning", "INFINITY"]);
        assert.equal(read(["gauntlet", "gauntlet", "ticket", "ticket", "ticket"]), null);
    });

    test("the Gauntlet never links the logo", () => {
        assert.equal(read(["gauntlet", "logo", "logo", "logo", "logo"]), null);
        assert.equal(read(["logo", "gauntlet", "logo", "ticket", "ticket"]), null);
        assert.equal(read(["map", "gauntlet", "logo", "map", "map"]), null);
        assert.deepEqual(summary(read(["logo", "logo", "logo", "gauntlet", "map"])), ["logo", 3, 2.5, null, null]);
        assert.equal(read(["logo", "logo", "logo", "logo", "gauntlet"]).jackpot, false);
    });

    for (const common of ["ticket", "popcorn", "clapper"]) {
        test(`the Gauntlet never links ${SYMBOL_BY_KEY[common].name}`, () => {
            assert.equal(read([common, "gauntlet", common, common, common]), null);
            assert.equal(read(["gauntlet", common, common, common, common]), null);
            assert.equal(read(["map", "gauntlet", common, common, common]), null);
            assert.deepEqual(summary(read([common, common, common, "gauntlet", "map"])).slice(0, 2), [common, 3]);
        });
    }

    test("a line with more than one reading pays the highest, with that reading's effect", () => {
        // 3 Gauntlets are INFINITY (2x), but followed by Maps the link reads Maps.
        assert.deepEqual(summary(read(["gauntlet", "gauntlet", "gauntlet", "map", "map"])), ["map", 5, 5, "fireworks", null]);
        assert.deepEqual(summary(read(["gauntlet", "gauntlet", "gauntlet", "map", "ticket"])), ["map", 4, 2.5, "fireworks", null]);
        assert.deepEqual(summary(read(["gauntlet", "gauntlet", "gauntlet", "gauntlet", "map"])), ["map", 5, 5, "fireworks", null]);
        // 3 Rings pay 1.6x on their own; the mixed link beats it whichever side the coin lands.
        assert.deepEqual(summary(read(["ring", "ring", "ring", "gauntlet", "map"], () => "map")), ["map", 5, 5, "fireworks", null]);
        assert.deepEqual(summary(read(["ring", "ring", "ring", "gauntlet", "map"], () => "ring")), ["ring", 5, 6, "lightning", "CRITICAL HIT!"]);
    });

    test("a winning line says where its Gauntlets are, and each mixed line flips its own coin", () => {
        // The top and bottom rows are mixed links; nothing else wins.
        const grid = [
            ["map", "ticket", "ring"],
            ["gauntlet", "clapper", "gauntlet"],
            ["ring", "popcorn", "map"],
            ["ticket", "clapper", "ticket"],
            ["logo", "ticket", "popcorn"],
        ];
        const sides = ["map", "ring"];
        const result = engine.evaluate(grid, 100, () => sides.shift());
        assert.equal(sides.length, 0);
        assert.deepEqual(result.lines.map((won) => SLOTS.paylines[won.line].key), ["top", "bottom"]);
        assert.deepEqual(lineNamed(result, "top"), {
            line: 0, symbol: "map", count: 3, multiplier: 1.5, cells: [[0, 0], [1, 0], [2, 0]], effect: "fireworks", text: null, gauntlets: [[1, 0]],
        });
        assert.deepEqual(lineNamed(result, "bottom"), {
            line: 2, symbol: "ring", count: 3, multiplier: 1.6, cells: [[0, 2], [1, 2], [2, 2]], effect: "lightning", text: "CRITICAL HIT!", gauntlets: [[1, 2]],
        });
        assert.equal(result.win, 310);
    });

    test("a plain win has no effect, no text and no Gauntlets", () => {
        const won = engine.evaluate(fill("ticket"), 100).lines[0];
        assert.deepEqual([won.effect, won.text, won.gauntlets], [null, null, []]);
        const infinity = lineNamed(engine.evaluate(gridWith("ticket", [0, 1, 2].map((reel) => [reel, 0, "gauntlet"])), 100), "top");
        assert.deepEqual([infinity.effect, infinity.text, infinity.gauntlets], ["lightning", "INFINITY", [[0, 0], [1, 0], [2, 0]]]);
    });
});

describe("the exact RTP", () => {
    const keys = SLOTS.symbols.map((symbol) => symbol.key);

    test("with no Gauntlet it matches the old closed form (no link can happen)", () => {
        const weights = { ...BASE_WEIGHTS, gauntlet: 1e-15 };
        const total = keys.reduce((sum, key) => sum + weights[key], 0);
        let line = 0;
        for (const key of keys) {
            const q = weights[key] / total;
            for (let n = 3; n < 5; n++) line += q ** n * (1 - q) * engine.multiplierFor(key, n);
            line += q ** 5 * engine.multiplierFor(key, 5);
        }
        assert.ok(Math.abs(rtpOf(weights) - SLOTS.paylines.length * line) < 1e-9);
    });

    test("reading every possible line by brute force gives the same RTP", () => {
        const q = keys.map((key) => BASE_WEIGHTS[key]);
        let line = 0;
        for (const a of keys.keys()) for (const b of keys.keys()) for (const c of keys.keys()) for (const d of keys.keys()) for (const e of keys.keys()) {
            const symbols = [a, b, c, d, e].map((i) => keys[i]);
            const pay = ((engine.readLine(symbols, () => "map")?.multiplier ?? 0) + (engine.readLine(symbols, () => "ring")?.multiplier ?? 0)) / 2;
            if (pay) line += pay * q[a] * q[b] * q[c] * q[d] * q[e];
        }
        assert.ok(Math.abs(rtpOf(BASE_WEIGHTS) - SLOTS.paylines.length * line) < 1e-12);
    });

    test("the base table is about 101.0%", () => {
        assert.ok(Math.abs(rtpOf(BASE_WEIGHTS) - 1.01) < 0.002, `${rtpOf(BASE_WEIGHTS)}`);
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
    test("the logo is the rarest symbol", () => {
        assert.deepEqual(rarityOrder(BASE_WEIGHTS), ["ticket", "popcorn", "clapper", "map", "ring", "gauntlet", "logo"]);
    });

    test("there's a table for every 1% from 93% to 110%, covering every RTP the luck gives", () => {
        assert.deepEqual(BUCKETS, Array.from({ length: 18 }, (_, i) => 93 + i));
        for (const rtp of [LUCK.richestRtp, LUCK.poorestRtp, LUCK.soloRtp, LUCK.inactiveRtp]) {
            assert.equal(tableFor(rtp).bucket, Math.round(rtp * 100));
        }
    });

    for (const bucket of Object.keys(TABLES)) {
        test(`the ${bucket}% table is within 0.3% of it and keeps the order of rarity`, () => {
            const weights = TABLES[bucket];
            assert.ok(Math.abs(rtpOf(weights) - Number(bucket) / 100) <= 0.003, `${rtpOf(weights)}`);
            assert.ok(keepsRarityOrder(weights));
            assert.deepEqual(Object.keys(weights).sort(), SLOTS.symbols.map((symbol) => symbol.key).sort());
        });
    }

    test("rank to RTP: richest active gets LUCK.richestRtp, poorest LUCK.poorestRtp, a straight line between", () => {
        const { richestRtp, poorestRtp } = LUCK;
        assert.ok(richestRtp < poorestRtp, "the richer you are, the less comes back");
        assert.equal(targetRtp({ active: true, rank: 1, count: 5 }), richestRtp);
        assert.equal(targetRtp({ active: true, rank: 5, count: 5 }), poorestRtp);
        assert.ok(Math.abs(targetRtp({ active: true, rank: 3, count: 5 }) - (richestRtp + (poorestRtp - richestRtp) / 2)) < 1e-12);
        assert.ok(Math.abs(targetRtp({ active: true, rank: 2, count: 5 }) - (richestRtp + (poorestRtp - richestRtp) / 4)) < 1e-12);
    });

    test("the only active player gets 103%, and inactive players 95%", () => {
        assert.equal(targetRtp({ active: true, rank: 1, count: 1 }), 1.03);
        assert.equal(targetRtp({ active: false }), 0.95);
        assert.equal(LUCK.activeDays, 30);
    });

    test("a spin uses the nearest table", () => {
        assert.equal(tableFor(0.954).bucket, 95);
        assert.equal(tableFor(0.956).bucket, 96);
        assert.equal(tableFor(1.0349).bucket, 103);
        assert.equal(tableFor(0.5).bucket, 93);
        assert.equal(tableFor(2).bucket, 110);
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
    // for each symbol, the middle of the share it has in every table.
    const INSIDE = (() => {
        const keys = SLOTS.symbols.map((symbol) => symbol.key);
        const lows = keys.map(() => 0);
        const highs = keys.map(() => 1);
        for (const weights of Object.values(TABLES)) {
            const total = keys.reduce((sum, key) => sum + weights[key], 0);
            let start = 0;
            keys.forEach((key, i) => {
                lows[i] = Math.max(lows[i], start / total);
                start += weights[key];
                highs[i] = Math.min(highs[i], start / total);
            });
        }
        assert.ok(keys.every((key, i) => lows[i] < highs[i]));
        return Object.fromEntries(keys.map((key, i) => [key, (lows[i] + highs[i]) / 2]));
    })();
    // 5 tickets on every line, as a multiple of the bet.
    const ALL_TICKETS = SLOTS.paylines.length * SYMBOL_BY_KEY.ticket.pays[2];
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
        assert.equal(body.lines.length, SLOTS.paylines.length);
        assert.ok(body.lines.every((won) => won.effect === null && won.text === null && won.gauntlets.length === 0));
        assert.equal(body.win, 15 * ALL_TICKETS);
        assert.equal(body.balance, 20 - 15 + 15 * ALL_TICKETS);
        assert.equal(body.bigWin, true);
        assert.doesNotMatch(JSON.stringify(body), /rtp|bucket|weight|luck/i);

        const machine = await machineOf(user);
        assert.deepEqual([machine.pp, machine.ppp], [0, 500 + 15 * ALL_TICKETS * 100]);
        const logged = await SlotSpin.findOne({ user: user._id }).lean();
        assert.ok(BUCKETS.includes(logged.rtpBucket));
        assert.equal((await call(user, "GET", "/")).body.machine.lastWin, 15 * ALL_TICKETS);
    });

    routeTest("a mixed link line flips the server's coin, and the spin says what it paid as and why", async () => {
        const user = await member(10);
        await call(user, "POST", "/credits", { amount: 10 });
        // The top and bottom rows are mixed links; the coin always lands Rings.
        const grid = [
            ["map", "ticket", "ring"],
            ["gauntlet", "clapper", "gauntlet"],
            ["ring", "popcorn", "map"],
            ["ticket", "clapper", "ticket"],
            ["logo", "ticket", "popcorn"],
        ];
        slots.useRandomSource(landing(grid), () => 1);

        const { body } = await spinOf(user, 1);
        assert.deepEqual(body.grid, grid);
        assert.deepEqual(body.lines.map((won) => [won.symbol, won.effect, won.text, won.gauntlets]), [
            ["ring", "lightning", "CRITICAL HIT!", [[1, 0]]],
            ["ring", "lightning", "CRITICAL HIT!", [[1, 2]]],
        ]);
        assert.equal(body.win, 3.2);
        assert.doesNotMatch(JSON.stringify(body), /rtp|bucket|weight|luck/i);
        const logged = await SlotSpin.findOne({ user: user._id }).lean();
        assert.deepEqual(logged.lines.map((won) => won.text), ["CRITICAL HIT!", "CRITICAL HIT!"]);

        // Coming back to the same spin gives the same lines.
        assert.deepEqual((await spinOf(user, 1, body.spinId)).body.lines, body.lines);
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

    routeTest("the jackpot pays 2,000 times the bet on each line, and everyone hears", async () => {
        const player = await member(1);
        await call(player, "POST", "/credits", { amount: 1 });
        slots.useRandomSource(everywhere("logo"));

        const { body } = await spinOf(player, 1);
        assert.equal(body.jackpot, true);
        assert.equal(body.win, SLOTS.paylines.length * SLOTS.jackpotMultiplier);
        const notes = await Notification.find({ type: "slotJackpot", actors: player._id }).lean();
        assert.equal(notes.length, await User.countDocuments());
        assert.equal(notes[0].amount, SLOTS.paylines.length * SLOTS.jackpotMultiplier);
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

    routeTest("a machine left alone for 15 minutes cashes itself out up to the cap, and the rest is gone", async () => {
        const idle = await member();
        const busy = await member();
        await call(idle, "GET", "/");
        await call(busy, "GET", "/");
        // 20.50 PP and 400.75 P-PP; today's cap is 300 P-PP.
        const quarterAgo = new Date(Date.now() - (SLOTS.idleCashOutMinutes + 1) * 60 * 1000);
        await SlotMachine.collection.updateOne({ user: idle._id }, { $set: { pp: 2050, ppp: 40075, sessionInput: 30000, updatedAt: quarterAgo } });
        // Played a minute ago: left alone.
        await SlotMachine.collection.updateOne({ user: busy._id }, { $set: { pp: 5000, ppp: 0, sessionInput: 5000, updatedAt: new Date(Date.now() - 60 * 1000) } });

        assert.equal(await slots.sweepIdleMachines(), 1);
        assert.deepEqual(await walletOf(idle), { pp: 20, ppp: 300 });
        const emptied = await machineOf(idle);
        assert.deepEqual([emptied.pp, emptied.ppp, emptied.sessionInput, emptied.pppOutToday], [0, 0, 0, 30000]);
        assert.equal((await WalletTx.find({ user: idle._id, reason: "slotCashOut" }).lean()).length, 1);
        assert.equal((await machineOf(busy)).pp, 5000);
        assert.deepEqual(await walletOf(busy), { pp: 0, ppp: 0 });

        // Empty now: nothing more to do. The cap stays used for today.
        assert.equal(await slots.sweepIdleMachines(), 0);
        await SlotMachine.collection.updateOne({ user: idle._id }, { $set: { ppp: 5000, updatedAt: quarterAgo } });
        assert.equal(await slots.sweepIdleMachines(), 1);
        assert.deepEqual(await walletOf(idle), { pp: 20, ppp: 300 });
        assert.equal((await machineOf(idle)).ppp, 0);
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
