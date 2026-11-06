// Cuts and comments: disliking a cut (its author's PvP has to come with it
// for the page to allow it), and editing cuts, their replies and review
// comments. Against a real MongoDB.
//
// From backend/, with a MongoDB running:
//   PowerShell:  $env:MONGO_TEST_URI="mongodb://127.0.0.1:27017/kino_test"; npm test
//   bash:        MONGO_TEST_URI=mongodb://127.0.0.1:27017/kino_test npm test
// The database is wiped first, so its name has to end in "_test".
const { test, describe, before, after } = require("node:test");
const assert = require("node:assert/strict");

process.env.SECRET ??= "cuts-test-secret";
const mongoose = require("mongoose");
const express = require("express");
const jwt = require("jsonwebtoken");

const uri = process.env.MONGO_TEST_URI;
const dbName = uri ? new URL(uri).pathname.slice(1) : "";

describe("cuts and comments", { skip: !uri ? "set MONGO_TEST_URI to run these" : !dbName.endsWith("_test") ? "MONGO_TEST_URI's database must end in _test" : false }, () => {
    let base;
    let server;
    let User;
    let Follow;
    let Review;
    const tokens = new Map();

    before(async () => {
        await mongoose.connect(uri);
        await mongoose.connection.dropDatabase();
        User = require("../models/userModel");
        Follow = require("../models/followModel");
        Review = require("../models/reviewModel");
        const models = [User, Follow, Review, require("../models/cutModel"), require("../models/commentModel"), require("../models/notificationModel")];
        await Promise.all(models.map((model) => model.syncIndexes()));

        const app = express();
        app.use(express.json());
        app.use("/api/cuts", require("../routes/cutRouter"));
        app.use("/api/comments", require("../routes/commentRouter"));
        app.use("/api/reviews", require("../routes/reviewRouter"));
        app.use("/api/feed", require("../routes/feedRouter"));
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
    async function member(extra = {}) {
        count += 1;
        const user = await User.create({ username: `cutter${count}`, email: `c${count}@test.invalid`, password: "x", ...extra });
        tokens.set(String(user._id), jwt.sign({ _id: user._id }, process.env.SECRET));
        return user;
    }
    async function call(user, method, path, body) {
        const response = await fetch(base + path, {
            method,
            headers: { "Content-Type": "application/json", ...(user ? { Authorization: `Bearer ${tokens.get(String(user._id))}` } : {}) },
            body: body === undefined ? undefined : JSON.stringify(body),
        });
        return { status: response.status, body: await response.json().catch(() => null) };
    }
    const postCut = async (user, text = "A take.") => (await call(user, "POST", "/cuts", { text })).body;

    test("a cut's author comes with their PvP, so a member with PvP on can dislike their cut", async () => {
        const [voter, fighter, pacifist] = [await member({ pvp: true }), await member({ pvp: true }), await member({ pvp: false })];
        await Follow.create([{ follower: voter._id, following: fighter._id }, { follower: voter._id, following: pacifist._id }]);
        const [fighting, peaceful] = [await postCut(fighter, "Fight me."), await postCut(pacifist, "Peace.")];

        // In Notifications, on the cut's own page, and in Show all cuts' shape.
        const feed = (await call(voter, "GET", "/feed?filter=cuts")).body.items;
        const authorOf = (cutId) => feed.find((item) => item.cut?._id === cutId).actors[0];
        assert.equal(authorOf(fighting._id).pvp, true);
        assert.equal(authorOf(peaceful._id).pvp, false);
        assert.equal((await call(voter, "GET", `/cuts/${fighting._id}`)).body.actors[0].pvp, true);

        const disliked = await call(voter, "PUT", `/cuts/${fighting._id}/vote`, { vote: "dislike" });
        assert.equal(disliked.status, 200);
        assert.deepEqual(disliked.body, { likeCount: 0, dislikeCount: 1, myVote: "dislike" });

        // The server still says no where PvP is off, on either side.
        const refused = await call(voter, "PUT", `/cuts/${peaceful._id}/vote`, { vote: "dislike" });
        assert.equal(refused.status, 403);
        assert.equal(refused.body.error, "This member has PVP turned off, so their cuts can't be disliked.");
        assert.equal((await call(pacifist, "PUT", `/cuts/${fighting._id}/vote`, { vote: "dislike" })).status, 403);
    });

    test("only a cut's author can edit it, 1 to 280 characters, and it says when", async () => {
        const [author, other, moderator] = [await member(), await member(), await member({ role: "moderator" })];
        const cut = await postCut(author, "First draft.");

        const edited = await call(author, "PATCH", `/cuts/${cut._id}`, { text: "  Second draft.  " });
        assert.equal(edited.status, 200);
        assert.equal(edited.body.text, "Second draft.");
        assert.ok(new Date(edited.body.editedAt) <= new Date());
        const shown = (await call(author, "GET", `/cuts/${cut._id}`)).body.cut;
        assert.deepEqual([shown.text, shown.editedAt], ["Second draft.", edited.body.editedAt]);

        // Not anyone else's, not even a moderator's (they can delete it).
        assert.equal((await call(other, "PATCH", `/cuts/${cut._id}`, { text: "Mine now." })).status, 403);
        assert.equal((await call(moderator, "PATCH", `/cuts/${cut._id}`, { text: "Tidied." })).status, 403);
        assert.equal((await call(author, "PATCH", `/cuts/${cut._id}`, { text: "   " })).status, 400);
        assert.equal((await call(author, "PATCH", `/cuts/${cut._id}`, { text: "x".repeat(281) })).status, 400);
        assert.equal((await call(author, "GET", `/cuts/${cut._id}`)).body.cut.text, "Second draft.");

        // Saved unchanged, a fresh cut isn't marked edited.
        const fresh = await postCut(author, "Untouched.");
        assert.equal((await call(author, "PATCH", `/cuts/${fresh._id}`, { text: "Untouched." })).body.editedAt, null);
        assert.equal((await call(author, "GET", `/cuts/${fresh._id}`)).body.cut.editedAt, null);

        await User.updateOne({ _id: author._id }, { $set: { "bans.cuts": true } });
        const banned = await call(author, "PATCH", `/cuts/${cut._id}`, { text: "Sneaky." });
        assert.deepEqual([banned.status, banned.body.error], [403, "You've been banned from posting cuts."]);

        assert.equal((await call(author, "PATCH", "/cuts/nonsense", { text: "Hi." })).status, 404);
        assert.equal((await call(null, "PATCH", `/cuts/${cut._id}`, { text: "Hi." })).status, 401);
    });

    test("only a comment's author can edit it, under a review or a cut", async () => {
        const [writer, commenter, other] = [await member(), await member(), await member()];
        const review = await Review.create({ user: writer._id, tmdbId: 777, filmTitle: "A Film", rating: 4, text: "Good." });
        const comment = (await call(commenter, "POST", `/reviews/${review._id}/comments`, { text: "Agreed." })).body;

        const edited = await call(commenter, "PATCH", `/comments/${comment._id}`, { text: "Mostly agreed." });
        assert.equal(edited.status, 200);
        assert.equal(edited.body.text, "Mostly agreed.");
        const listed = (await call(commenter, "GET", `/reviews/${review._id}/comments`)).body;
        assert.deepEqual([listed[0].text, listed[0].editedAt], ["Mostly agreed.", edited.body.editedAt]);

        assert.equal((await call(other, "PATCH", `/comments/${comment._id}`, { text: "Hijacked." })).status, 403);
        assert.equal((await call(writer, "PATCH", `/comments/${comment._id}`, { text: "Hijacked." })).status, 403);
        assert.equal((await call(commenter, "PATCH", `/comments/${comment._id}`, { text: "x".repeat(1001) })).status, 400);

        // Not while the review's comments are off.
        await Review.updateOne({ _id: review._id }, { $set: { allowComments: false } });
        const off = await call(commenter, "PATCH", `/comments/${comment._id}`, { text: "Hello?" });
        assert.deepEqual([off.status, off.body.error], [403, "Comments are turned off for this review."]);

        // A reply under a cut is a comment too.
        const cut = await postCut(writer);
        const reply = (await call(commenter, "POST", `/cuts/${cut._id}/replies`, { text: "Hot." })).body;
        assert.equal((await call(commenter, "PATCH", `/comments/${reply._id}`, { text: "Lukewarm." })).status, 200);
        assert.equal((await call(writer, "GET", `/cuts/${cut._id}/replies`)).body[0].text, "Lukewarm.");

        await User.updateOne({ _id: commenter._id }, { $set: { "bans.comments": true } });
        const banned = await call(commenter, "PATCH", `/comments/${reply._id}`, { text: "Cold." });
        assert.deepEqual([banned.status, banned.body.error], [403, "You've been banned from commenting."]);

        assert.equal((await call(commenter, "PATCH", "/comments/nonsense", { text: "Hi." })).status, 404);
        assert.equal((await call(null, "PATCH", `/comments/${reply._id}`, { text: "Hi." })).status, 401);
    });
});
