// Pet Forge (utils/petForge.js, routes/petForgeRouter.js): the admin
// panel's pet maker. Its page for anyone, everything it saves for admins
// only, every save checked, and nothing deleted that something still uses.
// Through the real API. Against a real MongoDB.
//
// From backend/, with a MongoDB running:
//   PowerShell:  $env:MONGO_TEST_URI="mongodb://127.0.0.1:27017/kino_test"; npm test
//   bash:        MONGO_TEST_URI=mongodb://127.0.0.1:27017/kino_test npm test
// The database is wiped first, so its name has to end in "_test".
const { test, describe, before, after } = require("node:test");
const assert = require("node:assert/strict");

process.env.SECRET ??= "pet-forge-test-secret";
const mongoose = require("mongoose");
const express = require("express");
const jwt = require("jsonwebtoken");

const uri = process.env.MONGO_TEST_URI;
const dbName = uri ? new URL(uri).pathname.slice(1) : "";

// The smallest real GIF and PNG (their first bytes are what's checked).
const GIF = Buffer.concat([Buffer.from("GIF89a", "latin1"), Buffer.from([1, 0, 1, 0, 0, 0, 0, 0x3b])]);
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);

describe("Pet Forge", { skip: !uri ? "set MONGO_TEST_URI to run these" : !dbName.endsWith("_test") ? "MONGO_TEST_URI's database must end in _test" : false }, () => {
    let base;
    let server;
    let User;
    let PetAsset;
    const tokens = new Map();

    before(async () => {
        await mongoose.connect(uri);
        await mongoose.connection.dropDatabase();
        User = require("../models/userModel");
        PetAsset = require("../models/petAssetModel");
        await Promise.all(["../models/petBaseFormModel", "../models/petFormModel", "../models/petAssetModel"].map((model) => require(model).syncIndexes()));

        const app = express();
        app.use("/api/pet-forge/assets", express.json({ limit: "8mb" }));
        app.use(express.json());
        app.use("/api/pet-forge", require("../routes/petForgeRouter"));
        app.use((error, req, res, next) => {
            console.error(error);
            res.status(500).json({ error: "Something went wrong" });
        });
        server = app.listen(0);
        base = `http://127.0.0.1:${server.address().port}/api/pet-forge`;
    });

    after(async () => {
        server?.close();
        await mongoose.disconnect();
    });

    let count = 0;
    async function member(role = "user") {
        count += 1;
        const user = await User.create({ username: `forger${count}`, email: `pf${count}@test.invalid`, password: "x", role });
        tokens.set(String(user._id), jwt.sign({ _id: user._id }, process.env.SECRET));
        return user;
    }
    async function call(user, method, path, body) {
        const response = await fetch(base + path, {
            method,
            redirect: "manual",
            headers: { ...(user && { Authorization: `Bearer ${tokens.get(String(user._id))}` }), "Content-Type": "application/json" },
            body: body === undefined ? undefined : JSON.stringify(body),
        });
        return { status: response.status, headers: response.headers, body: await response.json().catch(() => null) };
    }
    const upload = (user, bytes = GIF, type = "image/gif") => call(user, "POST", "/assets", { type, data: bytes.toString("base64") });
    const baseForm = (assetId, extra = {}) => ({ name: "Cat", createdAt: 1700000000000, fur: ["#AA5533", "#aa5533", "#cc7744"], anims: { idle: { kind: "gif", file: "idle.gif", frames: 4, asset: assetId } }, ...extra });

    test("the page is for anyone, with its files; everything it saves is admins' only", async () => {
        const page = await fetch(`${base}/app/`);
        assert.equal(page.status, 200);
        const html = await page.text();
        assert.match(html, /<title>Pet Forge<\/title>/);
        assert.match(html, /<script src="forge.js"><\/script>/);
        for (const file of ["forge.js", "gif.js", "forge.css"]) assert.equal((await fetch(`${base}/app/${file}`)).status, 200, file);
        assert.equal((await fetch(`${base}/app`, { redirect: "manual" })).status, 301, "to /app/, so its files are found");

        const [admin, moderator, user] = [await member("admin"), await member("moderator"), await member()];
        assert.equal((await call(null, "GET", "")).status, 401);
        assert.equal((await call(user, "GET", "")).status, 403);
        assert.equal((await call(moderator, "PUT", "/baseForms/abcd1234", baseForm(null))).status, 403);
        assert.equal((await upload(user)).status, 403);
        assert.deepEqual((await call(admin, "GET", "")).body, { baseForms: {}, registeredForms: {} });
    });

    test("uploads: only a real GIF or PNG, up to 5 MB; served to anyone, cached for good", async () => {
        const admin = await member("admin");
        const gif = await upload(admin);
        assert.equal(gif.status, 200);
        assert.equal(gif.body.url, `/api/pet-forge/assets/${gif.body.id}`);
        assert.equal((await upload(admin, PNG, "image/png")).status, 200);
        assert.match((await upload(admin, PNG, "image/gif")).body.error, /isn't the GIF or PNG/);
        assert.match((await upload(admin, GIF, "image/webp")).body.error, /GIFs or PNGs/);
        assert.equal((await upload(admin, Buffer.alloc(5 * 1024 * 1024 + 10, 0x47))).status, 413);

        const served = await fetch(`${base}/assets/${gif.body.id}`);
        assert.equal(served.status, 200);
        assert.equal(served.headers.get("content-type"), "image/gif");
        assert.match(served.headers.get("cache-control"), /immutable/);
        assert.deepEqual(Buffer.from(await served.arrayBuffer()), GIF);
        assert.equal((await fetch(`${base}/assets/${new mongoose.Types.ObjectId()}`)).status, 404);
        assert.equal((await fetch(`${base}/assets/nope`)).status, 404);
    });

    test("base forms and registered forms: every save checked, and only links to what exists", async () => {
        const admin = await member("admin");
        const file = (await upload(admin)).body.id;

        const saved = await call(admin, "PUT", "/baseForms/cat123", { ...baseForm(file), facing: "right", sink: 99, nudge: -3, extra: "dropped" });
        assert.equal(saved.status, 200);
        assert.deepEqual(saved.body.doc, {
            name: "Cat",
            anims: { idle: { kind: "gif", file: "idle.gif", frames: 4, asset: file, url: `/api/pet-forge/assets/${file}` } },
            fur: ["#aa5533", "#cc7744"],
            facing: "right",
            sink: 0,
            nudge: -3,
            createdAt: 1700000000000,
        });
        // How an animation moves, ticked in the Studio, kept (amounts kept in range).
        const moving = await call(admin, "PUT", "/baseForms/cat123", baseForm(file, { anims: { idle: { kind: "gif", frames: 4, asset: file, hover: true, shake: false, shakeAmt: 9, rlf: true, rlfN: 2, spin: true } } }));
        assert.deepEqual(moving.body.doc.anims.idle, { kind: "gif", file: "idle.gif", frames: 4, asset: file, url: `/api/pet-forge/assets/${file}`, hover: true, shake: false, rlf: true, shakeAmt: 2, rlfN: 2 });
        // An animation's own size: kept (within 0.1 to 8 times), left out at its file's size, and only numbers.
        const sized = await call(admin, "PUT", "/baseForms/cat123", baseForm(file, { anims: { idle: { kind: "gif", frames: 4, asset: file, resize: { x: 1.5, y: 20 } } } }));
        assert.deepEqual(sized.body.doc.anims.idle.resize, { x: 1.5, y: 8 });
        const own = await call(admin, "PUT", "/baseForms/cat123", baseForm(file, { anims: { idle: { kind: "gif", frames: 4, asset: file, resize: { x: 1, y: 1 } } } }));
        assert.equal(own.body.doc.anims.idle.resize, undefined);
        const bad = await call(admin, "PUT", "/baseForms/cat123", baseForm(file, { anims: { idle: { kind: "gif", frames: 4, asset: file, resize: { x: "big", y: 1 } } } }));
        assert.equal(bad.status, 400);
        assert.match((await call(admin, "PUT", "/baseForms/cat123", baseForm(file, { anims: { dance: { kind: "gif", asset: file } } }))).body.error, /isn't an animation/);
        assert.match((await call(admin, "PUT", "/baseForms/cat123", baseForm(String(new mongoose.Types.ObjectId())))).body.error, /file is gone/);
        assert.match((await call(admin, "PUT", "/baseForms/cat123", baseForm(file, { name: "  " }))).body.error, /name/);
        assert.match((await call(admin, "PUT", "/baseForms/cat123", baseForm(file, { fur: ["orange"] }))).body.error, /#rrggbb/);
        assert.match((await call(admin, "PUT", "/baseForms/bad%20id!", baseForm(file))).body.error, /isn't one of Pet Forge's/);

        const form = { name: "Mochi", baseFormId: "cat123", rarity: "mythic", look: "Cream", changes: { "#AA5533": "#FFEEDD" }, createdAt: 1700000000001 };
        const registered = await call(admin, "PUT", "/registeredForms/mochi1", form);
        assert.deepEqual(registered.body.doc, { name: "Mochi", baseFormId: "cat123", rarity: "common", look: "Cream", changes: { "#aa5533": "#ffeedd" }, createdAt: 1700000000001, updatedAt: null });
        assert.match((await call(admin, "PUT", "/registeredForms/mochi1", { ...form, baseFormId: "gone1234" })).body.error, /base form is gone/);
        assert.match((await call(admin, "PUT", "/registeredForms/mochi1", { ...form, changes: { "#aa5533": "red" } })).body.error, /#rrggbb/);
        await call(admin, "PUT", "/registeredForms/mochi1", { ...form, rarity: "legendary", updatedAt: 1700000000002 });

        const all = (await call(admin, "GET", "")).body;
        assert.deepEqual(Object.keys(all.baseForms), ["cat123"]);
        assert.deepEqual([all.registeredForms.mochi1.rarity, all.registeredForms.mochi1.updatedAt], ["legendary", 1700000000002]);
    });

    test("nothing in use is deleted: a base form with registered forms, a file a base form uses; a base form takes its files with it", async () => {
        const admin = await member("admin");
        const [first, second] = [(await upload(admin)).body.id, (await upload(admin)).body.id];
        await call(admin, "PUT", "/baseForms/dog123", baseForm(first, { name: "Dog" }));
        await call(admin, "PUT", "/registeredForms/rex123", { name: "Rex", baseFormId: "dog123" });

        assert.equal((await call(admin, "DELETE", `/assets/${first}`)).status, 409, "the idle animation uses it");
        // A new upload replaces it: then the old one can go.
        await call(admin, "PUT", "/baseForms/dog123", baseForm(second, { name: "Dog" }));
        assert.equal((await call(admin, "DELETE", `/assets/${first}`)).status, 200);
        assert.equal(await PetAsset.exists({ _id: first }), null);

        const refused = await call(admin, "DELETE", "/baseForms/dog123");
        assert.equal(refused.status, 409);
        assert.match(refused.body.error, /1 registered form is made from it/);
        assert.equal((await call(admin, "DELETE", "/registeredForms/rex123")).status, 200);
        assert.equal((await call(admin, "DELETE", "/registeredForms/rex123")).status, 404);
        assert.equal((await call(admin, "DELETE", "/baseForms/dog123")).status, 200);
        assert.equal(await PetAsset.exists({ _id: second }), null, "its file went with it");
    });
});
