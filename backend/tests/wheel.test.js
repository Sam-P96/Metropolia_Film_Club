// The Club Wheel (/api/wheel): everyone sees it, moderators and admins edit
// it, admins open it to members with a weight allowance each, and its
// public activity box. Against a real MongoDB.
//
// From backend/, with a MongoDB running:
//   PowerShell:  $env:MONGO_TEST_URI="mongodb://127.0.0.1:27017/kino_test"; npm test
//   bash:        MONGO_TEST_URI=mongodb://127.0.0.1:27017/kino_test npm test
// The database is wiped first, so its name has to end in "_test".
const { test, describe, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");

process.env.SECRET ??= "wheel-test-secret";
const mongoose = require("mongoose");
const express = require("express");
const jwt = require("jsonwebtoken");

const uri = process.env.MONGO_TEST_URI;
const dbName = uri ? new URL(uri).pathname.slice(1) : "";

describe("the Club Wheel", { skip: !uri ? "set MONGO_TEST_URI to run these" : !dbName.endsWith("_test") ? "MONGO_TEST_URI's database must end in _test" : false }, () => {
    let base;
    let server;
    let User;
    let WheelEntry;
    let WheelSettings;
    let WheelActivity;
    const tokens = new Map();

    before(async () => {
        await mongoose.connect(uri);
        await mongoose.connection.dropDatabase();
        User = require("../models/userModel");
        WheelEntry = require("../models/EntryModel");
        WheelSettings = require("../models/wheelSettingsModel");
        WheelActivity = require("../models/wheelActivityModel");
        await Promise.all([User, WheelEntry, WheelSettings, WheelActivity].map((model) => model.syncIndexes()));

        const app = express();
        app.use(express.json());
        app.use("/api/wheel", require("../routes/wheel"));
        await new Promise((resolve) => {
            server = app.listen(0, "127.0.0.1", resolve);
        });
        base = `http://127.0.0.1:${server.address().port}/api/wheel`;
    });

    after(async () => {
        server?.close();
        await mongoose.disconnect();
    });

    beforeEach(async () => {
        await Promise.all([WheelEntry.deleteMany({}), WheelSettings.deleteMany({}), WheelActivity.deleteMany({})]);
    });

    let count = 0;
    async function member(role = "user") {
        count += 1;
        const user = await User.create({ username: `person${count}`, email: `w${count}@test.invalid`, password: "x", role });
        tokens.set(String(user._id), jwt.sign({ _id: user._id }, process.env.SECRET));
        return user;
    }
    async function call(user, method, path = "", body) {
        const headers = body ? { "Content-Type": "application/json" } : {};
        if (user) headers.Authorization = `Bearer ${tokens.get(String(user._id))}`;
        const response = await fetch(base + path, { method, headers, body: body && JSON.stringify(body) });
        return { status: response.status, body: await response.json() };
    }
    const films = (state) => state.entries.map((e) => [e.title, e.weight]);
    const idOf = (state, title) => state.entries.find((e) => e.title === title).id;

    test("everyone sees it, logged in or not; closed and 1 weight per member to begin with", async () => {
        const mod = await member("moderator");
        await call(mod, "POST", "", { title: "Dune" });

        const out = await call(null, "GET");
        assert.equal(out.status, 200);
        assert.deepEqual(films(out.body), [["Dune", 1]]);
        assert.deepEqual([out.body.open, out.body.memberWeight], [false, 1]);
        assert.deepEqual(out.body.you, { canAdd: false, canEdit: false, canManage: false, weightLeft: null });

        const seen = await call(await member(), "GET");
        assert.deepEqual(seen.body.you, { canAdd: false, canEdit: false, canManage: false, weightLeft: 1 });
        assert.deepEqual((await call(mod, "GET")).body.you, { canAdd: true, canEdit: true, canManage: false, weightLeft: null });
        assert.equal((await call(await member("admin"), "GET")).body.you.canManage, true);
    });

    test("while it's closed only moderators and admins add; logged out can't do anything", async () => {
        assert.equal((await call(null, "POST", "", { title: "Dune" })).status, 401);
        assert.equal((await call(null, "DELETE")).status, 401);

        const added = await call(await member(), "POST", "", { title: "Dune" });
        assert.equal(added.status, 403);
        assert.match(added.body.error, /closed/);

        const mod = await call(await member("moderator"), "POST", "", { title: "Dune", weight: 5 });
        assert.equal(mod.status, 201, JSON.stringify(mod.body));
        const admin = await call(await member("admin"), "POST", "", { title: "Alien", weight: 1000 });
        assert.equal(admin.status, 201, JSON.stringify(admin.body));
        assert.deepEqual(films(admin.body), [["Dune", 5], ["Alien", 1000]]);
    });

    test("moderators set weights, remove one film at a time, and clear; members can't", async () => {
        const mod = await member("moderator");
        const user = await member();
        await call(mod, "POST", "", { title: "Dune" });
        const state = (await call(mod, "POST", "", { title: "Alien" })).body;

        assert.equal((await call(user, "PATCH", `/${idOf(state, "Dune")}`, { weight: 4 })).status, 403);
        assert.equal((await call(user, "DELETE", `/${idOf(state, "Dune")}`)).status, 403);
        assert.equal((await call(user, "DELETE")).status, 403);

        const weighed = await call(mod, "PATCH", `/${idOf(state, "Dune")}`, { weight: 4 });
        assert.equal(weighed.status, 200);
        assert.deepEqual(films(weighed.body), [["Dune", 4], ["Alien", 1]]);

        const removed = await call(mod, "DELETE", `/${idOf(state, "Alien")}`);
        assert.deepEqual(films(removed.body), [["Dune", 4]]);
        assert.equal((await call(mod, "DELETE", `/${idOf(state, "Alien")}`)).status, 404);
        assert.equal((await call(mod, "DELETE", "/not-an-id")).status, 404);

        const cleared = await call(mod, "DELETE");
        assert.deepEqual(cleared.body.entries, []);
    });

    test("weights are whole numbers from 1 to 1000; titles are needed", async () => {
        const mod = await member("moderator");
        for (const weight of [0, -1, 1.5, 1001, "lots"]) {
            assert.equal((await call(mod, "POST", "", { title: "Dune", weight })).status, 400, `weight ${weight}`);
        }
        assert.equal((await call(mod, "POST", "", { title: "   " })).status, 400);
        const state = (await call(mod, "POST", "", { title: "Dune" })).body;
        assert.equal((await call(mod, "PATCH", `/${idOf(state, "Dune")}`, { weight: 0 })).status, 400);
    });

    test("only admins open it and set the members' weight; moderators can't", async () => {
        const mod = await member("moderator");
        assert.equal((await call(mod, "PUT", "/settings", { open: true })).status, 403);
        assert.equal((await call(await member(), "PUT", "/settings", { open: true })).status, 403);

        const admin = await member("admin");
        assert.equal((await call(admin, "PUT", "/settings", { open: "yes" })).status, 400);
        assert.equal((await call(admin, "PUT", "/settings", { memberWeight: 0 })).status, 400);
        assert.equal((await call(admin, "PUT", "/settings", {})).status, 400);

        const opened = await call(admin, "PUT", "/settings", { open: true, memberWeight: 3 });
        assert.equal(opened.status, 200);
        assert.deepEqual([opened.body.open, opened.body.memberWeight], [true, 3]);
        const unlimited = await call(admin, "PUT", "/settings", { memberWeight: null });
        assert.equal(unlimited.body.memberWeight, null);
    });

    test("open: members add up to their weight, over one film or several, and a film on the wheel takes their weight", async () => {
        const admin = await member("admin");
        await call(admin, "PUT", "/settings", { open: true, memberWeight: 3 });
        const user = await member();

        const first = await call(user, "POST", "", { title: "Dune", weight: 2 });
        assert.equal(first.status, 201, JSON.stringify(first.body));
        assert.deepEqual([first.body.you.canAdd, first.body.you.weightLeft], [true, 1]);

        const over = await call(user, "POST", "", { title: "Alien", weight: 2 });
        assert.equal(over.status, 409);
        assert.match(over.body.error, /1 more weight/);

        // The same film again (any case) adds to it.
        const again = await call(user, "POST", "", { title: "dune" });
        assert.equal(again.status, 201);
        assert.deepEqual(films(again.body), [["Dune", 3]]);
        assert.equal(again.body.you.weightLeft, 0);
        assert.match((await call(user, "POST", "", { title: "Alien" })).body.error, /all the weight/);

        // Someone else's weight is their own.
        const other = await member();
        assert.deepEqual(films((await call(other, "POST", "", { title: "Alien", weight: 3 })).body), [["Dune", 3], ["Alien", 3]]);

        // A moderator's weight change doesn't give it back; taking the film off does.
        const mod = await member("moderator");
        const state = (await call(mod, "PATCH", `/${idOf(again.body, "Dune")}`, { weight: 1 })).body;
        assert.equal((await call(user, "GET")).body.you.weightLeft, 0);
        await call(mod, "DELETE", `/${idOf(state, "Dune")}`);
        assert.equal((await call(user, "GET")).body.you.weightLeft, 3);

        // No limit.
        await call(admin, "PUT", "/settings", { memberWeight: null });
        const big = await call(user, "POST", "", { title: "Heat", weight: 50 });
        assert.equal(big.status, 201);
        assert.equal(big.body.you.weightLeft, null);

        // Closed again: members can't add.
        await call(admin, "PUT", "/settings", { open: false });
        assert.equal((await call(user, "POST", "", { title: "Ran" })).status, 403);
    });

    test("films from before weights count as 1, and adding to one starts from there", async () => {
        await WheelEntry.collection.insertOne({ title: "Old Film", titleKey: "old film", createdAt: new Date(), updatedAt: new Date() });
        const mod = await member("moderator");
        assert.deepEqual(films((await call(null, "GET")).body), [["Old Film", 1]]);
        assert.deepEqual(films((await call(mod, "POST", "", { title: "Old Film", weight: 2 })).body), [["Old Film", 3]]);
    });

    test("a film can't go over 1000 weight; the wheel holds 60 films", async () => {
        const mod = await member("moderator");
        await call(mod, "POST", "", { title: "Dune", weight: 999 });
        assert.equal((await call(mod, "POST", "", { title: "Dune", weight: 2 })).status, 409);

        await WheelEntry.insertMany(Array.from({ length: 59 }, (_, i) => ({ title: `Film ${i}`, titleKey: `film ${i}` })));
        const full = await call(mod, "POST", "", { title: "One too many" });
        assert.equal(full.status, 409);
        assert.match(full.body.error, /full/);
    });

    test("the activity box: who did what, newest first, for everyone to see", async () => {
        const admin = await member("admin");
        const mod = await member("moderator");
        const user = await member();

        await call(admin, "PUT", "/settings", { open: true, memberWeight: 2 });
        let state = (await call(user, "POST", "", { title: "Dune" })).body;
        await call(mod, "POST", "", { title: "Dune", weight: 2 });
        state = (await call(mod, "POST", "", { title: "Alien" })).body;
        await call(mod, "PATCH", `/${idOf(state, "Alien")}`, { weight: 7 });
        await call(mod, "PATCH", `/${idOf(state, "Alien")}`, { weight: 7 }); // no change, no line
        await call(mod, "DELETE", `/${idOf(state, "Alien")}`);
        await call(admin, "DELETE");
        await call(admin, "DELETE"); // already empty, no line
        await call(admin, "PUT", "/settings", { open: false });

        const { activity } = (await call(null, "GET")).body;
        assert.deepEqual(
            activity.map((a) => [a.user, a.action, a.title, a.weight]),
            [
                [admin.username, "close", null, null],
                [admin.username, "clear", null, null],
                [mod.username, "remove", "Alien", null],
                [mod.username, "weight", "Alien", 7],
                [mod.username, "add", "Alien", 1],
                [mod.username, "back", "Dune", 2],
                [user.username, "add", "Dune", 1],
                [admin.username, "memberWeight", null, 2],
                [admin.username, "open", null, null],
            ],
        );
        assert.ok(activity.every((a) => a.id && a.at));
    });
});
