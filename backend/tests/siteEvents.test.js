// The calendar events (shared/events.js, utils/siteEvents.js): the Black
// Market's Black Friday Sale and Box Office Scratch's Double Prize Weekend,
// what they change, and everyone's notification when one starts. Against
// a real MongoDB for the last part.
//
// From backend/, with a MongoDB running:
//   PowerShell:  $env:MONGO_TEST_URI="mongodb://127.0.0.1:27017/kino_test"; npm test
//   bash:        MONGO_TEST_URI=mongodb://127.0.0.1:27017/kino_test npm test
// The database is wiped first, so its name has to end in "_test".
const { test, describe, before, after } = require("node:test");
const assert = require("node:assert/strict");

const mongoose = require("mongoose");
const { blackFridayOf, blackFridaySale, doublePrizeWeekend, priceInSale, salePrice } = require("../../shared/events.js");
const { NAME_ITEMS, cosmeticById } = require("../../shared/cosmetics/catalogue.js");

// Helsinki is UTC+2 in late November: its midnight is 22:00 UTC the day before.
const at = (utc) => new Date(utc);

describe("the calendar", () => {
    test("Black Friday is the day after the fourth Thursday of November", () => {
        assert.equal(blackFridayOf(2025), "2025-11-28");
        assert.equal(blackFridayOf(2026), "2026-11-27");
        assert.equal(blackFridayOf(2027), "2027-11-26");
        assert.equal(blackFridayOf(2028), "2028-11-24");
    });

    test("the sale runs from Black Friday's first minute to Sunday's last, Helsinki time", () => {
        assert.equal(blackFridaySale(at("2026-11-26T21:59:59Z")).on, false, "Thursday 23:59");
        assert.equal(blackFridaySale(at("2026-11-26T22:00:00Z")).on, true, "Friday 00:00");
        assert.equal(blackFridaySale(at("2026-11-29T21:59:59Z")).on, true, "Sunday 23:59");
        assert.equal(blackFridaySale(at("2026-11-29T22:00:00Z")).on, false, "Monday 00:00");
        assert.deepEqual(blackFridaySale(at("2026-11-28T10:00:00Z")), { on: true, key: "blackFriday-2026-11-27", lastDay: "2026-11-29" });
        assert.equal(blackFridaySale(at("2026-07-03T10:00:00Z")).on, false, "a Friday in July");
    });

    test("half price, rounded up, on everything but the Jackpot name style and border", () => {
        assert.equal(priceInSale({ id: "name.neon.blue", price: 5000 }, true), 2500);
        assert.equal(priceInSale({ id: "border.lava", price: 1001 }, true), 501);
        assert.equal(priceInSale(cosmeticById("name.jackpot"), true), 100000);
        assert.equal(priceInSale(cosmeticById("border.jackpot"), true), 100000);
        assert.equal(priceInSale({ id: "name.neon.blue", price: 5000 }, false), 5000);
        assert.equal(salePrice({ id: "name.neon.blue", price: 5000 }, at("2026-11-28T10:00:00Z")), 2500);
        assert.equal(salePrice({ id: "name.neon.blue", price: 5000 }, at("2026-12-05T10:00:00Z")), 5000);
    });

    test("Double Prize Weekend: every Saturday and Sunday, Helsinki time, named by its Saturday", () => {
        assert.equal(doublePrizeWeekend(at("2026-11-20T21:59:59Z")).on, false, "Friday 23:59");
        assert.deepEqual(doublePrizeWeekend(at("2026-11-20T22:00:00Z")), { on: true, key: "doublePrizes-2026-11-21", lastDay: "2026-11-22" });
        assert.equal(doublePrizeWeekend(at("2026-11-22T21:59:59Z")).key, "doublePrizes-2026-11-21", "Sunday 23:59");
        assert.equal(doublePrizeWeekend(at("2026-11-22T22:00:00Z")).on, false, "Monday 00:00");
        // Summer time: Helsinki is UTC+3.
        assert.equal(doublePrizeWeekend(at("2026-06-26T20:59:59Z")).on, false);
        assert.equal(doublePrizeWeekend(at("2026-06-26T21:00:00Z")).on, true);
    });
});

const uri = process.env.MONGO_TEST_URI;
const dbName = uri ? new URL(uri).pathname.slice(1) : "";

