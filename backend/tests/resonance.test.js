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
    similarity,
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
const { resonanceTier } = require("../../shared/resonance.js");

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

    test("similarity is 1 for the same rating, 0 at 4.5 apart, and never below 0", () => {
        assert.equal(similarity(1.5, 1.5), 1);
        close(similarity(-1, 1.25), 0.5);
        assert.equal(similarity(-2.25, 2.25), 0);
        assert.equal(similarity(-3, 3), 0);
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

    test("a harsh and a generous rater with the same taste match in full", () => {
        const genres = (index) => ({ genres: [["Drama"], ["Comedy"], ["Horror"]][index % 3] });
        const generous = films(12, (index) => 2 + (index % 7) * 0.5, genres);
        const harsh = films(12, (index) => 0.5 + (index % 7) * 0.5, genres);
        const a = tasteOf(generous);
        const b = tasteOf(harsh);

        // 1.5 stars apart on every film, but the same above and below their usual.
        close(moviesFactor(a, b).factor, 1);
        close(genreRatingFactor(a, b), 1);
        assert.equal(resonanceBetween(a, b).movies, 100);
        assert.equal(resonanceBetween(a, b).genre, 100);
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
        const drama = similarity(5 - meanA, 1 - meanB);
        const comedy = similarity(3 - meanA, 3 - meanB);
        close(genreRatingFactor(a, b), (drama * 4 + comedy * 6) / 10);

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
        assert.deepEqual(resonanceTier(100), { key: "soul", label: "Soul Resonance", shown: 100 });
        assert.deepEqual(resonanceTier(80), { key: "soul", label: "Soul Resonance", shown: 80 });
        assert.deepEqual(resonanceTier(79), { key: "resonance", label: "Resonance", shown: 79 });
        assert.deepEqual(resonanceTier(50), { key: "resonance", label: "Resonance", shown: 50 });
        assert.deepEqual(resonanceTier(49), { key: "dissonance", label: "Dissonance", shown: 51 });
        assert.deepEqual(resonanceTier(40), { key: "dissonance", label: "Dissonance", shown: 60 });
        assert.deepEqual(resonanceTier(0), { key: "dissonance", label: "Dissonance", shown: 100 });
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

    test("the sweep stores each pair of members with 20+ rated films once, and removes pairs that no longer qualify", async () => {
        await clear();
        const a = await member();
        await member(20, {}, (index) => 1 + (index % 9) * 0.5);
        await member(25);
        const few = await member(19);
        // Resonance off and a private profile still count: they only hide.
        const off = await member(20, { resonance: false, privacy: "private" });

        assert.deepEqual(await store.recalculateResonance(), { members: 4, pairs: 6 });
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
        assert.deepEqual(await store.recalculateResonance(), { members: 4, pairs: 6 });
        assert.equal(await Resonance.countDocuments(), 6);

        // Down to 19 rated films: their pairs go at the next sweep.
        await FilmLog.updateOne({ user: a._id, tmdbId: 1 }, { $set: { rating: null } });
        assert.deepEqual(await store.recalculateResonance(), { members: 3, pairs: 3 });
        assert.equal(await Resonance.countDocuments({ $or: [{ userA: a._id }, { userB: a._id }] }), 0);
        assert.ok(await store.lastCalculatedAt());
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
        assert.deepEqual(Object.keys(first).sort(), ["genre", "movies", "percent", "relation", "sharedCount", "sharedFilms", "user"]);
        assert.deepEqual(Object.keys(first.user).sort(), ["_id", "avatarUrl", "reviewCardBanner", "username"]);
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

    test("/SECRETresonance: admins see every pair, worked out now, with 20+ or any rated films", async () => {
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

        // Nobody else.
        assert.equal((await call(few, "/resonance/all")).status, 403);
        assert.equal((await call(await member(20, { role: "moderator" }), "/resonance/all")).status, 403);
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
