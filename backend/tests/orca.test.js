// Lord Gang Orca: his clock, begging, questions, the secret threshold,
// favours and their hooks, the sweep, and the admins' tools.
//
// From backend/, with a MongoDB running:
//   bash: MONGO_TEST_URI=mongodb://127.0.0.1:27017/kino_test npm test
// The database is wiped first, so its name has to end in "_test".
const { test, describe, before, after } = require("node:test");
const assert = require("node:assert/strict");

process.env.SECRET ??= "orca-test-secret";

const clock = require("../utils/orca/clock");
const SCRIPTS = require("../data/lordGangOrcaScripts");

describe("his clock and his words", () => {
    test("open Monday to Friday from 16:00 to midnight; closed mornings and weekends", () => {
        assert.equal(clock.isOpen({ weekday: 1, hour: 16 }), true);
        assert.equal(clock.isOpen({ weekday: 5, hour: 23 }), true);
        assert.equal(clock.isOpen({ weekday: 3, hour: 15 }), false);
        assert.equal(clock.isOpen({ weekday: 6, hour: 18 }), false);
        assert.equal(clock.isOpen({ weekday: 0, hour: 20 }), false);
    });

    test("the next 00:00 in Helsinki, summer and winter", () => {
        assert.equal(clock.nextMidnight(new Date("2026-11-17T12:00:00Z")).toISOString(), "2026-11-17T22:00:00.000Z");
        assert.equal(clock.nextMidnight(new Date("2026-07-01T12:00:00Z")).toISOString(), "2026-07-01T21:00:00.000Z");
        assert.equal(clock.helsinkiWeekday(new Date("2026-11-17T12:00:00Z")), 2, "a Tuesday");
    });

    test("every closed day has its story, every question its answer among its options", () => {
        for (const key of [1, 2, 3, 4, 5, "weekend"]) assert.ok(SCRIPTS.closed[key].steps.length > 2);
        assert.equal(SCRIPTS.questions.length, 20);
        for (const q of SCRIPTS.questions) assert.ok(q.options.includes(q.correct), q.question);
    });
});

const uri = process.env.MONGO_TEST_URI;
const dbName = uri ? new URL(uri).pathname.slice(1) : "";

