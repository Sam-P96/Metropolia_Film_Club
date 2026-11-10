// The PP Leaderboard on the Games page (GET /api/wallet/leaderboard): 10
// at a time down to the top 100, members in debt included at the bottom.
// Against a real MongoDB.
//
// From backend/, with a MongoDB running:
//   PowerShell:  $env:MONGO_TEST_URI="mongodb://127.0.0.1:27017/kino_test"; npm test
//   bash:        MONGO_TEST_URI=mongodb://127.0.0.1:27017/kino_test npm test
// The database is wiped first, so its name has to end in "_test".
const { test, describe, before, after } = require("node:test");
const assert = require("node:assert/strict");

process.env.SECRET ??= "leaderboard-test-secret";
const mongoose = require("mongoose");
const express = require("express");

const uri = process.env.MONGO_TEST_URI;
const dbName = uri ? new URL(uri).pathname.slice(1) : "";

describe("the PP Leaderboard", { skip: !uri ? "set MONGO_TEST_URI to run these" : !dbName.endsWith("_test") ? "MONGO_TEST_URI's database must end in _test" : false }, () => {
    let base;
    let server;
    let User;

    before(async () => {
        await mongoose.connect(uri);
        await mongoose.connection.dropDatabase();
        User = require("../models/userModel");
        await User.syncIndexes();

        const app = express();
        app.use(express.json());
        app.use("/api/wallet", require("../routes/walletRouter"));
        await new Promise((resolve) => {
            server = app.listen(0, "127.0.0.1", resolve);
        });
        base = `http://127.0.0.1:${server.address().port}/api`;
    });

    after(async () => {
        server?.close();
        await mongoose.disconnect();
    });

    const page = async (skip) => (await fetch(`${base}/wallet/leaderboard?skip=${skip}`)).json();

    test("10 at a time, the most points first, down to the top 100; nobody with 0; debts at the bottom, below 0", async () => {
        // 103 with points (PP and P-PP together), 2 with none, 2 in debt.
        const members = [];
        for (let i = 1; i <= 103; i++) members.push({ username: `rich${String(i).padStart(3, "0")}`, wallet: { pp: i, ppp: i } });
        members.push({ username: "nothing1", wallet: { pp: 0, ppp: 0 } }, { username: "nothing2", wallet: { pp: 0, ppp: 0 } });
        members.push({ username: "owing1", wallet: { pp: 0, ppp: -525 } }, { username: "owing2", wallet: { pp: 3, ppp: -10 } });
        await User.insertMany(members.map((member, i) => ({ ...member, email: `l${i}@test.invalid`, password: "x" })));

        const first = await page(0);
        assert.equal(first.leaders.length, 10);
        assert.deepEqual(first.leaders.slice(0, 2).map((row) => [row.user.username, row.pp]), [["rich103", 206], ["rich102", 204]]);
        assert.deepEqual([first.hasMore, first.next], [true, 10]);

        const seen = [...first.leaders];
        let next = first.next;
        let more = first.hasMore;
        while (more) {
            const got = await page(next);
            seen.push(...got.leaders);
            next = got.next;
            more = got.hasMore;
        }
        // Stops at 100, even with more to rank.
        assert.equal(seen.length, 100);
        assert.equal(new Set(seen.map((row) => row.user.username)).size, 100);
        assert.deepEqual((await page(100)).leaders, []);

        // Past the top 100: the rest of the points, then the debts, never the zeros.
        const rest = await User.aggregate([
            ...require("../utils/wallet").leaderboardStages({ username: 1 }),
            { $match: { pp: { $ne: 0 } } },
        ]);
        assert.deepEqual(rest.slice(-2).map((row) => [row.username, row.pp]), [["owing2", -7], ["owing1", -525]]);
        assert.equal(rest.some((row) => row.username.startsWith("nothing")), false);
    });

    test("a short leaderboard shows everyone, debts included, on one page", async () => {
        await User.deleteMany({});
        await User.insertMany([
            { username: "a", email: "a@test.invalid", password: "x", wallet: { pp: 5, ppp: 0 } },
            { username: "b", email: "b@test.invalid", password: "x", wallet: { pp: 0, ppp: -40 } },
            { username: "c", email: "c@test.invalid", password: "x", wallet: { pp: 0, ppp: 0 } },
        ]);
        const only = await page(0);
        assert.deepEqual(only.leaders.map((row) => [row.user.username, row.pp]), [["a", 5], ["b", -40]]);
        assert.deepEqual([only.hasMore, only.next], [false, 2]);
    });
});
