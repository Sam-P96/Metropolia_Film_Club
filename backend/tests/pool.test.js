// 8 Ball Pool: the table and the rules on their own, then the routes
// against a real MongoDB (challenges, stakes, shots, watching, the crowd's
// bets, the sweep, notifications).
//
// From backend/, with a MongoDB running:
//   PowerShell:  $env:MONGO_TEST_URI="mongodb://127.0.0.1:27017/kino_test"; npm test
//   bash:        MONGO_TEST_URI=mongodb://127.0.0.1:27017/kino_test npm test
// The database is wiped first, so its name has to end in "_test".
const { test, describe, before, after } = require("node:test");
const assert = require("node:assert/strict");

process.env.SECRET ??= "pool-test-secret";

const physics = require("../../shared/pool/physics.js");
const rules = require("../../shared/pool/rules.js");
const { shoot, freshGame } = require("../games/pool/engine");

const { TABLE, simulate } = physics;
const { H } = TABLE;

// A game in play, after the break, with these balls on the table (the
// rest pocketed). Seat 0 to shoot.
function midGame(on, extra = {}) {
    const balls = on.map(([id, x, y]) => ({ id, x, y, on: true }));
    return { balls, current: 0, solids: null, breakShot: false, hand: null, status: "active", winner: null, endedBy: null, shots: 4, lastShot: null, ...extra };
}
// The unit vector from (x1, y1) to (x2, y2).
function toward(x1, y1, x2, y2) {
    const d = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    return { dx: (x2 - x1) / d, dy: (y2 - y1) / d };
}
// Lined up: cue at (500, 250), the object ball on the way to the bottom
// right corner pocket.
const lineUp = (id, extra = []) => [[0, 500, 250], [id, 800, 400], ...extra];
const pot = (power = 0.45) => ({ ...toward(500, 250, 800, 400), power });

describe("the table", () => {
    test("a shot comes out the same every time, and after a trip through JSON", () => {
        const game = rules.newGame(() => 0.37);
        const shot = { dx: 1, dy: 0, speed: physics.MAX_SPEED };
        const first = simulate(game.balls, shot);
        const again = simulate(JSON.parse(JSON.stringify(game.balls)), shot);
        assert.deepEqual(again, first);
        assert.ok(first.steps > 100, "the break takes a while");
        assert.ok(first.balls.filter((ball) => ball.on && ball.id).every((ball) => ball.x >= TABLE.R - 0.001 && ball.y >= TABLE.R - 0.001 && ball.y <= H - TABLE.R + 0.001));
    });

    test("the rack: 15 balls, the black in the middle, a solid and a stripe in the back corners", () => {
        for (const seed of [0.1, 0.5, 0.9]) {
            const balls = rules.newGame(() => seed).balls;
            assert.equal(balls.length, 16);
            assert.deepEqual(balls.map((ball) => ball.id), [...Array(16).keys()]);
            const byPlace = [...balls].filter((ball) => ball.id).sort((a, b) => a.x - b.x || a.y - b.y);
            const eight = balls.find((ball) => ball.id === 8);
            assert.ok(Math.abs(eight.y - H / 2) < 0.001, "the black on the middle line");
            const back = byPlace.filter((ball) => Math.abs(ball.x - byPlace.at(-1).x) < 0.01).sort((a, b) => a.y - b.y);
            assert.deepEqual([rules.groupOfBall(back[0].id), rules.groupOfBall(back.at(-1).id)].sort(), ["solids", "stripes"]);
        }
    });

    test("balls don't overlap at rest, and a ball lined up with a pocket goes down", () => {
        const result = simulate([{ id: 0, x: 500, y: 250, on: true }, { id: 3, x: 800, y: 400, on: true }], { ...toward(500, 250, 800, 400), speed: 1300 });
        assert.deepEqual([result.firstHit, result.pocketed], [3, [3]]);
    });
});

