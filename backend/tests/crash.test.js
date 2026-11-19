// Crash: the engine on its own (games/crash/engine.js): the ticks, how a
// round ends, auto-cash-outs and payouts. No database.
//
// From backend/: npm test (or node --test tests/crash.test.js)
const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const { CRASH, ENDINGS, CrashRound, cashOutsAt, payoutFor, secureRandom } = require("../games/crash/engine");
const { CRASH_RULES, allInBlockedFor, blockedFor, isProtected, playersNeeded, playsLeft, roundKindFor, roundsFor } = require("../../shared/crash/rules.js");
const ORCA_LINES = require("../data/lordGangOrcaScripts").crashAllIn;

// Random numbers in a set order, then the last one for ever.
const scripted = (...values) => {
    let i = 0;
    return () => values[Math.min(i++, values.length - 1)];
};
// A seeded generator (mulberry32), so the long-run check is the same every run.
function seeded(seed) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const UP = 0.1; // between h and h + (1 - h) / 2
const DOWN = 0.9;
const BOOM = 0.001; // below h

describe("the engine", () => {
    test("the config: d cancels the crash chance, and a round starts at 0.99x", () => {
        assert.equal(CRASH.drift, CRASH.crashChance / (1 - CRASH.crashChance));
        assert.equal(CRASH.start, 0.99);
        assert.equal(CRASH.tickMs, 100);
        assert.equal(CRASH.maxTicks, 600);
        assert.equal(CRASH.cap, 25);
        // One step up and one down, with no crash, on average stays put
        // once the crash chance is counted.
        const { crashChance: h, swing: s, drift: d } = CRASH;
        const expected = (1 - h) * (1 + d) * (0.5 * (1 + s) + 0.5 * (1 - s));
        assert.ok(Math.abs(expected - 1) < 1e-12);
    });

    test("a tick goes up, down, or crashes to 0", () => {
        const round = new CrashRound(scripted(UP, DOWN, BOOM));
        const { drift: d, swing: s } = CRASH;
        const first = round.step();
        assert.equal(first.tick, 1);
        assert.ok(Math.abs(first.multiplier - 0.99 * (1 + d) * (1 + s)) < 1e-6);
        assert.equal(first.ended, null);
        const second = round.step();
        assert.ok(Math.abs(second.multiplier - first.multiplier * (1 + d) * (1 - s)) < 1e-6);
        const third = round.step();
        assert.deepEqual([third.multiplier, third.ended], [0, ENDINGS.crash]);
        assert.equal(round.step(), null, "nothing after the end");
        assert.equal(round.path.length, 4, "the start and every tick");
        assert.equal(round.path[0], 0.99);
    });

    test("the 25x cap and the 60 second limit end a round", () => {
        const capped = new CrashRound(scripted(UP)).playOut();
        assert.equal(capped.ended, ENDINGS.cap);
        assert.equal(capped.multiplier, 25);
        assert.ok(capped.tick < CRASH.maxTicks);

        // Up, down, up, down, never crashing: only the drift moves it
        // (about 15x by the end), and time runs out before the cap.
        let flip = false;
        const timed = new CrashRound(() => ((flip = !flip) ? UP : DOWN)).playOut();
        assert.equal(timed.ended, ENDINGS.time);
        assert.equal(timed.tick, CRASH.maxTicks);
        assert.ok(timed.multiplier > 1 && timed.multiplier < CRASH.cap);
    });

    test("auto-cash-out: the first tick at or above the target, at that tick's multiplier; everyone at the cap or time limit; nobody on a crash", () => {
        const players = [{ id: "a", autoAt: 1.5 }, { id: "b", autoAt: null }, { id: "c", autoAt: 2 }];
        assert.deepEqual(cashOutsAt(players, { multiplier: 1.49, ended: null }), []);
        assert.deepEqual(cashOutsAt(players, { multiplier: 1.52, ended: null }).map(({ player, multiplier }) => [player.id, multiplier]), [["a", 1.52]]);
        assert.equal(cashOutsAt(players, { multiplier: 25, ended: ENDINGS.cap }).length, 3);
        assert.deepEqual(cashOutsAt(players, { multiplier: 1.3, ended: ENDINGS.time }).map(({ multiplier }) => multiplier), [1.3, 1.3, 1.3]);
        assert.deepEqual(cashOutsAt(players, { multiplier: 0, ended: ENDINGS.crash }), []);
    });

    test("payouts: whole points, rounded down; the stake back in its own coins, profit in P-PP; under 1x split like the bet", () => {
        assert.deepEqual(payoutFor({ pp: 10, ppp: 0 }, 2.5), { pp: 10, ppp: 15, total: 25 });
        assert.deepEqual(payoutFor({ pp: 6, ppp: 4 }, 1.87), { pp: 6, ppp: 12, total: 18 });
        assert.deepEqual(payoutFor({ pp: 10, ppp: 0 }, 1.1), { pp: 10, ppp: 1, total: 11 }, "no point lost to 10 x 1.1");
        assert.deepEqual(payoutFor({ pp: 10, ppp: 0 }, 0.7), { pp: 7, ppp: 0, total: 7 });
        assert.deepEqual(payoutFor({ pp: 6, ppp: 4 }, 0.55), { pp: 3, ppp: 2, total: 5 });
        assert.deepEqual(payoutFor({ pp: 1, ppp: 0 }, 1.99), { pp: 1, ppp: 0, total: 1 }, "a 1 point bet can't win below 2x");
        assert.deepEqual(payoutFor({ pp: 3, ppp: 0 }, 0.2), { pp: 0, ppp: 0, total: 0 });
        assert.deepEqual(payoutFor({ pp: 0, ppp: 8 }, 0), { pp: 0, ppp: 0, total: 0 });
    });

    test("a protected round (5 or more players): half of a loss back, rounded down, in the coins it was paid in; wins untouched", () => {
        assert.deepEqual(payoutFor({ pp: 10, ppp: 0 }, 0, 0.5), { pp: 5, ppp: 0, total: 5 }, "crashed: half the bet");
        assert.deepEqual(payoutFor({ pp: 6, ppp: 4 }, 0, 0.5), { pp: 3, ppp: 2, total: 5 });
        assert.deepEqual(payoutFor({ pp: 7, ppp: 0 }, 0, 0.5), { pp: 3, ppp: 0, total: 3 }, "3.5 rounds down");
        assert.deepEqual(payoutFor({ pp: 10, ppp: 0 }, 0.7, 0.5), { pp: 8, ppp: 0, total: 8 }, "7 back, and 1 of the 3 lost");
        assert.deepEqual(payoutFor({ pp: 1, ppp: 0 }, 0, 0.5), { pp: 0, ppp: 0, total: 0 }, "half of 1 rounds down to nothing");
        assert.deepEqual(payoutFor({ pp: 10, ppp: 0 }, 2.5, 0.5), { pp: 10, ppp: 15, total: 25 });
    });

    test("a fair walk: cashing out at 2x returns about 0.99 over many rounds", () => {
        const random = seeded(20261117);
        const rounds = 40000;
        let total = 0;
        for (let i = 0; i < rounds; i++) {
            const round = new CrashRound(random);
            let paid = null;
            while (!round.ended && paid === null) {
                const tick = round.step();
                if (tick.ended !== ENDINGS.crash && tick.multiplier >= 2) paid = tick.multiplier;
                else if (tick.ended === ENDINGS.time) paid = tick.multiplier;
            }
            total += paid ?? 0;
        }
        const average = total / rounds;
        assert.ok(average > 0.97 && average < 1.01, `got ${average}`);
    });

    test("the secure source gives numbers from 0 up to 1", () => {
        const random = secureRandom(60);
        for (let i = 0; i < 1000; i++) {
            const value = random();
            assert.ok(value >= 0 && value < 1);
        }
    });
});