describe("against the database", { skip: !uri ? "set MONGO_TEST_URI to run these" : !dbName.endsWith("_test") ? "MONGO_TEST_URI's database must end in _test" : false }, () => {
    let User;
    let Review;
    let Notification;
    let ScratchCard;
    let SiteEvent;
    let count = 0;

    before(async () => {
        await mongoose.connect(uri);
        await mongoose.connection.dropDatabase();
        User = require("../models/userModel");
        Review = require("../models/reviewModel");
        Notification = require("../models/notificationModel");
        ScratchCard = require("../models/scratchCardModel");
        SiteEvent = require("../models/siteEventModel");
        await Promise.all([User, Review, Notification, ScratchCard, SiteEvent].map((model) => model.syncIndexes()));
    });

    after(async () => {
        await mongoose.disconnect();
    });

    async function member({ reviews = 0, pp = 0, ppp = 0 } = {}) {
        count += 1;
        const user = await User.create({ username: `eventer${count}`, email: `e${count}@test.invalid`, password: "x", wallet: { pp, ppp } });
        if (reviews) {
            await Review.collection.insertMany(
                Array.from({ length: reviews }, (_, i) => ({ user: user._id, tmdbId: count * 1000 + i, filmTitle: `Film ${i}`, text: "Seen it.", likeCount: 0, dislikeCount: 0, likedBy: [], dislikedBy: [], createdAt: new Date(), updatedAt: new Date() })),
            );
        }
        return user;
    }
    const walletOf = async (user) => (await User.findById(user._id).lean()).wallet;

    test("everyone hears once when each starts, and nothing while neither is on", async () => {
        const { announceSiteEvents } = require("../utils/siteEvents");
        const people = [await member(), await member(), await member()];

        assert.deepEqual(await announceSiteEvents(at("2026-11-25T10:00:00Z")), [], "a Wednesday");
        // Black Friday: the sale, but not a weekend yet.
        assert.deepEqual(await announceSiteEvents(at("2026-11-27T08:00:00Z")), ["blackFriday"]);
        assert.deepEqual(await announceSiteEvents(at("2026-11-27T09:00:00Z")), [], "only once");
        // The Saturday: the weekend starts too.
        assert.deepEqual(await announceSiteEvents(at("2026-11-28T08:00:00Z")), ["doublePrizes"]);
        assert.deepEqual(await announceSiteEvents(at("2026-11-29T20:00:00Z")), [], "Sunday: both already sent");
        // The next weekend is a new one.
        assert.deepEqual(await announceSiteEvents(at("2026-12-05T08:00:00Z")), ["doublePrizes"]);

        for (const person of people) {
            const types = (await Notification.find({ recipient: person._id }).lean()).map((note) => note.type).sort();
            assert.deepEqual(types, ["blackFriday", "doublePrizes", "doublePrizes"]);
        }
    });

    test("the Black Market charges the sale price, and the Jackpot items full price", async () => {
        const { buyCosmetic } = require("../utils/blackMarket");
        const item = NAME_ITEMS.find((candidate) => candidate.price >= 1000 && candidate.reviews <= 20);
        const buyer = await member({ reviews: 200, ppp: 200000 });

        const inSale = await buyCosmetic(buyer._id, item.id, at("2026-11-28T10:00:00Z"));
        assert.equal(inSale.price, Math.ceil(item.price / 2));
        assert.equal((await walletOf(buyer)).ppp, 200000 - Math.ceil(item.price / 2));

        const jackpot = await buyCosmetic(buyer._id, "name.jackpot", at("2026-11-28T10:00:00Z"));
        assert.equal(jackpot.price, 100000);

        const other = NAME_ITEMS.find((candidate) => candidate.price >= 1000 && candidate.reviews <= 20 && candidate.id !== item.id);
        const after = await buyCosmetic(buyer._id, other.id, at("2026-12-01T10:00:00Z"));
        assert.equal(after.price, other.price, "the sale's over");
    });

    test("Double Prize Weekend: cards bought then pay double (a refund: the price back and once more in P-PP)", async () => {
        const { buyCard, payPrize } = require("../utils/scratch");
        const player = await member({ ppp: 100 });

        const saturday = await buyCard(player._id, "standard", at("2026-11-21T10:00:00Z"));
        assert.equal((await ScratchCard.findById(saturday._id).lean()).doublePrizes, true);
        await ScratchCard.deleteOne({ _id: saturday._id });
        const monday = await buyCard(player._id, "standard", at("2026-11-23T10:00:00Z"));
        assert.equal((await ScratchCard.findById(monday._id).lean()).doublePrizes, false);
        await ScratchCard.deleteOne({ _id: monday._id });

        const card = (fields) =>
            ScratchCard.create({ user: player._id, ticketType: "standard", layout: ["star"], salt: "s", hash: "h", price: 10, status: "complete", ...fields });

        // Box Office Smash on a Standard ticket: 80, doubled to 160.
        await User.updateOne({ _id: player._id }, { $set: { "wallet.pp": 0, "wallet.ppp": 0 } });
        const smash = await card({ tier: "smash", doublePrizes: true });
        await payPrize(smash._id);
        assert.equal((await walletOf(player)).ppp, 160);

        // Straight to DVD: the 10 back as it was paid (4 PP, 6 P-PP), and 10 more in P-PP.
        await User.updateOne({ _id: player._id }, { $set: { "wallet.pp": 0, "wallet.ppp": 0 } });
        const dvd = await card({ tier: "dvd", doublePrizes: true, spent: { pp: 4, ppp: 6 } });
        await payPrize(dvd._id);
        const wallet = await walletOf(player);
        assert.deepEqual([wallet.pp, wallet.ppp], [4, 16]);

        // Not a weekend card: as before.
        await User.updateOne({ _id: player._id }, { $set: { "wallet.pp": 0, "wallet.ppp": 0 } });
        await payPrize((await card({ tier: "smash" }))._id);
        assert.equal((await walletOf(player)).ppp, 80);
    });
});
