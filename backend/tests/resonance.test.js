// Resonance (utils/resonance.js, shared/resonance.js): the scoring, which
// needs no database, then the API and the nightly sweep against a real
// MongoDB.
//
// From backend/, with a MongoDB running (the scoring tests run without one):
//   PowerShell:  $env:MONGO_TEST_URI="mongodb://127.0.0.1:27017/kino_test"; npm test
//   bash:        MONGO_TEST_URI=mongodb://127.0.0.1:27017/kino_test npm test
// The database is wiped first, so its name has to end in "_test".
const { test, describe, before, after } = require("node:test");
const assert = require("node:assert/strict");

const {
    WEIGHTS,
    SCORING_VERSION,
    RATING_SPREAD,
    GAP_CURVE,
    similarity,
    filmGap,
    filmSimilarity,
    shares,
    overlap,
    tasteOf,
    moviesFactor,
    genreRatingFactor,
    genreOverlapFactor,
    yearFactor,
    ageRatingFactor,
    resonanceBetween,
    suggestionCount,
} = require("../utils/resonance");
const { RESONANCE_TIERS, resonanceTier } = require("../../shared/resonance.js");
const { onSharedScale, sharedAverage, trueGap } = require("../../shared/resonanceScale.js");

// A rated film, with no genres, year or age rating unless given.
function film(tmdbId, rating, extra = {}) {
    return { tmdbId, title: `Film ${tmdbId}`, posterPath: null, rating, genres: [], year: null, certification: null, ...extra };
}

// `count` films from `from` on, each rated by `rate(index)`.
function films(count, rate, extra = () => ({}), from = 1) {
    return Array.from({ length: count }, (_, index) => film(from + index, rate(index), extra(index)));
}

const close = (actual, expected, message) => assert.ok(Math.abs(actual - expected) < 1e-9, `${message ?? ""} ${actual} vs ${expected}`);

