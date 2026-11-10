// The reviews toggle's Featured, and the Shuffle and Recommend sorts
// (utils/recommend.js): how a
// review is scored and drawn, which needs no database, then the API against
// a real MongoDB.
//
// From backend/, with a MongoDB running (the scoring tests run without one):
//   PowerShell:  $env:MONGO_TEST_URI="mongodb://127.0.0.1:27017/kino_test"; npm test
//   bash:        MONGO_TEST_URI=mongodb://127.0.0.1:27017/kino_test npm test
// The database is wiped first, so its name has to end in "_test".
const { test, describe, before, after } = require("node:test");
const assert = require("node:assert/strict");

const { WEIGHTS, genreFit, scoreReview, pickWeighted, shuffle, split } = require("../utils/recommend");
const { tasteOf } = require("../utils/resonance");

// A rated film for tasteOf.
const rated = (tmdbId, rating, genres = []) => ({ tmdbId, rating, genres });

describe("Recommend scoring", () => {
    // Usually 3 stars; Horror 1.5 above that, Romance 1.5 below, Drama
    // only once (too few to count).
    const taste = tasteOf([
        rated(1, 4.5, ["Horror"]), rated(2, 4.5, ["Horror"]),
        rated(3, 1.5, ["Romance"]), rated(4, 1.5, ["Romance"]),
        rated(5, 3, ["Drama"]),
    ]);
    const context = (extra = {}) => ({ taste, seen: new Map(), resonance: new Map(), ...extra });
    const review = (extra = {}) => ({ user: "author", tmdbId: 99, rating: 4, genres: [], likeCount: 0, ...extra });

    test("genres they rate above their usual fit, below it don't, and unknown ones lean a little away", () => {
        assert.equal(genreFit(["Horror"], taste), 1);
        assert.equal(genreFit(["Romance"], taste), 0);
        assert.equal(genreFit(["Drama"], taste), 0.4);
        assert.equal(genreFit(["Western"], taste), 0.4);
        assert.equal(genreFit(["Horror", "Romance"], taste), 0.5);
        assert.equal(genreFit([], taste), 0.5);
    });

    test("each weight set adds up to 1", () => {
        for (const weights of Object.values(WEIGHTS)) {
            assert.ok(Math.abs(Object.values(weights).reduce((sum, weight) => sum + weight, 0) - 1) < 1e-12);
        }
    });

    test("a film they haven't seen: Resonance with its author, its genres and its likes all raise it", () => {
        const plain = scoreReview(review(), context());
        assert.ok(scoreReview(review(), context({ resonance: new Map([["author", 95]]) })) > plain);
        assert.ok(scoreReview(review(), context({ resonance: new Map([["author", 10]]) })) < plain);
        assert.ok(scoreReview(review({ genres: ["Horror"] }), context()) > scoreReview(review({ genres: ["Romance"] }), context()));
        assert.ok(scoreReview(review({ likeCount: 12 }), context()) > plain);
        // Nothing known: everything neutral but the unknown-ish genre and no likes.
        assert.equal(plain, WEIGHTS.unseen.resonance * 0.5 + WEIGHTS.unseen.genre * 0.5);
    });

    test("a film they've seen: the closer its rating to theirs, the better", () => {
        const seen = new Map([[99, 4.5]]);
        const agrees = scoreReview(review({ rating: 4.5 }), context({ seen }));
        const disagrees = scoreReview(review({ rating: 1 }), context({ seen }));
        assert.ok(agrees > disagrees);
        assert.ok(Math.abs(agrees - disagrees - WEIGHTS.seen.agreement * (3.5 / 4.5)) < 1e-12);
        // Seen but not rated: agreement is neutral.
        assert.ok(scoreReview(review(), context({ seen: new Map([[99, null]]) })) < agrees);
    });

    test("the draw: no repeats, never more than asked for, and the heavy ones come up far more often", () => {
        const items = ["a", "b", "c", "d"];
        const picked = pickWeighted(items, 3, () => 1);
        assert.equal(new Set(picked).size, 3);
        assert.deepEqual(pickWeighted(items, 10, () => 1).sort(), items);
        assert.deepEqual(pickWeighted(items, 0, () => 1), []);
        // The same luck for both: the heavier wins.
        assert.deepEqual(pickWeighted(["light", "heavy"], 1, (item) => (item === "heavy" ? 100 : 1), () => 0.5), ["heavy"]);

        // e^4 (a score of 1 against 0) should win about 98% of the time.
        let heavy = 0;
        for (let i = 0; i < 2000; i++) {
            if (pickWeighted(["light", "heavy"], 1, (item) => (item === "heavy" ? Math.exp(4) : 1))[0] === "heavy") heavy += 1;
        }
        assert.ok(heavy > 1800, `${heavy} of 2000`);

        assert.deepEqual(shuffle(items).sort(), items);
    });

    test("a fifth from films they've seen, the rest from ones they haven't, each making up for the other", () => {
        assert.deepEqual(split(30, 100, 100), { seen: 6, unseen: 24 });
        assert.deepEqual(split(10, 100, 100), { seen: 2, unseen: 8 });
        assert.deepEqual(split(30, 100, 10), { seen: 20, unseen: 10 });
        assert.deepEqual(split(30, 2, 100), { seen: 2, unseen: 28 });
        assert.deepEqual(split(30, 3, 5), { seen: 3, unseen: 5 });
        assert.deepEqual(split(30, 0, 0), { seen: 0, unseen: 0 });
    });
});

