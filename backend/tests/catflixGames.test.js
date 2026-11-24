// Catflix No Chill's two games: Ruin Run (utils/catflix/ruinRun.js, the
// engine in public/pet-forge/ruin-engine.js) and Nekomusume: Kitty Race
// (utils/catflix/kittyRace.js). The engine and the payout on their own
// first; then through the real API, against a real MongoDB.
//
// From backend/, with a MongoDB running:
//   PowerShell:  $env:MONGO_TEST_URI="mongodb://127.0.0.1:27017/kino_test"; npm test
//   bash:        MONGO_TEST_URI=mongodb://127.0.0.1:27017/kino_test npm test
// The database is wiped first, so its name has to end in "_test".
const { test, describe, before, after } = require("node:test");
const assert = require("node:assert/strict");

process.env.SECRET ??= "catflix-games-test-secret";
const engine = require("../public/pet-forge/ruin-engine.js");
const { CATFLIX, ruinPayout } = require("../../shared/catflix/rules.js");

// A run played the way the page plays it: tick by tick, with what the
// player did recorded as tick × 8 + what. `plan(tick)` says what to do.
function playLikeThePage(seed, plan, maxTicks = 20000) {
    const s = engine.reset({}, seed);
    const inputs = [];
    while (s.state === "running" && s.tick < maxTicks) {
        const codes = plan(s);
        if (codes) for (const code of codes) inputs.push(s.tick * 8 + code);
        engine.step(s, codes);
    }
    return { s, inputs };
}
// Random presses (the same every time: its own seeded generator).
function randomPlayer(seed) {
    const rand = engine.generator(seed);
    return () => {
        const r = rand();
        if (r < 0.02) return [Math.floor(rand() * 3)];
        if (r < 0.03) return [engine.JUMP];
        if (r < 0.035) return [engine.RELEASE];
        return null;
    };
}

describe("Ruin Run's engine and payout (no database)", () => {
    test("the server's replay gets exactly what the page played", () => {
        for (const seed of [1, 42, 987654, 2 ** 30]) {
            const { s, inputs } = playLikeThePage(seed, randomPlayer(seed));
            const result = engine.replay({ seed, inputs, endTick: s.tick });
            assert.deepEqual(result, { ticks: s.tick, over: s.state === "over", endedBy: s.over ? s.over.why : "stopped", speed: engine.speedPercent(s.mult), metres: engine.metres(s) });
        }
    });

    test("a run stopped early ends there, and its speed is what it had by then", () => {
        const seed = 7;
        const { s, inputs } = playLikeThePage(seed, randomPlayer(seed));
        const half = Math.floor(s.tick / 2);
        const result = engine.replay({ seed, inputs: inputs.filter((value) => Math.floor(value / 8) < half), endTick: half });
        assert.equal(result.ticks, half);
        assert.equal(result.endedBy, "stopped");
        assert.ok(result.speed >= 100 && result.speed <= engine.speedPercent(s.mult));
    });

    test("speed: +2% every second running, from 100%", () => {
        // 2 s, before anything's in the way (the first obstacles are 2.2 s off and further on).
        const result = engine.replay({ seed: 3, inputs: [], endTick: 2 * engine.TICK_HZ });
        assert.deepEqual([result.speed, result.endedBy], [104, "stopped"]);
    });

    test("every 1% above 100% pays back 2% of the bet, no cap", () => {
        assert.equal(ruinPayout(100, 100), 0);
        assert.equal(ruinPayout(100, 99), 0);
        assert.equal(ruinPayout(100, 150), 100, "150%: the bet back");
        assert.equal(ruinPayout(100, 200), 200, "200%: twice it");
        assert.equal(ruinPayout(100, 300), 400);
        assert.equal(ruinPayout(10, 154), 10, "10 × 2 × 54 / 100 = 10.8, rounded down");
        assert.equal(ruinPayout(10000, 1100), 200000, "no cap");
    });
});

const uri = process.env.MONGO_TEST_URI;
const dbName = uri ? new URL(uri).pathname.slice(1) : "";

