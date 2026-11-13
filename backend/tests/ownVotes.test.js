// Liking or disliking your own review doesn't count towards your level, the
// Critics Leaderboard (Top and Controversial) or First Place
// (utils/critics.js). Against a real MongoDB.
//
// From backend/, with a MongoDB running:
//   PowerShell:  $env:MONGO_TEST_URI="mongodb://127.0.0.1:27017/kino_test"; npm test
//   bash:        MONGO_TEST_URI=mongodb://127.0.0.1:27017/kino_test npm test
// The database is wiped first, so its name has to end in "_test".
const { test, describe, before, beforeEach, after } = require("node:test");
const assert = require("node:assert/strict");

const mongoose = require("mongoose");

const uri = process.env.MONGO_TEST_URI;
const dbName = uri ? new URL(uri).pathname.slice(1) : "";

describe("own votes don't count", { skip: !uri ? "set MONGO_TEST_URI to run these" : !dbName.endsWith("_test") ? "MONGO_TEST_URI's database must end in _test" : false }, () => {
    let User;
    let Review;
    let critics;
    let level;
    let firstPlace;

    before(async () => {
        await mongoose.connect(uri);
        await mongoose.connection.dropDatabase();
        User = require("../models/userModel");
        Review = require("../models/reviewModel");
        critics = require("../utils/critics");
        level = require("../utils/level");
        firstPlace = require("../utils/firstPlace");
        await Promise.all([User, Review].map((model) => model.syncIndexes()));
    });

    after(() => mongoose.disconnect());

    beforeEach(async () => {
        await Promise.all([User.deleteMany({}), Review.deleteMany({})]);
        firstPlace.forgetFirstPlaceHolders();
    });

    let count = 0;
    async function member(pvp = false) {
        count += 1;
        return User.create({ username: `voter${count}`, email: `v${count}@test.invalid`, password: "x", pvp });
    }
    // A review by `author` liked and disliked by those members, with counts
    // as castVote keeps them: every like counts, a dislike only from PVP on.
    async function review(author, { likedBy = [], dislikedBy = [] } = {}) {
        count += 1;
        return Review.create({
            user: author._id,
            tmdbId: count,
            filmTitle: "A Film",
            rating: 4,
            text: "Good.",
            likedBy: likedBy.map((voter) => voter._id),
            likeCount: likedBy.length,
            dislikedBy: dislikedBy.map((voter) => voter._id),
            dislikeCount: dislikedBy.filter((voter) => voter.pvp).length,
        });
    }
    const totalsOf = async (user) => (await critics.everyCritic()).find((row) => String(row._id) === String(user._id));

    test("your own like: not on Top Critics, not towards your level", async () => {
        const [author, fan, loner] = [await member(), await member(), await member()];
        await review(author, { likedBy: [author, fan] });
        await review(loner, { likedBy: [loner] });

        const top = await critics.rankCritics({ limit: 10 });
        assert.deepEqual(top.map((row) => [row.user[0].username, row.likes]), [[author.username, 1]], "only others' likes, and a lone own like isn't on it");

        // 10 others' likes = level 2 (120 + 3 from the review, /60); with the own like too it'd be no different
        // here, so use 9 others + own: 108 + 3 = 111 -> level 1, where counting the own like would make it 2.
        const many = await member();
        const fans = await Promise.all(Array.from({ length: 9 }, () => member()));
        await review(many, { likedBy: [many, ...fans] });
        const profile = await level.withStanding({ _id: many._id, pvp: false });
        assert.equal(profile.level, 1);
    });

    test("your own dislike: not on Controversial, not against your level, and only taken off where it counted", async () => {
        const [villain, critic, calm] = [await member(true), await member(true), await member(false)];
        await review(villain, { dislikedBy: [villain, critic] });
        assert.equal((await totalsOf(villain)).dislikes, 1, "PVP on: their own dislike had counted, and comes off");

        // PVP off: their own dislike never counted, so nothing comes off.
        await review(calm, { dislikedBy: [calm, critic] });
        assert.equal((await totalsOf(calm)).dislikes, 1);

        const controversial = await critics.rankCritics({ controversial: true, limit: 10 });
        assert.deepEqual(controversial.map((row) => [row.user[0].username, row.dislikes]), [[villain.username, 1]]);

        // Only their own dislike: they're not on Controversial at all.
        const selfOnly = await member(true);
        await review(selfOnly, { dislikedBy: [selfOnly] });
        assert.ok(!(await critics.rankCritics({ controversial: true, limit: 10 })).some((row) => String(row._id) === String(selfOnly._id)));

        // Against their level: 6 others' likes (72 + 3 = 75 -> 1); their own dislike would make it 75 - 20 = 55 -> 0.
        const fans = await Promise.all(Array.from({ length: 6 }, () => member()));
        const proud = await member(true);
        await review(proud, { likedBy: fans, dislikedBy: [proud] });
        assert.equal((await level.withStanding({ _id: proud._id, pvp: true })).level, 1);
    });

    test("First Place: an own like can't break a tie", async () => {
        const [a, b, fan1, fan2] = [await member(), await member(), await member(), await member()];
        await review(a, { likedBy: [a, fan1, fan2] });
        await review(b, { likedBy: [fan1, fan2] });
        assert.equal((await firstPlace.getFirstPlaceHolders()).critics, null, "2 others' likes each: a tie");
    });
});
