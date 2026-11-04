// Deleting a review: its author can, moderators and admins can delete
// anyone's, and nobody else can; each can take the review, the rating, or
// both. Saving a review with no rating takes the rating off. Against a real
// MongoDB, with TMDB stubbed out.
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
    let films;
    let User;
    let Review;
    let Comment;
    let FilmLog;
    const tokens = new Map();

    before(async () => {
        // Before the controllers load: they keep their own reference to it.
        require("../services/tmdbService").getMovie = async () => ({ title: "Test Film", year: "2001", posterPath: null, genres: ["Drama"] });

        await mongoose.connect(uri);
        await mongoose.connection.dropDatabase();
        User = require("../models/userModel");
        Review = require("../models/reviewModel");
        Comment = require("../models/commentModel");
        FilmLog = require("../models/filmLogModel");
        // Deleting a review clears its notifications and reports too.
        const Notification = require("../models/notificationModel");
        const Report = require("../models/reportModel");
        await Promise.all([User, Review, Comment, FilmLog, Notification, Report].map((model) => model.syncIndexes()));

        const app = express();
        app.use(express.json());
        app.use("/api/reviews", require("../routes/reviewRouter"));
        app.use("/api/films", require("../routes/filmRouter"));
        app.use((error, req, res, next) => {
            console.error(error);
            res.status(500).json({ error: "Something went wrong" });
        });
        server = app.listen(0);
        base = `http://127.0.0.1:${server.address().port}/api/reviews`;
        films = `http://127.0.0.1:${server.address().port}/api/films`;
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
    const reviewBy = (user, votes = {}) =>
        Review.create({ user: user._id, tmdbId: 1000 + count, filmTitle: "Test Film", rating: 4, text: "Good.", ...votes });
    // A review, with the film log entry that goes with it.
    async function ratedReviewBy(user, rating = 4) {
        const review = await reviewBy(user, { rating });
        await FilmLog.create({ user: user._id, tmdbId: review.tmdbId, title: "Test Film", status: "completed", rating });
        return review;
    }
    const entryFor = (review) => FilmLog.findOne({ user: review.user, tmdbId: review.tmdbId }).lean();
    const remove = async (user, id, what) => {
        const response = await fetch(`${base}/${id}${what ? `?remove=${what}` : ""}`, {
            method: "DELETE",
            headers: user ? { Authorization: `Bearer ${tokens.get(String(user._id))}` } : {},
        });
        return { status: response.status, body: await response.json().catch(() => null) };
    };
    const save = async (user, tmdbId, body) => {
        const response = await fetch(`${films}/${tmdbId}/review`, {
            method: "PUT",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokens.get(String(user._id))}` },
            body: JSON.stringify(body),
        });
        return { status: response.status, body: await response.json().catch(() => null) };
    };

    test("the Critics Leaderboard's Level view: highest level first, ties by likes, nobody at level 0", async () => {
        await Review.deleteMany({});
        const level = (likes, dislikes = 0) => Math.floor((12 * likes - 20 * dislikes + Math.min(3, 3 * (12 * likes - 20 * dislikes))) / 60);
        // One review each. With PVP off, dislikes don't count against them.
        const high = await member();
        await reviewBy(high, { likeCount: 20 });
        const tied = await member();
        await reviewBy(tied, { likeCount: 16 });
        const tiedMoreLikes = await member();
        await reviewBy(tiedMoreLikes, { likeCount: 19, dislikeCount: 30 });
        const none = await member();
        await reviewBy(none, { likeCount: 2 });

        const critics = await (await fetch(`${base}/critics?sort=level`)).json();
        assert.deepEqual(critics.map((critic) => [critic.user.username, critic.user.level]), [
            [high.username, level(20)],
            [tiedMoreLikes.username, level(19)],
            [tied.username, level(16)],
        ]);
        assert.equal(level(19), level(16));
        assert.ok(!critics.some((critic) => critic.user.username === none.username));

        // The others still sort the way they did.
        const top = await (await fetch(`${base}/critics?sort=top`)).json();
        assert.deepEqual(top.map((critic) => critic.likes), [20, 19, 16, 2]);
    });

    test("the author deletes their own review, and its comments go with it; the rating stays", async () => {
        const [author, fan] = [await member(), await member()];
        const review = await ratedReviewBy(author);
        await Comment.create({ review: review._id, user: fan._id, text: "Agreed." });

        const { status, body } = await remove(author, review._id);
        assert.equal(status, 200);
        assert.deepEqual(body, { deleted: true, removed: "review" });
        assert.equal(await Review.exists({ _id: review._id }), null);
        assert.equal(await Comment.countDocuments({ review: review._id }), 0);
        assert.equal((await entryFor(review)).rating, 4);
    });

    test("the review and the rating together: the film stays on their list as watched", async () => {
        const author = await member();
        const review = await ratedReviewBy(author);

        const { status, body } = await remove(author, review._id, "both");
        assert.equal(status, 200);
        assert.equal(body.removed, "both");
        assert.equal(await Review.exists({ _id: review._id }), null);
        const entry = await entryFor(review);
        assert.equal(entry.rating, null);
        assert.equal(entry.status, "completed");
    });

    test("only the rating: the review stays, unrated", async () => {
        const [author, moderator] = [await member(), await member("moderator")];
        const review = await ratedReviewBy(author, 3.5);

        const { status, body } = await remove(moderator, review._id, "rating");
        assert.equal(status, 200);
        assert.equal(body.removed, "rating");
        const kept = await Review.findById(review._id).lean();
        assert.equal(kept.rating, null);
        assert.equal(kept.text, "Good.");
        assert.equal((await entryFor(review)).rating, null);
    });

    test("anything else to remove: 400, and nothing changes", async () => {
        const author = await member();
        const review = await ratedReviewBy(author);
        assert.equal((await remove(author, review._id, "everything")).status, 400);
        assert.equal((await remove(author, review._id, "constructor")).status, 400);
        assert.ok(await Review.exists({ _id: review._id }));
        assert.equal((await entryFor(review)).rating, 4);
    });

    test("another member can't delete it, or its rating: 403, and both stay", async () => {
        const [author, other] = [await member(), await member()];
        const review = await ratedReviewBy(author);
        const { status, body } = await remove(other, review._id);
        assert.equal(status, 403);
        assert.match(body.error, /your own/);
        assert.equal((await remove(other, review._id, "rating")).status, 403);
        assert.equal((await remove(other, review._id, "both")).status, 403);
        assert.ok(await Review.exists({ _id: review._id }));
        assert.equal((await entryFor(review)).rating, 4);
    });

    test("moderators and admins delete other people's", async () => {
        const [author, moderator, admin] = [await member(), await member("moderator"), await member("admin")];
        const first = await ratedReviewBy(author);
        assert.equal((await remove(moderator, first._id, "both")).status, 200);
        assert.equal(await Review.exists({ _id: first._id }), null);
        assert.equal((await entryFor(first)).rating, null);

        const second = await ratedReviewBy(await member());
        assert.equal((await remove(admin, second._id)).status, 200);
        assert.equal(await Review.exists({ _id: second._id }), null);
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

    test("saving with no rating takes the rating off, and the review keeps its text", async () => {
        const author = await member();
        const review = await ratedReviewBy(author);

        const { status, body } = await save(author, review.tmdbId, { rating: null, text: "Changed my mind." });
        assert.equal(status, 200);
        assert.equal(body.entry.rating, null);
        assert.equal(body.review.rating, null);
        assert.equal(body.review.text, "Changed my mind.");
    });

    test("saving with neither: both come off a film they'd rated or reviewed, but it's refused for one they hadn't", async () => {
        const author = await member();
        const review = await ratedReviewBy(author);

        const { status, body } = await save(author, review.tmdbId, { rating: null, text: null });
        assert.equal(status, 200);
        assert.equal(body.review, null);
        assert.equal(body.entry.rating, null);
        assert.equal(body.entry.status, "completed");
        assert.equal(await Review.exists({ _id: review._id }), null);

        // Rated only, no review.
        await FilmLog.create({ user: author._id, tmdbId: 5000, title: "Test Film", status: "completed", rating: 2 });
        assert.equal((await save(author, 5000, { rating: null, text: null })).status, 200);
        assert.equal((await FilmLog.findOne({ user: author._id, tmdbId: 5000 }).lean()).rating, null);

        // Nothing to take off any more, and a film they'd never logged.
        assert.equal((await save(author, 5000, { rating: null, text: null })).status, 400);
        assert.equal((await save(author, 5001, { rating: null, text: null })).status, 400);
        assert.equal(await FilmLog.exists({ user: author._id, tmdbId: 5001 }), null);
    });
});
