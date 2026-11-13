// "Forgot password?": the emailed link, and "Reset Locally", where the
// request goes to the moderators' and admins' Notifications to approve in
// person. Against a real MongoDB.
//
// From backend/, with a MongoDB running:
//   PowerShell:  $env:MONGO_TEST_URI="mongodb://127.0.0.1:27017/kino_test"; npm test
//   bash:        MONGO_TEST_URI=mongodb://127.0.0.1:27017/kino_test npm test
// The database is wiped first, so its name has to end in "_test".
const { test, describe, before, after } = require("node:test");
const assert = require("node:assert/strict");

process.env.SECRET ??= "password-reset-test-secret";
// No Resend key: the emailed link is logged instead of sent.
delete process.env.RESEND_API_KEY;
const mongoose = require("mongoose");
const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const uri = process.env.MONGO_TEST_URI;
const dbName = uri ? new URL(uri).pathname.slice(1) : "";

describe("password resets", { skip: !uri ? "set MONGO_TEST_URI to run these" : !dbName.endsWith("_test") ? "MONGO_TEST_URI's database must end in _test" : false }, () => {
    let base;
    let server;
    let User;
    let PasswordReset;
    const tokens = new Map();

    before(async () => {
        await mongoose.connect(uri);
        await mongoose.connection.dropDatabase();
        User = require("../models/userModel");
        PasswordReset = require("../models/passwordResetModel");
        await Promise.all([User, PasswordReset].map((model) => model.syncIndexes()));

        const app = express();
        app.use(express.json());
        app.use("/api/password-resets", require("../routes/passwordResetRouter"));
        app.use("/api/feed", require("../routes/feedRouter"));
        await new Promise((resolve) => {
            server = app.listen(0, "127.0.0.1", resolve);
        });
        base = `http://127.0.0.1:${server.address().port}/api`;
    });

    after(async () => {
        server?.close();
        await mongoose.disconnect();
    });

    let count = 0;
    async function member(role = "user") {
        count += 1;
        const user = await User.create({ username: `resetter${count}`, email: `reset${count}@test.invalid`, password: "old-password", role });
        tokens.set(String(user._id), jwt.sign({ _id: user._id }, process.env.SECRET));
        return user;
    }
    async function call(method, path, body, as = null) {
        const response = await fetch(base + path, {
            method,
            headers: { "Content-Type": "application/json", ...(as && { Authorization: `Bearer ${tokens.get(String(as._id))}` }) },
            body: body && JSON.stringify(body),
        });
        return { status: response.status, body: await response.json() };
    }
    const askLocally = (user) => call("POST", "/password-resets/local", { email: user.email.toUpperCase() });
    const status = (token) => call("POST", "/password-resets/status", { token });
    const decide = (id, decision, as) => call("PUT", `/password-resets/${id}`, { decision }, as);
    const resetsFor = async (viewer) => (await call("GET", "/feed", null, viewer)).body.passwordResets;

    test("Reset Locally: pinned for moderators and admins, approved in person, then the member chooses the password", async () => {
        const player = await member();
        const moderator = await member("moderator");
        const admin = await member("admin");
        const someoneElse = await member();

        const asked = await askLocally(player);
        assert.equal(asked.status, 201, JSON.stringify(asked.body));
        assert.equal(asked.body.email, player.email);
        assert.equal((await status(asked.body.token)).body.status, "pending");

        // Only once approved: the token alone can't set a password.
        assert.equal((await call("POST", "/password-resets/complete", { token: asked.body.token, password: "brand-new-pass" })).status, 410);

        // In both the moderator's and the admin's Notifications, not a member's, and it lights the bell.
        const pinned = await resetsFor(moderator);
        assert.equal(pinned.length, 1);
        assert.equal(pinned[0].user.username, player.username);
        assert.equal(pinned[0].user.email, undefined);
        assert.equal((await resetsFor(admin)).length, 1);
        assert.equal(await resetsFor(someoneElse), undefined);
        assert.equal((await call("GET", "/feed/unread", null, moderator)).body.unread, true);

        // A second request while one is open is refused.
        assert.equal((await askLocally(player)).status, 409);

        const approved = await decide(pinned[0]._id, "approve", moderator);
        assert.equal(approved.status, 200, JSON.stringify(approved.body));
        assert.deepEqual((await resetsFor(admin)).length, 0);
        const now = (await status(asked.body.token)).body;
        assert.deepEqual([now.status, now.approvedBy.username, now.approvedBy.role], ["approved", moderator.username, "moderator"]);

        assert.equal((await call("POST", "/password-resets/complete", { token: asked.body.token, password: "short" })).status, 400);
        const done = await call("POST", "/password-resets/complete", { token: asked.body.token, password: "brand-new-pass" });
        assert.equal(done.status, 200, JSON.stringify(done.body));
        assert.ok(done.body.token, "logged in");
        const saved = await User.findById(player._id).select("password").lean();
        assert.ok(await bcrypt.compare("brand-new-pass", saved.password));

        // Used once, then gone.
        assert.equal((await call("POST", "/password-resets/complete", { token: asked.body.token, password: "again-new-pass" })).status, 410);
        assert.equal((await status(asked.body.token)).body.status, "expired");
    });

    test("dismissing: the requester's page hears it, and they can ask again", async () => {
        const player = await member();
        const admin = await member("admin");
        const asked = await askLocally(player);
        const [request] = (await resetsFor(admin)).filter((open) => open.user.username === player.username);

        assert.equal((await decide(request._id, "dismiss", admin)).status, 200);
        assert.equal((await status(asked.body.token)).body.status, "dismissed");
        assert.equal((await decide(request._id, "approve", admin)).status, 404, "already decided");
        assert.equal((await askLocally(player)).status, 201);
    });

    test("who decides whose: moderators a member's, admins anyone's but their own", async () => {
        const [moderator, otherModerator, admin, otherAdmin] = [await member("moderator"), await member("moderator"), await member("admin"), await member("admin")];

        await askLocally(otherModerator);
        await askLocally(admin);
        const modRequest = (await resetsFor(otherAdmin)).find((open) => open.user.username === otherModerator.username);
        const adminRequest = (await resetsFor(otherAdmin)).find((open) => open.user.username === admin.username);

        // A moderator doesn't even see another moderator's or an admin's.
        const seenByModerator = (await resetsFor(moderator)).map((open) => open.user.username);
        assert.ok(!seenByModerator.includes(otherModerator.username));
        assert.ok(!seenByModerator.includes(admin.username));
        assert.equal((await decide(modRequest._id, "approve", moderator)).status, 403);

        // Nobody decides their own.
        assert.ok(!(await resetsFor(admin)).some((open) => open.user.username === admin.username));
        assert.equal((await decide(adminRequest._id, "approve", admin)).status, 403);

        // Another admin can decide an admin's, and a moderator's.
        assert.equal((await decide(adminRequest._id, "approve", otherAdmin)).status, 200);
        assert.equal((await decide(modRequest._id, "dismiss", otherAdmin)).status, 200);

        // A member can't decide anything.
        const player = await member();
        assert.equal((await decide(modRequest._id, "approve", player)).status, 403);
    });

    test("no account: Reset Locally says so; the emailed link still never does", async () => {
        const nobody = { email: "nobody@test.invalid" };
        assert.equal((await call("POST", "/password-resets/local", nobody)).status, 404);
        assert.equal((await call("POST", "/password-resets/local", {})).status, 400);
        const emailed = await call("POST", "/password-resets", nobody);
        assert.equal(emailed.status, 200);
        assert.match(emailed.body.message, /If there's an account/);
    });

    test("the emailed link still works on its own, and asking for one leaves a local request alone", async () => {
        const player = await member();
        const local = await askLocally(player);

        assert.equal((await call("POST", "/password-resets", { email: player.email })).status, 200);
        const kinds = (await PasswordReset.find({ user: player._id }).lean()).map((reset) => reset.kind).sort();
        assert.deepEqual(kinds, ["email", "local"]);
        assert.equal((await status(local.body.token)).body.status, "pending");

        // The emailed token is only in the email, so make one the same way to use it.
        const crypto = require("crypto");
        const token = crypto.randomBytes(32).toString("hex");
        await PasswordReset.deleteMany({ user: player._id, kind: "email" });
        await PasswordReset.create({ user: player._id, kind: "email", tokenHash: crypto.createHash("sha256").update(token).digest("hex"), expiresAt: new Date(Date.now() + 60000) });
        assert.equal((await status(token)).body.status, "expired", "an emailed token isn't a local request");
        const done = await call("POST", "/password-resets/complete", { token, password: "emailed-new-pass" });
        assert.equal(done.status, 200, JSON.stringify(done.body));

        // An older emailed one, from before `kind`, still works too.
        const old = crypto.randomBytes(32).toString("hex");
        await PasswordReset.collection.insertOne({ user: player._id, tokenHash: crypto.createHash("sha256").update(old).digest("hex"), expiresAt: new Date(Date.now() + 60000), createdAt: new Date() });
        assert.equal((await call("POST", "/password-resets/complete", { token: old, password: "older-new-pass" })).status, 200);
    });
});
