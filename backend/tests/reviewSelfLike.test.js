// A new review starts with its author's own like (PUT /api/films/:tmdbId/review),
// so liking your own review is never an edge over anyone. Against a real
// MongoDB, with TMDB's film lookup stubbed.
//
// From backend/, with a MongoDB running:
//   PowerShell:  $env:MONGO_TEST_URI="mongodb://127.0.0.1:27017/kino_test"; npm test
//   bash:        MONGO_TEST_URI=mongodb://127.0.0.1:27017/kino_test npm test
// The database is wiped first, so its name has to end in "_test".
const { test, describe, before, after } = require("node:test");
const assert = require("node:assert/strict");

process.env.SECRET ??= "self-like-test-secret";
const mongoose = require("mongoose");
const express = require("express");
const jwt = require("jsonwebtoken");

// No TMDB in tests: every film is the same made-up one. Swapped in before
// the controller takes its copy of getMovie.
const tmdb = require("../services/tmdbService");
tmdb.getMovie = async (tmdbId) => ({ id: tmdbId, title: "A Film", year: "2024", posterPath: null, genres: [], release_dates: { results: [] } });

const uri = process.env.MONGO_TEST_URI;
const dbName = uri ? new URL(uri).pathname.slice(1) : "";

describe("a review's own like", { skip: !uri ? "set MONGO_TEST_URI to run these" : !dbName.endsWith("_test") ? "MONGO_TEST_URI's database must end in _test" : false }, () => {
    let base;
    let server;
    let User;
    let Review;
    let Notification;
    let writer;
    let token;

    before(async () => {
        await mongoose.connect(uri);
        await mongoose.connection.dropDatabase();
        User = require("../models/userModel");
        Review = require("../models/reviewModel");
        Notification = require("../models/notificationModel");
        await Promise.all([User, Review, Notification].map((model) => model.syncIndexes()));

        const app = express();
        app.use(express.json());
        app.use("/api/films", require("../routes/filmRouter"));
        app.use((error, req, res, next) => {
            console.error(error);
            res.status(500).json({ error: "Something went wrong" });
        });
        await new Promise((resolve) => {
            server = app.listen(0, "127.0.0.1", resolve);
        });
        base = `http://127.0.0.1:${server.address().port}/api/films`;

        writer = await User.create({ username: "writer", email: "writer@test.invalid", password: "x" });
        token = jwt.sign({ _id: writer._id }, process.env.SECRET);
    });

    after(async () => {
        server?.close();
        await mongoose.disconnect();
    });

    const post = async (tmdbId, body) => {
        const response = await fetch(`${base}/${tmdbId}/review`, {
            method: "PUT",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });
        return { status: response.status, body: await response.json() };
    };
    const stored = (tmdbId) => Review.findOne({ user: writer._id, tmdbId }).select("+likedBy likeCount").lean();

    test("posting a review likes it for its author, once", async () => {
        const posted = await post(101, { rating: 4, text: "Loved it." });
        assert.equal(posted.status, 200, JSON.stringify(posted.body));
        assert.equal(posted.body.review.likeCount, 1);

        let review = await stored(101);
        assert.deepEqual([review.likeCount, review.likedBy.map(String)], [1, [String(writer._id)]]);

        // Editing it doesn't like it again.
        assert.equal((await post(101, { rating: 5, text: "Loved it even more." })).status, 200);
        review = await stored(101);
        assert.equal(review.likeCount, 1);

        // No "liked your review" notification for your own like.
        assert.equal(await Notification.countDocuments({ type: "like" }), 0);
    });

    test("a review taken down and written again starts with the own like again", async () => {
        await post(202, { rating: 3, text: "Fine." });
        assert.equal((await post(202, { rating: 3 })).status, 200, "text cleared: the review goes");
        assert.equal(await stored(202), null);

        await post(202, { rating: 3, text: "Fine, on reflection." });
        assert.equal((await stored(202)).likeCount, 1);
    });

    test("a rating without text isn't a review, so there's nothing to like", async () => {
        assert.equal((await post(303, { rating: 2 })).status, 200);
        assert.equal(await stored(303), null);
    });
});
