// The admin panel (/api/admin): admins only, whatever their name; sending
// P-PP to a member. Against a real MongoDB.
//
// From backend/, with a MongoDB running:
//   PowerShell:  $env:MONGO_TEST_URI="mongodb://127.0.0.1:27017/kino_test"; npm test
//   bash:        MONGO_TEST_URI=mongodb://127.0.0.1:27017/kino_test npm test
// The database is wiped first, so its name has to end in "_test".
const { test, describe, before, after } = require("node:test");
const assert = require("node:assert/strict");

process.env.SECRET ??= "admin-test-secret";
const mongoose = require("mongoose");
const express = require("express");
const jwt = require("jsonwebtoken");

const uri = process.env.MONGO_TEST_URI;
const dbName = uri ? new URL(uri).pathname.slice(1) : "";

describe("the admin panel", { skip: !uri ? "set MONGO_TEST_URI to run these" : !dbName.endsWith("_test") ? "MONGO_TEST_URI's database must end in _test" : false }, () => {
    let base;
    let server;
    let User;
    let WalletTx;
    let Notification;
    const tokens = new Map();

    before(async () => {
        await mongoose.connect(uri);
        await mongoose.connection.dropDatabase();
        User = require("../models/userModel");
        WalletTx = require("../models/walletTxModel");
        Notification = require("../models/notificationModel");
        await Promise.all([User, WalletTx, Notification].map((model) => model.syncIndexes()));

        const app = express();
        app.use(express.json());
        app.use("/api/admin", require("../routes/adminRouter"));
        await new Promise((resolve) => {
            server = app.listen(0, "127.0.0.1", resolve);
        });
        base = `http://127.0.0.1:${server.address().port}/api/admin`;
    });

    after(async () => {
        server?.close();
        await mongoose.disconnect();
    });

    let count = 0;
    async function member(role = "user", username = null) {
        count += 1;
        const user = await User.create({ username: username ?? `person${count}`, email: `a${count}@test.invalid`, password: "x", role, wallet: { pp: 3, ppp: 10 } });
        tokens.set(String(user._id), jwt.sign({ _id: user._id }, process.env.SECRET));
        return user;
    }
    async function call(user, method, path = "", body) {
        const response = await fetch(base + path, {
            method,
            headers: { Authorization: `Bearer ${tokens.get(String(user._id))}`, ...(body && { "Content-Type": "application/json" }) },
            body: body && JSON.stringify(body),
        });
        return { status: response.status, body: await response.json() };
    }

    test("only admins get in, whatever their name; moderators and members don't", async () => {
        assert.equal((await call(await member("admin", "Sam"), "GET")).status, 200);
        assert.equal((await call(await member("moderator"), "GET")).status, 403);
        assert.equal((await call(await member(), "GET")).status, 403);
        assert.equal((await call(await member(), "POST", "/grants", { userId: String(new mongoose.Types.ObjectId()), amount: 5 })).status, 403);
    });

    test("sending P-PP: it lands in their P-PP, on their history as from an admin, with a notification and the note", async () => {
        const admin = await member("admin");
        const player = await member();

        const sent = await call(admin, "POST", "/grants", { userId: String(player._id), amount: 500, note: "  Sorry about the outage!  " });
        assert.equal(sent.status, 201, JSON.stringify(sent.body));
        assert.deepEqual([sent.body.sent.amount, sent.body.sent.note, sent.body.sent.user.username], [500, "Sorry about the outage!", player.username]);

        const wallet = (await User.findById(player._id).lean()).wallet;
        assert.deepEqual([wallet.pp, wallet.ppp], [3, 510]);
        const receipt = await WalletTx.findOne({ user: player._id, reason: "adminGrant" }).lean();
        assert.deepEqual([receipt.ppp, receipt.pp, String(receipt.other)], [500, 0, String(admin._id)]);
        const note = await Notification.findOne({ recipient: player._id, type: "adminGrant" }).lean();
        assert.deepEqual([note.amount, note.note, String(note.actors[0])], [500, "Sorry about the outage!", String(admin._id)]);

        // The panel lists it, newest first.
        const panel = (await call(admin, "GET")).body;
        assert.equal(panel.grants[0].to.username, player.username);
        assert.equal(panel.grants[0].amount, 500);
    });

    test("refused: not a whole number from 1, too much at once, a long note, nobody", async () => {
        const admin = await member("admin");
        const player = await member();
        const send = (body) => call(admin, "POST", "/grants", { userId: String(player._id), ...body });
        assert.equal((await send({ amount: 0 })).status, 400);
        assert.equal((await send({ amount: 2.5 })).status, 400);
        assert.equal((await send({ amount: "500" })).status, 400);
        assert.equal((await send({ amount: 1_000_001 })).status, 400);
        assert.equal((await send({ amount: 5, note: "x".repeat(201) })).status, 400);
        assert.equal((await call(admin, "POST", "/grants", { userId: String(new mongoose.Types.ObjectId()), amount: 5 })).status, 404);
        assert.equal((await call(admin, "POST", "/grants", { userId: "nope", amount: 5 })).status, 400);
        assert.equal((await User.findById(player._id).lean()).wallet.ppp, 10);
    });
});
