// Deleting a review: its author can, an admin can delete anyone's, and
// nobody else can. Against a real MongoDB.
//
// From backend/, with a MongoDB running:
//   PowerShell:  $env:MONGO_TEST_URI="mongodb://127.0.0.1:27017/kino_test"; npm test
//   bash:        MONGO_TEST_URI=mongodb://127.0.0.1:27017/kino_test npm test
// The database is wiped first, so its name has to end in "_test".
const { test, describe, before, after } = require("node:test");
const assert = require("node:assert/strict");

process.env.SECRET ??= "reviews-test-secret";
const mongoose = require("mongoose");
const express = require("express");
const jwt = require("jsonwebtoken");

const uri = process.env.MONGO_TEST_URI;
const dbName = uri ? new URL(uri).pathname.slice(1) : "";

describe("deleting a review", { skip: !uri ? "set MONGO_TEST_URI to run these" : !dbName.endsWith("_test") ? "MONGO_TEST_URI's database must end in _test" : false }, () => {
    let base;
    let server;
    let User;
    let Review;
    let Comment;
    const tokens = new Map();

    before(async () => {
        await mongoose.connect(uri);
        await mongoose.connection.dropDatabase();
        User = require("../models/userModel");
        Review = require("../models/reviewModel");
        Comment = require("../models/commentModel");
        await Promise.all([User, Review, Comment].map((model) => model.syncIndexes()));

        const app = express();
        app.use(express.json());
        app.use("/api/reviews", require("../routes/reviewRouter"));
        app.use((error, req, res, next) => {
            console.error(error);
            res.status(500).json({ error: "Something went wrong" });
        });
        server = app.listen(0);
        base = `http://127.0.0.1:${server.address().port}/api/reviews`;
    });

    after(async () => {
        server?.close();
        await mongoose.disconnect();
    });

    let count = 0;
    async function member(role = "user") {
        count += 1;
        const user = await User.create({ username: `critic${count}`, email: `c${count}@test.invalid`, password: "x", role });
        tokens.set(String(user._id), jwt.sign({ _id: user._id }, process.env.SECRET));
        return user;
    }
    const reviewBy = (user) => Review.create({ user: user._id, tmdbId: 1000 + count, filmTitle: "Test Film", rating: 4, text: "Good." });
    const remove = async (user, id) => {
        const response = await fetch(`${base}/${id}`, {
            method: "DELETE",
            headers: user ? { Authorization: `Bearer ${tokens.get(String(user._id))}` } : {},
        });
        return { status: response.status, body: await response.json().catch(() => null) };
    };

    test("the author deletes their own review, and its comments go with it", async () => {
        const [author, fan] = [await member(), await member()];
        const review = await reviewBy(author);
        await Comment.create({ review: review._id, user: fan._id, text: "Agreed." });

        const { status, body } = await remove(author, review._id);
        assert.equal(status, 200);
        assert.deepEqual(body, { deleted: true });
        assert.equal(await Review.exists({ _id: review._id }), null);
        assert.equal(await Comment.countDocuments({ review: review._id }), 0);
    });

    test("another member can't delete it: 403, and it stays", async () => {
        const [author, other] = [await member(), await member()];
        const review = await reviewBy(author);
        const { status, body } = await remove(other, review._id);
        assert.equal(status, 403);
        assert.match(body.error, /your own/);
        assert.ok(await Review.exists({ _id: review._id }));
    });

    test("a moderator can't either; only admins delete other people's", async () => {
        const [author, moderator, admin] = [await member(), await member("moderator"), await member("admin")];
        const review = await reviewBy(author);
        assert.equal((await remove(moderator, review._id)).status, 403);
        assert.equal((await remove(admin, review._id)).status, 200);
        assert.equal(await Review.exists({ _id: review._id }), null);
    });

    test("already deleted, or a nonsense id: 404", async () => {
        const author = await member();
        const review = await reviewBy(author);
        assert.equal((await remove(author, review._id)).status, 200);
        assert.equal((await remove(author, review._id)).status, 404);
        assert.equal((await remove(author, "not-an-id")).status, 404);
    });

    test("logged out: 401", async () => {
        const review = await reviewBy(await member());
        assert.equal((await remove(null, review._id)).status, 401);
        assert.ok(await Review.exists({ _id: review._id }));
    });
});