// ---- The rooms, against a real MongoDB ----
//   bash: MONGO_TEST_URI=mongodb://127.0.0.1:27017/kino_test npm test
// The database is wiped first, so its name has to end in "_test".
const uri = process.env.MONGO_TEST_URI;
const dbName = uri ? new URL(uri).pathname.slice(1) : "";

describe("the daily plays (shared/crash/rules.js)", () => {
    test("rounds a day go by the size of the round: 3 alone, 6, 12, 24, then 25 with 5 or more (rooms of up to 30)", () => {
        assert.equal(CRASH_RULES.roomSize, 30);
        assert.deepEqual([1, 2, 3, 4, 5, 12, 30].map(roundsFor), [3, 6, 12, 24, 25, 25, 25]);
        assert.deepEqual([1, 2, 3, 4, 5, 30].map(roundKindFor), ["solo", "group", "group", "group", "protected", "protected"]);
        assert.deepEqual([1, 4, 5, 30].map(isProtected), [false, false, true, true]);
    });

    test("Lord Gang Orca's all in: only while it's on offer, with points, and nothing stashed elsewhere", () => {
        const status = (allIn, points = 100) => ({ dailyPp: 40, maxBet: 10, points, banned: null, used: { total: 3 }, allIn });
        assert.match(allInBlockedFor(status(null)), /Not today/);
        assert.equal(allInBlockedFor(status({ elsewhere: [] })), null);
        assert.match(allInBlockedFor(status({ elsewhere: [] }, 0)), /nothing to put in/);
        assert.equal(
            allInBlockedFor(status({ elsewhere: [{ points: 1200, where: "in Kino Kasino credits" }, { points: 5, where: "lent out and still owed to you" }] })),
            "All in means all of it, and you've got 1,200 in Kino Kasino credits and 5 lent out and still owed to you. Bring it home first."
        );
    });

    test("they all count together: what's left in each size, and the fewest players still playable", () => {
        const used = { total: 4 };
        assert.deepEqual([1, 2, 3, 4, 5].map((players) => playsLeft(used, players)), [0, 2, 8, 20, 21]);
        assert.equal(playsLeft(used), 21, "the most: a full room's");
        assert.deepEqual([0, 3, 6, 12, 24, 25].map((total) => playersNeeded({ total })), [1, 2, 3, 4, 5, null]);
    });

    test("ready or not: alone used up asks for a room; a room too small asks for more players; none left at 25", () => {
        const status = (total) => ({ dailyPp: 40, maxBet: 10, points: 100, banned: null, used: { total } });
        assert.equal(blockedFor(status(2), 5, 1), null);
        assert.match(blockedFor(status(3), 5, 1), /No rounds alone left .*room of 2/);
        assert.equal(blockedFor(status(3), 5, 2), null);
        assert.match(blockedFor(status(12), 5, 3), /wait for 4 players/);
        assert.equal(blockedFor(status(24), 5, 5), null);
        assert.match(blockedFor(status(25), 5, 5), /No rounds left today/);
    });
});

