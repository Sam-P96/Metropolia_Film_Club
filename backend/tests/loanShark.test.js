// Loan Shark (utils/loanShark/): the sums and dates with no database, then
// the whole thing against a real MongoDB through its routes: shark loans,
// the 12:00 check (missed payments, Kaveri), jobs, and player loans.
//
// From backend/, with a MongoDB running (the sums run without one):
//   PowerShell:  $env:MONGO_TEST_URI="mongodb://127.0.0.1:27017/kino_test"; npm test
//   bash:        MONGO_TEST_URI=mongodb://127.0.0.1:27017/kino_test npm test
// The database is wiped first, so its name has to end in "_test".
const { test, describe, before, after } = require("node:test");
const assert = require("node:assert/strict");

const math = require("../utils/loanShark/math");
const { COLLECTOR_LINES, pickLine, fillLine } = require("../../shared/loanShark/lines.js");

describe("Loan Shark sums", () => {
    const shark = (fields) => ({ borrowed: 0, rate: 10, paid: 0, jobReduction: 0, credit: 0, paidUntil: null, firstDueAt: null, ...fields });

    test("owed is borrowed x (100 + rate)%, rounded up, less what's paid and what jobs took off", () => {
        assert.equal(math.sharkOwed(shark({ borrowed: 20, rate: 25 })), 25);
        assert.equal(math.sharkOwed(shark({ borrowed: 15, rate: 10 })), 17);
        assert.equal(math.sharkOwed(shark({ borrowed: 100, rate: 20, jobReduction: 20 })), 100);
        assert.equal(math.sharkOwed(shark({ borrowed: 100, rate: 20, jobReduction: 40 })), 80);
        assert.equal(math.sharkOwed(shark({ borrowed: 100, rate: 20, paid: 50, jobReduction: 80 })), 0);
        assert.equal(math.sharkOwed(shark({ borrowed: 0 })), 0);
    });

    test("the daily minimum is 5% of the borrowed, rounded up, or what's left", () => {
        assert.equal(math.sharkMinimum(shark({ borrowed: 100 })), 5);
        assert.equal(math.sharkMinimum(shark({ borrowed: 30 })), 2);
        assert.equal(math.sharkMinimum(shark({ borrowed: 100, paid: 107 })), 3);
    });

    test("a missed payment doubles the rate, up to 160%", () => {
        const rates = [10];
        for (let i = 0; i < 5; i++) rates.push(math.doubled(rates.at(-1)));
        assert.deepEqual(rates, [10, 20, 40, 80, 160, 160]);
    });

    test("12:00 in Helsinki, summer and winter", () => {
        assert.equal(math.noonOf("2026-11-06").toISOString(), "2026-11-06T10:00:00.000Z");
        assert.equal(math.noonOf("2026-07-01").toISOString(), "2026-07-01T09:00:00.000Z");
        assert.equal(math.addDays("2026-12-31", 1), "2027-01-01");
    });

    test("the first payment is due at the first 12:00 check at least 24 hours after borrowing", () => {
        // 11:00 in Helsinki: 11:00 the next day is before noon, so that noon.
        assert.equal(math.firstDueAt(new Date("2026-11-06T09:00:00Z")).toISOString(), "2026-11-07T10:00:00.000Z");
        // 13:00: past noon the next day, so the day after.
        assert.equal(math.firstDueAt(new Date("2026-11-06T11:00:00Z")).toISOString(), "2026-11-08T10:00:00.000Z");
        // Exactly noon: 24 hours later is that noon.
        assert.equal(math.firstDueAt(new Date("2026-11-06T10:00:00Z")).toISOString(), "2026-11-07T10:00:00.000Z");
    });

    test("the next check: today's until it's been, then tomorrow's, or past a test check", () => {
        const morning = new Date("2026-11-06T08:00:00Z");
        const afternoon = new Date("2026-11-06T11:00:00Z");
        assert.equal(math.nextCheckDay(morning, "2026-11-05"), "2026-11-06");
        assert.equal(math.nextCheckDay(afternoon, "2026-11-06"), "2026-11-07");
        assert.equal(math.nextCheckDay(afternoon, "2026-11-05"), "2026-11-06");
        assert.equal(math.nextCheckDay(afternoon, "2026-11-09"), "2026-11-10");
    });

    test("prepaying: minimum 20, paying 60 covers 3 checks; the rest is credit for the next", () => {
        const now = new Date("2026-11-06T11:00:00Z");
        const account = { lastCheckDay: "2026-11-06", shark: shark({ borrowed: 400, firstDueAt: math.noonOf("2026-11-08") }) };
        const three = math.coverage(account, 60, now);
        assert.equal(three.days, 3);
        assert.equal(three.credit, 0);
        assert.equal(three.paidUntil.toISOString(), math.noonOf("2026-11-10").toISOString());

        const one = math.coverage(account, 30, now);
        assert.deepEqual([one.days, one.credit], [1, 10]);
        const topUp = math.coverage({ ...account, shark: { ...account.shark, credit: 10, paidUntil: one.paidUntil } }, 10, now);
        assert.deepEqual([topUp.days, topUp.credit], [1, 0]);
        assert.equal(topUp.paidUntil.toISOString(), math.noonOf("2026-11-09").toISOString());

        assert.equal(math.coverage(account, 19, now).days, 0);
    });

    test("player repayments: principal first, then interest, 20% of the interest burned, however it's split", () => {
        const debt = { principal: 20, interest: 5, principalPaid: 0, interestPaid: 0, taxBurned: 0 };
        const first = math.debtRepayment(debt, 22);
        assert.deepEqual(first, { principal: 20, interest: 2, tax: 1, toLender: 21, paid: 22 });
        const second = math.debtRepayment({ ...debt, principalPaid: 20, interestPaid: 2, taxBurned: 1 }, 10);
        assert.deepEqual(second, { principal: 0, interest: 3, tax: 0, toLender: 3, paid: 3 });
        // In all: 1 tax, the same as on 5 interest paid at once.
        assert.equal(math.taxOn(5), 1);
    });

    test("the lending preview: 20 at 25% pays back 25, 5 profit, 1 tax, 4 kept", () => {
        assert.deepEqual(math.lendPreview(20, 25), { amount: 20, payBack: 25, profit: 5, tax: 1, keep: 4 });
    });

    test("lines: never the same twice in a row, with the numbers filled in", () => {
        let last = null;
        for (let i = 0; i < 200; i++) {
            const next = pickLine(COLLECTOR_LINES.length, last);
            assert.notEqual(next, last);
            assert.ok(next >= 0 && next < COLLECTOR_LINES.length);
            last = next;
        }
        assert.equal(fillLine(COLLECTOR_LINES[0], { amount: 16, left: 1232 }), "Kaveri arrived and took 16 PP. You still owe 1,232.");
    });
});

