// Unread notifications: what lights up the bell in the nav (purple for
// anything new, red for games), marking them seen, and unread jackpots
// coming first on the Notifications page. Against a real MongoDB.
//
// From backend/, with a MongoDB running:
//   PowerShell:  $env:MONGO_TEST_URI="mongodb://127.0.0.1:27017/kino_test"; npm test
//   bash:        MONGO_TEST_URI=mongodb://127.0.0.1:27017/kino_test npm test
// The database is wiped first, so its name has to end in "_test".
const { test, describe, before, after } = require("node:test");
const assert = require("node:assert/strict");

process.env.SECRET ??= "notifications-test-secret";
const mongoose = require("mongoose");
const express = require("express");
const jwt = require("jsonwebtoken");

const uri = process.env.MONGO_TEST_URI;
const dbName = uri ? new URL(uri).pathname.slice(1) : "";
const later = () => new Promise((resolve) => setTimeout(resolve, 5));

describe("unread notifications", { skip: !uri ? "set MONGO_TEST_URI to run these" : !dbName.endsWith("_test") ? "MONGO_TEST_URI's database must end in _test" : false }, () => {
    let base;
    let server;
    let User;
    let Notification;
    let FarkleMatch;
    let Report;
    const tokens = new Map();

    before(async () => {
        await mongoose.connect(uri);
        await mongoose.connection.dropDatabase();
        User = require("../models/userModel");
        Notification = require("../models/notificationModel");
        FarkleMatch = require("../models/farkleMatchModel");
        Report = require("../models/reportModel");
        await Promise.all([User, Notification, FarkleMatch, Report].map((model) => model.syncIndexes()));

        const app = express();
        app.use(express.json());
        app.use("/api/feed", require("../routes/feedRouter"));
        app.use((error, req, res, next) => {
            console.error(error);
            res.status(500).json({ error: "Something went wrong" });
        });
        server = app.listen(0);
        base = `http://127.0.0.1:${server.address().port}/api/feed`;
    });

    after(async () => {
        server?.close();
        await mongoose.disconnect();
    });

    let count = 0;
    async function member(role = "user") {
        count += 1;
        const user = await User.create({ username: `reader${count}`, email: `r${count}@test.invalid`, password: "x", role });
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
    const unread = async (user) => (await call(user, "GET", "/unread")).body;
    // Opens their Notifications page, as the page does: load it, then mark it seen.
    async function openPage(user) {
        const page = (await call(user, "GET", "/")).body;
        await call(user, "POST", "/seen", { until: page.now });
        return page;
    }
    const notify = (recipient, type, extra = {}) => Notification.create({ recipient: recipient._id, type, ...extra });
    const seenAt = async (user) => (await User.findById(user._id).select("notificationsSeenAt").lean()).notificationsSeenAt;

    test("nothing there: the bell stays dark", async () => {
        const user = await member();
        assert.deepEqual(await unread(user), { unread: false, games: false });
    });

    test("a new follower glows purple, not red; opening Notifications puts it out", async () => {
        const [user, fan] = [await member(), await member()];
        await notify(user, "follow", { actors: [fan._id] });
        assert.deepEqual(await unread(user), { unread: true, games: false });

        await openPage(user);
        assert.deepEqual(await unread(user), { unread: false, games: false });

        // Something new after that lights it up again.
        await later();
        await notify(user, "follow", { actors: [(await member())._id] });
        assert.deepEqual(await unread(user), { unread: true, games: false });
    });

    for (const type of ["farkleOver", "farkleResult", "farkleChallenge", "scratchWin", "scratchJackpot"]) {
        test(`an unread ${type} is a game notification: red`, async () => {
            const [user, other] = [await member(), await member()];
            await notify(user, type, { actors: [other._id] });
            assert.deepEqual(await unread(user), { unread: true, games: true });
        });
    }

    test("the old farkleTurn notices, which aren't shown any more, never count", async () => {
        const [user, other] = [await member(), await member()];
        await notify(user, "farkleTurn", { actors: [other._id] });
        assert.deepEqual(await unread(user), { unread: false, games: false });
    });

    test("a Farkle game come round to your turn since you looked is red; the other player's turn isn't", async () => {
        const [me, them] = [await member(), await member()];
        await openPage(me);
        await later();
        const game = await FarkleMatch.create({
            mode: "pvp",
            status: "active",
            players: [{ user: them._id }, { user: me._id }],
            target: 2000,
            stake: 5,
            prize: 10,
            current: 0,
            lastMoveAt: new Date(),
        });
        assert.deepEqual(await unread(me), { unread: false, games: false });

        await FarkleMatch.updateOne({ _id: game._id }, { $set: { current: 1, lastMoveAt: new Date() } });
        assert.deepEqual(await unread(me), { unread: true, games: true });

        // Opening Notifications counts as having seen it's your turn.
        await later();
        await openPage(me);
        assert.deepEqual(await unread(me), { unread: false, games: false });
    });

    test("moderators: a new report glows; ordinary members don't hear about it", async () => {
        const [moderator, user] = [await member("moderator"), await member()];
        await openPage(moderator);
        await openPage(user);
        await later();
        await Report.create({ review: new mongoose.Types.ObjectId(), reporter: user._id });
        assert.deepEqual(await unread(moderator), { unread: true, games: false });
        assert.deepEqual(await unread(user), { unread: false, games: false });
    });

    test("seen never moves back, and never past right now", async () => {
        const user = await member();
        const page = await openPage(user);
        const first = await seenAt(user);
        assert.equal(first.toISOString(), page.now);

        await call(user, "POST", "/seen", { until: new Date(Date.parse(page.now) - 60_000).toISOString() });
        assert.equal((await seenAt(user)).toISOString(), page.now);

        await call(user, "POST", "/seen", { until: "2999-01-01T00:00:00.000Z" });
        assert.ok((await seenAt(user)) <= new Date());

        await call(user, "POST", "/seen", { until: "not a date" });
        assert.ok((await seenAt(user)) <= new Date());
    });

    test("unread jackpots come with the first page, until they've been seen", async () => {
        const [user, winner] = [await member(), await member()];
        const jackpot = await notify(user, "scratchJackpot", { actors: [winner._id], amount: 420 });
        await later();
        await notify(user, "follow", { actors: [winner._id] });

        const page = (await call(user, "GET", "/")).body;
        assert.equal(page.seenAt, null);
        assert.deepEqual(page.jackpots.map((item) => item._id), [String(jackpot._id)]);
        assert.equal(page.jackpots[0].amount, 420);
        // Still in the list by its date too (the page leaves it out there).
        assert.ok(page.items.some((item) => item._id === String(jackpot._id)));

        await call(user, "POST", "/seen", { until: page.now });
        const again = (await call(user, "GET", "/")).body;
        assert.deepEqual(again.jackpots, []);
        assert.equal(again.seenAt, page.now);
    });

    test("only the first page carries the games and jackpots, so Load more keeps them", async () => {
        const [user, other] = [await member(), await member()];
        for (let i = 0; i < 12; i++) await notify(user, "follow", { actors: [other._id] });
        const second = (await call(user, "GET", "/?skip=10")).body;
        assert.equal(second.items.length, 2);
        for (const key of ["games", "jackpots", "seenAt", "now"]) assert.ok(!(key in second), key);
    });

    test("logged out: 401", async () => {
        assert.equal((await fetch(`${base}/unread`)).status, 401);
        assert.equal((await fetch(`${base}/seen`, { method: "POST" })).status, 401);
    });
});