describe("the rooms", { skip: !uri ? "set MONGO_TEST_URI to run these" : !dbName.endsWith("_test") ? "MONGO_TEST_URI's database must end in _test" : false }, () => {
    const { before, after, beforeEach, afterEach } = require("node:test");
    const mongoose = require("mongoose");
    let User;
    let Review;
    let CrashDay;
    let CrashRound;
    let WalletTx;
    let GameBan;
    let createCrashRooms;
    let crash;
    let playDay;

    // A stand-in for Socket.IO: it remembers what was sent where.
    function fakeIo() {
        const heard = [];
        return {
            heard,
            to: (channel) => ({ emit: (event, data) => heard.push({ channel, event, data }) }),
            in: () => ({ socketsJoin() {}, socketsLeave() {} }),
        };
    }
    const socketOf = (user, id = `s-${user._id}`) => ({ id, data: { user: { _id: user._id } }, join() {} });

    // The random numbers the rounds get: what's queued, then crashes.
    let queue = [];
    const random = () => (queue.length ? queue.shift() : BOOM);
    const ups = (n) => Array.from({ length: n }, () => UP);

    let io;
    let rooms;
    beforeEach(() => {
        queue = [];
        io = fakeIo();
        rooms = createCrashRooms({ io, random, config: { ...CRASH, tickMs: 5 }, countdownMs: 0, graceMs: 20 });
    });
    afterEach(() => rooms.stopAll());

    before(async () => {
        await mongoose.connect(uri);
        await mongoose.connection.dropDatabase();
        User = require("../models/userModel");
        Review = require("../models/reviewModel");
        CrashDay = require("../models/crashDayModel");
        CrashRound = require("../models/crashRoundModel");
        WalletTx = require("../models/walletTxModel");
        GameBan = require("../models/gameBanModel");
        ({ createCrashRooms } = require("../games/crash/rooms"));
        crash = require("../utils/crash");
        ({ playDay } = require("../utils/wallet"));
        await Promise.all([CrashDay, CrashRound].map((model) => model.syncIndexes()));
    });
    after(async () => {
        await mongoose.disconnect();
    });

    let count = 0;
    // A member with `reviews` reviews (their daily PP) and a wallet.
    async function member({ reviews = 40, pp = 100, ppp = 100 } = {}) {
        count += 1;
        const user = await User.create({ username: `rider${count}`, email: `crash${count}@test.invalid`, password: "x", wallet: { pp, ppp } });
        if (reviews > 0) {
            await Review.collection.insertMany(
                Array.from({ length: reviews }, (_, i) => ({ user: user._id, tmdbId: 9000 + i, filmTitle: `Film ${i}`, text: "Seen it.", rating: 4, createdAt: new Date() }))
            );
        }
        return user;
    }
    const idOf = (user) => String(user._id);
    const walletOf = async (user) => {
        const { wallet } = await User.findById(user._id).select("wallet").lean();
        return { pp: wallet.pp, ppp: wallet.ppp };
    };
    const until = async (check, ms = 5000) => {
        for (let waited = 0; waited < ms; waited += 10) {
            if (await check()) return;
            await new Promise((resolve) => setTimeout(resolve, 10));
        }
        throw new Error("timed out");
    };
    const lastFor = (user, event) => io.heard.filter((entry) => entry.channel === `crash:user:${idOf(user)}` && entry.event === event).at(-1)?.data;

    test("alone: a solo round with an auto-cash-out; the stake back in PP, profit in P-PP; the round kept", async () => {
        const rider = await member({ reviews: 8, pp: 5, ppp: 5 });
        await rooms.hello(socketOf(rider));
        await assert.rejects(rooms.solo(idOf(rider), { bet: 3 }), /up to 2/, "a quarter of 8 daily PP");

        queue = [...ups(13)];
        const view = await rooms.solo(idOf(rider), { bet: 2, autoAt: 1.5 });
        assert.equal(view.private, true);
        const room = rooms.rooms.get(view.id);
        await until(() => room.round?.status === "over" && room.last);

        const me = room.last.players[0];
        assert.ok(me.cashedAt >= 1.5 && me.cashedAt < 1.6, `cashed at ${me.cashedAt}`);
        assert.equal(me.auto, true);
        assert.equal(me.payout, 3, "2 x 1.55, rounded down");
        assert.deepEqual(await walletOf(rider), { pp: 5, ppp: 6 }, "2 PP back, 1 P-PP profit");
        assert.deepEqual(await CrashDay.findOne({ user: rider._id, day: playDay() }).select("total -_id").lean(), { total: 1 });

        const saved = await CrashRound.findById(room.last.roundId).lean();
        assert.deepEqual([saved.status, saved.kind, saved.endedBy, saved.private], ["over", "solo", "crash", true]);
        assert.equal(saved.path.length, saved.ticks + 1);
        assert.equal(saved.path.at(-1), 0);
        assert.equal(saved.players[0].cashedAt, me.cashedAt);
        assert.deepEqual((await WalletTx.find({ user: rider._id, reason: /^crash/ }).distinct("reason")).sort(), ["crashBet", "crashWin"]);
        assert.equal(rooms.rooms.has(view.id), true, "still in their room of one, with rounds alone left");
    });

    test("90% of what a round loses goes to the scratch jackpots: bets ridden to the crash (less a protected round's half back), never a cash-out's profit", async () => {
        const { jackpotView } = require("../utils/scratch");
        const inPools = async () => Object.values((await jackpotView()).amounts).reduce((sum, amount) => sum + amount, 0);
        assert.equal(crash.lostIn([
            { paid: { pp: 10, ppp: 0 }, payout: { total: 5 } },
            { paid: { pp: 4, ppp: 6 }, payout: { total: 25 } },
            { paid: { pp: 0, ppp: 7 }, payout: { total: 0 } },
        ]), 12, "5 + nothing + 7");

        // Alone, ridden to the crash: 7 lost, 90% is 6.3, rounded up to 7.
        const rider = await member();
        await rooms.hello(socketOf(rider));
        let before = await inPools();
        queue = [...ups(3)];
        const view = await rooms.solo(idOf(rider), { bet: 7 });
        const alone = rooms.rooms.get(view.id);
        await until(() => alone.round?.status === "over" && alone.last);
        assert.equal(alone.last.players[0].payout, 0);
        assert.equal((await inPools()) - before, 7);

        // A room of two: one cashes out ahead, the other rides it down: 10
        // lost, 9 to the pools.
        const a = await member();
        const b = await member();
        await rooms.hello(socketOf(a));
        await rooms.hello(socketOf(b));
        const { id } = await rooms.create(idOf(a));
        await rooms.join(idOf(b), id);
        const room = rooms.rooms.get(id);
        before = await inPools();
        queue = [...ups(40)];
        await rooms.ready(idOf(a), { bet: 10 });
        await rooms.ready(idOf(b), { bet: 10 });
        await until(() => room.round?.status === "playing" && room.round.engine.tick >= 3);
        rooms.cashOut(idOf(a));
        await until(() => room.round?.status === "over" && room.last);
        assert.ok(room.last.players[0].payout >= 10, "a cashed out ahead");
        assert.equal((await inPools()) - before, 9);
    });

    test("a room of two: both ready starts one round; a cash-out pays at the server's multiplier; riding to the crash loses", async () => {
        const a = await member();
        const b = await member();
        await rooms.hello(socketOf(a));
        await rooms.hello(socketOf(b));
        const { id } = await rooms.create(idOf(a));
        await rooms.join(idOf(b), id);
        const room = rooms.rooms.get(id);

        queue = [...ups(40)];
        await rooms.ready(idOf(a), { bet: 10 });
        assert.equal(room.round, null, "waiting for b");
        await rooms.ready(idOf(b), { bet: 10 });
        await until(() => room.round?.status === "playing" && room.round.engine.tick >= 3);
        const out = rooms.cashOut(idOf(a));
        assert.throws(() => rooms.cashOut(idOf(a)), /already/);
        await until(() => room.round?.status === "over" && room.last);

        const [first, second] = room.last.players;
        assert.equal(first.cashedAt, out.multiplier);
        assert.equal(first.payout, Math.floor(10 * out.multiplier + 1e-9));
        assert.equal(second.cashedAt, null);
        assert.equal(second.payout, 0);
        assert.equal(room.last.best, idOf(a));
        assert.deepEqual(await walletOf(b), { pp: 90, ppp: 100 });
        const day = await CrashDay.findOne({ user: b._id, day: playDay() }).lean();
        assert.equal(day.total, 1);
        assert.equal(room.last.kind, "group");
        assert.equal(room.last.protected, false);
        assert.ok(room.players.every((player) => !player.ready), "ready resets for the next round");
    });

    test("more players, more rounds: alone used up still plays in a room; a round of 5 is protected, half of every loss back; the last round sends a player back to the lobby", async () => {
        const players = [await member(), await member(), await member(), await member(), await member()];
        const [tired, busy, fresh, last] = players;
        await CrashDay.create({ user: tired._id, day: playDay(), total: 3 });
        await CrashDay.create({ user: busy._id, day: playDay(), total: 12 });
        await CrashDay.create({ user: last._id, day: playDay(), total: 24 });
        for (const player of players) await rooms.hello(socketOf(player));

        await assert.rejects(rooms.solo(idOf(tired), { bet: 1 }), /No rounds alone left/);
        const { id } = await rooms.create(idOf(tired));
        const room = rooms.rooms.get(id);
        await rooms.join(idOf(busy), id);
        await rooms.ready(idOf(tired), { bet: 10 });
        await rooms.ready(idOf(tired), { ready: false });
        await assert.rejects(rooms.ready(idOf(busy), { bet: 10 }), /wait for 4 players/, "12 played: rooms of 4 or more");
        await rooms.join(idOf(fresh), id);
        await rooms.join(idOf(last), id);
        await assert.rejects(rooms.ready(idOf(last), { bet: 10 }), /wait for 5 players/, "24 played: only a full room");
        await rooms.join(idOf(players[4]), id);

        // It crashes at once: everyone loses their 10, and gets 5 back.
        queue = [];
        for (const player of players) await rooms.ready(idOf(player), { bet: 10 });
        await until(() => room.round?.status === "over" && room.last);
        assert.deepEqual([room.last.kind, room.last.protected], ["protected", true]);
        assert.deepEqual(
            room.last.players.map((player) => [player.payout, player.net]),
            players.map(() => [5, -5])
        );
        assert.deepEqual(await walletOf(fresh), { pp: 95, ppp: 100 }, "10 PP bet, 5 PP back");
        assert.deepEqual((await WalletTx.find({ user: fresh._id, reason: /^crash/ }).distinct("reason")).sort(), ["crashBet", "crashProtect"]);
        const saved = await CrashRound.findById(room.last.roundId).lean();
        assert.deepEqual([saved.kind, saved.players[2].payout.pp], ["protected", 5]);

        const totals = await Promise.all([tired, busy, last].map((player) => CrashDay.findOne({ user: player._id, day: playDay() }).lean()));
        assert.deepEqual(totals.map((day) => day.total), [4, 13, 25]);
        await until(() => lastFor(last, "crash:kicked"));
        assert.ok(!room.players.some((player) => player.userId === idOf(last)), "25 of 25 played: out of the room");
        assert.match(lastFor(last, "crash:kicked").message, /last round/);
    });

    test("a big room: the first one ready starts the countdown, which never starts a round by itself; Start Game asks the others ready; whoever doesn't answer sits out; 30 is full", async () => {
        rooms.stopAll();
        rooms = createCrashRooms({ io, random, config: { ...CRASH, tickMs: 5 }, countdownMs: 0, readyMs: 80, offerMs: 150, graceMs: 20 });
        const [a, b, c, d] = [await member(), await member(), await member(), await member()];
        for (const player of [a, b, c, d]) await rooms.hello(socketOf(player));
        const { id } = await rooms.create(idOf(a));
        const room = rooms.rooms.get(id);
        for (const player of [b, c, d]) await rooms.join(idOf(player), id);

        await rooms.ready(idOf(a), { bet: 5 });
        assert.ok(room.countdown, "the first one ready starts the countdown");
        await rooms.ready(idOf(a), { ready: false });
        assert.equal(room.countdown, null, "nobody ready: no countdown");
        queue = [];
        for (const player of [a, b, c]) await rooms.ready(idOf(player), { bet: 5 });
        await assert.rejects(rooms.startGame(idOf(a)), /30 seconds/, "not before the countdown ends");
        await until(() => room.startable);
        assert.equal(room.round, null, "d isn't ready: the countdown ending doesn't start it");

        await assert.rejects(rooms.startGame(idOf(d)), /Ready up first/);
        await rooms.startGame(idOf(a));
        assert.deepEqual([room.offer.by, room.offer.size, [...room.offer.asked].sort()], [idOf(a), 3, [idOf(b), idOf(c)].sort()]);
        await assert.rejects(rooms.startGame(idOf(b)), /starting already/);
        assert.throws(() => rooms.answer(idOf(d), { join: true }), /nothing to answer/, "d wasn't ready, so wasn't asked");
        rooms.answer(idOf(b), { join: true });
        assert.equal(room.round, null, "c hasn't answered: it waits");
        await until(() => room.last);

        assert.deepEqual(room.last.players.map((player) => player.userId).sort(), [idOf(a), idOf(b)].sort(), "c didn't answer and sat out; d watched");
        assert.equal(room.last.kind, "group");
        assert.match(lastFor(c, "crash:error").message, /Time's up/);
        const totals = await Promise.all([a, b, c, d].map((player) => CrashDay.findOne({ user: player._id, day: playDay() }).lean()));
        assert.deepEqual(totals.map((day) => day?.total ?? 0), [1, 1, 0, 0]);
        assert.deepEqual(await walletOf(c), { pp: 100, ppp: 100 }, "nothing taken from c");

        // Up to 30 players; spectators don't take a seat.
        for (let i = 4; i < CRASH_RULES.roomSize; i++) {
            const filler = await member({ reviews: 0 });
            await rooms.hello(socketOf(filler));
            await rooms.join(idOf(filler), id);
        }
        assert.equal(room.players.length, 30);
        assert.equal(rooms.lobbyView().find((entry) => entry.id === id).full, true);
        const extra = await member({ reviews: 0 });
        await rooms.hello(socketOf(extra));
        await assert.rejects(rooms.join(idOf(extra), id), /full/);
        await rooms.join(idOf(extra), id, { spectate: true });
        assert.deepEqual(rooms.lobbyView().find((entry) => entry.id === id).spectators.map((entry) => entry.userId), [idOf(extra)]);
        await assert.rejects(rooms.spectate(idOf(extra), { on: false }), /Every seat is taken/);
    });

    test("Start Game: only for a player who can play a round that size; a no sits out at once; readying during the prompt is a yes; once everyone asked has answered it starts", async () => {
        rooms.stopAll();
        rooms = createCrashRooms({ io, random, config: { ...CRASH, tickMs: 5 }, countdownMs: 0, readyMs: 60, offerMs: 60000, graceMs: 20 });
        const [e, f, g, h, i] = [await member(), await member(), await member(), await member(), await member()];
        // f has played 12: fine in a round of 4, not of 3.
        await CrashDay.create({ user: f._id, day: playDay(), total: 12 });
        for (const player of [e, f, g, h, i]) await rooms.hello(socketOf(player));
        const { id } = await rooms.create(idOf(e));
        const room = rooms.rooms.get(id);
        for (const player of [f, g, h, i]) await rooms.join(idOf(player), id);

        queue = [];
        for (const player of [e, f, g]) await rooms.ready(idOf(player), { bet: 5 });
        await until(() => room.startable);
        await assert.rejects(rooms.startGame(idOf(f)), /A round of 3 gets 12 rounds a day/, "f can't play a round of the 3 ready");
        await rooms.startGame(idOf(g));
        await rooms.ready(idOf(h), { bet: 5 });
        assert.equal(room.offer.answers.get(idOf(h)), "yes", "h readied during the prompt");
        rooms.answer(idOf(e), { join: false });
        assert.equal(room.players.find((player) => player.userId === idOf(e)).ready, false, "a no sits out at once");
        rooms.answer(idOf(f), { join: true });
        // Everyone asked has answered: it starts now, not in a minute. With g,
        // f and h it's a round of 3, too small for f, so f sits it out too.
        await until(() => room.last, 3000);
        assert.deepEqual(room.last.players.map((player) => player.userId).sort(), [idOf(g), idOf(h)].sort());
        assert.match(lastFor(f, "crash:error").message, /^You sat this round out. A round of 3 gets 12 rounds a day/);
        assert.equal(room.offer, null);
        assert.equal(room.startable, false);
    });

    test("spectators: they don't hold a round up, can't ready, stay through it, and can take a seat again; whoever pressed Start Game un-readying calls it off", async () => {
        rooms.stopAll();
        rooms = createCrashRooms({ io, random, config: { ...CRASH, tickMs: 5 }, countdownMs: 0, readyMs: 60, offerMs: 60000, graceMs: 20 });
        const [a, b, c, d] = [await member(), await member(), await member(), await member()];
        for (const player of [a, b, c, d]) await rooms.hello(socketOf(player));
        const { id } = await rooms.create(idOf(a));
        const room = rooms.rooms.get(id);
        await rooms.join(idOf(b), id);
        await rooms.join(idOf(c), id);
        await rooms.join(idOf(d), id, { spectate: true });
        await rooms.spectate(idOf(c), { on: true });
        await assert.rejects(rooms.ready(idOf(c), { bet: 5 }), /spectating/);

        queue = [];
        await rooms.ready(idOf(a), { bet: 5 });
        await rooms.ready(idOf(b), { bet: 5 });
        await until(() => room.last);
        assert.deepEqual(room.last.players.map((player) => player.userId).sort(), [idOf(a), idOf(b)].sort(), "every player ready: it started, spectators or not");
        assert.deepEqual(
            rooms.lobbyView().find((entry) => entry.id === id).spectators.map((entry) => entry.userId).sort(),
            [idOf(c), idOf(d)].sort(),
            "still watching after the round"
        );

        // c takes a seat again: now a and b wait for c.
        await rooms.spectate(idOf(c), { on: false });
        await rooms.ready(idOf(a), { bet: 5 });
        await rooms.ready(idOf(b), { bet: 5 });
        await until(() => room.startable);
        await rooms.startGame(idOf(a));
        assert.ok(room.offer);
        await rooms.ready(idOf(a), { ready: false });
        assert.equal(room.offer, null, "a pressed it, then un-readied: it's off");
        assert.equal(room.startable, true, "b, still ready, can press it");
        // a and c spectating leaves b the only player, and ready: that's everyone.
        await rooms.spectate(idOf(a), { on: true });
        await rooms.spectate(idOf(c), { on: true });
        await until(() => room.last && room.last.players.length === 1);
        assert.equal(room.last.players[0].userId, idOf(b));
    });

    test("invites: a notification to the room, once per member per room, never to someone in it already or to yourself", async () => {
        const Notification = require("../models/notificationModel");
        const [host, guest, outsider] = [await member(), await member(), await member()];
        await rooms.hello(socketOf(host));
        await rooms.hello(socketOf(guest));
        await assert.rejects(rooms.invite(idOf(host), { userId: idOf(outsider) }), /not in a room/);
        const { id } = await rooms.create(idOf(host));
        await rooms.join(idOf(guest), id, { spectate: true });

        await rooms.invite(idOf(guest), { userId: idOf(outsider) });
        const note = await Notification.findOne({ recipient: outsider._id, type: "crashInvite" }).lean();
        assert.deepEqual([note.crash.room, note.actors.map(String)], [id, [idOf(guest)]], "spectators can invite too");
        await assert.rejects(rooms.invite(idOf(guest), { userId: idOf(outsider) }), /already/);
        await rooms.invite(idOf(host), { userId: idOf(outsider) });
        await assert.rejects(rooms.invite(idOf(host), { userId: idOf(guest) }), /in this room already/);
        await assert.rejects(rooms.invite(idOf(host), { userId: idOf(host) }), /here already/);
        await assert.rejects(rooms.invite(idOf(host), { userId: "nobody" }), /Pick someone/);
        await assert.rejects(rooms.invite(idOf(host), { userId: String(new mongoose.Types.ObjectId()) }), /doesn't exist/);
        assert.equal(await Notification.countDocuments({ recipient: outsider._id, type: "crashInvite" }), 2);

        const state = rooms.inviteState(idOf(host), [idOf(guest), idOf(outsider)]);
        assert.deepEqual([state.room, [...state.here], [...state.invited]], [id, [idOf(guest)], [idOf(outsider)]]);
        assert.equal(rooms.isOpen(id), true);
        rooms.leave(idOf(host));
        rooms.leave(idOf(guest));
        assert.equal(rooms.isOpen(id), false, "everyone left: closed");
    });

    test("Lord Gang Orca's all in: offered once rounds alone are used up; not while points are stashed elsewhere; everything on one round; once a day", async () => {
        const LoanOffer = require("../models/loanOfferModel");
        const SlotMachine = require("../models/slotMachineModel");
        const PokerSeat = require("../models/pokerSeatModel");
        const PlayerDebt = require("../models/playerDebtModel");
        const gambler = await member({ pp: 60, ppp: 40 });
        const friend = await member();
        await CrashDay.create({ user: gambler._id, day: playDay(), total: 2 });
        assert.equal((await crash.statusOf(gambler._id)).allIn, null, "rounds alone left: not yet");
        await CrashDay.updateOne({ user: gambler._id, day: playDay() }, { $set: { total: 3 } });
        assert.deepEqual((await crash.statusOf(gambler._id)).allIn, { elsewhere: [] });

        // Stashed: poker chips, a loan offer, a loan, Kasino credits.
        await PokerSeat.create({ _id: gambler._id, stack: 40, funds: { pp: 40, ppp: 0 } });
        await LoanOffer.create({ lender: gambler._id, style: "fixed", amount: 30, available: 30, rate: 25 });
        await PlayerDebt.create({ borrower: friend._id, lender: gambler._id, principal: 20, interest: 5, principalPaid: 5 });
        await SlotMachine.create({ user: gambler._id, pp: 1250, ppp: 0 });
        await rooms.hello(socketOf(gambler));
        await assert.rejects(
            rooms.allIn(idOf(gambler)),
            /^Error: All in means all of it, and you've got 40 at the Kino Poker table, 30 in loan offers still up, 20 lent out and still owed to you and 12 in Kino Kasino credits. Bring it home first.$/
        );
        await Promise.all([PokerSeat, LoanOffer, PlayerDebt, SlotMachine].map((Model) => Model.deleteMany({})));

        // Everything, and it crashes.
        queue = [...ups(20)];
        const view = await rooms.allIn(idOf(gambler));
        assert.equal(view.private, true);
        const room = rooms.rooms.get(view.id);
        await until(() => lastFor(gambler, "crash:kicked"));
        assert.deepEqual(await walletOf(gambler), { pp: 0, ppp: 0 });
        const saved = await CrashRound.findOne({ kind: "allIn", "players.user": gambler._id }).lean();
        assert.deepEqual([saved.players[0].bet, saved.players[0].paid.pp, saved.players[0].paid.ppp, saved.endedBy], [100, 60, 40, "crash"]);
        const day = await CrashDay.findOne({ user: gambler._id, day: playDay() }).lean();
        assert.deepEqual([day.total, day.allIn], [3, true], "it doesn't use a round");
        const said = lastFor(gambler, "crash:kicked").message;
        assert.ok(ORCA_LINES.lost.some((line) => said === `Lord Gang Orca: "${line}"`), said);
        assert.ok(!room.players.length && !rooms.rooms.has(view.id), "back to the lobby");

        await CrashDay.updateOne({ user: gambler._id, day: playDay() }, { $set: { allIn: true } });
        await User.updateOne({ _id: gambler._id }, { $set: { "wallet.pp": 50 } });
        await assert.rejects(rooms.allIn(idOf(gambler)), /Not today/, "once a day");
        await assert.rejects(crash.claimAllIn(gambler._id), /gone for today/);
    });

    test("three rooms at most; leaving mid-round isn't allowed while riding; a dropped page leaves a waiting room", async () => {
        const [a, b, c, d] = [await member(), await member(), await member(), await member()];
        for (const player of [a, b, c, d]) await rooms.hello(socketOf(player));
        const first = await rooms.create(idOf(a));
        await rooms.create(idOf(b));
        const third = await rooms.create(idOf(c));
        await assert.rejects(rooms.create(idOf(d)), /3 rooms/);

        // c drops off while waiting: out of the room after the grace.
        rooms.goodbye(socketOf(c));
        await until(() => !rooms.rooms.has(third.id));
        assert.equal(rooms.lobbyView().length, 2);

        // a rides a round: can't leave or change the bet until cashed out.
        queue = [...ups(200)];
        const room = rooms.rooms.get(first.id);
        await rooms.ready(idOf(a), { bet: 1 });
        await until(() => room.round?.status === "playing" && room.round.engine.tick >= 1);
        assert.throws(() => rooms.leave(idOf(a)), /cash out/);
        assert.throws(() => rooms.setBet(idOf(a), { bet: 2 }), /started/);
        rooms.cashOut(idOf(a));
        rooms.leave(idOf(a));
        assert.ok(![...rooms.rooms.values()].some((entry) => entry.players.some((player) => player.userId === idOf(a))));
    });

    test("the 25x cap cashes everyone still in out at 25x", async () => {
        const rider = await member({ reviews: 40, pp: 20, ppp: 0 });
        await rooms.hello(socketOf(rider));
        queue = [...ups(500)];
        const view = await rooms.solo(idOf(rider), { bet: 4 });
        const room = rooms.rooms.get(view.id);
        await until(() => room.round?.status === "over" && room.last);
        assert.equal(room.last.endedBy, "cap");
        assert.equal(room.last.players[0].cashedAt, 25);
        assert.deepEqual(await walletOf(rider), { pp: 20, ppp: 96 }, "4 PP back, 96 P-PP profit");
    });

    test("a games ban, and members without reviews, can't play", async () => {
        const banned = await member();
        const admin = await member();
        await GameBan.create({ user: banned._id, scopes: ["games"], reason: "Testing", by: admin._id });
        await rooms.hello(socketOf(banned));
        await assert.rejects(rooms.solo(idOf(banned), { bet: 1 }));
        await assert.rejects(rooms.create(idOf(banned)));

        const fresh = await member({ reviews: 0 });
        await rooms.hello(socketOf(fresh));
        await assert.rejects(rooms.solo(idOf(fresh), { bet: 1 }), /review/);
    });

    test("plays are claimed atomically: racing for the last round alone, only one gets it", async () => {
        const racer = await member();
        await CrashDay.create({ user: racer._id, day: playDay(), total: 2 });
        const results = await Promise.allSettled([1, 2, 3, 4].map(() => crash.claimPlay(racer._id, 1)));
        assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
        assert.equal((await CrashDay.findOne({ user: racer._id, day: playDay() }).lean()).total, 3);
        await crash.claimPlay(racer._id, 2);
        assert.equal((await CrashDay.findOne({ user: racer._id, day: playDay() }).lean()).total, 4, "a room of 2 still has rounds");
    });

    test("notifications: 10x or more goes to every member; anything else to the player's followers", async () => {
        const Follow = require("../models/followModel");
        const Notification = require("../models/notificationModel");
        const lucky = await member({ pp: 20, ppp: 0 });
        const unlucky = await member();
        const fan = await member();
        const stranger = await member();
        await Follow.create({ follower: fan._id, following: unlucky._id });
        await rooms.hello(socketOf(lucky));
        await rooms.hello(socketOf(unlucky));

        // Up to the cap: 25x, big news.
        queue = [...ups(500)];
        const big = rooms.rooms.get((await rooms.solo(idOf(lucky), { bet: 2 })).id);
        await until(() => big.room !== null && big.last);
        // (Earlier tests' big wins are in there too: only this player's count.)
        const bigWins = () => Notification.countDocuments({ type: "crashBigWin", actors: lucky._id });
        await until(async () => (await bigWins()) > 0 && (await bigWins()) === (await User.countDocuments()));
        const note = await Notification.findOne({ type: "crashBigWin", actors: lucky._id, recipient: stranger._id }).lean();
        assert.ok(note, "a stranger hears about it too");
        assert.deepEqual([note.amount, note.crash.multiplier, note.crash.net], [50, 25, 48]);

        // A crash: only their followers hear, with what they lost.
        queue = [];
        const small = rooms.rooms.get((await rooms.solo(idOf(unlucky), { bet: 5 })).id);
        await until(() => small.last);
        await until(async () => (await Notification.countDocuments({ type: "crashResult", actors: unlucky._id })) > 0);
        const results = await Notification.find({ type: "crashResult", actors: unlucky._id }).lean();
        assert.deepEqual(results.map((entry) => String(entry.recipient)), [String(fan._id)]);
        assert.deepEqual([results[0].crash.multiplier, results[0].crash.net, results[0].amount], [null, -5, 0]);
    });

    test("after a restart, a round stopped in the middle hands back bets still riding, and their plays", async () => {
        // Rounds earlier tests left playing when their clocks were stopped.
        await CrashRound.updateMany({ status: "playing" }, { $set: { status: "over" } });
        const rider = await member({ pp: 50, ppp: 0 });
        const cashed = await member({ pp: 50, ppp: 0 });
        await crash.claimPlay(rider._id, 1);
        const id = new mongoose.Types.ObjectId();
        const paid = await crash.takeBet(rider._id, 10, id);
        await CrashRound.create({
            _id: id,
            room: "gone",
            kind: "solo",
            day: playDay(),
            players: [
                { user: rider._id, bet: 10, paid },
                { user: cashed._id, bet: 5, paid: { pp: 5, ppp: 0 }, cashedAt: 1.5, payout: { pp: 5, ppp: 2 } },
            ],
        });
        // And an all-in round: the offer comes back too.
        const allInRider = await member({ pp: 30, ppp: 0 });
        await CrashDay.create({ user: allInRider._id, day: playDay(), total: 3 });
        await crash.claimAllIn(allInRider._id);
        const allInId = new mongoose.Types.ObjectId();
        const allInPaid = await crash.takeBet(allInRider._id, 30, allInId);
        await CrashRound.create({ _id: allInId, room: "gone", private: true, kind: "allIn", day: playDay(), players: [{ user: allInRider._id, bet: 30, paid: allInPaid }] });

        assert.equal(await crash.recoverRounds(), 2);
        assert.deepEqual(await walletOf(rider), { pp: 50, ppp: 0 });
        assert.deepEqual(await walletOf(cashed), { pp: 50, ppp: 0 }, "already paid when they cashed out: nothing more");
        assert.equal((await CrashRound.findById(id).lean()).status, "void");
        assert.equal((await CrashDay.findOne({ user: rider._id }).lean()).total, 0);
        assert.deepEqual(await walletOf(allInRider), { pp: 30, ppp: 0 });
        const allInDay = await CrashDay.findOne({ user: allInRider._id }).lean();
        assert.deepEqual([allInDay.total, allInDay.allIn], [3, false]);
    });
});