const uri = process.env.MONGO_TEST_URI;
const dbName = uri ? new URL(uri).pathname.slice(1) : "";

describe("Loan Shark against the database", { skip: !uri ? "set MONGO_TEST_URI to run these" : !dbName.endsWith("_test") ? "MONGO_TEST_URI's database must end in _test" : false }, () => {
    process.env.SECRET ??= "loan-shark-test-secret";
    const mongoose = require("mongoose");
    const express = require("express");
    const jwt = require("jsonwebtoken");

    let base;
    let server;
    let User, Review, Notification, LoanAccount, LoanJob, LoanOffer, PlayerDebt, LoanTx;
    let wallet, jobs, members;
    const tokens = new Map();
    const people = {};

    let count = 0;
    async function member(name, { reviews = 0, pvp = false, email = null, pp = 0, ppp = 0, recent = true } = {}) {
        count += 1;
        const user = await User.create({ username: name, email: email ?? `${name}@test.invalid`, password: "x", pvp });
        tokens.set(String(user._id), jwt.sign({ _id: user._id }, process.env.SECRET));
        await User.collection.updateOne({ _id: user._id }, { $set: { wallet: { pp, ppp, lastPayoutDay: null } } });
        if (reviews > 0) {
            const at = recent ? new Date() : new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
            await Review.collection.insertMany(
                Array.from({ length: reviews }, (_, index) => ({
                    user: user._id,
                    tmdbId: count * 1000 + index,
                    filmTitle: `Film ${count}-${index}`,
                    text: "Seen it.",
                    likeCount: 0,
                    dislikeCount: 0,
                    likedBy: [],
                    dislikedBy: [],
                    createdAt: at,
                    updatedAt: at,
                })),
            );
        }
        people[name] = user;
        return user;
    }

    async function call(user, method, path, body) {
        const response = await fetch(`${base}${path}`, {
            method,
            headers: { Authorization: `Bearer ${tokens.get(String(user._id))}`, ...(body ? { "Content-Type": "application/json" } : {}) },
            body: body ? JSON.stringify(body) : undefined,
        });
        return { status: response.status, body: await response.json().catch(() => null) };
    }
    const view = async (user) => (await call(user, "GET", "/loan-shark")).body;
    const walletOf = async (user) => (await User.findById(user._id).select("wallet").lean()).wallet;
    const setWallet = (user, pp, ppp) => User.collection.updateOne({ _id: user._id }, { $set: { "wallet.pp": pp, "wallet.ppp": ppp } });
    const notes = (user, type) => Notification.find({ recipient: user._id, type }).sort({ at: 1, _id: 1 }).lean();
    const reviewsOf = (user) => Review.countDocuments({ user: user._id });
    // The 12:00 payout for one member on `day`, loans and all.
    async function payout(user, day) {
        const locked = await require("../utils/loanShark/daily").lockedInOffers();
        return wallet.payMember(user._id, day, { reviews: await reviewsOf(user), locked: locked.get(String(user._id)) ?? 0 });
    }

    before(async () => {
        await mongoose.connect(uri);
        await mongoose.connection.dropDatabase();
        User = require("../models/userModel");
        Review = require("../models/reviewModel");
        Notification = require("../models/notificationModel");
        LoanAccount = require("../models/loanAccountModel");
        LoanJob = require("../models/loanJobModel");
        LoanOffer = require("../models/loanOfferModel");
        PlayerDebt = require("../models/playerDebtModel");
        LoanTx = require("../models/loanTxModel");
        wallet = require("../utils/wallet");
        jobs = require("../utils/loanShark/jobs");
        members = require("../utils/loanShark/members");
        await Promise.all([User, Review, Notification, LoanAccount, LoanJob, LoanOffer, PlayerDebt, LoanTx].map((model) => model.syncIndexes()));

        const app = express();
        app.use(express.json());
        app.use("/api/loan-shark/admin", require("../routes/loanSharkAdminRouter"));
        app.use("/api/loan-shark", require("../routes/loanSharkRouter"));
        app.use("/api/reviews", require("../routes/reviewRouter"));
        app.use((error, req, res, next) => {
            console.error(error);
            res.status(500).json({ error: "Something went wrong" });
        });
        server = app.listen(0);
        base = `http://127.0.0.1:${server.address().port}/api`;

        // The borrower: 40 reviews, so 40 PP a day (shark cap 200, player cap 80).
        await member("borrower", { reviews: 40 });
        await member("borrower2", { reviews: 40 });
        await member("lender", { reviews: 10, pp: 100 });
        await member("lender2", { reviews: 10, pp: 100 });
        await member("lender3", { reviews: 10, pp: 100 });
        // Quiet: few reviews, or none lately.
        await member("quietPvp", { reviews: 2, pvp: true });
        await member("quietNoPvp", { reviews: 0 });
        await member("oldTimer", { reviews: 30, pvp: true, recent: false });
        // Busy, with PvP on: a Y, never an X.
        await member("busyPvp", { reviews: 25, pvp: true });
        // A test account, never in a job.
        await member("testAccount", { reviews: 1, pvp: true, email: "XXX@xxx.com" });
        await member("newbie", { reviews: 0, pp: 50 });
    });

    after(async () => {
        server?.close();
        await mongoose.disconnect();
    });

    test("no reviews, no loans: from the shark or from members", async () => {
        const shark = await call(people.newbie, "POST", "/loan-shark/shark/borrow", { amount: 10 });
        assert.equal(shark.status, 403);
        assert.match(shark.body.error, /posted a review/);
        assert.equal((await view(people.newbie)).me.canBorrow, false);
    });

    test("shark loans: up to 5x daily PP, paid in P-PP, starting a loan with 4 jobs nobody excluded is in", async () => {
        const borrowed = await call(people.borrower, "POST", "/loan-shark/shark/borrow", { amount: 100 });
        assert.equal(borrowed.status, 200);
        const shark = borrowed.body.view.shark;
        assert.deepEqual([shark.borrowed, shark.rate, shark.owed, shark.minimum, shark.maxBorrow], [100, 10, 110, 5, 100]);
        assert.equal(shark.state, "covered");
        assert.deepEqual(await walletOf(people.borrower), { pp: 0, ppp: 100, lastPayoutDay: null });

        const tooMuch = await call(people.borrower, "POST", "/loan-shark/shark/borrow", { amount: 101 });
        assert.deepEqual([tooMuch.status, tooMuch.body.error], [400, "You can borrow 100 more P-PP at most."]);
        for (const amount of [0, -5, 2.5, "lots"]) {
            assert.equal((await call(people.borrower, "POST", "/loan-shark/shark/borrow", { amount })).status, 400, String(amount));
        }

        assert.equal(shark.jobs.length, 4);
        const banned = new Set([String(people.borrower._id), String(people.testAccount._id)]);
        for (const job of shark.jobs) {
            assert.ok(!banned.has(String(job.x._id)) && !(job.y && banned.has(String(job.y._id))), job.type);
            assert.notEqual(String(job.x._id), String(people.busyPvp._id), "busy members aren't X");
        }
        const log = await LoanTx.find({ user: people.borrower._id }).lean();
        assert.deepEqual(log.map((entry) => [entry.kind, entry.amount]), [["sharkBorrow", 100]]);
    });

    test("jobs only ever pick fitting members: quiet X, PvP where it's needed, never the borrower or a test account", async () => {
        const pools = await jobs.candidates(people.borrower._id);
        const quiet = new Set(pools.reviewFirst.map((member) => String(member._id)));
        assert.ok(quiet.has(String(people.oldTimer._id)), "30 reviews, none lately: quiet");
        assert.ok(quiet.has(String(people.lender._id)), "10 reviews: quiet");
        assert.ok(!quiet.has(String(people.busyPvp._id)), "25 reviews, busy: not quiet");
        assert.ok(!quiet.has(String(people.testAccount._id)));
        assert.ok(!pools.reviewAll.some((member) => String(member._id) === String(people.borrower._id)), "never the borrower");

        const loans = Array.from({ length: 25 }, () => new mongoose.Types.ObjectId());
        for (const loan of loans) {
            const made = await jobs.generateJobs(people.borrower._id, loan);
            assert.equal(made.length, 4);
            // With quiet members about, every X is one.
            for (const job of made) assert.ok(quiet.has(String(job.x)), job.type);
        }
        assert.deepEqual(await jobs.generateJobs(people.borrower._id, loans[0]), [], "once per loan");

        const pvp = new Set([people.quietPvp, people.oldTimer, people.busyPvp].map((user) => String(user._id)));
        const needPvp = await LoanJob.find({ type: { $in: ["dislike", "steal"] } }).lean();
        assert.ok(needPvp.length > 0);
        for (const job of needPvp) {
            assert.ok(pvp.has(String(job.x)) && pvp.has(String(job.y)) && String(job.x) !== String(job.y), job.type);
        }
        await LoanJob.deleteMany({ loan: { $in: loans } });
    });

    test("paying back: PP first, then P-PP; whole minimums cover checks, the rest is credit", async () => {
        await setWallet(people.borrower, 7, 100);
        const paid = await call(people.borrower, "POST", "/loan-shark/shark/pay", { amount: 12 });
        assert.equal(paid.status, 200);
        assert.deepEqual(await walletOf(people.borrower), { pp: 0, ppp: 95, lastPayoutDay: null });
        const shark = paid.body.view.shark;
        assert.deepEqual([shark.owed, shark.credit, paid.body.done.days], [98, 2, 2]);
        const firstDue = math.noonOf(new Date(shark.firstDueAt).toLocaleDateString("en-CA", { timeZone: "Europe/Helsinki" }));
        assert.equal(new Date(shark.paidUntil).getTime(), firstDue.getTime() + 24 * 60 * 60 * 1000);
        // Countdown: until the first check not paid for, two after the first due.
        assert.equal(new Date(shark.leavesAloneUntil).getTime(), firstDue.getTime() + 2 * 24 * 60 * 60 * 1000);

        const broke = await call(people.borrower, "POST", "/loan-shark/shark/pay", { amount: 96 });
        assert.equal(broke.status, 400);
        assert.match(broke.body.error, /You need 96 points/);
    });

    test("the 12:00 check: covered checks are fine, each missed one doubles the rate to 160%, then Kaveri takes 40% of the daily PP", async () => {
        const account = await LoanAccount.findById(people.borrower._id).lean();
        const firstDue = new Date(account.shark.firstDueAt).toLocaleDateString("en-CA", { timeZone: "Europe/Helsinki" });
        const before = math.addDays(firstDue, -1);

        // Not due yet, then the two covered checks.
        for (const day of [before, firstDue, math.addDays(firstDue, 1)]) {
            const result = await payout(people.borrower, day);
            assert.deepEqual([result.deducted, result.credited, result.loans.missed], [0, 40, false], day);
        }
        let shark = (await view(people.borrower)).shark;
        assert.equal(shark.rate, 10);

        // Four missed: 20, 40, 80, 160. Kaveri comes with the fourth.
        const rates = [];
        for (let i = 2; i <= 5; i++) {
            // Room under the PP cap again for Kaveri's day.
            if (i === 5) await setWallet(people.borrower, 0, 95);
            const result = await payout(people.borrower, math.addDays(firstDue, i));
            rates.push(result.loans.rate);
            if (i < 5) assert.equal(result.deducted, 0);
            else assert.deepEqual([result.deducted, result.loans.collector, result.credited], [16, 16, 24]);
        }
        assert.deepEqual(rates, [20, 40, 80, 160]);
        shark = (await view(people.borrower)).shark;
        // 100 at 160% = 260, less 12 paid and Kaveri's 16.
        assert.deepEqual([shark.state, shark.owed, shark.warnings.collector], ["collector", 232, true]);
        assert.equal((await notes(people.borrower, "loanMissed")).length, 4);

        const kaveri = await notes(people.borrower, "loanCollector");
        assert.equal(kaveri.length, 1);
        assert.deepEqual([kaveri[0].amount, kaveri[0].loan.left], [16, 232]);
        assert.ok(Number.isInteger(kaveri[0].variant));

        // The next day: a different line.
        await payout(people.borrower, math.addDays(firstDue, 6));
        const both = await notes(people.borrower, "loanCollector");
        assert.notEqual(both[1].variant, both[0].variant);

        // A day is only ever paid once.
        assert.equal(await payout(people.borrower, math.addDays(firstDue, 6)), null);
        assert.equal(await payout(people.borrower, math.addDays(firstDue, 3)), null);

        const log = await LoanTx.find({ user: people.borrower._id, kind: { $in: ["sharkMissed", "sharkCollector"] } }).sort({ at: 1, _id: 1 }).lean();
        assert.deepEqual(log.map((entry) => entry.kind), ["sharkMissed", "sharkMissed", "sharkMissed", "sharkMissed", "sharkCollector", "sharkCollector"]);
    });

    test("paying it all off ends the loan: the rate, credit and timer reset, and the jobs close", async () => {
        const owed = (await view(people.borrower)).shark.owed;
        await setWallet(people.borrower, 0, owed + 5);
        const paid = await call(people.borrower, "POST", "/loan-shark/shark/pay", { amount: owed + 50 });
        assert.equal(paid.status, 200);
        assert.deepEqual([paid.body.done.paid, paid.body.done.cleared], [owed, true]);
        assert.equal((await walletOf(people.borrower)).ppp, 5);
        const shark = paid.body.view.shark;
        assert.deepEqual([shark.state, shark.borrowed, shark.rate, shark.jobs.length], ["clear", 0, 10, 0]);
        assert.equal(await LoanJob.countDocuments({ borrower: people.borrower._id, status: "open" }), 0);
        const nothing = await call(people.borrower, "POST", "/loan-shark/shark/pay", { amount: 5 });
        assert.match(nothing.body.error, /don't owe King Loan Shark/);
    });

    test("jobs: each done takes 20% of the borrowed (then) off, when it happens, and a job's dislike comes off after 48 hours", async () => {
        const borrowed = await call(people.borrower, "POST", "/loan-shark/shark/borrow", { amount: 100 });
        const loan = (await LoanAccount.findById(people.borrower._id).lean()).shark.loan;
        assert.equal(borrowed.body.view.shark.jobs.length, 4, "a new loan, four new jobs");
        await LoanJob.deleteMany({ borrower: people.borrower._id, loan });

        const target = await Review.findOne({ user: people.busyPvp._id }).lean();
        const [reviewJob, dislikeJob, stealJob] = await LoanJob.insertMany([
            { borrower: people.borrower._id, loan, type: "review", x: people.quietNoPvp._id },
            { borrower: people.borrower._id, loan, type: "dislike", x: people.quietPvp._id, y: people.busyPvp._id, review: target._id, filmTitle: target.filmTitle },
            { borrower: people.borrower._id, loan, type: "steal", x: people.quietPvp._id, y: people.busyPvp._id },
        ]);

        // Someone else posting a review does nothing; X posting one does.
        await jobs.onReviewPosted(people.lender._id);
        assert.equal((await LoanJob.findById(reviewJob._id).lean()).status, "open");
        await Review.create({ user: people.quietNoPvp._id, tmdbId: 777, filmTitle: "Jaws", text: "Big fish." });
        await jobs.onReviewPosted(people.quietNoPvp._id);
        let shark = (await view(people.borrower)).shark;
        assert.deepEqual([shark.owed, shark.jobReduction], [90, 20]);
        const done = await notes(people.borrower, "loanJob");
        assert.deepEqual([done.length, done[0].amount, done[0].loan.left, String(done[0].actors[0])], [1, 20, 90, String(people.quietNoPvp._id)]);

        // The dislike, through the real vote route.
        const vote = await call(people.quietPvp, "PUT", `/reviews/${target._id}/vote`, { vote: "dislike" });
        assert.equal(vote.status, 200);
        const dislike = await LoanJob.findById(dislikeJob._id).lean();
        assert.equal(dislike.status, "done");
        assert.ok(Math.abs(dislike.undoDislikeAt - Date.now() - 48 * 60 * 60 * 1000) < 60 * 1000);
        assert.equal((await Review.findById(target._id).lean()).dislikeCount, 1);
        assert.equal(await jobs.undoJobDislikes(new Date()), 0, "not yet");
        assert.equal(await jobs.undoJobDislikes(new Date(Date.now() + 49 * 60 * 60 * 1000)), 1);
        assert.equal((await Review.findById(target._id).lean()).dislikeCount, 0);
        assert.equal(await Notification.countDocuments({ type: "dislike", review: target._id }), 0);

        // Borrowing more later: the next job is worth 20% of the new total,
        // and the ones done before stay as they were.
        await call(people.borrower, "POST", "/loan-shark/shark/borrow", { amount: 50 });
        await jobs.onStealSuccess(people.busyPvp._id, people.quietPvp._id);
        assert.equal((await LoanJob.findById(stealJob._id).lean()).status, "open", "the wrong way round");
        await jobs.onStealSuccess(people.quietPvp._id, people.busyPvp._id);
        shark = (await view(people.borrower)).shark;
        // 150 at 10% = 165, less 20 + 20 + 30.
        assert.deepEqual([shark.owed, shark.jobReduction], [95, 70]);
        assert.deepEqual((await LoanJob.find({ borrower: people.borrower._id, loan }).sort({ createdAt: 1, _id: 1 }).lean()).map((job) => job.reduction), [20, 20, 30]);
    });

    test("player offers: lent from PP, at most 3 up, and taking one down gives back what nobody borrowed", async () => {
        const posted = [];
        for (const [style, amount, rate] of [["fixed", 30, 25], ["flexible", 40, 10], ["fixed", 20, 0]]) {
            const result = await call(people.lender, "POST", "/loan-shark/offers", { style, amount, rate });
            assert.equal(result.status, 201, style);
            posted.push(result.body.done);
        }
        assert.equal((await walletOf(people.lender)).pp, 10);
        const fourth = await call(people.lender, "POST", "/loan-shark/offers", { style: "fixed", amount: 20, rate: 5 });
        assert.match(fourth.body.error, /3 offers up at once/);

        for (const body of [{ style: "fixed", amount: 19, rate: 5 }, { style: "both", amount: 30, rate: 5 }, { style: "fixed", amount: 30, rate: 101 }, { style: "fixed", amount: 30, rate: 2.5 }]) {
            assert.equal((await call(people.lender2, "POST", "/loan-shark/offers", body)).status, 400, JSON.stringify(body));
        }
        const poor = await call(people.newbie, "POST", "/loan-shark/offers", { style: "fixed", amount: 60, rate: 5 });
        assert.match(poor.body.error, /You have 50 PP to lend/);

        const down = await call(people.lender, "DELETE", `/loan-shark/offers/${posted[2]._id}`);
        assert.deepEqual([down.status, down.body.done.returned], [200, 20]);
        assert.equal((await walletOf(people.lender)).pp, 30);
        assert.equal((await call(people.lender, "DELETE", `/loan-shark/offers/${posted[2]._id}`)).status, 404);
        assert.equal((await call(people.lender2, "DELETE", `/loan-shark/offers/${posted[0]._id}`)).status, 404, "not theirs");
    });

    test("borrowing from members: exact for Fixed, 20+ for Flexible, within 2 lenders and 2x daily PP, interest per draw", async () => {
        const offers = await LoanOffer.find({ lender: people.lender._id, status: "active" }).lean();
        const fixed = offers.find((offer) => offer.style === "fixed");
        const flexible = offers.find((offer) => offer.style === "flexible");

        assert.match((await call(people.lender, "POST", `/loan-shark/offers/${fixed._id}/borrow`, {})).body.error, /your own offer/);
        assert.equal((await call(people.newbie, "POST", `/loan-shark/offers/${fixed._id}/borrow`, {})).status, 403);

        const took = await call(people.borrower2, "POST", `/loan-shark/offers/${fixed._id}/borrow`, { amount: 5 });
        assert.equal(took.status, 200);
        assert.deepEqual([took.body.done.amount, took.body.done.interest], [30, 8]);
        assert.equal((await walletOf(people.borrower2)).pp, 30);
        assert.equal((await LoanOffer.findById(fixed._id).lean()).closedReason, "taken");
        assert.equal((await call(people.borrower, "POST", `/loan-shark/offers/${fixed._id}/borrow`, {})).status, 404, "gone");

        assert.match((await call(people.borrower2, "POST", `/loan-shark/offers/${flexible._id}/borrow`, { amount: 10 })).body.error, /at least 20/);
        const draw = await call(people.borrower2, "POST", `/loan-shark/offers/${flexible._id}/borrow`, { amount: 20 });
        assert.deepEqual([draw.status, draw.body.done.owed], [200, 60]);
        assert.equal((await PlayerDebt.countDocuments({ borrower: people.borrower2._id, status: "active" })), 1, "one debt per lender");

        // 60 owed of 80: another 22 would pass the cap.
        const capped = await call(people.borrower2, "POST", `/loan-shark/offers/${flexible._id}/borrow`, { amount: 20 });
        assert.match(capped.body.error, /You can owe 80 PP across player loans/);

        await call(people.lender2, "POST", "/loan-shark/offers", { style: "flexible", amount: 50, rate: 0 });
        await call(people.lender3, "POST", "/loan-shark/offers", { style: "fixed", amount: 20, rate: 0 });
        const [second] = await LoanOffer.find({ lender: people.lender2._id, status: "active" }).lean();
        const [third] = await LoanOffer.find({ lender: people.lender3._id, status: "active" }).lean();
        assert.equal((await call(people.borrower2, "POST", `/loan-shark/offers/${second._id}/borrow`, { amount: 20 })).status, 200);
        assert.match((await call(people.borrower2, "POST", `/loan-shark/offers/${third._id}/borrow`, {})).body.error, /already owe 2 members/);

        const mine = (await view(people.borrower2)).player;
        assert.deepEqual([mine.owed, mine.lenders, mine.borrowing.length], [80, 2, 2]);
        const theirs = (await view(people.lender)).player;
        assert.deepEqual(theirs.lending.borrowers.map((debt) => debt.owed), [60]);
        assert.equal((await notes(people.lender, "loanBorrowed")).length, 2);
    });

    test("12:00: 10% of the daily PP to each lender, principal first, 20% of interest burned, and both told", async () => {
        const day = wallet.helsinkiDay();
        const result = await payout(people.borrower2, day);
        // 40 a day: 4 to each lender, 32 kept.
        assert.deepEqual([result.deducted, result.loans.toLenders, result.credited], [8, 8, 32]);
        assert.equal((await walletOf(people.lender)).ppp, 4);
        assert.equal((await walletOf(people.lender2)).ppp, 4);
        const told = await notes(people.borrower2, "loanRepay");
        assert.deepEqual(told.map((note) => [note.amount, note.loan.left, note.loan.auto]), [[4, 56, true], [4, 16, true]]);
        assert.equal((await notes(people.lender, "loanRepaid"))[0].amount, 4);
        assert.equal(await payout(people.borrower2, day), null, "once a day");

        // Paying the first lender off: 56 left, 46 principal and all 10 of
        // the interest, 2 of that tax: 54 to the lender.
        const debt = await PlayerDebt.findOne({ borrower: people.borrower2._id, lender: people.lender._id, status: "active" }).lean();
        await setWallet(people.borrower2, 50, 10);
        const paid = await call(people.borrower2, "POST", `/loan-shark/debts/${debt._id}/pay`);
        assert.deepEqual([paid.status, paid.body.done.paid], [200, 56]);
        assert.deepEqual([(await walletOf(people.borrower2)).pp, (await walletOf(people.borrower2)).ppp], [0, 4]);
        assert.equal((await walletOf(people.lender)).ppp, 4 + 54);
        const closed = await PlayerDebt.findById(debt._id).lean();
        assert.deepEqual([closed.status, closed.taxBurned, closed.interestPaid], ["paid", 2, 10]);
        const mine = (await view(people.borrower2)).player;
        assert.deepEqual([mine.owed, mine.lenders], [16, 1]);

        const log = await LoanTx.find({ user: people.borrower2._id, kind: "playerRepay" }).sort({ at: 1, _id: 1 }).lean();
        assert.deepEqual(log.map((entry) => [entry.amount, entry.tax, entry.toLender, entry.auto]), [[4, 0, 4, true], [4, 0, 4, true], [56, 2, 54, false]]);
    });

    test("the payout: PP up in offers still counts towards the cap", async () => {
        // The lender: 10 reviews, so 10 a day and 30 at most. 5 PP, and 20
        // still up in their Flexible offer: room for 5 more.
        await setWallet(people.lender, 5, (await walletOf(people.lender)).ppp);
        const result = await payout(people.lender, wallet.helsinkiDay());
        assert.equal(result.credited, 5);
        assert.equal((await walletOf(people.lender)).pp, 10);
    });

    test("an admin's test check runs the next 12:00 check now, and the real one never pays that day again", async () => {
        const first = await members.testCheck(people.borrower2._id);
        const paidDay = (await walletOf(people.borrower2)).lastPayoutDay;
        assert.equal(first.day, paidDay);
        assert.ok(first.day > wallet.helsinkiDay(), "today was already paid, so tomorrow's");
        assert.equal(await payout(people.borrower2, first.day), null);
    });

    test("double clicks and two tabs: never past a cap, never paid twice", async () => {
        // 10 reviews: the shark lends 50 at most.
        const quick = await member("quick", { reviews: 10 });
        const borrows = await Promise.all(Array.from({ length: 8 }, () => call(quick, "POST", "/loan-shark/shark/borrow", { amount: 10 })));
        assert.equal(borrows.filter((result) => result.status === 200).length, 5);
        assert.equal((await LoanAccount.findById(quick._id).lean()).shark.borrowed, 50);
        assert.equal((await walletOf(quick)).ppp, 50);

        // Paying the 55 owed from two tabs at once: only one of them can.
        await setWallet(quick, 5, 50);
        const pays = await Promise.all([1, 2].map(() => call(quick, "POST", "/loan-shark/shark/pay", { amount: 55 })));
        assert.deepEqual(pays.map((result) => result.status).sort(), [200, 400]);
        assert.equal((await walletOf(quick)).ppp, 0);

        // One offer, taken down twice at once: the PP comes back once.
        await setWallet(people.lender3, 40, 0);
        const posted = await call(people.lender3, "POST", "/loan-shark/offers", { style: "fixed", amount: 40, rate: 5 });
        const downs = await Promise.all([1, 2].map(() => call(people.lender3, "DELETE", `/loan-shark/offers/${posted.body.done._id}`)));
        assert.deepEqual(downs.map((result) => result.status).sort(), [200, 404]);
        assert.equal((await walletOf(people.lender3)).pp, 40);

        // A Fixed offer two borrowers grab at once: one gets it.
        const grab = await call(people.lender3, "POST", "/loan-shark/offers", { style: "fixed", amount: 20, rate: 0 });
        const takes = await Promise.all([quick, people.borrower].map((user) => call(user, "POST", `/loan-shark/offers/${grab.body.done._id}/borrow`, {})));
        assert.deepEqual(takes.map((result) => result.status).sort(), [200, 409]);
        const owedNow = (await LoanAccount.find({ _id: { $in: [quick._id, people.borrower._id] } }).lean()).map((account) => account.player.owed);
        assert.deepEqual(owedNow.sort((a, b) => a - b), [0, 20]);
    });

    test("the development button: admins only; Kaveri comes now, from the wallet, a new line each time, no payout day used", async () => {
        // 10 reviews: Kaveri takes 4 (40% of 10, rounded up).
        const dev = await member("devAdmin", { reviews: 10 });
        assert.equal((await call(dev, "POST", "/loan-shark/test/collector")).status, 403, "not an admin yet");
        await User.updateOne({ _id: dev._id }, { $set: { role: "admin" } });
        assert.match((await call(dev, "POST", "/loan-shark/test/collector")).body.error, /Take a loan first/);

        await call(dev, "POST", "/loan-shark/shark/borrow", { amount: 20 });
        await setWallet(dev, 3, 10);
        const first = await call(dev, "POST", "/loan-shark/test/collector");
        assert.equal(first.status, 200);
        // 20 at 160% = 52, less Kaveri's 4: 3 PP first, then 1 P-PP.
        assert.deepEqual(first.body.done, { take: 4, left: 48, cleared: false, rate: 160 });
        assert.deepEqual(await walletOf(dev), { pp: 0, ppp: 9, lastPayoutDay: null });
        assert.deepEqual([first.body.view.shark.state, first.body.view.shark.owed], ["collector", 48]);

        const second = await call(dev, "POST", "/loan-shark/test/collector");
        assert.equal(second.body.done.left, 44);
        const visits = await notes(dev, "loanCollector");
        assert.deepEqual(visits.map((note) => [note.amount, note.loan.left]), [[4, 48], [4, 44]]);
        assert.notEqual(visits[0].variant, visits[1].variant);
        assert.equal(await LoanTx.countDocuments({ user: dev._id, kind: "devRate" }), 1, "the rate jumps once");
        assert.equal(await LoanTx.countDocuments({ user: dev._id, kind: "sharkCollector" }), 2);

        // The last of it: his cleared line, and the loan ends.
        await setWallet(dev, 0, 100);
        await call(dev, "POST", "/loan-shark/shark/pay", { amount: 42 });
        const last = await call(dev, "POST", "/loan-shark/test/collector");
        assert.deepEqual(last.body.done, { take: 2, left: 0, cleared: true, rate: null });
        assert.equal(last.body.view.shark.state, "clear");
        const cleared = (await notes(dev, "loanCollector")).at(-1);
        assert.deepEqual([cleared.amount, cleared.loan.cleared, cleared.variant], [2, true, null]);
    });

    describe("/SECRETloanshark: the job lists", () => {
        let admin;
        const ids = (entries) => entries.map((entry) => String(entry.user?._id ?? entry._id));
        const lists = async () => (await call(admin, "GET", "/loan-shark/admin/lists")).body;
        const add = (list, user) => call(admin, "POST", `/loan-shark/admin/lists/${list}`, { userId: String(user._id) });
        const remove = (list, user) => call(admin, "DELETE", `/loan-shark/admin/lists/${list}/${user._id}`);
        const pick = (pools, type, times = 40) => Promise.all(Array.from({ length: times }, () => jobs.pickJob(type, pools, Math.random)));

        before(async () => {
            admin = await member("listAdmin", { reviews: 30, email: "list-admin@test.invalid" });
            await User.updateOne({ _id: admin._id }, { $set: { role: "admin" } });
        });

        test("non-admins get 403 on every admin route", async () => {
            const someone = people.borrower;
            for (const [method, path, body] of [
                ["GET", "/loan-shark/admin/lists"],
                ["GET", "/loan-shark/admin/search?q=a"],
                ["POST", "/loan-shark/admin/lists/protected", { userId: String(people.quietPvp._id) }],
                ["DELETE", `/loan-shark/admin/lists/protected/${people.quietPvp._id}`],
            ]) {
                const result = await call(someone, method, path, body);
                assert.equal(result.status, 403, `${method} ${path}`);
            }
            assert.equal(await mongoose.connection.collection("loanjoblists").countDocuments(), 0);
        });

        test("a hand-added active member can be X for dislike and steal; review X is quiet members first", async () => {
            // busyPvp: 25 reviews, busy, PvP on: not quiet, so not on the Persuasion List.
            assert.ok(!ids((await lists()).persuasion).includes(String(people.busyPvp._id)));
            const added = await add("persuasion", people.busyPvp);
            assert.equal(added.status, 201);
            const row = added.body.persuasion.find((entry) => String(entry.user._id) === String(people.busyPvp._id));
            assert.equal(row.tag, "hand");

            const pools = await jobs.candidates(people.borrower._id);
            assert.ok(ids(pools.persuasion).includes(String(people.busyPvp._id)));
            const steals = await pick({ ...pools, persuasion: pools.persuasion.filter((entry) => String(entry._id) === String(people.busyPvp._id)) }, "steal", 5);
            assert.ok(steals.every((job) => String(job.x) === String(people.busyPvp._id)));
            // Review jobs: busy members aren't X while anyone's quiet.
            assert.ok(!ids(pools.reviewFirst).includes(String(people.busyPvp._id)));
            assert.ok((await pick(pools, "review")).every((job) => ids(pools.reviewFirst).includes(String(job.x))));
        });

        test("review jobs: with nobody quiet, anyone not protected, PvP or not", async () => {
            const pools = await jobs.candidates(people.borrower._id);
            const fallback = { ...pools, reviewFirst: [] };
            const picked = new Set((await pick(fallback, "review", 200)).map((job) => String(job.x)));
            // borrower2: 40 reviews and busy, PvP off.
            assert.ok(ids(pools.reviewAll).includes(String(people.borrower2._id)));
            assert.ok([...picked].every((id) => ids(pools.reviewAll).includes(id)));
            assert.ok(picked.size > 1);
            assert.equal(await jobs.pickJob("review", { ...pools, reviewFirst: [], reviewAll: [] }, Math.random), null);
        });

        test("a protected quiet member is never X, but can still be Y", async () => {
            assert.equal((await add("protected", people.quietPvp)).status, 201);
            const pools = await jobs.candidates(people.borrower._id);
            const protectedId = String(people.quietPvp._id);
            for (const pool of [pools.reviewFirst, pools.reviewAll, pools.persuasion]) assert.ok(!ids(pool).includes(protectedId));
            assert.ok(ids(pools.targets).includes(protectedId));

            const made = [];
            for (let i = 0; i < 20; i++) made.push(...(await jobs.generateJobs(people.borrower._id, new mongoose.Types.ObjectId())));
            assert.ok(made.every((job) => String(job.x) !== protectedId));
            await LoanJob.deleteMany({ _id: { $in: made.map((job) => job._id) } });

            const page = await lists();
            assert.ok(ids(page.protected).includes(protectedId));
            assert.equal(page.protected[0].addedBy.username, "listAdmin");
            assert.ok(page.targets.find((entry) => String(entry.user._id) === protectedId).protected);
            assert.ok(!ids(page.persuasion).includes(protectedId) && !ids(page.reviewPersuasion).includes(protectedId));
        });

        test("one hand-kept list each: adding to one takes them off the other", async () => {
            const LoanJobList = require("../models/loanJobListModel");
            await add("persuasion", people.oldTimer);
            await add("protected", people.oldTimer);
            assert.deepEqual((await LoanJobList.find({ user: people.oldTimer._id }).lean()).map((entry) => entry.list), ["protected"]);
            let page = await lists();
            assert.ok(ids(page.protected).includes(String(people.oldTimer._id)) && !ids(page.persuasion).includes(String(people.oldTimer._id)));

            await add("persuasion", people.oldTimer);
            assert.deepEqual((await LoanJobList.find({ user: people.oldTimer._id }).lean()).map((entry) => entry.list), ["persuasion"]);
            page = await lists();
            assert.ok(!ids(page.protected).includes(String(people.oldTimer._id)));

            // Removing a quiet member's hand-added entry: still on the list, as auto.
            assert.equal((await remove("persuasion", people.oldTimer)).status, 200);
            page = await lists();
            assert.equal(page.persuasion.find((entry) => String(entry.user._id) === String(people.oldTimer._id)).tag, "auto");
            assert.equal((await remove("persuasion", people.oldTimer)).status, 404, "not on it any more");

            // Bad list names and members.
            assert.equal((await call(admin, "POST", "/loan-shark/admin/lists/targets", { userId: String(people.oldTimer._id) })).status, 404);
            assert.equal((await call(admin, "POST", "/loan-shark/admin/lists/protected", { userId: "nope" })).status, 400);
            assert.equal((await call(admin, "POST", "/loan-shark/admin/lists/protected", { userId: String(new mongoose.Types.ObjectId()) })).status, 404);
        });

        test("excluded emails never appear in a list, a search, or a job", async () => {
            const page = await lists();
            const hidden = String(people.testAccount._id);
            for (const column of [page.persuasion, page.reviewPersuasion, page.protected, page.targets]) assert.ok(!ids(column).includes(hidden));
            assert.ok(page.hidden >= 1);
            assert.deepEqual((await call(admin, "GET", "/loan-shark/admin/search?q=testAccount")).body, []);
            assert.match((await add("protected", people.testAccount)).body.error, /excluded in config/);
            assert.equal(await LoanJob.countDocuments({ $or: [{ x: people.testAccount._id }, { y: people.testAccount._id }] }), 0);

            const found = (await call(admin, "GET", "/loan-shark/admin/search?q=QUIET")).body;
            assert.deepEqual(found.map((entry) => [entry.user.username, entry.list]), [["quietNoPvp", null], ["quietPvp", "protected"]]);
        });

        test("leaving the club takes them off the lists", async () => {
            const LoanJobList = require("../models/loanJobListModel");
            const leaver = await member("listLeaver", { reviews: 1 });
            await add("protected", leaver);
            await members.forgetLoanMember(leaver._id);
            assert.equal(await LoanJobList.countDocuments({ user: leaver._id }), 0);
            await LoanJobList.deleteMany({});
        });
    });

    test("leaving the club: their offers come down, and what's owed to or by them is let go", async () => {
        await members.forgetLoanMember(people.lender2._id);
        assert.equal(await LoanOffer.countDocuments({ lender: people.lender2._id, status: "active" }), 0);
        assert.equal(await PlayerDebt.countDocuments({ lender: people.lender2._id, status: "active" }), 0);
        const mine = (await view(people.borrower2)).player;
        assert.deepEqual([mine.owed, mine.lenders, mine.borrowing.length], [0, 0, 0]);
    });
});
