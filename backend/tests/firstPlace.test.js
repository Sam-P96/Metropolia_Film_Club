// First Place: who holds each title (#1 on the PP Leaderboard, the Critics
// Leaderboard and by level), and saving the name effect's settings.
// Against a real MongoDB.
//
// From backend/, with a MongoDB running:
//   PowerShell:  $env:MONGO_TEST_URI="mongodb://127.0.0.1:27017/kino_test"; npm test
//   bash:        MONGO_TEST_URI=mongodb://127.0.0.1:27017/kino_test npm test
// The database is wiped first, so its name has to end in "_test".
const { test, describe, before, beforeEach, after } = require("node:test");
const assert = require("node:assert/strict");

process.env.SECRET ??= "first-place-test-secret";
const mongoose = require("mongoose");
const express = require("express");
const jwt = require("jsonwebtoken");

const uri = process.env.MONGO_TEST_URI;
const dbName = uri ? new URL(uri).pathname.slice(1) : "";

describe("First Place", { skip: !uri ? "set MONGO_TEST_URI to run these" : !dbName.endsWith("_test") ? "MONGO_TEST_URI's database must end in _test" : false }, () => {
    let base;
    let server;
    let User;
    let Review;
    let firstPlace;
    const tokens = new Map();

    before(async () => {
        await mongoose.connect(uri);
        await mongoose.connection.dropDatabase();
        User = require("../models/userModel");
        Review = require("../models/reviewModel");
        firstPlace = require("../utils/firstPlace");
        await Promise.all([User, Review].map((model) => model.syncIndexes()));

        const app = express();
        app.use(express.json());
        app.use("/api/first-place", require("../routes/firstPlaceRouter"));
        await new Promise((resolve) => {
            server = app.listen(0, "127.0.0.1", resolve);
        });
        base = `http://127.0.0.1:${server.address().port}/api/first-place`;
    });

    after(async () => {
        server?.close();
        await mongoose.disconnect();
    });

    // Every test starts from nobody, so the rankings are only its own members.
    beforeEach(async () => {
        await Promise.all([User.deleteMany({}), Review.deleteMany({})]);
        firstPlace.forgetFirstPlaceHolders();
    });

    let count = 0;
    async function member({ pp = 0, ppp = 0, pvp = false } = {}) {
        count += 1;
        const user = await User.create({ username: `champ${count}`, email: `c${count}@test.invalid`, password: "x", pvp, wallet: { pp, ppp } });
        tokens.set(String(user._id), jwt.sign({ _id: user._id }, process.env.SECRET));
        return user;
    }
    // `reviews` reviews by `user`, with `likes` likes and `dislikes` dislikes between them.
    async function reviews(user, howMany, likes = 0, dislikes = 0) {
        for (let i = 0; i < howMany; i++) {
            await Review.create({
                user: user._id,
                tmdbId: 1000 + count * 100 + i,
                filmTitle: "A Film",
                rating: 4,
                text: "Good.",
                likeCount: i === 0 ? likes : 0,
                dislikeCount: i === 0 ? dislikes : 0,
            });
        }
    }
    const holders = () => {
        firstPlace.forgetFirstPlaceHolders();
        return firstPlace.getFirstPlaceHolders();
    };
    async function call(method, path = "", body, as) {
        const response = await fetch(base + path, {
            method,
            headers: { "Content-Type": "application/json", ...(as && { Authorization: `Bearer ${tokens.get(String(as._id))}` }) },
            body: body && JSON.stringify(body),
        });
        return { status: response.status, body: await response.json() };
    }
    const settingsOf = async (user) => (await User.findById(user._id).select("firstPlaceFx").lean()).firstPlaceFx;
    const custom = {
        enabled: true,
        stones: ["mind", "time"],
        order: ["reality", "soul", "mind", "time", "space", "power"],
        intervals: { power: 1, space: 2, time: 3.5, mind: 0.3, soul: 20, reality: 4 },
        random: false,
    };

    test("PP: a clear #1 holds it, PP and P-PP together; a tie for first, or nobody above 0, and nobody does", async () => {
        const rich = await member({ pp: 50, ppp: 60 });
        await member({ pp: 100 });
        assert.equal((await holders()).pp, String(rich._id));

        await User.updateOne({ username: "champ2" }, { $set: { "wallet.ppp": 10 } });
        assert.equal((await holders()).pp, null, "110 each: a tie");

        await User.updateMany({}, { $set: { "wallet.pp": 0, "wallet.ppp": 0 } });
        assert.equal((await holders()).pp, null, "everyone at 0");
    });

    test("Critic: the most likes on their reviews; a tie, and nobody", async () => {
        const [top, other] = [await member(), await member()];
        await reviews(top, 1, 9);
        await reviews(other, 3, 8);
        assert.equal((await holders()).critics, String(top._id));

        await Review.updateOne({ user: other._id, likeCount: 8 }, { $set: { likeCount: 9 } });
        assert.equal((await holders()).critics, null);
    });

    test("Controversial: the most dislikes, PVP on only; a tie, and nobody", async () => {
        const [villain, rival, hidden] = [await member({ pvp: true }), await member({ pvp: true }), await member({ pvp: false })];
        await reviews(villain, 1, 0, 7);
        await reviews(rival, 1, 0, 5);
        await reviews(hidden, 1, 0, 50);
        assert.equal((await holders()).controversial, String(villain._id), "PVP off is never on Controversial");

        await Review.updateOne({ user: rival._id }, { $set: { dislikeCount: 7 } });
        assert.equal((await holders()).controversial, null);

        // Independent of Top Critic: one title each.
        await Review.updateOne({ user: rival._id }, { $set: { dislikeCount: 1, likeCount: 9 } });
        const now = await holders();
        assert.deepEqual([now.controversial, now.critics], [String(villain._id), String(rival._id)]);
        const view = (await call("GET")).body;
        assert.deepEqual(view.titles.controversial, { userId: String(villain._id), username: villain.username, label: "#1 Controversial" });
    });

    test("Level: the highest, compared within the level too; only exactly equal ties", async () => {
        // 10 likes = 2 levels (120/60); 11 likes = 2 levels too (132/60), but further along.
        const [ahead, behind] = [await member(), await member()];
        await reviews(ahead, 1, 11);
        await reviews(behind, 1, 10);
        assert.equal((await holders()).level, String(ahead._id));

        await Review.updateOne({ user: behind._id }, { $set: { likeCount: 11 } });
        assert.equal((await holders()).level, null, "exactly level");

        // Level 0 isn't on the Level view, so it can't hold the title.
        await Review.updateMany({}, { $set: { likeCount: 2 } });
        await Review.updateOne({ user: ahead._id }, { $set: { likeCount: 4 } });
        assert.equal((await holders()).level, null);
    });

    test("the titles are independent, one member can hold several, and #2 behind them gets nothing", async () => {
        const [champ, second, critic] = [await member({ pp: 900 }), await member({ pp: 800 }), await member()];
        await reviews(champ, 1, 30);
        await reviews(second, 1, 20);
        await reviews(critic, 1, 5);
        assert.deepEqual(await holders(), { pp: String(champ._id), critics: String(champ._id), controversial: null, level: String(champ._id) });

        await Review.updateOne({ user: critic._id }, { $set: { likeCount: 40 } });
        const now = await holders();
        assert.deepEqual([now.pp, now.critics, now.level], [String(champ._id), String(critic._id), String(critic._id)]);

        // One effect, every title listed.
        await reviews(second, 0);
        const view = (await call("GET")).body;
        assert.deepEqual(view.titles.pp, { userId: String(champ._id), username: champ.username, label: "#1 PP" });
        assert.equal(view.titles.critics.userId, String(critic._id));
        assert.deepEqual(Object.keys(view.settings).sort(), [String(champ._id), String(critic._id)].sort());
        assert.equal(view.settings[String(second._id)], undefined, "settings only for holders");
    });

    test("a first-time holder gets the defaults: all six, in order, 2.8s, random on, effect on", async () => {
        const champ = await member({ pp: 10 });
        const view = (await call("GET")).body;
        assert.deepEqual(view.settings[String(champ._id)], {
            enabled: true,
            stones: ["power", "space", "time", "mind", "soul", "reality"],
            order: ["power", "space", "time", "mind", "soul", "reality"],
            intervals: { power: 2.8, space: 2.8, time: 2.8, mind: 2.8, soul: 2.8, reality: 2.8 },
            random: true,
        });
        assert.equal(await settingsOf(champ), undefined, "nothing stored until they save");
    });

    test("saved settings stay through losing every title, and come back with any title", async () => {
        const champ = await member({ pp: 100 });
        const saved = await call("PUT", "/settings", custom, champ);
        assert.equal(saved.status, 200, JSON.stringify(saved.body));
        assert.deepEqual(saved.body.settings.stones, ["time", "mind"]);

        // Someone overtakes them: no titles, settings kept, not shown.
        const rival = await member({ pp: 500 });
        firstPlace.forgetFirstPlaceHolders();
        let view = (await call("GET")).body;
        assert.equal(view.titles.pp.userId, String(rival._id));
        assert.equal(view.settings[String(champ._id)], undefined);
        assert.ok(await settingsOf(champ), "kept");
        assert.equal((await call("PUT", "/settings", custom, champ)).status, 403, "no title, no saving");

        // They win a different title back: the same settings.
        await reviews(champ, 1, 3);
        firstPlace.forgetFirstPlaceHolders();
        view = (await call("GET")).body;
        assert.equal(view.titles.critics.userId, String(champ._id));
        assert.deepEqual(view.settings[String(champ._id)], { ...custom, stones: ["time", "mind"] });
    });

    test("saving: only current holders, and anything invalid is refused", async () => {
        const champ = await member({ pp: 100 });
        const nobody = await member({ pp: 5 });
        assert.equal((await call("PUT", "/settings", custom, nobody)).status, 403);
        assert.equal((await call("PUT", "/settings", custom)).status, 401, "not logged in");

        const refused = [
            { ...custom, order: ["power", "space", "time", "mind", "soul"] },
            { ...custom, order: ["power", "power", "time", "mind", "soul", "reality"] },
            { ...custom, order: ["power", "space", "time", "mind", "soul", "gauntlet"] },
            { ...custom, stones: [] },
            { ...custom, stones: ["mind", "mind"] },
            { ...custom, stones: ["mind", "gauntlet"] },
            { ...custom, intervals: { ...custom.intervals, mind: 0.29 } },
            { ...custom, intervals: { ...custom.intervals, mind: 20.01 } },
            { ...custom, intervals: { ...custom.intervals, mind: "3" } },
            { ...custom, intervals: { power: 1, space: 2, time: 3, mind: 4, soul: 5 } },
            { ...custom, intervals: { ...custom.intervals, gauntlet: 3 } },
            { ...custom, enabled: "yes" },
            { ...custom, random: 1 },
        ];
        for (const body of refused) {
            const answer = await call("PUT", "/settings", body, champ);
            assert.equal(answer.status, 400, JSON.stringify(body));
        }
        assert.equal(await settingsOf(champ), undefined, "nothing saved");

        const off = await call("PUT", "/settings", { ...custom, enabled: false }, champ);
        assert.equal(off.status, 200);
        assert.equal((await settingsOf(champ)).enabled, false);
    });
});
