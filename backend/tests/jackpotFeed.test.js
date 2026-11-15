// What else fills the Box Office Scratch jackpots (config/jackpotFeed.js):
// 75% of a stake lost to Clanker at Kino Farkle and 50% of what King Loan
// Shark takes, each rounded up, shared 15 / 35 / 50 between the Standard,
// Premium and VIP pools. Against a real MongoDB.
//
// From backend/, with a MongoDB running:
//   PowerShell:  $env:MONGO_TEST_URI="mongodb://127.0.0.1:27017/kino_test"; npm test
//   bash:        MONGO_TEST_URI=mongodb://127.0.0.1:27017/kino_test npm test
// The database is wiped first, so its name has to end in "_test".
const { test, describe, before, after } = require("node:test");
const assert = require("node:assert/strict");

const mongoose = require("mongoose");
const { splitFeed } = require("../utils/scratch");
const { feedShare } = require("../utils/jackpotFeed");

test("the split: 15 / 35 / 50, always adding up to exactly what's fed in", () => {
    assert.deepEqual(splitFeed(100), { standard: 15, premium: 35, vip: 50 });
    assert.deepEqual(splitFeed(8), { standard: 1, premium: 3, vip: 4 });
    assert.deepEqual(splitFeed(13), { standard: 2, premium: 5, vip: 6 });
    assert.deepEqual(splitFeed(1), { standard: 0, premium: 0, vip: 1 });
    for (let amount = 0; amount <= 500; amount++) {
        const shares = splitFeed(amount);
        assert.equal(shares.standard + shares.premium + shares.vip, amount, String(amount));
    }
});

test("the shares fed in are rounded up", () => {
    assert.equal(feedShare(10, 0.75), 8);
    assert.equal(feedShare(1, 0.75), 1);
    assert.equal(feedShare(1500, 0.75), 1125);
    assert.equal(feedShare(15, 0.5), 8);
    assert.equal(feedShare(0, 0.5), 0);
});

const uri = process.env.MONGO_TEST_URI;
const dbName = uri ? new URL(uri).pathname.slice(1) : "";

describe("feeding the scratch jackpots", { skip: !uri ? "set MONGO_TEST_URI to run these" : !dbName.endsWith("_test") ? "MONGO_TEST_URI's database must end in _test" : false }, () => {
    let User;
    let Review;
    let FarkleMatch;
    let scratch;
    let farkle;
    let loans;
    let count = 0;

    before(async () => {
        await mongoose.connect(uri);
        await mongoose.connection.dropDatabase();
        User = require("../models/userModel");
        Review = require("../models/reviewModel");
        FarkleMatch = require("../models/farkleMatchModel");
        scratch = require("../utils/scratch");
        farkle = require("../utils/farkle");
        loans = require("../utils/loanShark");
        await Promise.all([User, Review, FarkleMatch].map((model) => model.syncIndexes()));
    });

    after(async () => {
        await mongoose.disconnect();
    });

    async function member({ reviews = 0, pp = 0, ppp = 0, role = "user" } = {}) {
        count += 1;
        const user = await User.create({ username: `feeder${count}`, email: `f${count}@test.invalid`, password: "x", role, wallet: { pp, ppp } });
        if (reviews) {
            await Review.collection.insertMany(
                Array.from({ length: reviews }, (_, i) => ({ user: user._id, tmdbId: count * 1000 + i, filmTitle: `Film ${i}`, text: "Seen it.", likeCount: 0, dislikeCount: 0, likedBy: [], dislikedBy: [], createdAt: new Date(), updatedAt: new Date() })),
            );
        }
        return user;
    }
    const pools = async () => (await scratch.jackpotView()).amounts;
    // How much each pool grew while `work` ran.
    async function grew(work) {
        const before = await pools();
        await work();
        const now = await pools();
        return { standard: now.standard - before.standard, premium: now.premium - before.premium, vip: now.vip - before.vip };
    }
    const botMatch = (user, winner, stake = 10) =>
        FarkleMatch.create({
            mode: "bot",
            status: "over",
            players: [{ user: null }, { user: user._id, paid: { pp: stake, ppp: 0 } }],
            target: 2000,
            stake,
            prize: stake * 2,
            winner,
        });

    test("Kino Farkle: 75% of a stake lost to Clanker, rounded up, once; nothing when the member wins", async () => {
        const player = await member();
        const lost = await botMatch(player, farkle.BOT_SEAT ?? 0, 10);
        // 75% of 10 = 7.5, so 8: 1 / 3 / 4.
        assert.deepEqual(await grew(() => farkle.settleMatch(lost._id)), { standard: 1, premium: 3, vip: 4 });
        assert.deepEqual(await grew(() => farkle.settleMatch(lost._id)), { standard: 0, premium: 0, vip: 0 }, "settled once");

        const big = await botMatch(player, 0, 1500);
        // 75% of 1,500 = 1,125: 168.75 / 393.75 / 562.5 -> 169 / 394 / 562.
        assert.deepEqual(await grew(() => farkle.settleMatch(big._id)), { standard: 169, premium: 394, vip: 562 });

        const won = await botMatch(player, 1, 10);
        assert.deepEqual(await grew(() => farkle.settleMatch(won._id)), { standard: 0, premium: 0, vip: 0 });
        assert.equal((await User.findById(player._id).lean()).wallet.ppp, 20, "the winner is paid as before");
    });

    test("Loan Shark: 50% of a repayment, rounded up", async () => {
        const borrower = await member({ reviews: 10 });
        await loans.sharkBorrow(borrower._id, 100);
        await User.collection.updateOne({ _id: borrower._id }, { $set: { "wallet.pp": 7, "wallet.ppp": 100 } });
        // 12 paid: 6 fed, 0.9 / 2.1 / 3 -> 1 / 2 / 3.
        assert.deepEqual(await grew(() => loans.sharkPay(borrower._id, 12)), { standard: 1, premium: 2, vip: 3 });
        // More than is owed only takes what's owed: 110 - 12 = 98, so 49 fed.
        await User.collection.updateOne({ _id: borrower._id }, { $set: { "wallet.pp": 0, "wallet.ppp": 500 } });
        const all = await grew(() => loans.sharkPay(borrower._id, 400));
        assert.equal(all.standard + all.premium + all.vip, 49);
    });

    test("Loan Shark: 50% of what Kaveri collects, rounded up", async () => {
        const admin = await member({ reviews: 10, role: "admin" });
        await loans.sharkBorrow(admin._id, 20);
        // Kaveri takes 40% of 10 daily PP = 4: 2 fed, 0.3 / 0.7 / 1 -> 0 / 1 / 1.
        assert.deepEqual(await grew(() => loans.devCollectorVisit(admin._id)), { standard: 0, premium: 1, vip: 1 });
    });
});
