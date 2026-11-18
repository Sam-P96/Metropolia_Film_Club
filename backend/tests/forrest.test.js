// Forrest Bounce: the engine on its own (shared/forrest/engine.js), then the
// server's side (utils/forrest.js) against a test database: entries, the
// replayed score, the clock check, cash-outs, bests and buddies.
//
// From backend/: npm test (or node --test tests/forrest.test.js), with
// MONGO_TEST_URI set to a database whose name ends in _test for the second
// part.
const { test, describe, before, after } = require("node:test");
const assert = require("node:assert/strict");
const engine = require("../../shared/forrest/engine.js");
const { FORREST, payoutFor } = require("../../shared/forrest/rules.js");
const { buddyChoices, isAnimal } = require("../../shared/forrest/buddies.js");

// A simple player: taps a moment after landing on a branch, and now and then
// double-jumps. What it scores depends only on the seed.
function play(seed, mult, { maxTicks = engine.MAX_TICKS } = {}) {
    const s = engine.newRun({ seed, mult, visual: false });
    const taps = [];
    let wait = 0;
    while (!s.over && s.tick < maxTicks) {
        let tapped = false;
        if (s.phase === "ready") {
            wait += 1;
            if (wait > 30) {
                tapped = true;
                wait = 0;
            }
        } else if (s.flight && !s.flight.doubled && s.tick % 97 === 0) tapped = true;
        if (tapped) taps.push(s.tick);
        engine.step(s, tapped);
    }
    return { s, taps };
}

describe("the engine", () => {
    test("its own sine and cosine match Math's to within 1e-7", () => {
        let worst = 0;
        for (let x = -60; x <= 60; x += 0.0071) worst = Math.max(worst, Math.abs(engine.dsin(x) - Math.sin(x)), Math.abs(engine.dcos(x) - Math.cos(x)));
        assert.ok(worst < 1e-7, `worst ${worst}`);
    });

    test("a run played again from its seed and taps comes out exactly the same", () => {
        for (const seed of [1, 42, -5, 777, 2024]) {
            const { s, taps } = play(seed, 3);
            const again = engine.replay({ seed, mult: 3, taps, endTick: s.tick });
            assert.deepEqual([again.score, again.fruit, again.level, again.ticks, again.over], [s.score, s.basic, s.level, s.tick, s.over], `seed ${seed}`);
        }
    });

    test("the multiplier only scales the score: the same taps catch the same fruit", () => {
        const { s, taps } = play(-5, 1);
        const tenfold = engine.replay({ seed: -5, mult: 10, taps, endTick: s.tick });
        assert.ok(s.basic > 0);
        assert.equal(tenfold.fruit, s.basic);
        assert.equal(tenfold.score, s.score * 10);
    });

    test("stopping early ends the run there; taps past the end don't count", () => {
        const { s, taps } = play(-5, 3);
        const half = Math.floor(s.tick / 2);
        const early = engine.replay({ seed: -5, mult: 3, taps, endTick: half });
        assert.equal(early.ticks, half);
        assert.equal(early.over, false);
        assert.ok(early.fruit <= s.basic);
    });

    test("nobody tapping is never hit (shurikens fly past the resting spots): the run times out at 20 minutes", () => {
        const idle = engine.replay({ seed: 3, mult: 1, taps: [], endTick: engine.MAX_TICKS });
        assert.deepEqual([idle.over, idle.endedBy, idle.ticks, idle.score], [true, "time", engine.MAX_TICKS, 0]);
    });

    test("payouts: a score is worth 5 to 1, rounded down; break-even is 50 fruit at any entry", () => {
        assert.deepEqual([0, 4, 5, 99, 100].map(payoutFor), [0, 0, 1, 19, 20]);
        for (const cost of FORREST.entries) assert.equal(payoutFor(50 * (cost / 10)), cost);
    });

    test("buddies: the frog and the rabbit, and Infinite Gomoku animals the member owns", () => {
        assert.deepEqual(buddyChoices([]).map((choice) => choice.emoji), ["🐸", "🐰"]);
        const owned = ["piece.emoji.wolf", "piece.emoji.pizza", "piece.emoji.web", "piece.emoji.polar-bear", "piece.emoji.bunny"];
        assert.deepEqual(buddyChoices(owned).map((choice) => choice.name), ["Frog", "Rabbit", "Wolf", "Polar Bear", "Spider"], "the pizza isn't an animal; the bunny is already there");
        assert.ok(isAnimal("😼") && isAnimal("🕷") && !isAnimal("🍕") && !isAnimal("😎"));
    });
});

