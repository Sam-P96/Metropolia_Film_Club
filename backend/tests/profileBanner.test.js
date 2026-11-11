// The review card banner's picture position (PATCH /api/users/me): saved
// as x and y from 0 to 100, centred when left out, refused out of range.
// Against a real MongoDB.
//
// From backend/, with a MongoDB running:
//   PowerShell:  $env:MONGO_TEST_URI="mongodb://127.0.0.1:27017/kino_test"; npm test
//   bash:        MONGO_TEST_URI=mongodb://127.0.0.1:27017/kino_test npm test
// The database is wiped first, so its name has to end in "_test".
const { test, describe, before, after } = require("node:test");
const assert = require("node:assert/strict");

process.env.SECRET ??= "banner-test-secret";
const mongoose = require("mongoose");
const express = require("express");
const jwt = require("jsonwebtoken");

const uri = process.env.MONGO_TEST_URI;
const dbName = uri ? new URL(uri).pathname.slice(1) : "";

describe("the banner picture's position", { skip: !uri ? "set MONGO_TEST_URI to run these" : !dbName.endsWith("_test") ? "MONGO_TEST_URI's database must end in _test" : false }, () => {
    let base;
    let server;
    let User;
    let me;
    let token;

    before(async () => {
        await mongoose.connect(uri);
        await mongoose.connection.dropDatabase();
        User = require("../models/userModel");
        await User.syncIndexes();
        me = await User.create({ username: "framer", email: "framer@test.invalid", password: "x" });
        token = jwt.sign({ _id: me._id }, process.env.SECRET);

        const app = express();
        app.use(express.json());
        app.use("/api/users", require("../routes/userRouter"));
        app.use((error, req, res, next) => {
            console.error(error);
            res.status(500).json({ error: "Something went wrong" });
        });
        await new Promise((resolve) => {
            server = app.listen(0, "127.0.0.1", resolve);
        });
        base = `http://127.0.0.1:${server.address().port}/api`;
    });

    after(async () => {
        server?.close();
        await mongoose.disconnect();
    });

    const save = async (banner) => {
        const response = await fetch(`${base}/users/me`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify({ reviewCardBanner: banner }),
        });
        return { status: response.status, body: await response.json() };
    };
    const picture = { type: "image", color: "#2D1B47", imageUrl: "https://example.com/wide.jpg", style: "opaque" };

    test("saved and sent back; centred when left out; refused outside 0 to 100", async () => {
        const moved = await save({ ...picture, position: { x: 12.34, y: 100 } });
        assert.equal(moved.status, 200, JSON.stringify(moved.body));
        assert.deepEqual(moved.body.reviewCardBanner.position, { x: 12.3, y: 100 });
        assert.deepEqual((await User.findById(me._id).lean()).reviewCardBanner.position, { x: 12.3, y: 100 });

        assert.deepEqual((await save(picture)).body.reviewCardBanner.position, { x: 50, y: 50 });

        assert.equal((await save({ ...picture, position: { x: 101, y: 50 } })).status, 400);
        assert.equal((await save({ ...picture, position: { x: 50, y: -1 } })).status, 400);
        assert.equal((await save({ ...picture, position: { x: "50", y: 50 } })).status, 400);
    });

    test("an older banner with no position reads as centred", async () => {
        await User.collection.updateOne({ _id: me._id }, { $set: { reviewCardBanner: { type: "image", color: "#2D1B47", imageUrl: "https://example.com/old.jpg", style: "glass" } } });
        const response = await fetch(`${base}/users/${me._id}`);
        assert.deepEqual((await response.json()).reviewCardBanner.position, { x: 50, y: 50 });
    });
});