describe("against the database", { skip: !uri ? "set MONGO_TEST_URI to run these" : !dbName.endsWith("_test") ? "MONGO_TEST_URI's database must end in _test" : false }, () => {
    const mongoose = require("mongoose");
    const express = require("express");
    const jwt = require("jsonwebtoken");
    let User;
    let Review;
    let OrcaPlayer;
    let OrcaJob;
    let orca;
    let jobs;
    let server;
    let base;

    before(async () => {
        await mongoose.connect(uri);
        await mongoose.connection.dropDatabase();
        User = require("../models/userModel");
        Review = require("../models/reviewModel");
        OrcaPlayer = require("../models/orcaPlayerModel");
        OrcaJob = require("../models/orcaJobModel");
        orca = require("../utils/orca/player");
        jobs = require("../utils/orca/jobs");
        await Promise.all([OrcaPlayer, OrcaJob, Review].map((model) => model.syncIndexes()));
        const app = express();
        app.use(express.json());
        app.use("/api/orca", require("../routes/orcaRouter"));
        await new Promise((resolve) => {
            server = app.listen(0, "127.0.0.1", resolve);
        });
        base = `http://127.0.0.1:${server.address().port}/api/orca`;
    });
    after(async () => {
        server?.close();
        await mongoose.disconnect();
    });

    let count = 0;
    let tmdb = 1;
    async function member({ reviews = 20, pp = 0, ppp = 0, pvp = false, role = "user" } = {}) {
        count += 1;
        const user = await User.create({ username: `goon${count}`, email: `orca${count}@test.invalid`, password: "x", wallet: { pp, ppp }, pvp, role });
        if (reviews > 0) {
            await Review.collection.insertMany(
                Array.from({ length: reviews }, (_, i) => ({ user: user._id, tmdbId: tmdb++, filmTitle: `Film ${i}`, text: "Seen it.", rating: 4, likedBy: [], dislikedBy: [], likeCount: 0, dislikeCount: 0, createdAt: new Date() }))
            );
        }
        return user;
    }
    const walletOf = async (user) => (await User.findById(user._id).select("wallet").lean()).wallet;
    // An open Tuesday evening for this member.
    const openUp = (user) => orca.debug(user._id, "clock", { weekday: 2, hour: 18 });

    test("begging: 10% of daily PP (rounded up) in PP, an hour apart, three a day; nothing without a review", async () => {
        const kid = await member({ reviews: 23 });
        await openUp(kid);
        const first = await orca.beg(kid._id, { random: () => 0.5 });
        assert.deepEqual(first.paid, { pp: 3, ppp: 0 }, "10% of 23, rounded up");
        assert.equal(first.steps[0].speaker, "orca");
        assert.ok(SCRIPTS.lines.beg.includes(first.steps[0].text));

        const again = await orca.beg(kid._id, { random: () => 0.5 });
        assert.ok(SCRIPTS.lines.cooldown.includes(again.steps[0].text));
        assert.ok(again.cooldownUntil > new Date());

        await orca.debug(kid._id, "skipCooldown");
        await orca.beg(kid._id, { random: () => 0.5 });
        await orca.debug(kid._id, "skipCooldown");
        await orca.beg(kid._id, { random: () => 0.5 });
        await orca.debug(kid._id, "skipCooldown");
        const fourth = await orca.beg(kid._id, { random: () => 0.5 });
        assert.ok(SCRIPTS.lines.dailyLimit.includes(fourth.steps[0].text));
        assert.equal((await walletOf(kid)).pp, 9);

        const nobody = await member({ reviews: 0 });
        await openUp(nobody);
        assert.equal((await orca.beg(nobody._id)).steps[0].text, SCRIPTS.lines.noReviews[0]);
    });

    test("closed hours: no begging, and the day's story", async () => {
        const kid = await member();
        await orca.debug(kid._id, "clock", { weekday: 6, hour: 18 });
        await assert.rejects(orca.beg(kid._id), /not in/);
        const status = await orca.statusOf(kid._id);
        assert.deepEqual([status.open, status.speaker, status.story], [false, "kaveri", "The Double Agent"]);
        await orca.debug(kid._id, "clock", { weekday: 3, hour: 9 });
        const wednesday = await orca.statusOf(kid._id);
        assert.deepEqual([wednesday.speaker, wednesday.story], ["dolphine", "Meeting the Partners"]);
    });

    test("the PP cap: a beg never takes PP past it", async () => {
        const kid = await member({ reviews: 10, pp: 29 });
        await openUp(kid);
        const begged = await orca.beg(kid._id, { random: () => 0.5 });
        assert.deepEqual(begged.paid, { pp: 1, ppp: 0 }, "cap 30: only 1 more fits");
    });

    test("a question: asked again until answered, never with its answer; right pays PP and the same in P-PP", async () => {
        const kid = await member({ reviews: 20 });
        await openUp(kid);
        await orca.debug(kid._id, "forceQuestion");
        const asked = await orca.beg(kid._id);
        assert.ok(asked.question && asked.question.options.length === 3);
        assert.equal(JSON.stringify(asked).includes("correct"), false, "the answer stays on the server");
        const status = await orca.statusOf(kid._id);
        assert.deepEqual(status.question, asked.question, "the same question after a refresh");
        assert.deepEqual((await orca.beg(kid._id)).question, asked.question, "no rerolling by begging again");

        const q = SCRIPTS.questions.find((entry) => entry.question === asked.question.question);
        const result = await orca.answer(kid._id, q.correct);
        assert.equal(result.right, true);
        assert.deepEqual(result.paid, { pp: 2, ppp: 2 });
        assert.equal(result.steps[0].text, q.right);
        await assert.rejects(orca.answer(kid._id, q.correct), /hasn't asked/);
        assert.equal((await OrcaPlayer.findOne({ user: kid._id }).lean()).begs, 1, "it used a beg");
    });

    test("the secret threshold: favour mode, four jobs from the right lists, and no more begging", async () => {
        const kid = await member({ reviews: 20 });
        // Quiet members (few reviews): the Persuasion List. Some with PvP on.
        const quiet = [await member({ reviews: 1, pvp: true }), await member({ reviews: 1, pvp: true }), await member({ reviews: 2 })];
        await member({ reviews: 30, pvp: true });
        await member({ reviews: 30, pvp: true });
        await openUp(kid);
        await OrcaPlayer.updateOne({ user: kid._id }, { $set: { threshold: 150, built: 140 } });
        const begged = await orca.beg(kid._id, { random: () => 0.5 });
        assert.equal(begged.steps[1].text, SCRIPTS.lines.favourStart[0]);

        const dealt = await OrcaJob.find({ player: kid._id }).lean();
        assert.equal(dealt.length, 4);
        // The Persuasion List as /SECRETloanshark has it (these quiet members
        // are on it, with any from earlier tests).
        const lists = await require("../utils/loanShark/jobLists").jobLists({ borrowerId: kid._id });
        const persuasion = new Set(lists.persuasion.map((entry) => String(entry._id)));
        for (const user of quiet) assert.ok(persuasion.has(String(user._id)));
        for (const job of dealt) {
            assert.ok(persuasion.has(String(job.x)), "X from the Persuasion List");
            assert.notEqual(String(job.x), String(kid._id));
            if (job.y) assert.notEqual(String(job.y), String(job.x));
            if (job.type === "dislike") assert.equal((await User.findById(job.y).select("pvp").lean()).pvp, true, "Y on the Target List (PvP on)");
        }
        const counts = new Map();
        for (const job of dealt) counts.set(String(job.x), (counts.get(String(job.x)) ?? 0) + 1);
        assert.ok([...counts.values()].every((n) => n <= 2), "the same X at most twice");

        await orca.debug(kid._id, "skipCooldown");
        const refused = await orca.beg(kid._id);
        assert.ok(SCRIPTS.lines.favourMode.includes(refused.steps[0].text));
        const status = await orca.statusOf(kid._id);
        assert.deepEqual([status.favour.on, status.favour.done, status.favour.jobs.length], [true, 0, 4]);
        assert.equal("threshold" in status, false);
    });

    test("jobs complete by their hooks, count across days, and three end favour mode with a new threshold", async () => {
        const kid = await member({ reviews: 20 });
        const x = await member({ reviews: 1, pvp: true });
        const y = await member({ reviews: 5, pvp: true });
        const yReview = await Review.findOne({ user: y._id }).lean();
        await OrcaPlayer.updateOne({ user: kid._id }, { $set: { threshold: 200, "favour.on": true, "favour.jobsDay": "x" } }, { upsert: true });
        await OrcaJob.deleteMany({ player: kid._id });
        const now = new Date(Date.now() - 1000);
        const expiresAt = clock.nextMidnight(new Date());
        const day = clock.today(new Date());
        const make = (job) => OrcaJob.create({ player: kid._id, day, createdAt: now, expiresAt, x: x._id, ...job });
        await make({ type: "review" });
        await make({ type: "like", y: y._id, review: yReview._id, filmTitle: yReview.filmTitle });
        await make({ type: "challenge", y: y._id });
        await make({ type: "dislike", y: y._id, review: yReview._id, filmTitle: yReview.filmTitle });
        await OrcaPlayer.updateOne({ user: kid._id }, { $set: { "favour.jobsDay": day } });

        await jobs.onReviewPosted(x._id);
        let player = await OrcaPlayer.findOne({ user: kid._id }).lean();
        assert.deepEqual([player.favour.done, player.news], [1, ["jobDone"]]);

        const finish = await jobs.beforeVote(yReview._id, x._id, "like");
        assert.ok(finish, "the like would finish a job");
        await Review.updateOne({ _id: yReview._id }, { $addToSet: { likedBy: x._id } });
        await finish();
        assert.equal((await OrcaPlayer.findOne({ user: kid._id }).lean()).favour.done, 2);

        // A game X challenged Y to, finished.
        await jobs.onGameFinished({ challenger: x._id, status: "over", createdAt: new Date(), players: [{ user: y._id }, { user: x._id }] });
        player = await OrcaPlayer.findOne({ user: kid._id }).lean();
        assert.equal(player.favour.on, false, "three done: favour mode over");
        assert.equal(player.built, 0);
        assert.ok(player.threshold >= 150 && player.threshold <= 300);
        assert.ok(player.news.includes("allDone"));
        assert.equal((await OrcaJob.findOne({ player: kid._id, type: "dislike" }).lean()).status, "cancelled", "what's left is cancelled");

        const status = await orca.statusOf(kid._id, { takeNews: true });
        assert.deepEqual(status.news.map((step) => step.text), [SCRIPTS.lines.jobDone[0], SCRIPTS.lines.jobDone[0], SCRIPTS.lines.jobDone[0], SCRIPTS.lines.allDone[0]]);
        assert.equal((await orca.statusOf(kid._id, { takeNews: true })).news.length, 0, "shown once");
    });

    test("a challenge sent before the job was made doesn't count; nor does a job past 00:00", async () => {
        const kid = await member();
        const x = await member({ reviews: 1 });
        const y = await member();
        await OrcaPlayer.create({ user: kid._id, threshold: 200, favour: { on: true, done: 0, jobsDay: "x" } });
        const job = await OrcaJob.create({ player: kid._id, day: "x", type: "challenge", x: x._id, y: y._id, createdAt: new Date(), expiresAt: new Date(Date.now() + 60000) });
        await jobs.onGameFinished({ challenger: x._id, status: "over", createdAt: new Date(Date.now() - 3600000), players: [{ user: x._id }, { user: y._id }] });
        assert.equal((await OrcaJob.findById(job._id).lean()).status, "open", "the challenge came first");
        await OrcaJob.updateOne({ _id: job._id }, { $set: { expiresAt: new Date(Date.now() - 1) } });
        await jobs.sweep(new Date());
        assert.equal((await OrcaJob.findById(job._id).lean()).status, "expired");
        assert.ok((await OrcaJob.countDocuments({ player: kid._id, status: "open" })) >= 0, "and a new day's jobs are dealt");
    });

    test("a job's dislike comes off 48 hours later", async () => {
        const kid = await member();
        const x = await member({ reviews: 1, pvp: true });
        const y = await member({ pvp: true });
        const review = await Review.findOne({ user: y._id }).lean();
        await Review.updateOne({ _id: review._id }, { $addToSet: { dislikedBy: x._id }, $inc: { dislikeCount: 1 } });
        await OrcaJob.create({ player: kid._id, day: "x", type: "dislike", x: x._id, y: y._id, review: review._id, status: "done", expiresAt: new Date(), undoDislikeAt: new Date(Date.now() - 1) });
        assert.equal(await jobs.undoJobDislikes(new Date()), 1);
        const after = await Review.findById(review._id).select("+dislikedBy").lean();
        assert.equal(after.dislikedBy.length, 0);
    });

    test("the routes: the testing tools are admins' only", async () => {
        const kid = await member();
        const admin = await member({ role: "admin" });
        const call = (user, method, path, body) =>
            fetch(base + path, {
                method,
                headers: { Authorization: `Bearer ${jwt.sign({ _id: user._id }, process.env.SECRET)}`, "Content-Type": "application/json" },
                body: body ? JSON.stringify(body) : undefined,
            }).then(async (res) => ({ status: res.status, body: await res.json() }));
        const mine = await call(kid, "GET", "/");
        assert.equal(mine.status, 200);
        assert.equal("debug" in mine.body, false);
        assert.equal((await call(kid, "POST", "/debug", { action: "forceFavour" })).status, 403);
        assert.equal("debug" in (await call(admin, "GET", "/")).body, false, "not on the page, even for admins");
        const theirs = await call(admin, "POST", "/debug", { action: "clock", weekday: 1, hour: 20 });
        assert.equal(theirs.status, 200);
        assert.equal(theirs.body.open, true);
        assert.deepEqual(theirs.body.debug.fakeClock, { weekday: 1, hour: 20 });
        assert.equal((await call(kid, "GET", "/summary")).status, 200);
    });
});