const uri = process.env.MONGO_TEST_URI;
const dbName = uri ? new URL(uri).pathname.slice(1) : "";

describe("the server", { skip: !uri ? "set MONGO_TEST_URI to run these" : !dbName.endsWith("_test") ? "MONGO_TEST_URI's database must end in _test" : false }, () => {
    const mongoose = require("mongoose");
    let User;
    let ForrestRun;
    let ForrestDay;
    let ForrestPlayer;
    let GomokuOwned;
    let Notification;
    let WalletTx;
    let forrest;
    let playDay;

    before(async () => {
        await mongoose.connect(uri);
        await mongoose.connection.dropDatabase();
        User = require("../models/userModel");
        ForrestRun = require("../models/forrestRunModel");
        ForrestDay = require("../models/forrestDayModel");
        ForrestPlayer = require("../models/forrestPlayerModel");
        GomokuOwned = require("../models/gomokuOwnedModel");
        Notification = require("../models/notificationModel");
        WalletTx = require("../models/walletTxModel");
        forrest = require("../utils/forrest");
        ({ playDay } = require("../utils/wallet"));
        await Promise.all([ForrestDay, ForrestPlayer].map((model) => model.syncIndexes()));
    });
    after(async () => {
        await mongoose.disconnect();
    });

    let count = 0;
    const member = async ({ pp = 100, ppp = 100 } = {}) => {
        count += 1;
        return User.create({ username: `bouncer${count}`, email: `forrest${count}@test.invalid`, password: "x", wallet: { pp, ppp } });
    };
    const walletOf = async (user) => {
        const { wallet } = await User.findById(user._id).select("wallet").lean();
        return { pp: wallet.pp, ppp: wallet.ppp };
    };
    const until = async (check, ms = 5000) => {
        for (let waited = 0; waited < ms; waited += 20) {
            if (await check()) return;
            await new Promise((resolve) => setTimeout(resolve, 20));
        }
        throw new Error("timed out");
    };
    // Plays a run the way the page would, on seed `seed` (set on the run, as
    // if the server had picked it), as if it started long enough ago.
    async function playRun(user, cost, seed) {
        const run = await forrest.startRun(user._id, cost);
        await ForrestRun.updateOne({ _id: run.id }, { $set: { seed, startedAt: new Date(Date.now() - 25 * 60 * 1000 + 60 * 1000) } });
        const { s, taps } = play(seed, run.mult);
        return { run, s, taps, finish: () => forrest.finishRun(user._id, run.id, { taps, endTick: s.tick }) };
    }

    test("an entry is taken (PP first, then P-PP); free play only once the day's cash-outs are used", async () => {
        const player = await member({ pp: 15, ppp: 100 });
        await assert.rejects(forrest.startRun(player._id, 0), /Free play opens once your 3 cash-outs/);
        await assert.rejects(forrest.startRun(player._id, 25), /Pick one of the entries/);
        const run = await forrest.startRun(player._id, 30);
        assert.deepEqual([run.cost, run.mult, run.free, typeof run.seed], [30, 3, false, "number"]);
        assert.deepEqual(await walletOf(player), { pp: 0, ppp: 85 });
        assert.deepEqual((await ForrestRun.findById(run.id).lean()).paid, { pp: 15, ppp: 15 });
        const poor = await member({ pp: 5, ppp: 0 });
        await assert.rejects(forrest.startRun(poor._id, 10), /need 10 points/);
    });

    test("the score is the server's own replay; a run faster than the clock, or with taps out of order, doesn't count", async () => {
        const player = await member();
        const { run, s, finish } = await playRun(player, 10, -5);
        const { run: scored } = await finish();
        assert.deepEqual([scored.status, scored.score, scored.fruit, scored.level, scored.payout], ["finished", s.score, s.basic, s.level, payoutFor(s.score)]);
        await assert.rejects(forrest.finishRun(player._id, run.id, { taps: [], endTick: 100 }), /That run is over/, "only once");

        const quick = await forrest.startRun(player._id, 10);
        await assert.rejects(forrest.finishRun(player._id, quick.id, { taps: [5, 3], endTick: 100 }), /doesn't add up/);
        await assert.rejects(forrest.finishRun(player._id, quick.id, { taps: [], endTick: 120 * 60 }), /faster than the clock/);
        assert.equal((await ForrestRun.findById(quick.id).lean()).status, "discarded");
    });

    test("cash-outs: the entry back in its own coins and the rest in P-PP; three a day; throwing a run away keeps the cash-out; followers hear", async () => {
        const Follow = require("../models/followModel");
        const player = await member({ pp: 100, ppp: 0 });
        const other = await member();
        const stranger = await member();
        await Follow.create({ follower: other._id, following: player._id });
        const { run, s, finish } = await playRun(player, 10, -5);
        await finish();
        const { payout } = await forrest.cashOut(player._id, run.id);
        assert.equal(payout, payoutFor(s.score));
        const tx = await WalletTx.findOne({ user: player._id, reason: "forrestCashOut" }).lean();
        assert.deepEqual([tx.pp, tx.ppp, String(tx.forrest)], [10, payout - 10, run.id]);
        await assert.rejects(forrest.cashOut(player._id, run.id), /can't be cashed out/, "only once");
        await until(async () => (await Notification.countDocuments({ type: "forrestCashOut", actors: player._id })) > 0);
        const notes = await Notification.find({ type: "forrestCashOut", actors: player._id }).lean();
        assert.deepEqual(notes.map((note) => String(note.recipient)), [String(other._id)], "a follower, not the stranger");
        assert.deepEqual([notes[0].amount, notes[0].forrest.entry, notes[0].forrest.net, notes[0].forrest.fruit], [payout, 10, payout - 10, s.basic]);
        assert.equal(await Notification.countDocuments({ recipient: stranger._id, type: { $in: ["forrestCashOut", "forrestBigWin"] } }), 0);

        // Thrown away: no points, the cash-out still there.
        const second = await playRun(player, 10, 1);
        await second.finish();
        await forrest.discard(player._id, second.run.id);
        assert.equal((await forrest.statusOf(player._id)).cashOutsLeft, 2);

        // Two more, then that's the day.
        for (const seed of [42, 1]) {
            const next = await playRun(player, 10, seed);
            await next.finish();
            await forrest.cashOut(player._id, next.run.id);
        }
        assert.equal((await forrest.statusOf(player._id)).cashOutsLeft, 0);
        await assert.rejects(forrest.startRun(player._id, 10), /cash-outs today are used/);
        const freeRun = await playRun(player, 0, 42);
        const { run: freeScored } = await freeRun.finish();
        assert.deepEqual([freeScored.free, freeScored.mult, freeScored.status], [true, 2, "discarded"], "free play is never cashed out");
        await assert.rejects(forrest.cashOut(player._id, freeRun.run.id), /can't be cashed out/);
        assert.equal((await ForrestDay.findOne({ user: player._id, day: playDay() }).lean()).cashOuts, 3);
    });

    test("a cash-out of 5 times the entry or more goes to every member as a big win", async () => {
        const { noteForrestCashOut } = require("../utils/notify");
        const lucky = await member();
        await noteForrestCashOut({ user: lucky._id, cost: 10, score: 250, fruit: 250, level: 4 }, 50);
        assert.equal(await Notification.countDocuments({ type: "forrestBigWin", actors: lucky._id }), await User.countDocuments());
        await noteForrestCashOut({ user: lucky._id, cost: 10, score: 245, fruit: 245, level: 4 }, 49);
        assert.equal(await Notification.countDocuments({ type: "forrestCashOut", actors: lucky._id }), 0, "49 back on 10: only followers (none)");
    });

    test("less back than the entry is split like the entry was paid", () => {
        assert.deepEqual(forrest.splitPayout({ pp: 6, ppp: 4 }, 5), { pp: 3, ppp: 2 });
        assert.deepEqual(forrest.splitPayout({ pp: 10, ppp: 0 }, 25), { pp: 10, ppp: 15 });
        assert.deepEqual(forrest.splitPayout({ pp: 0, ppp: 0 }, 9), { pp: 0, ppp: 9 }, "free play: all P-PP");
    });

    test("bests: beating the site's best goes to everyone as a record; beating your own, as a personal best; a first run sets one quietly", async () => {
        await ForrestPlayer.deleteMany({});
        const ace = await member();
        const rookie = await member();
        const bests = (type, user) => Notification.countDocuments({ type, actors: user._id });

        // ace: 60 fruit (seed -5), the first on the board: a record.
        const first = await playRun(ace, 10, -5);
        const result = await first.finish();
        assert.deepEqual([result.best.site, result.best.personal], [true, false]);
        await until(async () => (await bests("forrestRecord", ace)) === (await User.countDocuments()));

        // rookie: 20 (seed 1), then 40 (seed 42): a quiet first, then a personal best.
        const quiet = await (await playRun(rookie, 10, 1)).finish();
        assert.deepEqual([quiet.best.site, quiet.best.personal], [false, false]);
        const better = await (await playRun(rookie, 10, 42)).finish();
        assert.deepEqual([better.best.site, better.best.personal, better.best.previous], [false, true, 20]);
        await until(async () => (await bests("forrestBest", rookie)) === (await User.countDocuments()));
        const note = await Notification.findOne({ type: "forrestBest", actors: rookie._id }).lean();
        assert.deepEqual([note.forrest.fruit, note.forrest.previous], [40, 20]);

        // No better: nothing.
        const same = await (await playRun(rookie, 10, 1)).finish();
        assert.deepEqual([same.best.site, same.best.personal], [false, false]);

        const board = await forrest.leaderboard();
        assert.deepEqual(board.map((entry) => [entry.user.username, entry.fruit]), [[ace.username, 60], [rookie.username, 40]]);
    });

    test("buddies: two different ones, the frog and the rabbit or Gomoku animals they own", async () => {
        const player = await member();
        assert.deepEqual((await forrest.statusOf(player._id)).buddies, ["🐸", "🐰"]);
        await assert.rejects(forrest.setBuddies(player._id, ["🐺", "🐸"]), /bought in the Infinite Gomoku shop/);
        await GomokuOwned.create([{ user: player._id, item: "piece.emoji.wolf", price: 200 }, { user: player._id, item: "piece.emoji.pizza", price: 200 }]);
        await assert.rejects(forrest.setBuddies(player._id, ["🍕", "🐸"]), /bought in the Infinite Gomoku shop/);
        await assert.rejects(forrest.setBuddies(player._id, ["🐸", "🐸"]), /two different/);
        await forrest.setBuddies(player._id, ["🐺", "🐸"]);
        const status = await forrest.statusOf(player._id);
        assert.deepEqual(status.buddies, ["🐺", "🐸"]);
        assert.deepEqual(status.choices.map((choice) => choice.emoji), ["🐸", "🐰", "🐺"]);
        // The wolf refunded: back to the frog and the rabbit.
        await GomokuOwned.deleteMany({ user: player._id });
        assert.deepEqual((await forrest.statusOf(player._id)).buddies, ["🐸", "🐰"]);
    });

    test("a new run lets go of the one waiting; leaving the club takes their runs", async () => {
        const player = await member();
        const waiting = await playRun(player, 10, 1);
        await waiting.finish();
        assert.equal((await forrest.statusOf(player._id)).waiting.id, waiting.run.id);
        await forrest.startRun(player._id, 10);
        assert.equal((await ForrestRun.findById(waiting.run.id).lean()).status, "discarded");
        await forrest.forgetForrestPlayer(player._id);
        assert.equal(await ForrestRun.countDocuments({ user: player._id }), 0);
    });
});
