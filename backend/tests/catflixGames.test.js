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
        assert.equal((await call(user, "POST", "/run", { bet: 5001 })).status, 400, "5,000 at most");
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

    // ---- Ruin Run's best runs and notifications ----

    const until = async (check, ms = 5000) => {
        for (let waited = 0; waited < ms; waited += 20) {
            if (await check()) return;
            await new Promise((resolve) => setTimeout(resolve, 20));
        }
        throw new Error("timed out");
    };
    // A run played some other time: free play, its speed and distance.
    const pastRun = (user, speed, metres, extra = {}) =>
        CatflixRun.create({ user: user._id, day: "2026-01-01", seed: 1, bet: 0, free: true, status: "discarded", finishedAt: new Date(), ticks: 600, speed, metres, ...extra });
    // A run started and played like the page, not sent yet: what it'll come to.
    async function playedRun(user) {
        const started = await call(user, "POST", "/run", { bet: 1 });
        assert.equal(started.status, 200);
        const played = await playRun(user, started.body.run.id, started.body.run.seed);
        return { ...played, id: started.body.run.id, speed: engine.speedPercent(played.s.mult) };
    }
    const notes = (type, user) => require("../models/notificationModel").countDocuments({ type, actors: user._id });

    test("Ruin Run's best runs: one a member, fastest first, then furthest; runs never played don't count", async () => {
        const [slow, far, fast, quitter] = [await member({ pet: false }), await member({ pet: false }), await member({ pet: false }), await member({ pet: false })];
        await pastRun(slow, 5180, 900);
        await pastRun(slow, 5150, 2000);
        await pastRun(far, 5180, 1200);
        await pastRun(fast, 5240, 500);
        // Let go before it came back: the replay never gave it ticks.
        await pastRun(quitter, 9000, 0, { ticks: 0, free: false, bet: 10 });

        const { body } = await call(slow, "GET", "/run");
        assert.deepEqual(
            body.status.leaderboard.slice(0, 3).map((entry) => [entry.user.username, entry.speed, entry.metres]),
            [[fast.username, 5240, 500], [far.username, 5180, 1200], [slow.username, 5180, 900]]
        );
        assert.ok(!body.status.leaderboard.some((entry) => entry.user.username === quitter.username));
        assert.equal(body.status.leaderboard[0].user.email, undefined, "only their name and picture");
        assert.deepEqual(body.status.bestRun, { speed: 5180, metres: 900 }, "their own best, by speed");
        assert.equal((await call(quitter, "GET", "/run")).body.status.bestRun, null);
        await CatflixRun.deleteMany({ speed: { $gte: 5000 } });
    });

    test("Ruin Run: a new best speed goes out to every member, beating everyone's is the site record, and a first run is quiet", async () => {
        const members = await User.countDocuments();
        const someoneElse = await member({ pet: false });

        // A first run, someone faster: nothing goes out.
        const newbie = await member({ pp: 10 });
        const first = await playedRun(newbie);
        await pastRun(someoneElse, first.speed + 100, 10);
        const quiet = await first.finish();
        assert.deepEqual(quiet.body.best, { personal: false, site: false, previous: 0 });

        // Their own best beaten, someone faster: every member hears.
        const rookie = await member({ pp: 10 });
        const second = await playedRun(rookie);
        await pastRun(rookie, second.speed - 1, 10);
        await pastRun(someoneElse, second.speed + 100, 10);
        const beat = await second.finish();
        assert.deepEqual(beat.body.best, { personal: true, site: false, previous: second.speed - 1 });
        await until(async () => (await notes("ruinBest", rookie)) === members + 3);
        const note = await require("../models/notificationModel").findOne({ type: "ruinBest", actors: rookie._id }).lean();
        assert.deepEqual(note.ruin, { speed: second.speed, metres: engine.metres(second.s), previous: second.speed - 1 });

        // Faster than everyone: the site record.
        const ace = await member({ pp: 10 });
        const third = await playedRun(ace);
        await CatflixRun.deleteMany({ ticks: { $gt: 0 }, speed: { $gte: third.speed } });
        await pastRun(ace, third.speed - 1, 10);
        const record = await third.finish();
        assert.deepEqual(record.body.best, { personal: true, site: true, previous: third.speed - 1 });
        await until(async () => (await notes("ruinRecord", ace)) === members + 4);
        assert.equal(await notes("ruinBest", ace), 0, "the record says it all");
        assert.equal((await notes("ruinBest", newbie)) + (await notes("ruinRecord", newbie)), 0, "still nothing for the first run");
    });

    test("Ruin Run: a cash-out goes to the player's followers; 5 times the bet or more goes to everyone", async () => {
        const Notification = require("../models/notificationModel");
        const player = await member({ pp: 100 });
        const fan = await member({ pet: false });
        const stranger = await member({ pet: false });
        await Follow.create({ follower: fan._id, following: player._id });

        // Worth 12 on a 10 PP bet (what its speed paid, set here: a played run's speed is whatever it was).
        const started = await call(player, "POST", "/run", { bet: 10 });
        const { finish, s } = await playRun(player, started.body.run.id, started.body.run.seed);
        await finish();
        await CatflixRun.updateOne({ _id: started.body.run.id }, { $set: { worth: 12 } });
        assert.equal((await call(player, "POST", `/run/${started.body.run.id}/cashout`)).status, 200);
        await until(async () => (await Notification.countDocuments({ type: "ruinCashOut", actors: player._id })) > 0);
        const note = await Notification.findOne({ type: "ruinCashOut", actors: player._id }).lean();
        assert.equal(String(note.recipient), String(fan._id));
        assert.equal(note.amount, 12);
        assert.deepEqual(note.ruin, { bet: 10, speed: engine.speedPercent(s.mult), metres: engine.metres(s), net: 2 });
        assert.equal(await Notification.countDocuments({ recipient: stranger._id, type: { $in: ["ruinCashOut", "ruinBigWin"] } }), 0);

        // Worth 50 on 10: big news, for every member.
        const big = await call(player, "POST", "/run", { bet: 10 });
        await (await playRun(player, big.body.run.id, big.body.run.seed)).finish();
        await CatflixRun.updateOne({ _id: big.body.run.id }, { $set: { worth: 50 } });
        assert.equal((await call(player, "POST", `/run/${big.body.run.id}/cashout`)).status, 200);
        await until(async () => (await Notification.countDocuments({ type: "ruinBigWin", actors: player._id })) === (await User.countDocuments()));
        assert.equal((await Notification.findOne({ type: "ruinBigWin", recipient: stranger._id }).lean()).ruin.net, 40);
        assert.equal(await Notification.countDocuments({ type: "ruinCashOut", actors: player._id }), 1, "the big one only once, as big news");
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
    // field (0: the first member in it; 9: the last house cat), 0 after (so
    // every mishap, and no house cat throwing a cheat item).
    const fixed = (first) => {
        let calls = 0;
        return () => (calls++ === 0 ? first : 0);
    };
    // The moment `ms` into a race (its clock: 0 at the off, after the countdown).
    const raceTime = (race, ms) => new Date(new Date(race.startAt).getTime() + CATFLIX.kittyRace.countdownMs + ms);
    // When cheat items can't change a race any more, and its winner's paid.
    const settleMs = CATFLIX.kittyRace.winnerMs - CATFLIX.kittyRace.cheats.lateMs;

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
        // Paid 60 PP + 40 P-PP; paid out once cheat items can't change who wins (15 s before the winner's finish):
        // the 60 PP back, and 940 P-PP.
        assert.deepEqual(await walletOf(user), { pp: 0, ppp: 960 });
        assert.equal(await kittyRace.settleDue(raceTime(race, settleMs - 1)), 0, "not yet");
        assert.equal(await kittyRace.settleDue(raceTime(race, settleMs)), 1);
        assert.deepEqual(await walletOf(user), { pp: 60, ppp: 1900 });
        assert.equal(await kittyRace.settleDue(raceTime(race, settleMs + 60000)), 0, "once");
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

    test("Kitty Race mishaps: brawls (sometimes two, four cats), celebrating too soon, lightning in the rain, giving up; any time along the track, all in one race at once; never the winner, so every cat keeps the same chance", async () => {
        const crypto = require("crypto");
        const odds = CATFLIX.kittyRace.mishaps;
        const runs = 5000;
        const seen = { brawl: 0, two: 0, party: 0, struck: 0, quit: 0, all: 0 };
        const times = { brawl: [], struck: [] };
        for (let i = 0; i < runs; i++) {
            const winner = crypto.randomInt(10);
            const m = kittyRace.mishapsFor(10, winner, crypto.randomInt, "rain");
            if (!m) continue;
            const lanes = [...m.brawls.flatMap((brawl) => [brawl.attacker, brawl.victim]), m.celebrate?.lane, m.lightning?.lane, m.quit?.lane].filter((lane) => lane !== undefined);
            assert.equal(new Set(lanes).size, lanes.length, "never two mishaps to one cat");
            assert.ok(!lanes.includes(winner), "never the winner");
            for (const brawl of m.brawls) {
                assert.equal(Math.abs(brawl.attacker - brawl.victim), 1, "next-door lanes");
                assert.ok(brawl.atMs >= odds.brawlFrom && brawl.atMs <= odds.brawlTo);
                times.brawl.push(brawl.atMs);
            }
            if (m.lightning) {
                assert.ok(m.lightning.atMs >= odds.lightningFrom && m.lightning.atMs <= odds.lightningTo);
                times.struck.push(m.lightning.atMs);
            }
            seen.brawl += m.brawls.length > 0;
            seen.two += m.brawls.length === 2;
            seen.party += Boolean(m.celebrate);
            seen.struck += Boolean(m.lightning);
            seen.quit += Boolean(m.quit);
            if (m.quit) assert.ok(m.quit.atMs >= odds.quitFrom && m.quit.atMs <= odds.quitTo);
            seen.all += m.brawls.length > 0 && Boolean(m.celebrate) && Boolean(m.lightning) && Boolean(m.quit);
        }
        const share = (n) => n / runs;
        assert.ok(Math.abs(share(seen.brawl) - 0.2) < 0.025, `a brawl in ${(share(seen.brawl) * 100).toFixed(1)}% of races`);
        assert.ok(Math.abs(share(seen.two) - 0.04) < 0.012, `two brawls (four cats) in ${(share(seen.two) * 100).toFixed(1)}%`);
        assert.ok(Math.abs(share(seen.party) - 0.2) < 0.025, `too soon in ${(share(seen.party) * 100).toFixed(1)}%`);
        assert.ok(Math.abs(share(seen.struck) - 0.5) < 0.03, `lightning in ${(share(seen.struck) * 100).toFixed(1)}% of rainy races`);
        assert.ok(Math.abs(share(seen.quit) - 0.1) < 0.02, `giving up in ${(share(seen.quit) * 100).toFixed(1)}%`);
        assert.ok(seen.all > 0, "all of them in one race, sometimes");
        // Anywhere along the track: early, middle and late all come up.
        for (const [what, list, from, to] of [["brawls", times.brawl, odds.brawlFrom, odds.brawlTo], ["lightning", times.struck, odds.lightningFrom, odds.lightningTo]]) {
            const third = (to - from) / 3;
            const thirds = [0, 1, 2].map((k) => list.filter((t) => t >= from + k * third && t < from + (k + 1) * third).length);
            assert.ok(thirds.every((n) => n > list.length * 0.25), `${what} spread along the race: ${thirds}`);
        }
        for (const weather of ["sunny", "snow", null]) {
            for (let i = 0; i < 300; i++) assert.equal(kittyRace.mishapsFor(10, 0, crypto.randomInt, weather)?.lightning ?? null, null, `no lightning: ${weather}`);
        }

        // In a race (every roll 0: two brawls and too soon, and lightning if it's raining): the one who celebrated too
        // soon comes in after the rest, then the ones who never finished; the winner's paid all the same.
        const user = await member({ pp: 1000 });
        const race = await kittyRace.openRace(user._id, { bet: 100, solo: true }, { random: fixed(0) });
        const { brawls, celebrate, lightning, quit } = race.mishaps;
        assert.equal(brawls.length, 2, "four cats brawling");
        assert.ok(celebrate && quit);
        assert.equal(Boolean(lightning), ["rain", "thunder"].includes(race.weather), `lightning only in the rain (${race.weather})`);
        const unlucky = [celebrate.lane, quit.lane, ...(lightning ? [lightning.lane] : []), ...brawls.flatMap((brawl) => [brawl.attacker, brawl.victim])];
        assert.deepEqual(race.order.slice(-unlucky.length), unlucky, "celebrated too soon, then the ones who never finished");
        assert.equal(String(race.racers[race.order[0]].owner), String(user._id));
        assert.equal(race.entries[0].payout, 1000);
        const view = (await call(user, "GET", "/race")).body.races.mine;
        assert.deepEqual(view.mishaps, race.mishaps, "every page gets them");
    });

    test("Kitty Race alone, lost: 90% of the bet to the scratch jackpots", async () => {
        const user = await member({ pp: 500 });
        const jackpotBefore = await jackpots();
        const race = await kittyRace.openRace(user._id, { bet: 100, solo: true }, { random: fixed(9) });
        assert.equal(race.racers[race.order[0]].owner, null, "a house cat won");
        assert.equal(race.entries[0].payout, 0);
        assert.equal(await kittyRace.settleRace(race._id), true);
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
        // The winner: first after any cheat items the house cats threw (one can knock out the cat that was going to win).
        const winner = race.racers[race.finish[0]].owner;
        await kittyRace.settleRace(race.id);
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

    // ---- Kitty Race's cheat items ----

    const give = (user, cheats) => require("../models/catflixPlayerModel").updateOne({ user: user._id }, { $set: { ...Object.fromEntries(Object.entries(cheats).map(([kind, n]) => [`cheats.${kind}`, n])) } }, { upsert: true });
    const cheatsOf = async (user) => (await require("../models/catflixPlayerModel").findOne({ user: user._id }).lean())?.cheats;
    // A race between `host` and `friend` (friends), started with every roll 0 (no mishaps by the luck of it: those
    // are turned off here; no house cat throws), and set so the host's cat wins and the friend's comes in second.
    async function twoCatRace(host, friend, { hostBet = 100, friendBet = 100 } = {}) {
        await friends(host, friend);
        const { id } = (await call(host, "POST", "/race", { bet: hostBet })).body.races.mine;
        await call(friend, "POST", `/race/${id}/join`, { bet: friendBet });
        const started = await kittyRace.startRace(id, { by: host._id, random: fixed(0) });
        const lane = (user) => started.racers.findIndex((racer) => String(racer.owner) === String(user._id));
        const [h, f] = [lane(host), lane(friend)];
        const order = [h, f, ...started.order.filter((l) => l !== h && l !== f)];
        await CatflixRace.updateOne({ _id: id }, { $set: { order, finish: order, mishaps: null, entries: started.entries.map((e) => ({ ...e, payout: String(e.user) === String(host._id) ? e.bet * 10 : 0 })) } });
        return { race: await CatflixRace.findById(id).lean(), h, f };
    }

    test("Cheat items: the pet shop sells TNT and a Banana Peel, 200 PP each (PP first, then P-PP)", async () => {
        const user = await member({ pp: 150, ppp: 500 });
        const bought = await call(user, "POST", "/shop/buy", { item: "cheat", kind: "tnt" });
        assert.equal(bought.status, 200);
        assert.deepEqual(bought.body.player.cheats, { tnt: 1, banana: 0 });
        assert.deepEqual(await walletOf(user), { pp: 0, ppp: 450 }, "150 PP, then 50 P-PP");
        assert.deepEqual((await call(user, "POST", "/shop/buy", { item: "cheat", kind: "banana" })).body.player.cheats, { tnt: 1, banana: 1 });
        assert.deepEqual((await call(user, "POST", "/shop/buy", { item: "cheat", kind: "banana" })).body.player.cheats, { tnt: 1, banana: 2 }, "as many as they like");
        assert.equal((await call(user, "POST", "/shop/buy", { item: "cheat", kind: "anvil" })).status, 400);
        assert.equal((await call(user, "POST", "/shop/buy", { item: "cheat", kind: "tnt" })).status, 400, "not enough points");
        assert.deepEqual(await cheatsOf(user), { tnt: 1, banana: 2 });
    });

    test("Cheat items: TNT that hits the cat that was going to win knocks it out, and the next in line wins, the thrower's too; paid once nothing can change it", async () => {
        const host = await member({ pp: 1000 });
        const friend = await member({ pp: 1000 });
        await give(friend, { tnt: 2 });
        const { race, h, f } = await twoCatRace(host, friend, { hostBet: 300, friendBet: 200 });
        assert.equal((await kittyRace.throwItem(friend._id, race._id, { item: "tnt", lane: h }, { now: raceTime(race, -500) }).catch((e) => e)).status, 409, "not before the off");

        const thrown = await kittyRace.throwItem(friend._id, race._id, { item: "tnt", lane: h }, { now: raceTime(race, 20000), random: () => 0 });
        const t = thrown.throws.at(-1);
        assert.deepEqual({ ...t, by: String(t.by) }, { by: String(friend._id), username: friend.username, from: f, item: "tnt", target: h, atMs: 20000, landsMs: 20000 + CATFLIX.kittyRace.cheats.flightMs, hit: true });
        assert.equal(thrown.finish[0], f, "the friend's cat, next in line, wins");
        assert.equal(thrown.finish.at(-1), h, "the host's cat, knocked out, last");
        assert.deepEqual(thrown.order, race.order, "the race plays out from the same script");
        assert.deepEqual(thrown.entries.map((e) => [String(e.user), e.payout]), [[String(host._id), 0], [String(friend._id), 2000]]);
        assert.deepEqual(await cheatsOf(friend), { tnt: 1, banana: 0 });
        assert.equal((await kittyRace.throwItem(friend._id, race._id, { item: "tnt", lane: h }, { now: raceTime(race, 21000) }).catch((e) => e)).status, 409, "one a race");
        assert.deepEqual(await cheatsOf(friend), { tnt: 1, banana: 0 }, "and that one wasn't taken");

        // Every page gets it, watching or in it.
        const stranger = await member();
        const watched = await call(stranger, "GET", `/race/${race._id}`);
        assert.equal(watched.status, 200);
        assert.deepEqual(watched.body.race.throws.map((x) => [x.by, x.target, x.hit]), [[String(friend._id), h, true]]);
        assert.equal(watched.body.race.finish[0], f);
        // Paid once cheat items can't change it: the friend's 200 back, and 1,800 P-PP.
        assert.deepEqual(await walletOf(friend), { pp: 800, ppp: 0 });
        await kittyRace.settleDue(raceTime(race, settleMs));
        assert.deepEqual(await walletOf(friend), { pp: 1000, ppp: 1800 });
        assert.deepEqual(await walletOf(host), { pp: 700, ppp: 0 });
    });

    test("Cheat items: in the last 15 s they always miss; a miss changes nothing; not at your own cat; no item, no throw; none once the winner's home", async () => {
        const host = await member({ pp: 1000 });
        const friend = await member({ pp: 1000 });
        await give(host, { banana: 1 });
        await give(friend, { banana: 1 });
        const { race, h, f } = await twoCatRace(host, friend);
        const late = CATFLIX.kittyRace.winnerMs - CATFLIX.kittyRace.cheats.lateMs;
        assert.equal((await kittyRace.throwItem(host._id, race._id, { item: "banana", lane: h }, { now: raceTime(race, 5000) }).catch((e) => e)).status, 400, "not your own cat");
        assert.equal((await kittyRace.throwItem(host._id, race._id, { item: "tnt", lane: f }, { now: raceTime(race, 5000) }).catch((e) => e)).status, 409, "no TNT");
        const missed = await kittyRace.throwItem(friend._id, race._id, { item: "banana", lane: h }, { now: raceTime(race, late), random: () => 0 });
        assert.equal(missed.throws.at(-1).hit, false, "15 s before the winner's finish: a miss, every time");
        assert.equal(missed.finish[0], h, "the host's cat still wins");
        // A throw before then misses in 1 of 5: a roll of 80 to 99.
        const early = await kittyRace.throwItem(host._id, race._id, { item: "banana", lane: f }, { now: raceTime(race, 1000), random: () => 80 });
        assert.equal(early.throws.at(-1).hit, false);
        assert.deepEqual(early.finish, race.order);
        const third = await member();
        await give(third, { tnt: 1 });
        assert.equal((await kittyRace.throwItem(third._id, race._id, { item: "tnt", lane: f }, { now: raceTime(race, CATFLIX.kittyRace.winnerMs) }).catch((e) => e)).status, 409, "the winner's home");
    });

    test("Cheat items, watching: anyone can watch any race on now, and throw at members' cats whose owners have PvP on (only those)", async () => {
        const host = await member({ pp: 1000 });
        const friend = await member({ pp: 1000 });
        await User.updateOne({ _id: host._id }, { $set: { pvp: true } });
        const { race, h, f } = await twoCatRace(host, friend);
        assert.deepEqual([race.racers[h].pvp, race.racers[f].pvp], [true, false], "as their owners had it at the start");
        const fan = await member({ pet: false });
        await give(fan, { tnt: 1, banana: 1 });
        const looked = (await call(fan, "GET", "/race")).body.races;
        assert.ok(looked.live.some((r) => r.id === String(race._id)), "on now, to watch");
        assert.ok(!(await call(host, "GET", "/race")).body.races.live.some((r) => r.id === String(race._id)), "not in your own list: it's yours");
        const house = race.racers.findIndex((racer) => !racer.owner);
        const no = (lane) => kittyRace.throwItem(fan._id, race._id, { item: "tnt", lane }, { now: raceTime(race, 9000) }).catch((e) => e.status);
        assert.equal(await no(f), 403, "PvP off");
        assert.equal(await no(house), 403, "a house cat");
        const hit = await kittyRace.throwItem(fan._id, race._id, { item: "tnt", lane: h }, { now: raceTime(race, 9000), random: () => 0 });
        assert.deepEqual([hit.throws.at(-1).from, hit.throws.at(-1).hit, hit.finish[0]], [null, true, f]);
        const thrown = await call(fan, "POST", `/race/${race._id}/throw`, { item: "banana", lane: h });
        assert.equal(thrown.status, 409, "one a race, watching too");
    });

    test("Cheat items: never one that would leave no cat to cross the line", async () => {
        const host = await member({ pp: 1000 });
        const friend = await member({ pp: 1000 });
        await User.updateOne({ _id: host._id }, { $set: { pvp: true } });
        const { race, h, f } = await twoCatRace(host, friend);
        // Every other cat stopped by a mishap: the host's cat the only one left to finish.
        const rest = race.order.filter((lane) => lane !== h);
        const brawls = [[rest[0], rest[1]], [rest[2], rest[3]], [rest[4], rest[5]], [rest[6], rest[7]]].map(([attacker, victim]) => ({ attacker, victim, atMs: 10000 }));
        await CatflixRace.updateOne({ _id: race._id }, { $set: { mishaps: { brawls, celebrate: null, lightning: { lane: rest[8], atMs: 12000 }, quit: null } } });
        const fan = await member({ pet: false });
        await give(fan, { tnt: 1 });
        const thrown = await kittyRace.throwItem(fan._id, race._id, { item: "tnt", lane: h }, { now: raceTime(race, 20000), random: () => 0 });
        assert.equal(thrown.throws.at(-1).hit, false, "it misses: the cat jumps it");
        assert.equal(thrown.finish[0], h);
        assert.ok(rest.includes(f));
    });

    test("Cheat items, house cats: each throws in 30% of races, at another cat, any time to the winner's finish; 80% hit before the last 15 s, never after", () => {
        const crypto = require("crypto");
        const odds = CATFLIX.kittyRace.cheats;
        const winnerMs = CATFLIX.kittyRace.winnerMs;
        const runs = 4000;
        let thrown = 0, early = 0, earlyHits = 0, lateHits = 0;
        for (let i = 0; i < runs; i++) {
            const racers = [{ owner: "someone" }, ...Array.from({ length: 9 }, () => ({ owner: null }))];
            const order = [...Array(10).keys()].sort(() => crypto.randomInt(3) - 1);
            const throws = kittyRace.houseThrows({ racers, order, mishaps: null, settledAt: null }, crypto.randomInt);
            thrown += throws.length;
            for (const t of throws) {
                assert.ok(t.from >= 1 && t.target !== t.from, "a house cat, at another cat");
                assert.ok(t.atMs >= odds.houseFrom && t.atMs < winnerMs);
                assert.equal(t.landsMs, t.atMs + odds.flightMs);
                if (t.atMs < winnerMs - odds.lateMs) (early += 1), (earlyHits += t.hit);
                else lateHits += t.hit;
            }
            const finish = kittyRace.finishOrder(order, throws);
            const out = throws.filter((t) => t.hit).map((t) => t.target);
            assert.deepEqual(finish.slice(0, 10 - new Set(out).size), order.filter((lane) => !out.includes(lane)), "the rest in their order, the knocked out after them");
        }
        assert.ok(Math.abs(thrown / (runs * 9) - odds.houseCat) < 0.02, `${((thrown / (runs * 9)) * 100).toFixed(1)}% of house cats threw`);
        assert.ok(Math.abs(earlyHits / early - odds.hit) < 0.03, `${((earlyHits / early) * 100).toFixed(1)}% hit`);
        assert.equal(lateHits, 0, "the last 15 s: all misses");
    });
});
