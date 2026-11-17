// Crash: the engine on its own (games/crash/engine.js): the ticks, how a
// round ends, auto-cash-outs and payouts. No database.
//
// From backend/: npm test (or node --test tests/crash.test.js)
const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const { CRASH, ENDINGS, CrashRound, cashOutsAt, payoutFor, secureRandom } = require("../games/crash/engine");

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
        assert.deepEqual(await CrashDay.findOne({ user: rider._id, day: playDay() }).select("solo total -_id").lean(), { solo: 1, total: 1 });

        const saved = await CrashRound.findById(room.last.roundId).lean();
        assert.deepEqual([saved.status, saved.kind, saved.endedBy, saved.private], ["over", "solo", "crash", true]);
        assert.equal(saved.path.length, saved.ticks + 1);
        assert.equal(saved.path.at(-1), 0);
        assert.equal(saved.players[0].cashedAt, me.cashedAt);
        assert.deepEqual((await WalletTx.find({ user: rider._id, reason: /^crash/ }).distinct("reason")).sort(), ["crashBet", "crashWin"]);
        assert.equal(rooms.rooms.has(view.id), true, "still in their room of one, with solo rounds left");
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
        assert.deepEqual([day.solo, day.total], [1, 1], "2 players: a solo round");
        assert.ok(room.players.every((player) => !player.ready), "ready resets for the next round");
    });

    test("solo rounds run out: a room of 4 still plays, as a bonus round; the last round sends a player back to the lobby", async () => {
        const players = [await member(), await member(), await member(), await member()];
        const [tired, , , last] = players;
        await CrashDay.create({ user: tired._id, day: playDay(), solo: 3, total: 3 });
        await CrashDay.create({ user: last._id, day: playDay(), solo: 1, total: 5 });
        for (const player of players) await rooms.hello(socketOf(player));

        await assert.rejects(rooms.solo(idOf(tired), { bet: 1 }), /No solo rounds left/);
        const { id } = await rooms.create(idOf(tired));
        const room = rooms.rooms.get(id);
        await rooms.join(idOf(players[1]), id);
        await assert.rejects(rooms.ready(idOf(tired), { bet: 1 }), /wait for 4 players/);
        await rooms.join(idOf(players[2]), id);
        await rooms.join(idOf(last), id);
        const fifth = await member();
        await rooms.hello(socketOf(fifth));
        await assert.rejects(rooms.join(idOf(fifth), id), /full/);

        queue = [...ups(2)];
        for (const player of players) await rooms.ready(idOf(player), { bet: 1 });
        await until(() => room.round?.status === "over" && room.last);
        assert.equal(room.last.kind, "bonus");
        const tiredDay = await CrashDay.findOne({ user: tired._id, day: playDay() }).lean();
        assert.deepEqual([tiredDay.solo, tiredDay.total], [3, 4], "a bonus round only counts towards the 6");
        assert.ok(!room.players.some((player) => player.userId === idOf(last)), "6 of 6 played: out of the room");
        assert.match(lastFor(last, "crash:kicked").message, /last round/);
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

    test("plays are claimed atomically: racing for the last solo round, only one gets it", async () => {
        const racer = await member();
        await CrashDay.create({ user: racer._id, day: playDay(), solo: 2, total: 2 });
        const results = await Promise.allSettled([1, 2, 3, 4].map(() => crash.claimPlay(racer._id, "solo")));
        assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
        const day = await CrashDay.findOne({ user: racer._id, day: playDay() }).lean();
        assert.deepEqual([day.solo, day.total], [3, 3]);
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
        await crash.claimPlay(rider._id, "solo");
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
        assert.equal(await crash.recoverRounds(), 1);
        assert.deepEqual(await walletOf(rider), { pp: 50, ppp: 0 });
        assert.deepEqual(await walletOf(cashed), { pp: 50, ppp: 0 }, "already paid when they cashed out: nothing more");
        assert.equal((await CrashRound.findById(id).lean()).status, "void");
        assert.equal((await CrashDay.findOne({ user: rider._id }).lean()).total, 0);
    });
});