describe("Resonance scoring", () => {
    test("the weights add up to 1", () => {
        close(Object.values(WEIGHTS).reduce((sum, weight) => sum + weight, 0), 1);
    });

    test("similarity is 1 for the same rating, 0 at RATING_SPREAD apart, curved between (1 - (gap / RATING_SPREAD)²), and never below 0", () => {
        assert.equal(GAP_CURVE, 2);
        assert.equal(similarity(1.5, 1.5), 1);
        // Half of RATING_SPREAD apart: 1 - 0.5² = 0.75. A quarter: 1 - 0.25² = 0.9375.
        close(similarity(-1, -1 + RATING_SPREAD / 2), 0.75);
        close(similarity(2, 2 + RATING_SPREAD / 4), 0.9375);
        assert.equal(similarity(-RATING_SPREAD / 2, RATING_SPREAD / 2), 0);
        assert.equal(similarity(-3, 3), 0);
    });

    test("the curve: a small gap costs little, a big one a lot, and RATING_SPREAD or more is nothing alike", () => {
        // alike(gap), as similarity(0, gap): 1 - (gap / 2)².
        assert.equal(RATING_SPREAD, 2);
        const alikeAt = (gap) => similarity(0, gap);
        assert.equal(alikeAt(0), 1);
        close(alikeAt(0.4), 1 - 0.2 ** 2);
        close(alikeAt(1), 1 - 0.5 ** 2);
        close(alikeAt(1.5), 1 - 0.75 ** 2);
        assert.deepEqual([0.4, 1, 1.5].map((gap) => Number(alikeAt(gap).toFixed(4))), [0.96, 0.75, 0.4375]);
        for (const gap of [2, 2.75, 4.5]) assert.equal(alikeAt(gap), 0, `${gap} apart`);
        // Either way round.
        assert.equal(similarity(1, 0), alikeAt(1));
    });

    test("both loving a film: 5 from a member who averages 3.0 against 4 from one who averages 3.4 is 1.125 apart, 68%", () => {
        const a = tasteOf([film(1, 5), film(2, 2), film(3, 2)]);
        const b = tasteOf([film(1, 4), film(2, 3), film(3, 3), film(4, 3.5), film(5, 3.5)]);
        close(a.average, 3);
        close(b.average, 3.4);

        // On the shared scale (both averages at 3.2): the 5 stays 5, and the
        // 4, 0.6 of the way from 3.4 to 5, is 0.6 of the way from 3.2 to 5:
        // 3.875. 1.125 apart: 1 - (1.125 / 2)² = 1 - (9/16)² = 175/256.
        close(filmGap(a.byFilm.get(1), b.byFilm.get(1)), 1.125);
        close(filmSimilarity(a.byFilm.get(1), b.byFilm.get(1)), 175 / 256);
        assert.equal(Number(filmSimilarity(a.byFilm.get(1), b.byFilm.get(1)).toFixed(4)), 0.6836);
    });

    test("the shared scale: half a star and 5 never move, each average goes to the middle of the two, and nothing lands past either end", () => {
        const shared = sharedAverage(2, 4.5);
        assert.equal(shared, 3.25);
        // The ends stay the ends, however generous or harsh.
        for (const average of [1, 2, 3.25, 4.5, 4.9]) {
            assert.equal(onSharedScale(0.5, average, shared), 0.5);
            assert.equal(onSharedScale(5, average, shared), 5);
        }
        // Each one's average lands on the middle.
        assert.equal(onSharedScale(2, 2, shared), 3.25);
        assert.equal(onSharedScale(4.5, 4.5, shared), 3.25);
        // In between, in proportion: 1.25, halfway from 0.5 to the average of
        // 2, is halfway from 0.5 to 3.25; 4.75, halfway from 4.5 to 5, is
        // halfway from 3.25 to 5.
        close(onSharedScale(1.25, 2, shared), 1.875);
        close(onSharedScale(4.75, 4.5, shared), 4.125);
        // Every rating, from every average: never past the ends.
        for (let average = 0.75; average < 5; average += 0.25) {
            for (let rating = 0.5; rating <= 5; rating += 0.5) {
                const placed = onSharedScale(rating, average, sharedAverage(average, 5.5 - average));
                assert.ok(placed >= 0.5 && placed <= 5, `${rating} from an average of ${average}: ${placed}`);
            }
        }
        // The same either way round.
        close(trueGap(4, 3.1, 2.5, 2.2), trueGap(2.5, 2.2, 4, 3.1));
    });

    test("both at 5, or both at 0.5, is still 1 however far apart their averages are", () => {
        // Averages 3 and 3.875.
        const a = tasteOf([film(1, 5), film(2, 0.5), film(3, 3.5)]);
        const b = tasteOf([film(1, 5), film(2, 0.5), film(3, 5), film(4, 5)]);
        close(b.average - a.average, 0.875);

        for (const tmdbId of [1, 2]) {
            assert.equal(filmGap(a.byFilm.get(tmdbId), b.byFilm.get(tmdbId)), 0);
            assert.equal(filmSimilarity(a.byFilm.get(tmdbId), b.byFilm.get(tmdbId)), 1);
        }
    });

    test("no shared films: the movies factor is 0, and there's nothing for the card", () => {
        const a = tasteOf(films(20, () => 4));
        const b = tasteOf(films(20, () => 4, undefined, 101));
        const result = resonanceBetween(a, b);

        assert.equal(moviesFactor(a, b).factor, 0);
        assert.equal(result.movies, 0);
        assert.equal(result.sharedCount, 0);
        assert.deepEqual(result.sharedFilms, []);
    });

    test("confidence: 8 identically rated shared films count for 80%, 10 or more in full", () => {
        const rate = (index) => [5, 2, 3.5, 1, 4.5, 3, 0.5, 4, 2.5, 5, 1.5, 3][index % 12];
        const eight = films(8, rate);
        close(moviesFactor(tasteOf(eight), tasteOf(eight)).factor, 0.8);

        const ten = films(10, rate);
        close(moviesFactor(tasteOf(ten), tasteOf(ten)).factor, 1);

        const fifteen = films(15, rate);
        close(moviesFactor(tasteOf(fifteen), tasteOf(fifteen)).factor, 1);
    });

    test("a harsh and a generous rater with the same taste come out far closer than their ratings as given, but a 3.5 isn't a 5", () => {
        const genres = (index) => ({ genres: [["Drama"], ["Comedy"], ["Horror"]][index % 3] });
        const generous = films(12, (index) => 2 + (index % 7) * 0.5, genres);
        const harsh = films(12, (index) => 0.5 + (index % 7) * 0.5, genres);
        const a = tasteOf(generous);
        const b = tasteOf(harsh);

        // 1.5 stars apart on every film as given: a 44% match on them.
        const asGiven = [...a.byFilm.values()].reduce((sum, entry) => sum + similarity(entry.rating, b.byFilm.get(entry.tmdbId).rating), 0) / 12;
        close(asGiven, 0.4375);
        // The same above and below their usual, so far closer. But the harsh
        // one never goes past 3.5, so their top film isn't a 5 to them the
        // way it is to the generous one: that one's still apart.
        const movies = moviesFactor(a, b).factor;
        assert.ok(movies > 0.85 && movies < 1, String(movies));
        assert.ok(filmGap(a.byFilm.get(7), b.byFilm.get(7)) > 1, "a 5 against a 3.5");
        assert.ok(genreRatingFactor(a, b) > 0.95, String(genreRatingFactor(a, b)));
        assert.equal(resonanceBetween(a, b).movies, 88);
        assert.equal(resonanceBetween(a, b).genre, 99);
    });

    test("the same top or bottom rating is no gap, however generous or harsh the two usually are", () => {
        // Averages 3.125 and 2.375: three quarters of a star apart.
        const a = tasteOf([film(1, 5), film(2, 0.5), film(3, 4), film(4, 3)]);
        const b = tasteOf([film(1, 5), film(2, 0.5), film(3, 1), film(4, 3)]);
        const gap = (tmdbId) => filmGap(a.byFilm.get(tmdbId), b.byFilm.get(tmdbId));

        assert.equal(gap(1), 0);
        assert.equal(gap(2), 0);
        assert.equal(filmSimilarity(a.byFilm.get(1), b.byFilm.get(1)), 1);
        // On the shared scale (both averages at 2.75): A's 4 is 3.8 and B's 1
        // is 1.1, 2.7 apart: past RATING_SPREAD, nothing alike.
        close(gap(3), 2.7);
        assert.equal(filmSimilarity(a.byFilm.get(3), b.byFilm.get(3)), 0);
        // The same rating mid-scale still means more from the harsher one:
        // A's 3 is 18.5/7, B's 3 is 23/7, 9/14 apart: 1 - (9/28)² = 703/784.
        close(gap(4), 9 / 14);
        close(filmSimilarity(a.byFilm.get(4), b.byFilm.get(4)), 703 / 784);

        // And the Movies factor counts them that way (4 shared films: 40%).
        close(moviesFactor(a, b).factor, ((1 + 1 + 0 + 703 / 784) / 4) * 0.4);
    });

    test("opposite tastes score low on the movies factor", () => {
        const a = tasteOf(films(10, (index) => (index % 2 ? 5 : 0.5)));
        const b = tasteOf(films(10, (index) => (index % 2 ? 0.5 : 5)));
        assert.equal(moviesFactor(a, b).factor, 0);
    });

    test("a film in several genres counts a share of one towards each", () => {
        const split = shares(
            [film(1, 4, { genres: ["Sci-Fi", "Action", "Thriller"] }), film(2, 3, { genres: ["Drama"] }), film(3, 2)],
            (entry) => entry.genres
        );

        // The film with no genres is left out: two films, a half each.
        close(split.get("Sci-Fi"), 1 / 6);
        close(split.get("Action"), 1 / 6);
        close(split.get("Thriller"), 1 / 6);
        close(split.get("Drama"), 1 / 2);
        close([...split.values()].reduce((sum, share) => sum + share, 0), 1);

        const a = tasteOf([film(1, 4, { genres: ["Sci-Fi", "Action", "Thriller"] })]);
        const b = tasteOf([film(2, 4, { genres: ["Action"] })]);
        close(genreOverlapFactor(a, b), 1 / 3);
    });

    test("overlap is the smaller share, added up", () => {
        const a = new Map([["Drama", 0.5], ["Comedy", 0.5]]);
        const b = new Map([["Drama", 0.25], ["Horror", 0.75]]);
        close(overlap(a, b), 0.25);
        close(overlap(a, a), 1);
        assert.equal(overlap(a, new Map()), 0);
    });

    test("genre ratings compare only genres both rated 2+ films in, weighted by how many", () => {
        // Drama: A rates it above their usual, B below. Comedy: both the
        // same. Horror: only one film from A, so it isn't compared.
        const a = tasteOf([
            film(1, 5, { genres: ["Drama"] }),
            film(2, 5, { genres: ["Drama"] }),
            film(3, 3, { genres: ["Comedy"] }),
            film(4, 3, { genres: ["Comedy"] }),
            film(5, 3, { genres: ["Comedy"] }),
            film(6, 1, { genres: ["Horror"] }),
        ]);
        const b = tasteOf([
            film(11, 1, { genres: ["Drama"] }),
            film(12, 1, { genres: ["Drama"] }),
            film(13, 3, { genres: ["Comedy"] }),
            film(14, 3, { genres: ["Comedy"] }),
            film(15, 3, { genres: ["Comedy"] }),
            film(16, 5, { genres: ["Horror"] }),
            film(17, 5, { genres: ["Horror"] }),
        ]);

        const average = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;
        const meanA = average([5, 5, 3, 3, 3, 1]);
        const meanB = average([1, 1, 3, 3, 3, 5, 5]);
        // Each genre's average star rating, on the shared scale (both
        // averages at 19/6). Drama: A's 5 stays 5, B's 1 is about 1.03, far
        // past RATING_SPREAD: 0. Comedy: A's 3 is 48.5/17, B's 3 (their
        // average) is 19/6, 16/51 apart: 1 - (8/51)² = 2537/2601.
        const shared = sharedAverage(meanA, meanB);
        close(shared, 19 / 6);
        assert.equal(similarity(onSharedScale(5, meanA, shared), onSharedScale(1, meanB, shared)), 0);
        close(similarity(onSharedScale(3, meanA, shared), onSharedScale(3, meanB, shared)), 2537 / 2601);
        close(genreRatingFactor(a, b), (0 * 4 + (2537 / 2601) * 6) / 10);

        // Nothing comparable.
        assert.equal(genreRatingFactor(tasteOf([film(1, 4, { genres: ["Drama"] })]), a), 0);
    });

    test("years group by decade, and films with no year are left out", () => {
        const a = tasteOf([film(1, 4, { year: 1994 }), film(2, 4, { year: 1999 }), film(3, 4)]);
        const b = tasteOf([film(4, 4, { year: 1990 }), film(5, 4, { year: 2003 })]);
        close(yearFactor(a, b), 0.5);
    });

    test("age ratings leave out NR and unknown ones, and are 0 if either has none", () => {
        const a = tasteOf([film(1, 4, { certification: "PG-13" }), film(2, 4, { certification: "R" }), film(3, 4, { certification: "NR" }), film(4, 4)]);
        const b = tasteOf([film(5, 4, { certification: "R" })]);
        close(ageRatingFactor(a, b), 0.5);

        const none = tasteOf([film(6, 4, { certification: "NR" }), film(7, 4)]);
        assert.equal(ageRatingFactor(a, none), 0);
        assert.equal(ageRatingFactor(none, none), 0);
    });

    test("the card's top 3 shared films: highest combined rating, then the closest ratings", () => {
        const a = tasteOf([film(1, 5), film(2, 4.5), film(3, 5), film(4, 3), film(5, 4)]);
        const b = tasteOf([film(1, 4), film(2, 4.5), film(3, 5), film(4, 3), film(5, 5)]);
        // 3: 10. 1, 2 and 5 all 9: 2 is the closest (0 apart), then 1 and 5
        // (1 apart each), by title.
        assert.deepEqual(
            resonanceBetween(a, b).sharedFilms.map((entry) => entry.tmdbId),
            [3, 2, 1]
        );
        assert.deepEqual(Object.keys(resonanceBetween(a, b).sharedFilms[0]), ["tmdbId", "title", "posterPath"]);
    });

    test("identical members are 100%, and the factors are weighted into the total", () => {
        const genres = [["Drama"], ["Comedy", "Romance"], ["Horror"], ["Sci-Fi", "Action", "Thriller"]];
        const list = films(20, (index) => 1 + (index % 9) * 0.5, (index) => ({
            genres: genres[index % 4],
            year: 1970 + index * 2,
            certification: ["PG", "PG-13", "R"][index % 3],
        }));
        const same = resonanceBetween(tasteOf(list), tasteOf(list));
        assert.equal(same.percent, 100);
        assert.equal(same.sharedCount, 20);

        const result = resonanceBetween(tasteOf(list), tasteOf(films(20, () => 3, undefined, 500)));
        const { factors } = result;
        const total = 0.5 * factors.movies + 0.25 * factors.genreRating + 0.2 * factors.genreOverlap + 0.025 * factors.year + 0.025 * factors.ageRating;
        assert.equal(result.percent, Math.round(total * 100));
    });

    test("the tiers, and Dissonance shown the other way round", () => {
        assert.equal(RESONANCE_TIERS.soul, 85);
        assert.deepEqual(resonanceTier(100), { key: "soul", label: "Soul Resonance", shown: 100 });
        assert.deepEqual(resonanceTier(85), { key: "soul", label: "Soul Resonance", shown: 85 });
        assert.deepEqual(resonanceTier(84), { key: "resonance", label: "Resonance", shown: 84 });
        assert.deepEqual(resonanceTier(50), { key: "resonance", label: "Resonance", shown: 50 });
        assert.deepEqual(resonanceTier(49), { key: "dissonance", label: "Dissonance", shown: 51 });
        assert.deepEqual(resonanceTier(40), { key: "dissonance", label: "Dissonance", shown: 60 });
        assert.deepEqual(resonanceTier(0), { key: "dissonance", label: "Dissonance", shown: 100 });
    });

    test("the server works everyone out again on starting up when the scores are stale", () => {
        const { needsSweep } = require("../jobs/resonanceSweep");
        const now = Date.now();
        const hoursAgo = (hours) => new Date(now - hours * 60 * 60 * 1000);

        assert.equal(needsSweep(null, now), true);
        assert.equal(needsSweep({ at: hoursAgo(2), version: SCORING_VERSION }, now), false);
        assert.equal(needsSweep({ at: hoursAgo(25), version: SCORING_VERSION }, now), true);
        // Worked out with other weights, or before scores carried a version.
        assert.equal(needsSweep({ at: hoursAgo(2), version: "different" }, now), true);
        assert.equal(needsSweep({ at: hoursAgo(2), version: null }, now), true);
    });

    test("suggestions come from the top 5% of eligible members, at least 3", () => {
        assert.equal(suggestionCount(0), 3);
        assert.equal(suggestionCount(60), 3);
        assert.equal(suggestionCount(61), 4);
        assert.equal(suggestionCount(100), 5);
        assert.equal(suggestionCount(1000), 50);
    });
});