describe("Ruin Run and Kitty Race", { skip: !uri ? "set MONGO_TEST_URI to run these" : !dbName.endsWith("_test") ? "MONGO_TEST_URI's database must end in _test" : false }, () => {
    const mongoose = require("mongoose");
    const express = require("express");
    const jwt = require("jsonwebtoken");
    let base;
    let server;
    let User;
    let Follow;
    let CatflixPet;
    let CatflixRun;
    let CatflixRace;
    let Jackpot;
    let kittyRace;
    const tokens = new Map();

    before(async () => {
        await mongoose.connect(uri);
        await mongoose.connection.dropDatabase();
        User = require("../models/userModel");
        Follow = require("../models/followModel");
        CatflixPet = require("../models/catflixPetModel");
        CatflixRun = require("../models/catflixRunModel");
        CatflixRace = require("../models/catflixRaceModel");
        Jackpot = require("../models/jackpotModel");
        kittyRace = require("../utils/catflix/kittyRace");
        await Promise.all(
            [User, Follow, CatflixPet, CatflixRun, CatflixRace, require("../models/catflixRunDayModel"), require("../models/catflixPlayerModel"), require("../models/petFormModel")].map((model) => model.syncIndexes())
        );
        await require("../models/petBaseFormModel").create({ _id: "catbase1", name: "Cat", anims: {}, fur: [] });
        const PetForm = require("../models/petFormModel");
        for (const [id, rarity] of [["common1", "common"], ["uncomm1", "uncommon"], ["rare001", "rare"]]) await PetForm.create({ _id: id, name: id, baseFormId: "catbase1", rarity });
        // All three scratch jackpots exist from here on (each pool is made, with
        // its seed, the first time something goes in), so what's fed in shows
        // as the difference.
        await require("../utils/scratch").feedJackpots(100);

        const app = express();
        app.use(express.json());
        app.use("/api/catflix", require("../routes/catflixRouter"));
        app.use((error, req, res, next) => {
            console.error(error);
            res.status(500).json({ error: "Something went wrong" });
        });
        server = app.listen(0);
        base = `http://127.0.0.1:${server.address().port}/api/catflix`;
    });

    after(async () => {
        server?.close();
        await mongoose.disconnect();
    });

    let count = 0;
    async function member({ pp = 0, ppp = 0, pet = true } = {}) {
        count += 1;
        const user = await User.create({ username: `runner${count}`, email: `rr${count}@test.invalid`, password: "x", wallet: { pp, ppp } });
        tokens.set(String(user._id), jwt.sign({ _id: user._id }, process.env.SECRET));
        if (pet) await call(user, "POST", "/egg/hatch", { name: `Cat ${count}` });
        return user;
    }
    async function call(user, method, path, body) {
        const response = await fetch(base + path, {
            method,
            headers: { Authorization: `Bearer ${tokens.get(String(user._id))}`, "Content-Type": "application/json" },
            body: body === undefined ? undefined : JSON.stringify(body),
        });
        return { status: response.status, body: await response.json().catch(() => null) };
    }
    const walletOf = async (user) => {
        const { wallet } = await User.findById(user._id).select("wallet").lean();
        return { pp: wallet.pp, ppp: wallet.ppp };
    };
    const jackpots = async () => (await Jackpot.find().lean()).reduce((sum, pool) => sum + pool.amount, 0);
    const confidenceOf = async (user) => (await CatflixPet.findOne({ owner: user._id }).lean()).meters.confidence;
    async function friends(a, b) {
        await Follow.create({ follower: a._id, following: b._id });
        await Follow.create({ follower: b._id, following: a._id });
    }
    // Plays a run of `seed` like the page, and makes it look like it took as
    // long as it did (the server won't take a run faster than the clock).
    async function playRun(user, runId, seed) {
        const { s, inputs } = playLikeThePage(seed, randomPlayer(seed));
        await CatflixRun.updateOne({ _id: runId }, { $set: { startedAt: new Date(Date.now() - (s.tick / engine.TICK_HZ) * 1000 - 1000) } });
        return { s, inputs, finish: () => call(user, "POST", `/run/${runId}/finish`, { inputs, endTick: s.tick }) };
    }

    // ---- Ruin Run ----

    test("Ruin Run: a bet, a run played again on the server, +1 confidence, and a cash-out paying 2% for every 1% above 100%", async () => {
        const user = await member({ pp: 60, ppp: 500 });
        assert.equal((await call(user, "POST", "/run", { bet: 10001 })).status, 400, "10,000 at most");
        assert.equal((await call(user, "POST", "/run", { bet: 0 })).status, 409, "free play only once the cash-outs are used");

        const started = await call(user, "POST", "/run", { bet: 100 });
        assert.equal(started.status, 200);
        assert.deepEqual(await walletOf(user), { pp: 0, ppp: 460 }, "PP first, then P-PP");
        const confidence = await confidenceOf(user);
        const jackpotBefore = await jackpots();

        const { s, finish } = await playRun(user, started.body.run.id, started.body.run.seed);
        const finished = await finish();
        assert.equal(finished.status, 200);
        const speed = engine.speedPercent(s.mult);
        assert.equal(finished.body.run.speed, speed, "the server's replay matches the page");
        assert.equal(finished.body.run.worth, ruinPayout(100, speed));
        assert.equal(finished.body.status.waiting.id, started.body.run.id);
        assert.equal(await confidenceOf(user), Math.min(100, confidence + 1));
        assert.equal(finished.body.status.best, engine.metres(s));

        const cashed = await call(user, "POST", `/run/${started.body.run.id}/cashout`);
        assert.equal(cashed.status, 200);
        const worth = ruinPayout(100, speed);
        assert.equal(cashed.body.payout, worth);
        assert.equal(cashed.body.status.cashOutsLeft, 2);
        // The bet came 60 PP + 40 P-PP; less back than that is split like it was paid.
        const back = worth >= 100 ? { pp: 60, ppp: 40 + worth - 100 } : { pp: Math.floor((worth * 60) / 100), ppp: worth - Math.floor((worth * 60) / 100) };
        assert.deepEqual(await walletOf(user), { pp: back.pp, ppp: 460 + back.ppp });
        assert.equal((await jackpots()) - jackpotBefore, Math.max(0, 100 - worth), "what the run lost goes to the scratch jackpots");
        assert.equal((await call(user, "POST", `/run/${started.body.run.id}/cashout`)).status, 404, "once");
    });

    test("Ruin Run: a run faster than the clock doesn't count, and a pet's needed", async () => {
        const petless = await member({ pp: 100, pet: false });
        assert.equal((await call(petless, "POST", "/run", { bet: 10 })).status, 409);

        const user = await member({ pp: 100 });
        const started = await call(user, "POST", "/run", { bet: 50 });
        const jackpotBefore = await jackpots();
        const tooFast = await call(user, "POST", `/run/${started.body.run.id}/finish`, { inputs: [], endTick: 60 * engine.TICK_HZ });
        assert.equal(tooFast.status, 409);
        assert.match(tooFast.body.error, /faster than the clock/);
        assert.equal((await CatflixRun.findById(started.body.run.id).lean()).status, "discarded");
        assert.equal((await jackpots()) - jackpotBefore, 50);
        const bad = await call(user, "POST", `/run/${started.body.run.id}/finish`, { inputs: ["x"], endTick: 10 });
        assert.equal(bad.status, 400);
    });

    test("Ruin Run: three cash-outs a play day, throwing a run away keeps one, then free play", async () => {
        const user = await member({ pp: 1000 });
        for (let i = 0; i < 4; i++) {
            const started = await call(user, "POST", "/run", { bet: 1 });
            assert.equal(started.status, 200, `run ${i + 1}`);
            const { finish } = await playRun(user, started.body.run.id, 100 + i);
            assert.equal((await finish()).status, 200);
            if (i === 0) {
                // Thrown away: the cash-out's still there.
                const thrown = await call(user, "POST", `/run/${started.body.run.id}/discard`);
                assert.equal(thrown.body.status.cashOutsLeft, 3);
            } else assert.equal((await call(user, "POST", `/run/${started.body.run.id}/cashout`)).status, 200);
        }
        const paid = await call(user, "POST", "/run", { bet: 1 });
        assert.equal(paid.status, 409, "no more paid runs today");
        assert.match(paid.body.error, /free play/);
        const free = await call(user, "POST", "/run", { bet: 0 });
        assert.equal(free.status, 200);
        const before = await walletOf(user);
        const confidence = await confidenceOf(user);
        const { finish } = await playRun(user, free.body.run.id, 999);
        const done = await finish();
        assert.equal(done.body.run.status, "discarded", "free play is never cashed out");
        assert.equal(done.body.run.worth, 0);
        assert.deepEqual(await walletOf(user), before);
        assert.equal(await confidenceOf(user), Math.min(100, confidence + 1), "it still counts for the pet");
    });

    // ---- A friend's cat that loves you ----

    test("A friend's cat with 80+ love for you: a 5% chance a day of stealing 5% of its owner's PP for you, as P-PP", async () => {
        const { giftRound } = require("../utils/catflix/gifts");
        const Notification = require("../models/notificationModel");
        const rich = await member({ pp: 1000, ppp: 77 });
        const poor = await member({ pp: 10 });
        const fan = await member();
        const lukewarm = await member();
        const stranger = await member();
        await friends(rich, fan);
        await friends(rich, lukewarm);
        await friends(poor, fan);
        // Happy, full cats (so their love doesn't fade).
        const calm = { "meters.happiness": 90, "meters.hunger": 100, fullUntil: new Date(Date.now() + 30 * 24 * 3600 * 1000), clock: new Date(), poops: 0, poopClock: new Date() };
        await CatflixPet.updateOne({ owner: rich._id }, { $set: { ...calm, loveBy: { [fan._id]: 85, [lukewarm._id]: 50, [stranger._id]: 95 } } });
        await CatflixPet.updateOne({ owner: poor._id }, { $set: { ...calm, loveBy: { [fan._id]: 99 } } });
        const richCat = await CatflixPet.findOne({ owner: rich._id }).lean();

        const now = new Date();
        assert.equal(await giftRound({ now, random: () => 0 }), 1, "the fan gets 5% of the rich owner's PP; 5% of 10 PP is nothing");
        assert.deepEqual(await walletOf(rich), { pp: 950, ppp: 77 }, "PP only");
        assert.deepEqual(await walletOf(fan), { pp: 0, ppp: 50 }, "as P-PP");
        assert.deepEqual(await walletOf(poor), { pp: 10, ppp: 0 });
        assert.deepEqual([await walletOf(lukewarm), await walletOf(stranger)], [{ pp: 0, ppp: 0 }, { pp: 0, ppp: 0 }], "not enough love, or not a friend");

        const [toFan] = await Notification.find({ recipient: fan._id, type: "catflixGift" }).lean();
        assert.equal(toFan.amount, 50);
        assert.equal(String(toFan.actors[0]), String(rich._id));
        assert.deepEqual([toFan.catflix.petName, toFan.catflix.skinId], [richCat.name, richCat.skinId]);
        assert.equal(await Notification.countDocuments({ recipient: rich._id, type: "catflixStolen", amount: 50 }), 1, "the owner's told");

        assert.equal(await giftRound({ now, random: () => 0 }), 0, "once a play day");
        assert.equal(await giftRound({ now: new Date(now.getTime() + 24 * 3600 * 1000), random: () => 0.06 }), 0, "a 5% chance: 0.06 misses");
        assert.deepEqual(await walletOf(fan), { pp: 0, ppp: 50 });
    });

    // ---- Kitty Race ----

    // Randomness for the race's start: `first` for the winner's place in the
    // field (0: the first member in it; 9: the last house cat), 0 after.
    const fixed = (first) => {
        let calls = 0;
        return () => (calls++ === 0 ? first : 0);
    };

    test("Kitty Race alone: 9 house cats, every cat the same chance, and a win pays 10 times the bet", async () => {
        const user = await member({ pp: 60, ppp: 1000 });
        const race = await kittyRace.openRace(user._id, { bet: 100, solo: true }, { random: fixed(0) });
        assert.equal(race.status, "started");
        assert.equal(race.racers.length, 10);
        assert.equal(race.racers.filter((racer) => !racer.owner).length, 9);
        assert.equal(new Set(race.racers.map((racer) => racer.name)).size, 10);
        assert.equal(String(race.racers[race.order[0]].owner), String(user._id), "theirs won");
        assert.deepEqual([...race.order].sort((a, b) => a - b), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
        assert.equal(race.entries[0].payout, 1000);
        // Paid 60 PP + 40 P-PP; back: the 60 PP, and 940 P-PP.
        assert.deepEqual(await walletOf(user), { pp: 60, ppp: 1900 });
        assert.ok(race.startAt > new Date() && race.endsAt > race.startAt);
        assert.ok(Object.keys(CATFLIX.kittyRace.maps).includes(race.map));
    });

    test("Kitty Race: the track is picked at random, every one of them in use", async () => {
        const user = await member({ pp: 100000 });
        const seen = new Set();
        for (let i = 0; i < 40 && seen.size < 4; i++) seen.add((await kittyRace.openRace(user._id, { bet: 1, solo: true })).map);
        assert.deepEqual([...seen].sort(), Object.keys(CATFLIX.kittyRace.maps).sort());
    });

    test("Kitty Race alone, lost: 90% of the bet to the scratch jackpots", async () => {
        const user = await member({ pp: 500 });
        const jackpotBefore = await jackpots();
        const race = await kittyRace.openRace(user._id, { bet: 100, solo: true }, { random: fixed(9) });
        assert.equal(race.racers[race.order[0]].owner, null, "a house cat won");
        assert.equal(race.entries[0].payout, 0);
        assert.deepEqual(await walletOf(user), { pp: 400, ppp: 0 });
        assert.equal((await jackpots()) - jackpotBefore, 90);
        assert.equal((await call(user, "POST", "/race", { bet: 5001, solo: true })).status, 400, "5,000 at most");
    });

    test("Kitty Race with friends: only friends join, leaving gives the bet back, only the host starts it", async () => {
        const host = await member({ pp: 5000 });
        const friend = await member({ pp: 5000 });
        const stranger = await member({ pp: 5000 });
        await friends(host, friend);

        const opened = await call(host, "POST", "/race", { bet: 300 });
        assert.equal(opened.status, 200);
        const mine = opened.body.races.mine;
        assert.equal(mine.phase, "open");
        assert.ok(Object.keys(CATFLIX.kittyRace.maps).includes(mine.map), "a track picked at random");
        assert.equal((await call(host, "POST", "/race", { bet: 10 })).status, 409, "one race at a time");

        const seen = await call(friend, "GET", "/race");
        assert.deepEqual(seen.body.races.open.map((race) => race.id), [mine.id], "a friend sees it");
        assert.deepEqual((await call(stranger, "GET", "/race")).body.races.open, [], "a stranger doesn't");
        assert.equal((await call(stranger, "POST", `/race/${mine.id}/join`, { bet: 100 })).status, 403);

        assert.equal((await call(friend, "POST", `/race/${mine.id}/join`, { bet: 200 })).status, 200);
        assert.deepEqual(await walletOf(friend), { pp: 4800, ppp: 0 });
        assert.equal((await call(friend, "POST", `/race/${mine.id}/leave`)).status, 200);
        assert.deepEqual(await walletOf(friend), { pp: 5000, ppp: 0 }, "the bet back");
        const rejoined = await call(friend, "POST", `/race/${mine.id}/join`, { bet: 200 });
        assert.equal(rejoined.body.races.mine.entries.length, 2);

        assert.equal((await call(friend, "POST", `/race/${mine.id}/start`)).status, 403, "only the host");
        const started = await call(host, "POST", `/race/${mine.id}/start`);
        assert.equal(started.status, 200);
        const race = started.body.races.mine;
        assert.equal(race.phase, "countdown");
        assert.equal(race.racers.length, 10);
        assert.equal(race.racers.filter((racer) => racer.owner).length, 2);
        const winner = race.racers[race.order[0]].owner;
        for (const [user, bet] of [[host, 300], [friend, 200]]) {
            const entry = race.entries.find((e) => e.user === String(user._id));
            const won = winner === String(user._id);
            assert.equal(entry.payout, won ? bet * 10 : 0);
            assert.deepEqual(await walletOf(user), won ? { pp: 5000, ppp: bet * 9 } : { pp: 5000 - bet, ppp: 0 });
        }
        assert.equal((await call(friend, "POST", `/race/${mine.id}/leave`)).status, 409, "no leaving once it's started");
    });

    test("Kitty Race: the host leaving calls it off, everyone's bet back; a race left waiting starts by itself", async () => {
        const host = await member({ pp: 1000 });
        const friend = await member({ pp: 1000 });
        await friends(host, friend);
        const opened = await call(host, "POST", "/race", { bet: 100 });
        await call(friend, "POST", `/race/${opened.body.races.mine.id}/join`, { bet: 50 });
        const off = await call(host, "POST", `/race/${opened.body.races.mine.id}/leave`);
        assert.equal(off.status, 200);
        assert.equal((await CatflixRace.findById(opened.body.races.mine.id).lean()).status, "cancelled");
        assert.deepEqual([await walletOf(host), await walletOf(friend)], [{ pp: 1000, ppp: 0 }, { pp: 1000, ppp: 0 }]);

        const again = await call(host, "POST", "/race", { bet: 100 });
        const id = again.body.races.mine.id;
        // Straight to the collection: Mongoose keeps createdAt as it was made.
        await CatflixRace.collection.updateOne({ _id: new mongoose.Types.ObjectId(id) }, { $set: { createdAt: new Date(Date.now() - (CATFLIX.kittyRace.lobbyMinutes * 60 + 5) * 1000) } });
        const looked = await call(friend, "GET", "/race");
        assert.equal(looked.status, 200);
        assert.equal((await CatflixRace.findById(id).lean()).status, "started", "started by itself");
    });
});