const uri = process.env.MONGO_TEST_URI;
const dbName = uri ? new URL(uri).pathname.slice(1) : "";

describe("Featured, Shuffle and Recommend from the API", { skip: !uri ? "set MONGO_TEST_URI to run these" : !dbName.endsWith("_test") ? "MONGO_TEST_URI's database must end in _test" : false }, () => {
    process.env.SECRET ??= "recommend-test-secret";
    const mongoose = require("mongoose");
    const express = require("express");
    const jwt = require("jsonwebtoken");

    let base;
    let server;
    let User;
    let Review;
    let FilmLog;
    const tokens = new Map();
    let viewer;
    let otherViewer;
    let total;

    let count = 0;
    async function member() {
        count += 1;
        const user = await User.create({ username: `reader${count}`, email: `rec${count}@test.invalid`, password: "x" });
        tokens.set(String(user._id), jwt.sign({ _id: user._id }, process.env.SECRET));
        return user;
    }
    const range = (from, to) => Array.from({ length: to - from + 1 }, (_, index) => from + index);
    const watched = (user, ids) =>
        FilmLog.insertMany(ids.map((tmdbId) => ({ user: user._id, tmdbId, title: `Film ${tmdbId}`, status: "completed", rating: 4, genres: ["Drama"] })));
    const reviewsBy = (user, ids) =>
        Review.insertMany(ids.map((tmdbId) => ({ user: user._id, tmdbId, filmTitle: `Film ${tmdbId}`, rating: 4, genres: ["Drama"], text: "Seen it." })));
    async function list(user, sort, limit) {
        const response = await fetch(`${base}?sort=${sort}&limit=${limit}`, {
            headers: user ? { Authorization: `Bearer ${tokens.get(String(user._id))}` } : {},
        });
        return { status: response.status, body: await response.json().catch(() => null) };
    }

    before(async () => {
        await mongoose.connect(uri);
        await mongoose.connection.dropDatabase();
        User = require("../models/userModel");
        Review = require("../models/reviewModel");
        FilmLog = require("../models/filmLogModel");
        await Promise.all([User, Review, FilmLog, require("../models/resonanceModel")].map((model) => model.syncIndexes()));

        const app = express();
        app.use(express.json());
        app.use("/api/reviews", require("../routes/reviewRouter"));
        app.use((error, req, res, next) => {
            console.error(error);
            res.status(500).json({ error: "Something went wrong" });
        });
        server = app.listen(0);
        base = `http://127.0.0.1:${server.address().port}/api/reviews`;

        // The viewer has seen films 1 to 10, and reviewed 1 to 3 themselves.
        // Others reviewed films 1 to 10 (seen) and 101 to 140 (not).
        [viewer, otherViewer] = [await member(), await member()];
        const [a, b] = [await member(), await member()];
        await watched(viewer, range(1, 10));
        await reviewsBy(viewer, range(1, 3));
        await reviewsBy(a, range(1, 10));
        await reviewsBy(b, range(101, 140));
        // Someone who's seen 101 to 138: only 15 reviews of films they haven't.
        await watched(otherViewer, range(101, 138));
        total = await Review.countDocuments();
    });

    after(async () => {
        server?.close();
        await mongoose.disconnect();
    });

    const seenBy = (ids) => (review) => ids.includes(review.tmdbId);

    test("Recommend: a fifth of films they've seen, never their own reviews, and every review once", async () => {
        const { status, body } = await list(viewer, "recommend", 10);
        assert.equal(status, 200);
        assert.equal(body.length, 10);
        assert.equal(body.filter(seenBy(range(1, 10))).length, 2);
        assert.equal(new Set(body.map((review) => review._id)).size, 10);
        assert.ok(body.every((review) => review.user._id !== String(viewer._id)));
        // Shaped like the other lists: the author, and the viewer's vote.
        assert.ok(body.every((review) => review.user.username && "myVote" in review));

        // Asking for more than there is: everyone else's, each once.
        const all = (await list(viewer, "recommend", 50)).body;
        assert.equal(all.length, total - 3);
        assert.equal(all.filter(seenBy(range(1, 10))).length, 10);
    });

    test("Recommend: short of films they haven't seen, films they have make up the rest", async () => {
        const body = (await list(otherViewer, "recommend", 30)).body;
        assert.equal(body.length, 30);
        assert.equal(body.filter((review) => !range(101, 138).includes(review.tmdbId)).length, 15);
    });

    test("Recommend needs a login; Shuffle doesn't, and it's from everyone's", async () => {
        const refused = await list(null, "recommend", 10);
        assert.deepEqual([refused.status, refused.body.error], [401, "Log in to see reviews picked for you."]);

        const shuffled = await list(null, "shuffle", 10);
        assert.equal(shuffled.status, 200);
        assert.equal(new Set(shuffled.body.map((review) => review._id)).size, 10);
        // 50 at most (of 53), each once; and theirs can come up too (all three
        // missing from three draws of 50 in a row would be a one in 10^13).
        const draws = [];
        for (let i = 0; i < 3; i++) draws.push((await list(viewer, "shuffle", 50)).body);
        for (const draw of draws) assert.deepEqual([draw.length, new Set(draw.map((review) => review._id)).size], [Math.min(total, 50), Math.min(total, 50)]);
        assert.ok(draws.flat().some((review) => review.user._id === String(viewer._id)));
    });

    test("Featured: 60% the newest, the rest picked for them (or the most liked), each once, the two newest first and the rest mixed up", async () => {
        // A second apart, oldest first, so which are the newest is clear; and
        // likes on the three oldest by others, for the logged-out list.
        const everyone = await Review.find().sort({ _id: 1 }).select("_id").lean();
        await Review.collection.bulkWrite(
            everyone.map((review, index) => ({
                updateOne: {
                    filter: { _id: review._id },
                    update: { $set: { createdAt: new Date(Date.UTC(2026, 0, 1) + index * 1000), likeCount: index >= 3 && index < 6 ? 5 : 0 } },
                },
            }))
        );
        const newest = (await list(null, "recent", 23)).body.map((review) => review._id);

        const theirs = await list(viewer, "featured", 38);
        assert.equal(theirs.status, 200);
        assert.equal(theirs.body.length, 38);
        const ids = theirs.body.map((review) => review._id);
        assert.equal(new Set(ids).size, 38);
        // round(38 * 0.6) = 23: all of the newest are in, and the other 15
        // are Recommend's picks, so never their own.
        assert.ok(newest.every((id) => ids.includes(id)));
        const picked = theirs.body.filter((review) => !newest.includes(review._id));
        assert.equal(picked.length, 15);
        assert.ok(picked.every((review) => review.user._id !== String(viewer._id)));
        assert.ok(theirs.body.every((review) => review.user.username && "myVote" in review));
        // The first two cards are always the two newest, newest first.
        assert.deepEqual(ids.slice(0, 2), newest.slice(0, 2));

        // Logged out, the rest are the most liked of the others.
        const loggedOut = await list(null, "featured", 38);
        assert.equal(loggedOut.status, 200);
        const rest = loggedOut.body.filter((review) => !newest.includes(review._id)).map((review) => review._id);
        const mostLiked = (await Review.find({ _id: { $nin: newest } }).sort({ likeCount: -1, createdAt: -1 }).limit(15).lean()).map((review) => String(review._id));
        assert.deepEqual(rest.sort(), mostLiked.sort());
        assert.deepEqual(loggedOut.body.slice(0, 2).map((review) => review._id), newest.slice(0, 2));

        // Asking for more than there is: every review, each once.
        const all = (await list(viewer, "featured", 50)).body;
        assert.equal(all.length, Math.min(total, 50));
        assert.equal(new Set(all.map((review) => review._id)).size, all.length);

        // A single review is just the newest.
        assert.deepEqual((await list(viewer, "featured", 1)).body.map((review) => review._id), newest.slice(0, 1));
    });

    test("an unknown sort is the newest, even one JavaScript objects have built in", async () => {
        for (const sort of ["nonsense", "constructor", "__proto__"]) {
            const { status, body } = await list(null, sort, 5);
            assert.equal(status, 200, sort);
            assert.equal(body.length, 5, sort);
        }
    });
});
