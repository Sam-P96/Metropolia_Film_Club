// Box Office Crash on Notifications: every open room at the top of
// everyone's page, with every filter; invites into a room, with Play and
// Spectate while it's open; and Invite's friends list. Through the real API,
// with the live rooms started on a stand-in for Socket.IO. Against a real
// MongoDB.
//
// From backend/, with a MongoDB running:
//   PowerShell:  $env:MONGO_TEST_URI="mongodb://127.0.0.1:27017/kino_test"; npm test
//   bash:        MONGO_TEST_URI=mongodb://127.0.0.1:27017/kino_test npm test
// The database is wiped first, so its name has to end in "_test".
const { test, describe, before, after } = require("node:test");
const assert = require("node:assert/strict");

process.env.SECRET ??= "crash-invites-test-secret";
const mongoose = require("mongoose");
const express = require("express");
const jwt = require("jsonwebtoken");

const uri = process.env.MONGO_TEST_URI;
const dbName = uri ? new URL(uri).pathname.slice(1) : "";

describe("Box Office Crash on Notifications", { skip: !uri ? "set MONGO_TEST_URI to run these" : !dbName.endsWith("_test") ? "MONGO_TEST_URI's database must end in _test" : false }, () => {
    let base;
    let server;
    let User;
    let Follow;
    let rooms;
    const tokens = new Map();

    // A stand-in for Socket.IO: nothing is listening.
    const fakeIo = {
        on() {},
        to: () => ({ emit() {} }),
        in: () => ({ socketsJoin() {}, socketsLeave() {} }),
    };
    const socketOf = (user) => ({ id: `s-${user._id}`, data: { user: { _id: user._id } }, join() {} });

    before(async () => {
        await mongoose.connect(uri);
        await mongoose.connection.dropDatabase();
        User = require("../models/userModel");
        Follow = require("../models/followModel");
        await Promise.all([User, Follow, require("../models/notificationModel")].map((model) => model.syncIndexes()));

        const { startCrashLive, getCrashRooms } = require("../games/crash/live");
        startCrashLive(fakeIo);
        rooms = getCrashRooms();

        const app = express();
        app.use(express.json());
        app.use("/api/feed", require("../routes/feedRouter"));
        app.use("/api/crash", require("../routes/crashRouter"));
        app.use((error, req, res, next) => {
            console.error(error);
            res.status(500).json({ error: "Something went wrong" });
        });
        server = app.listen(0);
        base = `http://127.0.0.1:${server.address().port}/api`;
    });

    after(async () => {
        rooms?.stopAll();
        server?.close();
        await mongoose.disconnect();
    });

    let count = 0;
    async function member(pp = 0) {
        count += 1;
        const user = await User.create({ username: `crasher${count}`, email: `cr${count}@test.invalid`, password: "x", wallet: { pp, ppp: 0 } });
        tokens.set(String(user._id), jwt.sign({ _id: user._id }, process.env.SECRET));
        await rooms.hello(socketOf(user));
        return user;
    }
    const idOf = (user) => String(user._id);
    async function get(user, path) {
        const response = await fetch(base + path, { headers: { Authorization: `Bearer ${tokens.get(idOf(user))}` } });
        return response.json();
    }
    const befriend = (a, b) => Follow.create([{ follower: a._id, following: b._id }, { follower: b._id, following: a._id }]);

    test("every open room is at the top of everyone's Notifications, with every filter but Events, until everyone has left it", async () => {
        const [host, watcher, stranger] = [await member(), await member(), await member()];
        const { id } = await rooms.create(idOf(host));
        await rooms.join(idOf(watcher), id, { spectate: true });

        // Events is strictly events.
        assert.deepEqual((await get(stranger, "/feed?filter=events")).crash, []);
        for (const filter of ["all", "reviews", "cuts", "games"]) {
            const page = await get(stranger, `/feed?filter=${filter}`);
            assert.equal(page.crash.length, 1, filter);
            const [room] = page.crash;
            assert.deepEqual(
                [room.id, room.players.map((player) => player.userId), room.spectators.map((player) => player.userId), room.playing, room.full],
                [id, [idOf(host)], [idOf(watcher)], false, false],
                filter
            );
            assert.equal(room.players[0].user.username, host.username);
        }
        assert.equal((await get(stranger, "/feed?skip=10")).crash, undefined, "only with the first page");

        rooms.leave(idOf(host));
        assert.equal((await get(stranger, "/feed")).crash.length, 1, "the spectator's still there");
        rooms.leave(idOf(watcher));
        assert.deepEqual((await get(stranger, "/feed")).crash, []);
    });

    test("an invite: a game notification with the room, open until it closes; Invite's friends list says who's here and who's invited", async () => {
        const host = await member(10);
        const [rich, poor, friendInside, fan] = [await member(500), await member(5), await member(50), await member(999)];
        for (const friend of [rich, poor, friendInside]) await befriend(host, friend);
        // A fan follows the host, but the host doesn't follow back: not a friend.
        await Follow.create({ follower: fan._id, following: host._id });

        const { id } = await rooms.create(idOf(host));
        await rooms.join(idOf(friendInside), id);

        let friends = (await get(host, "/crash/friends")).friends;
        assert.deepEqual(friends.map((friend) => friend.username), [rich.username, friendInside.username, poor.username], "the most points first; not the fan");
        assert.deepEqual(friends.map((friend) => [friend.points, friend.here, friend.invited]), [[500, false, false], [50, true, false], [5, false, false]]);

        await rooms.invite(idOf(host), { userId: idOf(rich) });
        friends = (await get(host, "/crash/friends")).friends;
        assert.equal(friends.find((friend) => friend._id === idOf(rich)).invited, true);

        assert.deepEqual(await get(rich, "/feed/unread"), { unread: true, games: true }, "the bell blinks red: it's about a game");
        const invites = (page) => page.items.filter((item) => item.type === "crashInvite");
        const [invite] = invites(await get(rich, "/feed"));
        assert.deepEqual([invite.actors[0]._id, invite.crash], [idOf(host), { room: id, open: true }]);
        assert.equal(invites(await get(rich, "/feed?filter=games")).length, 1);
        assert.equal(invites(await get(rich, "/feed?filter=reviews")).length, 0, "a game notification, so not with Reviews");

        rooms.leave(idOf(host));
        rooms.leave(idOf(friendInside));
        assert.deepEqual(invites(await get(rich, "/feed"))[0].crash, { room: id, open: false }, "the room closed");
        assert.deepEqual((await get(host, "/crash/friends")).friends.map((friend) => [friend.here, friend.invited]), [[false, false], [false, false], [false, false]], "not in a room");
    });
});