describe("the rules", () => {
    test("an open table: the first ball down, clean, gives that group; you shoot again", () => {
        const game = rules.playShot(midGame(lineUp(2, [[9, 100, 100], [8, 300, 100]])), 0, pot());
        assert.deepEqual([game.solids, game.current, game.hand, game.lastShot.assigned, game.lastShot.keeps, game.lastShot.foul], [0, 0, null, "solids", true, null]);
        assert.equal(rules.groupOf(game, 1), "stripes");

        const striped = rules.playShot(midGame(lineUp(12, [[1, 100, 100], [8, 300, 100]])), 0, pot());
        assert.deepEqual([striped.solids, rules.groupOf(striped, 0)], [1, "stripes"]);
    });

    test("fouls give the other player the cue ball anywhere: the wrong ball first, nothing hit, the cue ball down", () => {
        // On solids, hitting a stripe first.
        const wrong = rules.playShot(midGame(lineUp(10, [[1, 100, 100], [8, 300, 100]]), { solids: 0 }), 0, pot());
        assert.deepEqual([wrong.lastShot.foul, wrong.current, wrong.hand, wrong.lastShot.keeps], ["wrongBall", 1, "table", false]);

        // The black first on an open table.
        const black = rules.playShot(midGame(lineUp(8, [[1, 100, 100], [9, 300, 100]])), 0, pot());
        assert.equal(black.status, "over", "and it went down: that loses");
        assert.deepEqual([black.winner, black.endedBy], [1, "eightFoul"]);

        // Nothing hit.
        const miss = rules.playShot(midGame([[0, 500, 250], [1, 100, 100], [9, 300, 100], [8, 300, 400]]), 0, { dx: 1, dy: 0, power: 0.1 });
        assert.deepEqual([miss.lastShot.foul, miss.hand, miss.current], ["miss", "table", 1]);

        // The cue ball into a pocket: back on the table, in the other player's hand.
        const scratch = rules.playShot(midGame([[0, 900, 450], [1, 100, 100], [9, 300, 100], [8, 300, 300]]), 0, { ...toward(900, 450, 1000, 500), power: 0.3 });
        const cue = scratch.balls.find((ball) => ball.id === 0);
        assert.deepEqual([scratch.lastShot.foul, scratch.hand, scratch.current, cue.on], ["scratch", "table", 1, true]);
        assert.ok(scratch.lastShot.pocketed.includes(0));
    });

    test("a foul that pockets your own ball still loses the turn, and doesn't give you a group", () => {
        // Hit hard off the 2 (an angle found by trying them): both go down.
        const angle = (215 / 3600) * 2 * Math.PI;
        const game = rules.playShot(midGame([[0, 880, 400], [2, 950, 460], [9, 100, 100], [8, 300, 100]]), 0, { dx: Math.cos(angle), dy: Math.sin(angle), power: 0.9 });
        assert.ok(game.lastShot.pocketed.includes(2));
        assert.equal(game.lastShot.foul, "scratch");
        assert.deepEqual([game.solids, game.current, game.lastShot.assigned], [null, 1, null]);
    });

    test("the black: clean after your group is down wins; too soon loses; with a foul loses", () => {
        const won = rules.playShot(midGame(lineUp(8, [[9, 100, 100]]), { solids: 0 }), 0, pot());
        assert.deepEqual([won.status, won.winner, won.endedBy], ["over", 0, "eight"]);

        const early = rules.playShot(midGame(lineUp(8, [[1, 100, 100], [9, 120, 120]]), { solids: 0 }), 0, pot());
        assert.deepEqual([early.status, early.winner, early.endedBy], ["over", 1, "eightFoul"]);

        // Group down, black pocketed, then the cue ball goes down too.
        const angle = (358 / 3600) * 2 * Math.PI;
        const fouled = rules.playShot(midGame([[0, 880, 400], [8, 950, 460], [9, 100, 100]], { solids: 0 }), 0, { dx: Math.cos(angle), dy: Math.sin(angle), power: 0.9 });
        assert.ok(fouled.lastShot.pocketed.includes(8) && fouled.lastShot.pocketed.includes(0), JSON.stringify(fouled.lastShot.pocketed));
        assert.deepEqual([fouled.winner, fouled.endedBy], [1, "eightFoul"]);
    });

    test("on the black, only the black counts as the right ball", () => {
        const game = rules.playShot(midGame(lineUp(10, [[8, 100, 100]]), { solids: 0 }), 0, pot());
        assert.equal(game.lastShot.foul, "wrongBall");
        assert.deepEqual(rules.legalTargets(midGame([[0, 1, 1], [8, 100, 100], [10, 50, 50]], { solids: 0 }), 0), [8]);
    });

    test("the break: the cue ball goes behind the head string; the black down on the break goes back on its spot", () => {
        const game = rules.newGame(() => 0.42);
        assert.equal(game.hand, "kitchen");
        assert.throws(() => rules.playShot(game, 0, { dx: 1, dy: 0, power: 1, cue: { x: 400, y: 250 } }), /behind the head string/);
        assert.throws(() => rules.playShot(game, 1, { dx: 1, dy: 0, power: 1 }), /not your turn/);
        assert.throws(() => rules.playShot(game, 0, { dx: 1, dy: 0, power: 2 }), /too soft or too hard/);
        assert.throws(() => rules.playShot(game, 0, { dx: 3, dy: 0, power: 0.5 }), /direction/);

        const broken = rules.playShot(game, 0, { dx: 1, dy: 0, power: 1, cue: { x: 200, y: 250 } });
        assert.equal(broken.breakShot, false);
        assert.equal(broken.solids, null, "the table stays open after the break");
        assert.deepEqual(broken.lastShot.before.find((ball) => ball.id === 0), { id: 0, x: 200, y: 250, on: true });

        // A rack with the black right in front of the corner pocket.
        const eightGame = { ...midGame([[0, 940, 470], [8, 970, 485], [1, 100, 100], [9, 300, 100]]), breakShot: true };
        const after = rules.playShot(eightGame, 0, { ...toward(940, 470, 1000, 500), power: 0.25 });
        const eight = after.balls.find((ball) => ball.id === 8);
        assert.deepEqual([after.status, after.lastShot.respotted, eight.on], ["active", true, true]);
        assert.ok(Math.abs(eight.x - TABLE.FOOT_X) < 60);
    });

    test("in hand after a foul: anywhere it fits, not on another ball", () => {
        const game = midGame([[0, 500, 250], [1, 600, 250], [9, 100, 100], [8, 300, 100]], { hand: "table", current: 1 });
        assert.throws(() => rules.playShot(game, 1, { dx: 1, dy: 0, power: 0.2, cue: { x: 605, y: 250 } }), /doesn't fit/);
        const placed = rules.playShot(game, 1, { dx: 1, dy: 0, power: 0.2, cue: { x: 700, y: 250 } });
        assert.deepEqual(placed.lastShot.before.find((ball) => ball.id === 0), { id: 0, x: 700, y: 250, on: true });
    });

    test("the server's shot is an angle; the page plays it again from the direction it kept, and gets the same table", () => {
        const game = freshGame();
        const shot = shoot(game, 0, { angle: 0.013, power: 0.93, cue: { x: 190, y: 255 } });
        const { before, dx, dy, speed } = shot.lastShot;
        const replayed = simulate(JSON.parse(JSON.stringify(before)), { dx, dy, speed });
        assert.deepEqual(replayed.pocketed, shot.lastShot.pocketed);
        const kept = shot.balls.filter((ball) => ball.id !== 8 && ball.id !== 0);
        for (const ball of kept) assert.deepEqual(ball, replayed.balls.find((r) => r.id === ball.id));
    });
});

const uri = process.env.MONGO_TEST_URI;
const dbName = uri ? new URL(uri).pathname.slice(1) : "";

describe("the routes", { skip: !uri ? "set MONGO_TEST_URI to run these" : !dbName.endsWith("_test") ? "MONGO_TEST_URI's database must end in _test" : false }, () => {
    const mongoose = require("mongoose");
    const express = require("express");
    const jwt = require("jsonwebtoken");

    let base;
    let server;
    let User;
    let Follow;
    let PoolMatch;
    let PoolBet;
    let Notification;
    let WalletTx;
    let pool;
    let PoolCueOwned;
    const tokens = new Map();

    before(async () => {
        await mongoose.connect(uri);
        await mongoose.connection.dropDatabase();
        User = require("../models/userModel");
        Follow = require("../models/followModel");
        PoolMatch = require("../models/poolMatchModel");
        PoolBet = require("../models/poolBetModel");
        Notification = require("../models/notificationModel");
        WalletTx = require("../models/walletTxModel");
        pool = require("../utils/pool");
        PoolCueOwned = require("../models/poolCueOwnedModel");
        await Promise.all([User, Follow, PoolMatch, PoolBet, Notification, WalletTx, PoolCueOwned].map((model) => model.syncIndexes()));

        const app = express();
        app.use(express.json());
        app.use("/api/pool", require("../routes/poolRouter"));
        await new Promise((resolve) => {
            server = app.listen(0, "127.0.0.1", resolve);
        });
        base = `http://127.0.0.1:${server.address().port}/api/pool`;
    });

    after(async () => {
        server?.close();
        await mongoose.disconnect();
    });

    let count = 0;
    async function member(pp = 0, ppp = 0) {
        count += 1;
        const user = await User.create({ username: `shark${count}`, email: `pool${count}@test.invalid`, password: "x", wallet: { pp, ppp } });
        tokens.set(String(user._id), jwt.sign({ _id: user._id }, process.env.SECRET));
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
    const follow = (follower, following) => Follow.create({ follower: follower._id, following: following._id });

    // A challenge from `a` to `b` for `stake`, accepted: `b` breaks.
    async function started(a, b, stake = 0) {
        const sent = await call(a, "POST", "/challenges", { opponent: String(b._id), stake });
        assert.equal(sent.status, 201, JSON.stringify(sent.body));
        const accepted = await call(b, "POST", `/matches/${sent.body._id}/accept`, { version: sent.body.version });
        assert.equal(accepted.status, 200, JSON.stringify(accepted.body));
        return accepted.body;
    }

    test("a challenge for points: nothing taken until it's accepted; then both stakes, and whoever accepted breaks", async () => {
        const a = await member(100);
        const b = await member(30, 70);
        const sent = await call(a, "POST", "/challenges", { opponent: String(b._id), stake: 50 });
        assert.equal(sent.status, 201);
        assert.deepEqual(await walletOf(a), { pp: 100, ppp: 0 });
        assert.equal(await Notification.countDocuments({ recipient: b._id, type: "poolChallenge", pinned: true }), 1);

        const again = await call(a, "POST", "/challenges", { opponent: String(b._id), stake: 10 });
        assert.equal(again.status, 409, "one at a time between two members");

        const accepted = await call(b, "POST", `/matches/${sent.body._id}/accept`, { version: sent.body.version });
        assert.equal(accepted.status, 200);
        assert.deepEqual([accepted.body.status, accepted.body.mySeat, accepted.body.current, accepted.body.hand, accepted.body.balls.length], ["active", 0, 0, "kitchen", 16]);
        assert.deepEqual(await walletOf(a), { pp: 50, ppp: 0 });
        assert.deepEqual(await walletOf(b), { pp: 0, ppp: 50 });
        assert.equal(accepted.body.prize, 100);
    });

    test("the shop: cues bought with points (PP first), once each; only owned ones used; both players see each other's", async () => {
        const a = await member(600, 1000);
        const b = await member();

        const fresh = await call(a, "GET", "/shop");
        assert.equal(fresh.status, 200);
        assert.deepEqual([fresh.body.cue, fresh.body.owned, fresh.body.points], ["cue.classic", [], 1600]);

        assert.equal((await call(a, "PUT", "/shop/equip", { itemId: "cue.neon" })).status, 403, "not bought");
        assert.equal((await call(a, "POST", "/shop/buy", { itemId: "cue.classic" })).status, 400, "free already");
        assert.equal((await call(a, "POST", "/shop/buy", { itemId: "cue.nope" })).status, 404);

        const bought = await call(a, "POST", "/shop/buy", { itemId: "cue.neon" });
        assert.equal(bought.status, 201, JSON.stringify(bought.body));
        assert.deepEqual(bought.body.done, { item: "cue.neon", price: 1000 });
        assert.deepEqual(await walletOf(a), { pp: 0, ppp: 600 }, "PP first, then P-PP");
        assert.equal(await WalletTx.countDocuments({ user: a._id, reason: "poolShop" }), 1);
        assert.equal((await call(a, "POST", "/shop/buy", { itemId: "cue.neon" })).status, 409, "once each");
        assert.equal((await call(a, "POST", "/shop/buy", { itemId: "cue.prism" })).status, 400, "not enough points");
        assert.equal(await PoolCueOwned.countDocuments({ user: a._id }), 1, "nothing kept that wasn't paid for");

        const used = await call(a, "PUT", "/shop/equip", { itemId: "cue.neon" });
        assert.equal(used.status, 200);
        assert.equal(used.body.view.cue, "cue.neon");

        const game = await started(a, b);
        const seen = await call(b, "GET", `/matches/${game._id}`);
        assert.deepEqual(seen.body.players.map((player) => player.look.cue), ["cue.classic", "cue.neon"], "b accepted, so b is seat 0");

        const back = await call(a, "PUT", "/shop/equip", { itemId: null });
        assert.equal(back.body.view.cue, "cue.classic");
    });

    test("shots: the player whose turn it is, on the version they saw; the other player is refused", async () => {
        const a = await member();
        const b = await member();
        const game = await started(a, b);
        const breaker = b;

        const notYours = await call(a, "POST", `/matches/${game._id}/shots`, { version: game.version, type: "shot", angle: 0, power: 1, cue: { x: 200, y: 250 } });
        assert.equal(notYours.status, 409);
        const stale = await call(breaker, "POST", `/matches/${game._id}/shots`, { version: game.version - 1, type: "shot", angle: 0, power: 1, cue: { x: 200, y: 250 } });
        assert.equal(stale.status, 409);
        const badCue = await call(breaker, "POST", `/matches/${game._id}/shots`, { version: game.version, type: "shot", angle: 0, power: 1, cue: { x: 600, y: 250 } });
        assert.equal(badCue.status, 400);

        const shot = await call(breaker, "POST", `/matches/${game._id}/shots`, { version: game.version, type: "shot", angle: 0, power: 1, cue: { x: 200, y: 250 } });
        assert.equal(shot.status, 200, JSON.stringify(shot.body));
        assert.equal(shot.body.shots, 1);
        assert.ok(shot.body.lastShot.before && Number.isFinite(shot.body.lastShot.dx));
        assert.equal(shot.body.breakShot, false);

        // The other player sees it as a shot they haven't seen yet.
        const seen = await call(a, "GET", `/matches/${game._id}`);
        assert.deepEqual([seen.body.shots, seen.body.seen], [1, 0]);
        await call(a, "POST", `/matches/${game._id}/seen`, { shots: 1 });
        assert.equal((await call(a, "GET", `/matches/${game._id}`)).body.seen, 1);
    });

    test("resigning ends it, the winner is paid, and members who follow them hear the result", async () => {
        const a = await member(40);
        const b = await member(40);
        const fan = await member();
        await follow(fan, a);
        const game = await started(a, b, 20);
        assert.equal(await Notification.countDocuments({ recipient: fan._id, type: "poolLive", pool: game._id }), 1, "a follower hears the game started");

        const resigned = await call(a, "POST", `/matches/${game._id}/shots`, { version: game.version, type: "resign" });
        assert.equal(resigned.status, 200);
        assert.deepEqual([resigned.body.status, resigned.body.winner, resigned.body.endedBy], ["over", 0, "resign"]);
        assert.deepEqual(await walletOf(b), { pp: 20, ppp: 40 });
        assert.equal(await Notification.countDocuments({ recipient: fan._id, type: "poolResult" }), 1);
        assert.equal(await Notification.countDocuments({ recipient: fan._id, type: "poolLive", pool: game._id }), 0, "the watch notice goes");
    });

    test("watching: members who follow a player see the game and its lobby row; anyone else doesn't", async () => {
        const a = await member();
        const b = await member();
        const fan = await member();
        const stranger = await member();
        await follow(fan, b);
        const game = await started(a, b);

        const watched = await call(fan, "GET", `/matches/${game._id}`);
        assert.equal(watched.status, 200);
        assert.deepEqual([watched.body.mySeat, watched.body.watching], [-1, true]);
        assert.equal((await call(stranger, "GET", `/matches/${game._id}`)).status, 404);
        assert.equal((await call(fan, "POST", `/matches/${game._id}/shots`, { version: game.version, type: "resign" })).status, 404, "watchers can't play");

        const lobby = await call(fan, "GET", "/lobby");
        assert.ok(lobby.body.watch.some((row) => String(row._id) === String(game._id)));
    });

    test("the crowd's bets: offered and taken by watchers, never players; the winner's backer gets both; unmatched ones come back", async () => {
        const a = await member();
        const b = await member();
        const fan1 = await member(100);
        const fan2 = await member(30, 100);
        const fan3 = await member(50);
        for (const fan of [fan1, fan2, fan3]) await follow(fan, a);
        const game = await started(a, b);

        assert.equal((await call(a, "POST", `/matches/${game._id}/bets`, { side: 0, amount: 10 })).status, 403, "players can't bet");
        assert.equal((await call(fan1, "POST", `/matches/${game._id}/bets`, { side: 0, amount: 0 })).status, 400);
        assert.equal((await call(fan1, "POST", `/matches/${game._id}/bets`, { side: 0, amount: 1000 })).status, 400, "more than they have");

        // fan1 backs seat 0 (b, who accepted) for 40; fan2 takes it.
        const placed = await call(fan1, "POST", `/matches/${game._id}/bets`, { side: 0, amount: 40 });
        assert.equal(placed.status, 201, JSON.stringify(placed.body));
        assert.deepEqual(await walletOf(fan1), { pp: 60, ppp: 0 });
        const bet = placed.body.bets[0];
        assert.deepEqual([bet.status, bet.side, bet.amount, bet.mine], ["open", 0, 40, "bettor"]);
        assert.equal((await call(fan1, "POST", `/bets/${bet._id}/take`)).status, 403, "not their own");

        const taken = await call(fan2, "POST", `/bets/${bet._id}/take`);
        assert.equal(taken.status, 200, JSON.stringify(taken.body));
        assert.deepEqual(await walletOf(fan2), { pp: 0, ppp: 90 });
        assert.equal(taken.body.bets[0].status, "matched");
        assert.equal((await call(fan3, "POST", `/bets/${bet._id}/take`)).status, 409, "only once");
        assert.equal((await call(fan1, "POST", `/bets/${bet._id}/withdraw`)).status, 409, "it's on now");
        assert.equal(await Notification.countDocuments({ recipient: fan1._id, type: "poolBetTaken" }), 1);

        // fan3 offers one nobody takes, and another they take back.
        const lonely = await call(fan3, "POST", `/matches/${game._id}/bets`, { side: 1, amount: 15 });
        const back = await call(fan3, "POST", `/matches/${game._id}/bets`, { side: 1, amount: 5 });
        const backId = back.body.bets.find((row) => row.amount === 5)._id;
        assert.equal((await call(fan3, "POST", `/bets/${backId}/withdraw`)).status, 200);
        assert.deepEqual(await walletOf(fan3), { pp: 35, ppp: 0 }, "15 still out");
        assert.equal(lonely.status, 201);

        // a resigns: seat 0 (b) wins.
        const now = await call(a, "GET", `/matches/${game._id}`);
        await call(a, "POST", `/matches/${game._id}/shots`, { version: now.body.version, type: "resign" });

        assert.deepEqual(await walletOf(fan1), { pp: 60, ppp: 80 }, "both 40s, as P-PP");
        assert.deepEqual(await walletOf(fan2), { pp: 0, ppp: 90 });
        assert.deepEqual(await walletOf(fan3), { pp: 50, ppp: 0 }, "the 15 nobody took is back, as it was paid");
        assert.equal(await Notification.countDocuments({ recipient: fan1._id, type: "poolBetWon", amount: 80 }), 1);
        assert.equal(await Notification.countDocuments({ recipient: fan2._id, type: "poolBetLost", amount: 40 }), 1);
        assert.equal(await Notification.countDocuments({ recipient: fan3._id, type: "poolBetBack", amount: 15 }), 1);
        assert.deepEqual((await PoolBet.find({ match: game._id }).lean()).map((row) => row.status).sort(), ["refunded", "settled", "withdrawn"]);
        assert.equal((await call(fan3, "POST", `/matches/${game._id}/bets`, { side: 1, amount: 5 })).status, 409, "no bets once it's over");
    });

    test("three days without a shot: the player to shoot loses, and the sweep settles it", async () => {
        const a = await member(10);
        const b = await member(10);
        const game = await started(a, b, 10);
        await PoolMatch.updateOne({ _id: game._id }, { $set: { lastMoveAt: new Date(Date.now() - pool.IDLE_LIMIT_MS - 1000) } });
        const counts = await pool.sweepMatches();
        assert.ok(counts.forfeited >= 1);
        const ended = await PoolMatch.findById(game._id).lean();
        assert.deepEqual([ended.status, ended.winner, ended.endedBy, ended.settled], ["over", 1, "forfeit", true]);
        assert.deepEqual(await walletOf(a), { pp: 0, ppp: 20 });
    });

    test("declining and counter offers", async () => {
        const a = await member(100);
        const b = await member(100);
        const sent = await call(a, "POST", "/challenges", { opponent: String(b._id), stake: 10 });
        const countered = await call(b, "POST", `/matches/${sent.body._id}/counter`, { version: sent.body.version, stake: 25 });
        assert.equal(countered.status, 200);
        assert.deepEqual([countered.body.stake, countered.body.counters], [25, 1]);
        assert.equal((await call(b, "POST", `/matches/${sent.body._id}/decline`, { version: countered.body.version })).status, 403, "it's a's to answer now");
        const declined = await call(a, "POST", `/matches/${sent.body._id}/decline`, { version: countered.body.version });
        assert.equal(declined.body.status, "declined");
        assert.deepEqual(await walletOf(a), { pp: 100, ppp: 0 });
    });
});