describe("the US age rating copied onto film logs", () => {
    const { usCertification } = require("../services/tmdbService");

    test("the first one that isn't NR, NR if that's all, or null", () => {
        assert.equal(usCertification({ usCertifications: ["NR", "PG-13", "R"] }), "PG-13");
        assert.equal(usCertification({ usCertifications: ["R"] }), "R");
        assert.equal(usCertification({ usCertifications: ["NR"] }), "NR");
        assert.equal(usCertification({ usCertifications: [" ", "PG"] }), "PG");
        assert.equal(usCertification({ usCertifications: [] }), null);
        assert.equal(usCertification(null), null);
    });
});

const uri = process.env.MONGO_TEST_URI;
const dbName = uri ? new URL(uri).pathname.slice(1) : "";

describe("Resonance API and sweep", { skip: !uri ? "set MONGO_TEST_URI to run these" : !dbName.endsWith("_test") ? "MONGO_TEST_URI's database must end in _test" : false }, () => {
    process.env.SECRET ??= "resonance-test-secret";
    const mongoose = require("mongoose");
    const express = require("express");
    const jwt = require("jsonwebtoken");

    let base;
    let server;
    let User;
    let Follow;
    let FilmLog;
    let Resonance;
    let store;
    const tokens = new Map();

    before(async () => {
        await mongoose.connect(uri);
        await mongoose.connection.dropDatabase();
        User = require("../models/userModel");
        Follow = require("../models/followModel");
        FilmLog = require("../models/filmLogModel");
        Resonance = require("../models/resonanceModel");
        store = require("../utils/resonanceStore");
        await Promise.all([User, Follow, FilmLog, Resonance].map((model) => model.syncIndexes()));

        const app = express();
        app.use(express.json());
        app.use("/api/resonance", require("../routes/resonanceRouter"));
        app.use("/api/users", require("../routes/userRouter"));
        app.use((error, req, res, next) => {
            console.error(error);
            res.status(500).json({ error: "Something went wrong" });
        });
        server = app.listen(0);
        base = `http://127.0.0.1:${server.address().port}/api`;
    });

    after(async () => {
        server?.close();
        await mongoose.disconnect();
    });

    let count = 0;
    // A member who has rated `rated` films (tmdbIds 1 on, each by `rate`).
    async function member(rated = 20, extra = {}, rate = () => 4) {
        count += 1;
        const user = await User.create({ username: `resonant${count}`, email: `r${count}@test.invalid`, password: "x", ...extra });
        tokens.set(String(user._id), jwt.sign({ _id: user._id }, process.env.SECRET));
        if (rated) {
            const entries = films(rated, rate, (index) => ({ genres: ["Drama"], year: 2000 + index }));
            await FilmLog.insertMany(entries.map((entry) => ({ ...entry, user: user._id, status: "completed" })));
        }
        return user;
    }
    async function call(user, path, options = {}) {
        const response = await fetch(base + path, {
            method: options.method ?? "GET",
            headers: { "Content-Type": "application/json", ...(user ? { Authorization: `Bearer ${tokens.get(String(user._id))}` } : {}) },
            body: options.body && JSON.stringify(options.body),
        });
        return { status: response.status, body: await response.json().catch(() => null) };
    }
    const befriend = (a, b) => Follow.create([{ follower: a._id, following: b._id }, { follower: b._id, following: a._id }]);
    // A stored pair, as the sweep would leave it.
    function pair(a, b, percent) {
        const [userA, userB] = [a._id, b._id].sort((x, y) => String(x).localeCompare(String(y)));
        return Resonance.create({ userA, userB, percent, movies: percent, genre: percent, sharedCount: 20, sharedFilms: [], computedAt: new Date() });
    }
    const names = (matches) => matches.map((match) => match.user.username);
    const percents = (matches) => matches.map((match) => match.percent);
    const clear = () => Promise.all([User, Follow, FilmLog, Resonance].map((model) => model.deleteMany({})));
    // A sweep's counts, without when it ran.
    async function sweep() {
        const { members, pairs, at } = await store.recalculateResonance();
        assert.ok(at instanceof Date);
        return { members, pairs };
    }

    test("the sweep stores each pair of members with 20+ rated films once, and removes pairs that no longer qualify", async () => {
        await clear();
        const a = await member();
        await member(20, {}, (index) => 1 + (index % 9) * 0.5);
        await member(25);
        const few = await member(19);
        // Resonance off and a private profile still count: they only hide.
        const off = await member(20, { resonance: false, privacy: "private" });

        assert.deepEqual(await sweep(), { members: 4, pairs: 6 });
        const stored = await Resonance.find().lean();
        assert.equal(stored.length, 6);
        for (const entry of stored) {
            assert.ok(String(entry.userA) < String(entry.userB));
            assert.ok(![String(entry.userA), String(entry.userB)].includes(String(few._id)));
            assert.equal(entry.sharedCount, 20);
            assert.equal(entry.sharedFilms.length, 3);
        }
        assert.ok(stored.some((entry) => [String(entry.userA), String(entry.userB)].includes(String(off._id))));

        // Twice is the same as once.
        assert.deepEqual(await sweep(), { members: 4, pairs: 6 });
        assert.equal(await Resonance.countDocuments(), 6);

        // Down to 19 rated films: their pairs go at the next sweep.
        await FilmLog.updateOne({ user: a._id, tmdbId: 1 }, { $set: { rating: null } });
        assert.deepEqual(await sweep(), { members: 3, pairs: 3 });
        assert.equal(await Resonance.countDocuments({ $or: [{ userA: a._id }, { userB: a._id }] }), 0);
        // Each stored score says which scoring settings made it.
        const last = await store.lastSweep();
        assert.equal(last.version, SCORING_VERSION);
        assert.ok(last.at instanceof Date);
    });

    test("standing: how many films they've rated, Resonance off, and waiting for the next sweep", async () => {
        await clear();
        const few = await member(19);
        assert.deepEqual((await call(few, "/resonance/me")).body, { on: true, icon: true, rated: 19, needed: 20, eligible: false, waiting: false });

        const off = await member(30, { resonance: false, resonanceIcon: false });
        assert.deepEqual((await call(off, "/resonance/me")).body, { on: false, icon: false, rated: 30, needed: 20, eligible: false, waiting: false });

        // The first to get there has nobody to match yet, but off still
        // counts (it's worked out for them too), so there is something to wait for.
        const first = await member(20);
        assert.equal((await call(first, "/resonance/me")).body.waiting, true);
        await store.recalculateResonance();
        assert.equal((await call(first, "/resonance/me")).body.waiting, false);
        assert.equal((await call(first, "/resonance/me")).body.eligible, true);

        assert.equal((await call(null, "/resonance/me")).status, 401);
    });

    test("alone with enough films: nothing to wait for", async () => {
        await clear();
        const only = await member(20);
        assert.equal((await call(only, "/resonance/me")).body.waiting, false);
        assert.deepEqual((await call(only, "/resonance/ranking")).body.matches, []);
    });

    test("the ranking shows everyone they may see: privacy, friends only, Resonance off and too few films hide", async () => {
        await clear();
        const me = await member();
        const shown = await member();
        const hidden = await member(20, { privacy: "private" });
        const notFriend = await member(20, { privacy: "friends" });
        const friend = await member(20, { privacy: "friends" });
        const off = await member(20, { resonance: false });
        const dropped = await member(20);
        await befriend(me, friend);
        // Following a friends-only member one way isn't enough.
        await Follow.create({ follower: me._id, following: notFriend._id });
        for (const [other, percent] of [[shown, 70], [hidden, 99], [notFriend, 98], [friend, 60], [off, 97], [dropped, 96]]) await pair(me, other, percent);
        // Down to 19 since the sweep: checked when it's asked for.
        await FilmLog.updateOne({ user: dropped._id, tmdbId: 1 }, { $set: { rating: null } });

        const ranking = (await call(me, "/resonance/ranking")).body;
        assert.deepEqual(names(ranking.matches), [shown.username, friend.username]);
        assert.equal(ranking.total, 2);
        assert.equal(ranking.standing.eligible, true);
        const [first] = ranking.matches;
        assert.deepEqual(Object.keys(first).sort(), ["genre", "movies", "percent", "rank", "relation", "sharedCount", "sharedFilms", "user"]);
        assert.deepEqual(Object.keys(first.user).sort(), ["_id", "avatarUrl", "cosmetics", "reviewCardBanner", "username"]);
        assert.equal(ranking.matches[1].relation, "friends");

        // Turning it off hides them from everyone straight away, and theirs from them.
        assert.equal((await call(shown, "/users/me", { method: "PATCH", body: { resonance: false } })).status, 200);
        assert.deepEqual(names((await call(me, "/resonance/ranking")).body.matches), [friend.username]);
        const theirs = (await call(shown, "/resonance/ranking")).body;
        assert.deepEqual(theirs.matches, []);
        assert.equal(theirs.standing.on, false);

        // And back on, without waiting for a sweep.
        await call(shown, "/users/me", { method: "PATCH", body: { resonance: true } });
        assert.deepEqual(names((await call(me, "/resonance/ranking")).body.matches), [shown.username, friend.username]);

        // A private profile is never shown, but they still see their own.
        assert.deepEqual(names((await call(hidden, "/resonance/ranking")).body.matches), [me.username]);

        // The settings only take true or false.
        assert.equal((await call(me, "/users/me", { method: "PATCH", body: { resonanceIcon: "no" } })).status, 400);
    });

    test("Resonance (50%+, best first) and Dissonance (under 50%, strongest first), with how they follow each other, a page at a time", async () => {
        await clear();
        const me = await member();
        const others = {};
        for (const percent of [95, 50, 80, 49, 10, 30, 0]) {
            others[percent] = await member();
            await pair(me, others[percent], percent);
        }
        await befriend(me, others[95]);
        await Follow.create({ follower: me._id, following: others[80]._id });
        await Follow.create({ follower: others[50]._id, following: me._id });

        const resonance = (await call(me, "/resonance/ranking?side=resonance")).body;
        assert.deepEqual(percents(resonance.matches), [95, 80, 50]);
        assert.deepEqual(resonance.matches.map((match) => match.relation), ["friends", "following", "followsYou"]);
        assert.equal(resonance.hasMore, false);

        const dissonance = (await call(me, "/resonance/ranking?side=dissonance")).body;
        assert.deepEqual(percents(dissonance.matches), [0, 10, 30, 49]);
        assert.equal(dissonance.matches[0].relation, null);

        // Anything else is Resonance.
        assert.deepEqual(percents((await call(me, "/resonance/ranking?side=sideways")).body.matches), [95, 80, 50]);

        for (let index = 0; index < 20; index++) await pair(me, await member(), 60);
        const page = (await call(me, "/resonance/ranking")).body;
        assert.equal(page.matches.length, 20);
        assert.equal(page.total, 23);
        assert.equal(page.hasMore, true);
        const next = (await call(me, `/resonance/ranking?offset=${page.next}`)).body;
        assert.deepEqual(percents(next.matches), [60, 60, 50]);
        assert.equal(next.hasMore, false);

        // Searching keeps each one's place in the whole list.
        const found = (await call(me, `/resonance/ranking?q=${others[80].username.toUpperCase()}`)).body;
        assert.deepEqual(found.matches.map((match) => [match.user.username, match.rank]), [[others[80].username, 2]]);
        assert.equal(found.total, 1);
        const lowest = (await call(me, `/resonance/ranking?side=dissonance&q=${others[30].username}`)).body;
        assert.deepEqual(lowest.matches.map((match) => match.rank), [3]);
        assert.deepEqual((await call(me, "/resonance/ranking?q=nobody-by-this-name")).body.matches, []);
    });

    test("suggestions: matches at 75%+, the top 5% of eligible members (at least 3), friends included", async () => {
        await clear();
        const me = await member();
        const byPercent = {};
        for (const percent of [99, 90, 85, 80, 76, 74]) {
            byPercent[percent] = await member();
            await pair(me, byPercent[percent], percent);
        }
        await befriend(me, byPercent[90]);

        // 7 eligible: 5% rounds up to 1, so the top 3.
        const { matches } = (await call(me, "/resonance/suggestions")).body;
        assert.deepEqual(percents(matches), [99, 90, 85]);
        assert.equal(matches[1].relation, "friends");

        // Nothing at 75%+: an empty pool, so no hero slide.
        const lonely = await member();
        await pair(lonely, me, 74);
        assert.deepEqual((await call(lonely, "/resonance/suggestions")).body, { matches: [] });

        // Too few films of their own: nothing.
        const few = await member(5);
        assert.deepEqual((await call(few, "/resonance/suggestions")).body, { matches: [] });
    });

    test("Soul Resonance: 80%+ only, with no icon if either of them has it off (the glow stays)", async () => {
        await clear();
        const me = await member();
        const soul = await member();
        const near = await member();
        const shy = await member(20, { resonanceIcon: false });
        const hidden = await member(20, { privacy: "private" });
        await pair(me, soul, 93);
        await pair(me, near, 79);
        await pair(me, shy, 97);
        await pair(me, hidden, 95);

        // 79% isn't one, and a private profile never shows.
        assert.deepEqual((await call(me, "/resonance/soul")).body, {
            [String(soul._id)]: { percent: 93, icon: true },
            [String(shy._id)]: { percent: 97, icon: false },
        });
        assert.deepEqual((await call(soul, "/resonance/soul")).body, { [String(me._id)]: { percent: 93, icon: true } });
        // shy sees no icons either.
        assert.deepEqual((await call(shy, "/resonance/soul")).body, { [String(me._id)]: { percent: 97, icon: false } });

        await call(me, "/users/me", { method: "PATCH", body: { resonanceIcon: false } });
        assert.deepEqual((await call(me, "/resonance/soul")).body, {
            [String(soul._id)]: { percent: 93, icon: false },
            [String(shy._id)]: { percent: 97, icon: false },
        });
        assert.deepEqual((await call(soul, "/resonance/soul")).body, { [String(me._id)]: { percent: 93, icon: false } });

        // Resonance off: nothing at all, either way.
        await call(soul, "/users/me", { method: "PATCH", body: { resonance: false } });
        assert.deepEqual((await call(soul, "/resonance/soul")).body, {});
        assert.deepEqual(Object.keys((await call(me, "/resonance/soul")).body), [String(shy._id)]);
        // The profile says how they're set.
        const profile = (await call(me, `/users/${me._id}`)).body;
        assert.equal(profile.resonance, true);
        assert.equal(profile.resonanceIcon, false);
    });

    test("/SECRETresonance: moderators and admins see every pair, worked out now, with 20+ or any rated films", async () => {
        await clear();
        const admin = await member(20, { role: "admin" });
        const hidden = await member(20, { privacy: "private", resonance: false });
        const few = await member(5);
        const plain = await member(0);

        // Members with 20+: the admin and hidden, whatever hidden's settings.
        const twenty = (await call(admin, "/resonance/all")).body;
        assert.deepEqual(twenty.members.map((entry) => [entry.username, entry.rated]).sort(), [[admin.username, 20], [hidden.username, 20]].sort());
        assert.equal(twenty.total, 1);
        assert.deepEqual(Object.keys(twenty.pairs[0].factors), ["movies", "genre", "genreOverlap", "decades", "ageRatings"]);
        assert.equal(twenty.members.find((entry) => entry.username === hidden.username).resonance, false);

        // Anyone who has rated something: few too, but never someone with none.
        const any = (await call(admin, "/resonance/all?min=any")).body;
        assert.equal(any.members.length, 3);
        assert.equal(any.total, 3);
        assert.ok(!any.members.some((entry) => entry.username === plain.username));

        // One member's pairs, with them first.
        const theirs = (await call(admin, `/resonance/all?min=any&member=${few._id}`)).body;
        assert.equal(theirs.total, 2);
        assert.ok(theirs.pairs.every((entry) => String(entry.a._id) === String(few._id)));

        // Pairs with someone whose name has it in it, any case, them first.
        const named = (await call(admin, `/resonance/all?min=any&q=${few.username.toUpperCase()}`)).body;
        assert.equal(named.total, 2);
        assert.ok(named.pairs.every((entry) => entry.a.username === few.username));
        assert.equal(named.members.length, 3, "everyone's still counted");
        // A member and a name: that member's pair with them.
        const between = (await call(admin, `/resonance/all?min=any&member=${admin._id}&q=${few.username}`)).body;
        assert.deepEqual(between.pairs.map((entry) => [entry.a.username, entry.b.username]), [[admin.username, few.username]]);
        assert.equal((await call(admin, "/resonance/all?min=any&q=nobody-by-this-name")).body.total, 0);

        // Moderators too, and nobody else.
        assert.equal((await call(await member(0, { role: "moderator" }), "/resonance/all")).status, 200);
        assert.equal((await call(few, "/resonance/all")).status, 403);
        assert.equal((await call(null, "/resonance/all")).status, 401);
    });

    test("/SECRETresonance's pairs: any two members' ratings side by side, with the score the list shows, moderators and admins only", async () => {
        await clear();
        const Review = require("../models/reviewModel");
        await Review.deleteMany({});
        const admin = await member(0, { role: "admin" });
        // Films 1 to 20, rated 1 to 5 in turn; and films 11 to 30, all at 3.
        const first = await member(20, { privacy: "private", resonance: false }, (index) => 1 + (index % 9) * 0.5);
        const second = await member(0);
        await FilmLog.insertMany(films(20, () => 3, (index) => ({ genres: ["Drama"], year: 2010 + index }), 11).map((entry) => ({ ...entry, user: second._id, status: "completed" })));
        const theirs = await Review.create({ user: second._id, tmdbId: 12, filmTitle: "Film 12", text: "Seen it." });

        const { status, body } = await call(admin, `/resonance/all/${first._id}/${second._id}`);
        assert.equal(status, 200);
        assert.equal(body.first.username, first.username);
        assert.equal(body.match.user.username, second.username);
        // The score the /SECRETresonance list shows for them.
        const listed = (await call(admin, `/resonance/all?member=${first._id}`)).body.pairs.find((entry) => entry.b.username === second.username);
        assert.equal(body.match.percent, listed.percent);
        assert.equal(body.match.sharedCount, 10);
        close(body.averages.mine, 2.825);
        close(body.averages.theirs, 3);
        assert.deepEqual(body.films.map((entry) => entry.tmdbId), [11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
        assert.deepEqual(body.films.find((entry) => entry.tmdbId === 12).theirs, { rating: 3, reviewId: String(theirs._id) });

        // The other way round: mine and theirs swap.
        const back = (await call(admin, `/resonance/all/${second._id}/${first._id}`)).body;
        assert.equal(back.first.username, second.username);
        assert.equal(back.match.percent, body.match.percent);
        assert.deepEqual(back.films.find((entry) => entry.tmdbId === 12).mine, { rating: 3, reviewId: String(theirs._id) });

        // Moderators too, and nobody else; no such pair is a 404.
        assert.equal((await call(await member(0, { role: "moderator" }), `/resonance/all/${first._id}/${second._id}`)).status, 200);
        assert.equal((await call(first, `/resonance/all/${first._id}/${second._id}`)).status, 403);
        assert.equal((await call(null, `/resonance/all/${first._id}/${second._id}`)).status, 401);
        assert.equal((await call(admin, `/resonance/all/${first._id}/${first._id}`)).status, 404);
        assert.equal((await call(admin, `/resonance/all/${first._id}/nonsense`)).status, 404);
        assert.equal((await call(admin, `/resonance/all/${first._id}/${new mongoose.Types.ObjectId()}`)).status, 404);
    });

    test("/SECRETresonance's Update Resonance now: moderators and admins store everyone's straight away", async () => {
        await clear();
        const moderator = await member(0, { role: "moderator" });
        const admin = await member(0, { role: "admin" });
        const a = await member();
        const b = await member();
        await member();

        // Nothing stored yet.
        assert.equal((await call(moderator, "/resonance/all")).body.updatedAt, null);
        assert.equal((await call(a, "/resonance/ranking")).body.matches.length, 0);

        // Members can't.
        assert.equal((await call(a, "/resonance/update", { method: "POST" })).status, 403);
        assert.equal((await call(null, "/resonance/update", { method: "POST" })).status, 401);
        assert.equal(await Resonance.countDocuments(), 0);

        const { status, body } = await call(moderator, "/resonance/update", { method: "POST" });
        assert.equal(status, 200);
        assert.equal(body.members, 3);
        assert.equal(body.pairs, 3);
        assert.equal(await Resonance.countDocuments(), 3);
        assert.equal((await call(a, "/resonance/ranking")).body.matches.length, 2);
        assert.equal((await call(moderator, "/resonance/all")).body.updatedAt, body.updatedAt);

        // Admins too, and it's a new sweep each time.
        const again = await call(admin, "/resonance/update", { method: "POST" });
        assert.equal(again.status, 200);
        assert.ok(again.body.updatedAt > body.updatedAt);
        assert.equal(await Resonance.countDocuments({ $or: [{ userA: b._id }, { userB: b._id }] }), 2);

        // Asked for while one is running (04:00's, say): it waits for that one.
        const { runSweep } = require("../jobs/resonanceSweep");
        const running = runSweep();
        assert.equal(runSweep(), running);
        assert.equal((await running).pairs, 3);
    });

    test("comparing ratings: every film both have rated, with both ratings and reviews, only for a match they may see", async () => {
        await clear();
        const Review = require("../models/reviewModel");
        await Review.deleteMany({});
        // Films 1 to 20, rated 1 to 5 in turn.
        const me = await member(20, {}, (index) => 1 + (index % 9) * 0.5);
        // Films 11 to 30, all at 3 but film 18 at 5, so 11 to 20 are shared,
        // and both rated 18 at 5. Film 5 watched but not rated, and film 6
        // only planned: neither counts.
        const other = await member(0);
        await FilmLog.insertMany([
            ...films(20, (index) => (index === 7 ? 5 : 3), undefined, 11).map((entry) => ({ ...entry, user: other._id, status: "completed" })),
            { ...film(5, null), user: other._id, status: "completed" },
            { ...film(6, null), user: other._id, status: "plan_to_watch" },
        ]);
        await pair(me, other, 90);
        const review = (user, tmdbId) => Review.create({ user: user._id, tmdbId, filmTitle: `Film ${tmdbId}`, text: "Seen it." });
        const [mine, theirs] = [await review(me, 12), await review(other, 12)];
        // Mine of a film they haven't rated isn't in it.
        await review(me, 1);

        const { status, body } = await call(me, `/resonance/with/${other._id}`);
        assert.equal(status, 200);
        assert.equal(body.match.user.username, other.username);
        assert.equal(body.match.percent, 90);
        assert.deepEqual(body.films.map((entry) => entry.tmdbId), [11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
        // Each one's average, of all their rated films (mine 56.5 / 20,
        // theirs 62 / 20), and each film's true difference: the two ratings
        // on the scale they share, and how alike that makes them, as the
        // Movies factor counts it.
        close(body.averages.mine, 2.825);
        close(body.averages.theirs, 3.1);
        const twelve = body.films.find((entry) => entry.tmdbId === 12);
        close(twelve.trueDifference, trueGap(2, 2.825, 3, 3.1));
        // On the shared scale (both averages at 2.9625): my 2 is
        // 0.5 + 1.5 × 2.4625 / 2.325, their 3 is 0.5 + 2.5 × 2.4625 / 2.6,
        // about 0.78 apart: 1 - (0.78 / 2)², 85%.
        close(twelve.trueDifference, 0.5 + (2.5 * 2.4625) / 2.6 - (0.5 + (1.5 * 2.4625) / 2.325));
        assert.equal(twelve.similarity, 85);
        assert.deepEqual(twelve, {
            tmdbId: 12,
            title: "Film 12",
            year: 2011,
            posterPath: null,
            mine: { rating: 2, reviewId: String(mine._id) },
            theirs: { rating: 3, reviewId: String(theirs._id) },
            trueDifference: twelve.trueDifference,
            similarity: twelve.similarity,
        });
        assert.deepEqual(body.films.find((entry) => entry.tmdbId === 13).theirs, { rating: 3, reviewId: null });
        // Both at 5: no gap, though their averages are apart.
        const eighteen = body.films.find((entry) => entry.tmdbId === 18);
        assert.deepEqual([eighteen.mine.rating, eighteen.theirs.rating, eighteen.trueDifference, eighteen.similarity], [5, 5, 0, 100]);

        // From their side, mine and theirs swap.
        const back = (await call(other, `/resonance/with/${me._id}`)).body;
        assert.deepEqual(back.films.find((entry) => entry.tmdbId === 12).mine, { rating: 3, reviewId: String(theirs._id) });
        assert.equal(back.films.find((entry) => entry.tmdbId === 12).similarity, twelve.similarity);

        // Only where the Resonance page would show them.
        await User.updateOne({ _id: other._id }, { privacy: "friends" });
        assert.equal((await call(me, `/resonance/with/${other._id}`)).status, 404);
        await befriend(me, other);
        assert.equal((await call(me, `/resonance/with/${other._id}`)).status, 200);
        await User.updateOne({ _id: other._id }, { privacy: "private" });
        const hidden = await call(me, `/resonance/with/${other._id}`);
        assert.equal(hidden.status, 404);
        assert.equal(hidden.body.error, "You have no Resonance with this member.");

        const stranger = await member();
        assert.equal((await call(me, `/resonance/with/${stranger._id}`)).status, 404);
        assert.equal((await call(me, `/resonance/with/${me._id}`)).status, 404);
        assert.equal((await call(me, "/resonance/with/nonsense")).status, 404);
        assert.equal((await call(null, `/resonance/with/${stranger._id}`)).status, 401);
    });

    test("comparing ratings: the genres both rated 2+ films in, each one's average star rating there from all their films, most films first", async () => {
        await clear();
        const me = await member(0);
        const other = await member(0);
        const admin = await member(0, { role: "admin" });
        const log = (user, tmdbId, rating, genres = []) => ({ ...film(tmdbId, rating, { genres }), user: user._id, status: "completed" });
        await FilmLog.insertMany([
            // Drama: 6 rated, 4 on average (films 3 to 6 only mine).
            ...[5, 4, 4, 3, 5, 3].map((rating, index) => log(me, 1 + index, rating, ["Drama"])),
            // Comedy: 4 of mine, but only 1 of theirs: left out.
            ...[2, 3, 2, 3].map((rating, index) => log(me, 7 + index, rating, ["Comedy"])),
            // Horror: only 1 of mine: left out.
            log(me, 11, 1, ["Horror"]),
            // Action (and Drama, for film 12): 2 each.
            log(me, 12, 4, ["Action", "Drama"]),
            log(me, 13, 5, ["Action"]),
            // No genre, to make 20.
            ...Array.from({ length: 7 }, (_, index) => log(me, 14 + index, 3)),
            // Theirs: Drama 3, 4 and 2 (film 50 only theirs), one Comedy, two Horror.
            log(other, 1, 3, ["Drama"]),
            log(other, 2, 4, ["Drama"]),
            log(other, 50, 2, ["Drama"]),
            log(other, 7, 5, ["Comedy"]),
            log(other, 11, 2, ["Horror"]),
            log(other, 51, 2, ["Horror"]),
            log(other, 12, 1, ["Action"]),
            log(other, 52, 2.5, ["Action"]),
            ...Array.from({ length: 12 }, (_, index) => log(other, 60 + index, 3)),
        ]);
        await pair(me, other, 70);

        const { status, body } = await call(me, `/resonance/with/${other._id}`);
        assert.equal(status, 200);
        assert.deepEqual(body.genres.map((entry) => entry.genre), ["Drama", "Action"]);
        const [drama, action] = body.genres;
        // Drama: mine 5, 4, 4, 3, 5, 3 and 4 (film 12): 28 / 7.
        close(drama.mine.average, 4);
        assert.equal(drama.mine.count, 7);
        close(drama.theirs.average, 3);
        assert.equal(drama.theirs.count, 3);
        assert.deepEqual(action, { genre: "Action", mine: { average: 4.5, count: 2 }, theirs: { average: 1.75, count: 2 } });

        // From their side, mine and theirs swap.
        const back = (await call(other, `/resonance/with/${me._id}`)).body;
        assert.deepEqual(back.genres.find((entry) => entry.genre === "Action"), { genre: "Action", mine: { average: 1.75, count: 2 }, theirs: { average: 4.5, count: 2 } });

        // /SECRETresonance's pair page has them too.
        assert.deepEqual((await call(admin, `/resonance/all/${me._id}/${other._id}`)).body.genres, body.genres);

        // The same rules as before: nothing for a member they may not see.
        await User.updateOne({ _id: other._id }, { privacy: "private" });
        assert.equal((await call(me, `/resonance/with/${other._id}`)).status, 404);
    });

    test("their matches are in their data download, and go with their account", async () => {
        await clear();
        const me = await member();
        const other = await member();
        const hidden = await member(20, { privacy: "private" });
        await pair(me, other, 88);
        await pair(me, hidden, 77);

        const download = (await call(me, "/users/me/export")).body;
        assert.deepEqual(download.resonance.map(({ member: name, percent }) => [name, percent]), [[other.username, 88]]);

        assert.equal((await call(me, "/users/me", { method: "DELETE" })).status, 200);
        assert.equal(await Resonance.countDocuments(), 0);
    });
});
