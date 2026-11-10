// Steal and Defend against a real MongoDB, through its routes: PvP and
// classes, who can attack whom, a whole attack with its quiz, success,
// failure, debt and the freeze, simultaneous attacks, timing out, the
// shop, equipping, taking steals back, trades, the market, gifts, bans and
// flags. TMDB is stubbed out, and the rolls are fixed.
//
// From backend/, with a MongoDB running:
//   PowerShell:  $env:MONGO_TEST_URI="mongodb://127.0.0.1:27017/kino_test"; npm test
//   bash:        MONGO_TEST_URI=mongodb://127.0.0.1:27017/kino_test npm test
// The database is wiped first, so its name has to end in "_test".
const { test, describe, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");

process.env.SECRET ??= "steal-test-secret";
const mongoose = require("mongoose");
const express = require("express");
const jwt = require("jsonwebtoken");

const uri = process.env.MONGO_TEST_URI;
const dbName = uri ? new URL(uri).pathname.slice(1) : "";
const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;

describe("Steal and Defend, end to end", { skip: !uri ? "set MONGO_TEST_URI to run these" : !dbName.endsWith("_test") ? "MONGO_TEST_URI's database must end in _test" : false }, () => {
    let base;
    let server;
    let User, Review, Follow, Notification, StealPlayer, StealItem, StealAttack, StealListing, StealTrade, StealFlag, WalletTx;
    let attacks, inventory, wallet, rules;
    const tokens = new Map();
    let count = 0;

    before(async () => {
        require("../services/tmdbService").getMovie = async () => null;
        await mongoose.connect(uri);
        await mongoose.connection.dropDatabase();

        User = require("../models/userModel");
        Review = require("../models/reviewModel");
        Follow = require("../models/followModel");
        Notification = require("../models/notificationModel");
        StealPlayer = require("../models/stealPlayerModel");
        StealItem = require("../models/stealItemModel");
        StealAttack = require("../models/stealAttackModel");
        StealListing = require("../models/stealListingModel");
        StealTrade = require("../models/stealTradeModel");
        StealFlag = require("../models/stealFlagModel");
        WalletTx = require("../models/walletTxModel");
        const others = ["GameBan", "DeviceSighting", "StealMarket"].map((name) => require(`../models/${{ GameBan: "gameBanModel", DeviceSighting: "deviceSightingModel", StealMarket: "stealMarketModel" }[name]}`));
        await Promise.all([User, Review, Follow, Notification, StealPlayer, StealItem, StealAttack, StealListing, StealTrade, StealFlag, WalletTx, ...others].map((model) => model.syncIndexes()));

        attacks = require("../utils/steal/attacks");
        inventory = require("../utils/steal/inventory");
        wallet = require("../utils/wallet");
        rules = require("../games/steal/rules");
        require("../utils/steal/tx").useTransactions(false);

        const app = express();
        app.use(express.json());
        app.use("/api/steal", require("../routes/stealRouter"));
        app.use("/api/users", require("../routes/userRouter"));
        app.use((error, req, res, next) => {
            console.error(error);
            res.status(500).json({ error: "Something went wrong" });
        });
        server = app.listen(0);
        base = `http://127.0.0.1:${server.address().port}/api`;
    });

    after(async () => {
        attacks?.useRandomSource(null);
        server?.close();
        await mongoose.connection.dropDatabase().catch(() => {});
        await mongoose.disconnect();
    });

    // Every roll comes out 50: a success whenever the chance is over 50%,
    // and no crit, Neuralyzer or fizzle (those need a roll under 5 or 20).
    beforeEach(() => attacks.useRandomSource((max) => Math.min(50, max - 1)));

    // A member: `days` old, with a wallet, some reviews, PVP on or off, and
    // a class (Warrior is everyone's to start with).
    async function member({ role = "user", days = 30, pp = 0, ppp = 0, reviews = 0, pvp = true, playerClass = "mage" } = {}) {
        count += 1;
        const user = await User.create({ username: `thief${count}`, email: `t${count}@test.invalid`, password: "x", role, pvp });
        // Straight to the driver: Mongoose won't change a createdAt (joinedAt).
        await User.collection.updateOne(
            { _id: user._id },
            { $set: { joinedAt: new Date(Date.now() - days * DAY), wallet: { pp, ppp, lastPayoutDay: null, frozenUntil: null } } }
        );
        for (let i = 0; i < reviews; i++) {
            await Review.create({ user: user._id, tmdbId: count * 100 + i, filmTitle: `Film ${count}-${i}`, rating: 3, text: "Fine.", genres: ["Drama"], filmYear: 2000 + i });
        }
        if (playerClass !== "warrior") await StealPlayer.create({ _id: user._id, playerClass });
        tokens.set(String(user._id), jwt.sign({ _id: user._id }, process.env.SECRET));
        return user;
    }

    async function follow(follower, following, hoursAgo = 100) {
        await Follow.create({ follower: follower._id, following: following._id });
        await Follow.collection.updateOne({ follower: follower._id, following: following._id }, { $set: { createdAt: new Date(Date.now() - hoursAgo * HOUR) } });
    }

    async function call(user, method, path, body) {
        const response = await fetch(`${base}${path}`, {
            method,
            headers: { Authorization: `Bearer ${tokens.get(String(user._id))}`, ...(body ? { "Content-Type": "application/json" } : {}) },
            body: body ? JSON.stringify(body) : undefined,
        });
        return { status: response.status, body: await response.json().catch(() => null) };
    }

    const walletOf = async (user) => (await User.findById(user._id).select("wallet").lean()).wallet;

    const rightAnswer = (question) =>
        question.input === "choice" ? question.answer.choice : question.input === "number" ? String(question.answer.number) : question.answer.accepted[0];

    // Answers every question, right or wrong, skipping each countdown.
    async function playQuiz(attacker, attackId, right = true) {
        for (let guard = 0; guard < 30; guard++) {
            const attack = await StealAttack.findById(attackId).lean();
            if (attack.status !== "quiz") return attack;
            await StealAttack.updateOne({ _id: attackId }, { $set: { opensAt: new Date(Date.now() - 500) } });
            const question = attack.questions[attack.current];
            const answer = right ? rightAnswer(question) : "zzzz wrong 98765";
            const result = await call(attacker, "POST", `/steal/attacks/${attackId}/answer`, { index: attack.current, answer });
            assert.equal(result.status, 200, JSON.stringify(result.body));
        }
        throw new Error("The quiz never ended");
    }

    async function giveItem(user, key, { equip = false, price = 10 } = {}) {
        const item = await inventory.createItem(user._id, key, price);
        if (equip) await StealPlayer.updateOne({ _id: user._id }, { $push: { equipped: { item: item._id, key } } });
        return item;
    }

    test("PvP is off by default, and the game says what to do", async () => {
        const stranger = await member({ pvp: false });
        const hub = await call(stranger, "GET", "/steal/me");
        assert.equal(hub.body.player.enabled, false);
        const victim = await member({ pp: 100 });
        const tried = await call(stranger, "POST", "/steal/attacks", { victim: victim._id, percent: 1 });
        assert.equal(tried.status, 403);
        assert.equal(tried.body.error, "Requires you to turn on PvP from your profile page");
    });

    test("the profile's PVP switch is the game's, and everyone starts as a Warrior", async () => {
        const user = await member({ pvp: false, playerClass: "warrior" });
        assert.deepEqual((await call(user, "GET", "/steal/status")).body, { pvp: false, playerClass: "warrior" });
        const turnedOn = await call(user, "PATCH", "/users/me", { pvp: true });
        assert.equal(turnedOn.status, 200, JSON.stringify(turnedOn.body));
        assert.deepEqual((await call(user, "GET", "/steal/status")).body, { pvp: true, playerClass: "warrior" });

        // A change from Warrior any time, then once a week.
        const rogue = await call(user, "POST", "/steal/class", { playerClass: "rogue" });
        assert.equal(rogue.body.player.playerClass, "rogue");
        const again = await call(user, "POST", "/steal/class", { playerClass: "mage" });
        assert.equal(again.body.code, "CLASS_LOCKED");
    });

    test("PVP can't be turned off while an attack you're in is being played", async () => {
        const attacker = await member();
        const victim = await member({ pp: 100 });
        await follow(attacker, victim);
        const started = await call(attacker, "POST", "/steal/attacks", { victim: victim._id, percent: 1 });
        for (const user of [attacker, victim]) {
            const off = await call(user, "PATCH", "/users/me", { pvp: false });
            assert.equal(off.body.code, "IN_ATTACK");
            assert.equal((await User.findById(user._id).lean()).pvp, true);
        }
        await playQuiz(attacker, started.body._id, true);
        assert.equal((await call(victim, "PATCH", "/users/me", { pvp: false })).status, 200);
        assert.equal((await User.findById(victim._id).lean()).pvp, false);
    });

    test("the target list says why each person can't be attacked", async () => {
        const attacker = await member();
        const fresh = await member({ pp: 50 });
        const off = await member({ pp: 50, pvp: false });
        const broke = await member({ pp: 0 });
        await follow(attacker, fresh, 10);
        await follow(attacker, off);
        await follow(attacker, broke);
        const { body } = await call(attacker, "GET", "/steal/targets");
        const reasonFor = (user) => body.targets.find((target) => String(target.user._id) === String(user._id)).reason;
        assert.match(reasonFor(fresh), /Follow them for 2d 14h more/);
        assert.equal(reasonFor(off), "PvP off");
        assert.equal(reasonFor(broke), "Net worth is 0");
    });

    test("a new account can't attack until it's 12 days old", async () => {
        const attacker = await member({ days: 3 });
        const victim = await member({ pp: 100 });
        await follow(attacker, victim);
        const tried = await call(attacker, "POST", "/steal/attacks", { victim: victim._id, percent: 1 });
        assert.equal(tried.body.code, "TOO_NEW");
    });

    test("a successful steal: the snapshot, the freeze, the quiz, then the payout and the feed", async () => {
        const attacker = await member({ playerClass: "mage" });
        const victim = await member({ pp: 600, ppp: 400, playerClass: "warrior" });
        await follow(attacker, victim);
        const lockpick = await giveItem(attacker, "lockpick-set", { equip: true });

        const started = await call(attacker, "POST", "/steal/attacks", { victim: victim._id, percent: 5 });
        assert.equal(started.status, 201, JSON.stringify(started.body));
        assert.equal(started.body.attempted, 50);
        assert.equal(started.body.questionCount, 10);
        assert.equal("answer" in (started.body.quiz?.question ?? {}), false);

        // The attacker's attack item lost 1 as it started.
        assert.equal((await StealItem.findById(lockpick._id).lean()).durability, 4);
        // The defender heard about it.
        assert.ok(await Notification.exists({ recipient: victim._id, type: "stealAttacked" }));
        // Both wallets are frozen: no spending elsewhere.
        await assert.rejects(wallet.spend(victim._id, 5), /frozen/);
        await User.updateOne({ _id: attacker._id }, { $set: { "wallet.pp": 5 } });
        await assert.rejects(wallet.spend(attacker._id, 1), /frozen/);
        // A second attack is refused while this one's going (and all day after).
        const again = await call(attacker, "POST", "/steal/attacks", { victim: victim._id, percent: 1 });
        assert.equal(again.body.code, "ATTACKING");

        const done = await playQuiz(attacker, started.body._id, true);
        assert.equal(done.status, "done");
        assert.equal(done.outcome, "success");
        assert.equal(done.correct, 10);
        // 100 + 5 (Lockpick) + 5 (Mage), clamped to 100, minus the Warrior's 5.
        assert.deepEqual(done.rates, { attack: 100, defense: 5, success: 95 });

        assert.equal((await walletOf(attacker)).ppp, done.amounts.attackerGot);
        assert.equal(done.amounts.attackerGot, 50);
        assert.equal(done.crit, false);
        const robbed = await walletOf(victim);
        assert.equal(robbed.pp + robbed.ppp, 1000 - 50);
        assert.equal(robbed.pp, 550, "PP goes first");
        assert.equal(robbed.frozenUntil, null);
        await wallet.spend(victim._id, 1);

        const tomorrow = await call(attacker, "POST", "/steal/attacks", { victim: victim._id, percent: 1 });
        assert.equal(tomorrow.body.code, "USED_TODAY");

        const feed = await call(attacker, "GET", "/steal/feed");
        assert.ok(feed.body.steals.some((row) => String(row._id) === String(done._id)));
        assert.ok(await Notification.exists({ recipient: attacker._id, type: "stealResult", stealAttack: done._id }));
        assert.equal(await Notification.exists({ recipient: victim._id, type: "stealAttacked" }), null);

        // The result shows every question with its right answer, to the attacker only.
        const view = await call(attacker, "GET", `/steal/attacks/${done._id}`);
        assert.equal(view.body.review.length, 10);
        const theirs = await call(victim, "GET", `/steal/attacks/${done._id}`);
        assert.equal(theirs.body.review, undefined);
        assert.equal(theirs.body.result.amounts.victimLost, 50);
    });

    test("up to 50% can be stolen, but only at the steps on offer", async () => {
        const attacker = await member();
        const victim = await member({ pp: 1000 });
        await follow(attacker, victim);
        const targets = await call(attacker, "GET", "/steal/targets");
        const target = targets.body.targets.find((row) => String(row.user._id) === String(victim._id));
        assert.deepEqual(Object.keys(target.amounts).map(Number), [1, 2, 3, 4, 5, 10, 20, 30, 40, 50]);
        assert.equal(target.amounts[50], 500);

        const odd = await call(attacker, "POST", "/steal/attacks", { victim: victim._id, percent: 7 });
        assert.equal(odd.status, 400);
        const half = await call(attacker, "POST", "/steal/attacks", { victim: victim._id, percent: 50 });
        assert.equal(half.status, 201, JSON.stringify(half.body));
        assert.equal(half.body.attempted, 500);
        const done = await playQuiz(attacker, half.body._id, true);
        assert.equal(done.outcome, "success");
        const robbed = await walletOf(victim);
        assert.equal(robbed.pp + robbed.ppp, 500);
    });

    test("a failed attack fines the thief, and what they can't pay becomes debt", async () => {
        attacks.useRandomSource(() => 99);
        const attacker = await member({ pp: 1 });
        const victim = await member({ pp: 2000 });
        await follow(attacker, victim);
        const started = await call(attacker, "POST", "/steal/attacks", { victim: victim._id, percent: 5 });
        assert.equal(started.body.attempted, 100);
        const done = await playQuiz(attacker, started.body._id, false);

        assert.equal(done.outcome, "fail");
        assert.equal(done.amounts.fine, 80);
        assert.equal(done.amounts.paid, 1);
        assert.equal(done.amounts.debt, 20);
        assert.equal(done.amounts.defenderGot, 1);
        const broke = await walletOf(attacker);
        assert.deepEqual([broke.pp, broke.ppp], [0, -20]);
        assert.equal((await walletOf(victim)).ppp, 1);

        // In debt: no attacking, no buying, and nothing else can take it lower.
        const standing = await attacks.attackerStanding(attacker._id);
        assert.ok(standing.refusal);
        await assert.rejects(wallet.spend(attacker._id, 1), /more points|need/);
        // P-PP coming in pays it off first.
        await wallet.credit(attacker._id, 5);
        assert.equal((await walletOf(attacker)).ppp, -15);
    });

    test("PP parked in a Slot Machine, at poker or in lending can't dodge a fine", async () => {
        const SlotMachine = require("../models/slotMachineModel");
        const PokerSeat = require("../models/pokerSeatModel");
        const LoanOffer = require("../models/loanOfferModel");
        const PlayerDebt = require("../models/playerDebtModel");
        const { moneyElsewhere } = require("../utils/steal/elsewhere");

        attacks.useRandomSource(() => 99);
        const attacker = await member({ pp: 1 });
        const victim = await member({ pp: 2000 });
        const borrower = await member();
        await follow(attacker, victim);

        // 30 in the Slot Machine (in cents), 10 at poker, 15 in an open
        // offer and 25 lent out (of 40, 15 paid back) = 80, the whole fine.
        await SlotMachine.create({ user: attacker._id, pp: 2000, ppp: 1050 });
        await PokerSeat.create({ _id: attacker._id, funds: { pp: 10, ppp: 0 }, stack: 10 });
        await LoanOffer.create({ lender: attacker._id, style: "flexible", amount: 50, available: 15, rate: 25 });
        await LoanOffer.create({ lender: attacker._id, style: "fixed", amount: 99, available: 99, rate: 25, status: "closed", closedReason: "down" });
        await PlayerDebt.create({ borrower: borrower._id, lender: attacker._id, principal: 40, interest: 10, principalPaid: 15 });
        assert.deepEqual(await moneyElsewhere(attacker._id), { slots: 30, poker: 10, lending: 15, lent: 25, total: 80 });

        const started = await call(attacker, "POST", "/steal/attacks", { victim: victim._id, percent: 5 });
        const done = await playQuiz(attacker, started.body._id, false);
        assert.equal(done.outcome, "fail");
        assert.equal(done.amounts.fine, 80);
        assert.equal(done.amounts.paid, 1);
        // The 79 unpaid is all covered by what's parked: owed in full.
        assert.equal(done.amounts.covered, 79);
        assert.equal(done.amounts.debt, 79);
        assert.equal(done.amounts.forgiven, 0);
        const broke = await walletOf(attacker);
        assert.equal(broke.pp + broke.ppp, -79);
        // ...and the defender is paid all of it: the 1 paid and the 79 parked.
        assert.equal(done.amounts.defenderGot, 80);
        const paidOut = await walletOf(victim);
        assert.equal(paidOut.ppp, 80);
    });

    test("the daily payout pays off debt first", async () => {
        const debtor = await member({ reviews: 5 });
        await User.updateOne({ _id: debtor._id }, { $set: { "wallet.ppp": -3 } });
        await wallet.payEveryone("2099-01-01");
        const after = await walletOf(debtor);
        assert.deepEqual([after.pp, after.ppp], [2, 0]);
    });

    test("two attacks on one victim: the first to finish decides, the other fails", async () => {
        const first = await member();
        const second = await member({ pp: 500 });
        const victim = await member({ pp: 1000 });
        await follow(first, victim);
        await follow(second, victim);
        const a = await call(first, "POST", "/steal/attacks", { victim: victim._id, percent: 1 });
        const b = await call(second, "POST", "/steal/attacks", { victim: victim._id, percent: 1 });
        assert.equal(b.status, 201);
        assert.equal((await playQuiz(first, a.body._id, true)).outcome, "success");
        const late = await playQuiz(second, b.body._id, true);
        assert.equal(late.outcome, "fail");
        assert.equal(late.doomed, true);
        assert.ok(late.amounts.fine > 0, "the normal fine applies");
    });

    test("unanswered questions count as wrong and the attack still finishes", async () => {
        attacks.useRandomSource(() => 99);
        const attacker = await member({ pp: 100 });
        const victim = await member({ pp: 100 });
        await follow(attacker, victim);
        const started = await call(attacker, "POST", "/steal/attacks", { victim: victim._id, percent: 1 });
        await StealAttack.updateOne({ _id: started.body._id }, { $set: { opensAt: new Date(Date.now() - 60000), closesAt: new Date(Date.now() - 50000) } });
        await attacks.sweepAttacks(new Date(Date.now() + 10 * 60 * 1000));
        const done = await StealAttack.findById(started.body._id).lean();
        assert.equal(done.status, "done");
        assert.equal(done.correct, 0);
        assert.equal(done.wrong, 10);
        assert.ok(done.answers.every((answer) => answer.timedOut));
    });

    test("the Invisibility Cloak can fizzle an attack: no fine, and the cloak wears", async () => {
        attacks.useRandomSource(() => 0);
        const attacker = await member({ pp: 100 });
        const victim = await member({ pp: 100 });
        await follow(attacker, victim);
        const cloak = await giveItem(victim, "invisibility-cloak", { equip: true });
        const started = await call(attacker, "POST", "/steal/attacks", { victim: victim._id, percent: 1 });
        assert.equal(started.body.outcome, "fizzle");
        assert.equal((await walletOf(attacker)).pp, 100);
        assert.equal((await StealItem.findById(cloak._id).lean()).durability, 2);
    });

    test("the Power Stone: no quiz, a sure success, and a stoneless defender's items break", async () => {
        const attacker = await member();
        const victim = await member({ pp: 1000 });
        await follow(attacker, victim);
        await giveItem(attacker, "power-stone", { equip: true });
        const shield = await giveItem(victim, "vibranium-shield", { equip: true });
        const started = await call(attacker, "POST", "/steal/attacks", { victim: victim._id, percent: 2 });
        assert.equal(started.body.outcome, "success");
        assert.equal(started.body.questionCount, 0);
        assert.equal(await StealItem.exists({ _id: shield._id }), null);
    });

    test("the Reality Stone: the thief is paid and the victim loses nothing", async () => {
        const attacker = await member();
        const victim = await member({ pp: 1000 });
        await follow(attacker, victim);
        await giveItem(victim, "reality-stone", { equip: true });
        const started = await call(attacker, "POST", "/steal/attacks", { victim: victim._id, percent: 3 });
        const done = await playQuiz(attacker, started.body._id, true);
        assert.equal(done.outcome, "success");
        assert.equal(done.amounts.victimLost, 0);
        assert.equal((await walletOf(victim)).pp, 1000);
        assert.equal((await walletOf(attacker)).ppp, 30);
    });

    test("a Critical Hit multiplies the thief's gain, the victim only loses the attempt, and everyone hears", async () => {
        attacks.useRandomSource(() => 0);
        const attacker = await member();
        const victim = await member({ pp: 1000 });
        const bystander = await member({ pvp: false });
        await follow(attacker, victim);
        const started = await call(attacker, "POST", "/steal/attacks", { victim: victim._id, percent: 2 });
        const done = await playQuiz(attacker, started.body._id, true);
        assert.equal(done.crit, true);
        assert.equal(done.amounts.attackerGot, 45);
        assert.equal(done.amounts.victimLost, 20);
        assert.ok(await Notification.exists({ recipient: bystander._id, type: "stealCrit", stealAttack: done._id }));
    });

    test("turning PvP off takes this week's steals back, and the victim gets theirs back", async () => {
        const attacker = await member();
        const victim = await member({ pp: 1000 });
        await follow(attacker, victim);
        const started = await call(attacker, "POST", "/steal/attacks", { victim: victim._id, percent: 5 });
        await playQuiz(attacker, started.body._id, true);
        assert.equal((await walletOf(attacker)).ppp, 50);

        const preview = await call(attacker, "GET", "/steal/pvp/takeback");
        assert.deepEqual(preview.body, { steals: 1, owed: 50 });
        const off = await call(attacker, "PATCH", "/users/me", { pvp: false });
        assert.equal(off.body.stealTakenBack.steals, 1);
        assert.equal((await call(attacker, "GET", "/steal/status")).body.pvp, false);
        assert.equal((await walletOf(attacker)).ppp, 0);
        const back = await walletOf(victim);
        assert.equal(back.pp + back.ppp, 1000);
    });

    test("turning PvP off with the stolen points parked in a Slot Machine: the victim still gets them back", async () => {
        const SlotMachine = require("../models/slotMachineModel");
        const attacker = await member();
        const victim = await member({ pp: 1000 });
        await follow(attacker, victim);
        const started = await call(attacker, "POST", "/steal/attacks", { victim: victim._id, percent: 5 });
        await playQuiz(attacker, started.body._id, true);

        // The 50 stolen, moved out of the wallet into the Slot Machine.
        await User.updateOne({ _id: attacker._id }, { $set: { "wallet.ppp": 0 } });
        await SlotMachine.create({ user: attacker._id, pp: 0, ppp: 5000 });

        const off = await call(attacker, "PATCH", "/users/me", { pvp: false });
        assert.equal(off.body.stealTakenBack.steals, 1);
        const owing = await walletOf(attacker);
        assert.equal(owing.pp + owing.ppp, -50);
        const back = await walletOf(victim);
        assert.equal(back.pp + back.ppp, 1000);
    });

    test("unfollowing someone you've stolen from doubles the follow time", async () => {
        const attacker = await member();
        const victim = await member({ pp: 1000 });
        await follow(attacker, victim);
        const started = await call(attacker, "POST", "/steal/attacks", { victim: victim._id, percent: 1 });
        await playQuiz(attacker, started.body._id, true);
        await call(attacker, "DELETE", `/users/${victim._id}/follow`);
        const player = await StealPlayer.findById(attacker._id).lean();
        assert.equal(require("../utils/steal/players").unfollowsOf(player, victim._id), 1);
        assert.equal(rules.requiredFollowHours(1), 144);
    });

    test("the shop: prices by daily PP, and each listing sells once", async () => {
        const day = rules.shopDay();
        await StealListing.deleteMany({ day });
        await StealListing.insertMany([
            { day, slot: 0, key: "vibranium-shield" },
            ...Array.from({ length: 8 }, (_, i) => ({ day, slot: i + 1, key: "lockpick-set" })),
        ]);
        const buyer = await member({ reviews: 7, pp: 100 });
        const late = await member({ reviews: 5, pp: 100 });
        const poor = await member({ reviews: 2, pp: 100 });

        const shop = await call(buyer, "GET", "/steal/shop");
        assert.equal(shop.body.listings.length, 9);
        assert.equal(shop.body.listings[0].price, 7);
        assert.equal((await call(poor, "GET", "/steal/shop")).body.canBuy, false);

        const bought = await call(buyer, "POST", `/steal/shop/${shop.body.listings[0]._id}/buy`);
        assert.equal(bought.status, 201, JSON.stringify(bought.body));
        assert.equal(bought.body.item.originalPrice, 7);
        assert.equal((await walletOf(buyer)).pp, 93);
        const second = await call(late, "POST", `/steal/shop/${shop.body.listings[0]._id}/buy`);
        assert.equal(second.body.code, "SOLD");
        assert.equal((await walletOf(late)).pp, 100);
    });

    test("equipping: 3 slots, never two of the same item", async () => {
        const user = await member();
        const items = await Promise.all(["lockpick-set", "lockpick-set", "wilson", "red-pill", "plot-armor"].map((key) => giveItem(user, key)));
        assert.equal((await call(user, "POST", `/steal/items/${items[0]._id}/equip`)).status, 200);
        assert.equal((await call(user, "POST", `/steal/items/${items[1]._id}/equip`)).status, 409);
        await call(user, "POST", `/steal/items/${items[2]._id}/equip`);
        await call(user, "POST", `/steal/items/${items[3]._id}/equip`);
        const fourth = await call(user, "POST", `/steal/items/${items[4]._id}/equip`);
        assert.equal(fourth.body.code, "SLOTS_FULL");
        const sold = await call(user, "POST", `/steal/items/${items[0]._id}/sell`);
        assert.equal(sold.body.code, "EQUIPPED");
    });

    test("selling back pays half the original price for the durability left", async () => {
        const user = await member();
        const item = await giveItem(user, "wilson", { price: 30 });
        await StealItem.updateOne({ _id: item._id }, { $set: { durability: 2 } });
        const sold = await call(user, "POST", `/steal/items/${item._id}/sell`);
        assert.equal(sold.body.value, 8);
        assert.equal((await walletOf(user)).ppp, 8);
    });

    test("a trade holds the offer in escrow, then swaps everything on accept", async () => {
        const alice = await member({ pp: 50 });
        const bob = await member({ pp: 50 });
        const helmet = await giveItem(alice, "popcorn-bucket-helmet");
        const map = await giveItem(bob, "marauders-map");
        const offered = await call(alice, "POST", "/steal/trades", { to: bob._id, giveItems: [helmet._id], givePp: 20, wantItems: [map._id], wantPp: 0 });
        assert.equal(offered.status, 201, JSON.stringify(offered.body));
        assert.equal((await StealItem.findById(helmet._id).lean()).state, "escrow");
        assert.equal((await walletOf(alice)).pp, 30);

        const accepted = await call(bob, "POST", `/steal/trades/${offered.body._id}/accept`);
        assert.equal(accepted.status, 200, JSON.stringify(accepted.body));
        assert.equal(String((await StealItem.findById(helmet._id).lean()).owner), String(bob._id));
        assert.equal(String((await StealItem.findById(map._id).lean()).owner), String(alice._id));
        assert.equal((await walletOf(bob)).ppp, 20);
    });

    test("a declined trade hands everything back", async () => {
        const alice = await member({ pp: 50, ppp: 10 });
        const bob = await member();
        const helmet = await giveItem(alice, "popcorn-bucket-helmet");
        const offered = await call(alice, "POST", "/steal/trades", { to: bob._id, giveItems: [helmet._id], givePp: 55 });
        await call(bob, "POST", `/steal/trades/${offered.body._id}/decline`);
        assert.equal((await StealItem.findById(helmet._id).lean()).state, "owned");
        const back = await walletOf(alice);
        assert.deepEqual([back.pp, back.ppp], [50, 10]);
    });

    test("the player market sells once, paying the seller in P-PP and keeping the original price", async () => {
        const seller = await member();
        const buyer = await member({ reviews: 5, pp: 100 });
        const item = await giveItem(seller, "neuralyzer", { price: 12 });
        const listed = await call(seller, "POST", "/steal/market", { item: item._id, price: 40 });
        assert.equal(listed.status, 201, JSON.stringify(listed.body));
        const bought = await call(buyer, "POST", `/steal/market/${listed.body._id}/buy`);
        assert.equal(bought.status, 200, JSON.stringify(bought.body));
        const moved = await StealItem.findById(item._id).lean();
        assert.equal(String(moved.owner), String(buyer._id));
        assert.equal(moved.originalPrice, 12);
        assert.equal((await walletOf(seller)).ppp, 40);
        assert.equal((await walletOf(buyer)).pp, 60);
    });

    test("a gift moves an item for free, and a Legendary gift is flagged for admins", async () => {
        const admin = await member({ role: "admin" });
        const giver = await member();
        const taker = await member();
        const stone = await giveItem(giver, "time-stone");
        const sent = await call(giver, "POST", "/steal/gifts", { to: taker._id, item: stone._id });
        assert.equal(sent.status, 201, JSON.stringify(sent.body));
        assert.equal(String((await StealItem.findById(stone._id).lean()).owner), String(taker._id));
        const flag = await StealFlag.findOne({ kind: "trade", users: giver._id }).lean();
        assert.ok(flag);
        assert.ok(await Notification.exists({ recipient: admin._id, type: "stealFlag", stealFlag: flag._id }));
    });

    test("only one of each Infinity Stone can exist", async () => {
        const user = await member();
        await giveItem(user, "soul-stone");
        await assert.rejects(giveItem(user, "soul-stone"), (error) => error.code === 11000);
    });

    test("admin bans: scoped, with a reason, and lifted by Unban", async () => {
        const admin = await member({ role: "admin" });
        const cheat = await member();
        const victim = await member({ pp: 100 });
        await follow(cheat, victim);

        const noReason = await call(admin, "POST", "/steal/admin/bans", { user: cheat._id, scopes: ["steal"], days: 3 });
        assert.equal(noReason.status, 400);
        const banned = await call(admin, "POST", "/steal/admin/bans", { user: cheat._id, scopes: ["steal"], days: 3, reason: "Alt farming" });
        assert.equal(banned.status, 201);
        const tried = await call(cheat, "POST", "/steal/attacks", { victim: victim._id, percent: 1 });
        assert.match(tried.body.error, /banned from stealing.*Alt farming/);

        const list = await call(admin, "GET", "/steal/admin/bans");
        assert.ok(list.body.bans.some((ban) => String(ban._id) === String(banned.body._id)));
        assert.equal((await call(cheat, "GET", "/steal/admin/bans")).status, 403);

        await call(admin, "DELETE", `/steal/admin/bans/${banned.body._id}`);
        const after = await call(cheat, "POST", "/steal/attacks", { victim: victim._id, percent: 1 });
        assert.equal(after.status, 201, JSON.stringify(after.body));
    });

    test("an admin can reset the steal timer: everyone can steal, and be stolen from, again", async () => {
        const admin = await member({ role: "admin" });
        const thieves = [await member(), await member(), await member()];
        const victim = await member({ pp: 1000 });
        for (const thief of thieves) await follow(thief, victim);

        // Robbed twice today: as often as a victim can be in a day.
        for (const thief of thieves.slice(0, 2)) {
            const started = await call(thief, "POST", "/steal/attacks", { victim: victim._id, percent: 1 });
            await playQuiz(thief, started.body._id, true);
        }
        const capped = await call(thieves[2], "GET", "/steal/targets");
        assert.equal(capped.body.targets.find((row) => String(row.user._id) === String(victim._id)).reason, "Robbed enough for today");
        assert.equal((await call(thieves[0], "POST", "/steal/attacks", { victim: victim._id, percent: 1 })).body.code, "USED_TODAY");

        assert.equal((await call(thieves[0], "POST", "/steal/admin/attack-reset")).status, 403);
        const reset = await call(admin, "POST", "/steal/admin/attack-reset");
        assert.equal(reset.status, 200, JSON.stringify(reset.body));
        assert.ok(reset.body.players >= 2);
        assert.equal((await call(admin, "GET", "/steal/admin/attack-reset")).body.reset.by.username, admin.username);

        // The victim can be robbed again, by someone who already did this week too.
        assert.equal((await call(thieves[0], "GET", "/steal/me")).body.attack.attacksToday, 0);
        const free = await call(thieves[2], "GET", "/steal/targets");
        assert.equal(free.body.targets.find((row) => String(row.user._id) === String(victim._id)).available, true);
        const again = await call(thieves[0], "POST", "/steal/attacks", { victim: victim._id, percent: 1 });
        assert.equal(again.status, 201, JSON.stringify(again.body));
        await playQuiz(thieves[0], again.body._id, true);
        assert.equal((await call(thieves[0], "POST", "/steal/attacks", { victim: victim._id, percent: 1 })).body.code, "USED_TODAY");
    });

    test("a site-wide ban shuts the member out, but they can still download their data", async () => {
        const admin = await member({ role: "admin" });
        const user = await member();
        await call(admin, "POST", "/steal/admin/bans", { user: user._id, scopes: ["site"], reason: "Abuse" });
        require("../utils/steal/moderation").forgetSiteBan(user._id);
        const hub = await call(user, "GET", "/steal/me");
        assert.equal(hub.status, 403);
        assert.equal(hub.body.code, "BANNED");
        const exported = await call(user, "GET", "/users/me/export");
        assert.equal(exported.status, 200);
        assert.ok("stealAndDefend" in exported.body);
    });

    test("deleting an account takes its items, so a stone can be found again", async () => {
        const user = await member();
        await giveItem(user, "mind-stone");
        const { forgetStealPlayer } = require("../utils/steal/upkeep");
        await forgetStealPlayer(user._id);
        assert.equal(await StealItem.exists({ key: "mind-stone" }), null);
        assert.equal(await StealPlayer.exists({ _id: user._id }), null);
    });
});
