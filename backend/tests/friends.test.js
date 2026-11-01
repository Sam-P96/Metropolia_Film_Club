// "Challenge a friend" in the Farkle lobby (GET /api/farkle/friends), and
// the points on a profile (GET /api/users/:id). Against a real MongoDB.
//
// From backend/, with a MongoDB running:
//   PowerShell:  $env:MONGO_TEST_URI="mongodb://127.0.0.1:27017/kino_test"; npm test
//   bash:        MONGO_TEST_URI=mongodb://127.0.0.1:27017/kino_test npm test
// The database is wiped first, so its name has to end in "_test".
const { test, describe, before, after } = require("node:test");
const assert = require("node:assert/strict");

process.env.SECRET ??= "friends-test-secret";
const mongoose = require("mongoose");
const express = require("express");
const jwt = require("jsonwebtoken");

const uri = process.env.MONGO_TEST_URI;
const dbName = uri ? new URL(uri).pathname.slice(1) : "";

describe("friends and points", { skip: !uri ? "set MONGO_TEST_URI to run these" : !dbName.endsWith("_test") ? "MONGO_TEST_URI's database must end in _test" : false }, () => {
    let base;
    let server;
    let User;
    let Follow;
    let FarkleMatch;
    const tokens = new Map();

    before(async () => {
        await mongoose.connect(uri);
        await mongoose.connection.dropDatabase();
        User = require("../models/userModel");
        Follow = require("../models/followModel");
        FarkleMatch = require("../models/farkleMatchModel");
        await Promise.all([User, Follow, FarkleMatch].map((model) => model.syncIndexes()));

        const app = express();
        app.use(express.json());
        app.use("/api/farkle", require("../routes/farkleRouter"));
        app.use("/api/users", require("../routes/userRouter"));
        app.use((error, req, res, next) => {
            console.error(error);
            res.status(500).json({ error: "Something went wrong" });
        });
        server = app.listen(0);
        base = `http://127.0.0.1:${server.address().port}/api`;
    });

    after(async () => {
        server?.close();
        await mongoose.disconnect();
    });

    let count = 0;
    async function member(pp = 0, ppp = 0, extra = {}) {
        count += 1;
        const user = await User.create({ username: `friend${count}`, email: `f${count}@test.invalid`, password: "x", wallet: { pp, ppp }, ...extra });
        tokens.set(String(user._id), jwt.sign({ _id: user._id }, process.env.SECRET));
        return user;
    }
    async function call(user, path) {
        const response = await fetch(base + path, { headers: user ? { Authorization: `Bearer ${tokens.get(String(user._id))}` } : {} });
        return { status: response.status, body: await response.json().catch(() => null) };
    }
    const befriend = (a, b) => Follow.create([{ follower: a._id, following: b._id }, { follower: b._id, following: a._id }]);

    test("friends are mutual follows only, the most points (PP + P-PP) first, five at a time", async () => {
        const me = await member(50);
        const friends = [];
        for (const [pp, ppp] of [[10, 0], [0, 300], [100, 100], [5, 5], [40, 0], [0, 0], [70, 1]]) {
            const friend = await member(pp, ppp);
            await befriend(me, friend);
            friends.push(friend);
        }
        // Following each other one way only isn't friendship.
        const fan = await member(9999);
        await Follow.create({ follower: fan._id, following: me._id });
        const idol = await member(8888);
        await Follow.create({ follower: me._id, following: idol._id });

        const first = (await call(me, "/farkle/friends")).body;
        assert.deepEqual(first.friends.map((f) => f.points), [300, 200, 71, 40, 10]);
        assert.equal(first.hasMore, true);
        assert.equal(first.friends[0].username, friends[1].username);
        assert.ok("avatarUrl" in first.friends[0]);
        const second = (await call(me, `/farkle/friends?skip=${first.next}`)).body;
        assert.deepEqual(second.friends.map((f) => f.points), [10, 0]);
        assert.equal(second.hasMore, false);
    });

    test("a friend you already have a challenge or game with says so", async () => {
        const [me, busy, free] = [await member(100), await member(100), await member(100)];
        await befriend(me, busy);
        await befriend(me, free);
        const pairKey = [String(me._id), String(busy._id)].sort().join(":");
        const match = await FarkleMatch.create({
            mode: "pvp",
            status: "challenge",
            players: [{ user: me._id }, { user: busy._id }],
            target: 2000,
            stake: 5,
            prize: 10,
            pairKey,
        });
        const { friends } = (await call(me, "/farkle/friends")).body;
        const byName = Object.fromEntries(friends.map((f) => [f.username, f]));
        assert.deepEqual(byName[busy.username].match, { _id: String(match._id), status: "challenge" });
        assert.equal(byName[free.username].match, null);
    });

    test("no friends: an empty list; logged out: 401", async () => {
        assert.deepEqual((await call(await member(), "/farkle/friends")).body, { friends: [], hasMore: false, next: 0 });
        assert.equal((await call(null, "/farkle/friends")).status, 401);
    });

    test("a profile shows its PP and P-PP, but a private one doesn't", async () => {
        const visitor = await member();
        const open = await member(12, 345);
        const hidden = await member(99, 99, { privacy: "private" });
        assert.deepEqual((await call(visitor, `/users/${open._id}`)).body.wallet, { pp: 12, ppp: 345 });
        assert.deepEqual((await call(null, `/users/${open._id}`)).body.wallet, { pp: 12, ppp: 345 });
        assert.equal((await call(visitor, `/users/${hidden._id}`)).body.wallet, undefined);
        // Its owner still sees their own.
        assert.deepEqual((await call(hidden, `/users/${hidden._id}`)).body.wallet, { pp: 99, ppp: 99 });
    });
});
