// The Black Market (utils/blackMarket.js, shared/cosmetics/catalogue.js):
// the catalogue with no database, then buying and wearing against a real
// MongoDB through the routes.
//
// From backend/, with a MongoDB running (the catalogue tests run without one):
//   PowerShell:  $env:MONGO_TEST_URI="mongodb://127.0.0.1:27017/kino_test"; npm test
//   bash:        MONGO_TEST_URI=mongodb://127.0.0.1:27017/kino_test npm test
// The database is wiped first, so its name has to end in "_test".
const { test, describe, before, after } = require("node:test");
const assert = require("node:assert/strict");

const { NAME_ITEMS, BORDER_ITEMS, ALL_ITEMS, CATEGORIES, cosmeticById, lookOf } = require("../../shared/cosmetics/catalogue.js");

describe("the cosmetics catalogue", () => {
    test("every item has a unique, stable id, a category, a requirement and a price", () => {
        assert.equal(new Set(ALL_ITEMS.map((item) => item.id)).size, ALL_ITEMS.length);
        for (const item of ALL_ITEMS) {
            assert.match(item.id, /^(name|border)\.[a-z0-9-]+(\.[a-z0-9-]+)?$/, item.id);
            assert.ok(item.id.startsWith(`${item.type}.`), item.id);
            assert.ok(CATEGORIES.includes(item.category), item.id);
            assert.ok(Number.isInteger(item.reviews) && item.reviews >= 0, item.id);
            assert.ok(Number.isInteger(item.price) && item.price >= 0, item.id);
        }
    });

    test("every colour variant is its own item at the full price; Default is free", () => {
        // 32 effects plus Default; the variants: Neon 6, Wave 4, Metal 4,
        // Sparkle 4, Glitter 5, Fire 5, Lightning 4, Glitch 3, Matrix 3,
        // Ghost Smoke 3.
        assert.equal(NAME_ITEMS.length, 1 + 23 + 6 + 4 + 4 + 4 + 5 + 5 + 4 + 3 + 3 + 3);
        assert.equal(BORDER_ITEMS.length, 1 + 23 + 6 + 6 + 4 + 4 + 5 + 5 + 4 + 3 + 3 + 3 + 5);
        for (const id of ["name.neon.blue", "name.neon.red"]) assert.deepEqual([cosmeticById(id).price, cosmeticById(id).reviews], [5000, 50]);
        assert.deepEqual(
            [cosmeticById("name.default"), cosmeticById("border.default")].map((item) => [item.price, item.reviews, lookOf(item)]),
            [[0, 0, null], [0, 0, null]],
        );
        assert.deepEqual([cosmeticById("name.jackpot").price, cosmeticById("name.jackpot").category], [100000, "Casino"]);
        assert.equal(cosmeticById("border.fire.soul").name, "Fire Soul");
        assert.equal(cosmeticById("name.matrix.red-pill").name, "Matrix Red Pill");
        assert.equal(cosmeticById("border.poker-chip.purple").category, "Casino");
        assert.equal(cosmeticById("border.void").price, 50000);
        assert.equal(cosmeticById("name.vhs-tape").category, "Film");
        assert.equal(cosmeticById("border.ghost-smoke.spirit").category, "Nature");
    });
});

const uri = process.env.MONGO_TEST_URI;
const dbName = uri ? new URL(uri).pathname.slice(1) : "";

describe("buying and wearing", { skip: !uri ? "set MONGO_TEST_URI to run these" : !dbName.endsWith("_test") ? "MONGO_TEST_URI's database must end in _test" : false }, () => {
    process.env.SECRET ??= "black-market-test-secret";
    const mongoose = require("mongoose");
    const express = require("express");
    const jwt = require("jsonwebtoken");

    let base;
    let server;
    let User, Review, CosmeticOwned, CosmeticWish, WalletTx;
    const tokens = new Map();

    let count = 0;
    async function member(name, { reviews = 0, pp = 0, ppp = 0, role = "user" } = {}) {
        count += 1;
        const user = await User.create({ username: name, email: `${name}@test.invalid`, password: "x", role });
        tokens.set(String(user._id), jwt.sign({ _id: user._id }, process.env.SECRET));
        await User.collection.updateOne({ _id: user._id }, { $set: { wallet: { pp, ppp, lastPayoutDay: null } } });
        if (reviews) {
            await Review.collection.insertMany(Array.from({ length: reviews }, (_, i) => ({ user: user._id, tmdbId: count * 1000 + i, filmTitle: `F${i}`, text: "x", likeCount: 0, dislikeCount: 0 })));
        }
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
    const walletOf = async (user) => (await User.findById(user._id).select("wallet").lean()).wallet;

    before(async () => {
        await mongoose.connect(uri);
        await mongoose.connection.dropDatabase();
        User = require("../models/userModel");
        Review = require("../models/reviewModel");
        CosmeticOwned = require("../models/cosmeticOwnedModel");
        CosmeticWish = require("../models/cosmeticWishModel");
        WalletTx = require("../models/walletTxModel");
        await Promise.all([User, Review, CosmeticOwned, CosmeticWish, WalletTx].map((model) => model.syncIndexes()));

        const app = express();
        app.use(express.json());
        app.use("/api/black-market", require("../routes/blackMarketRouter"));
        app.use("/api/reviews", require("../routes/reviewRouter"));
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

    test("the shop: P-PP, reviews, what's owned and worn", async () => {
        const shopper = await member("shopper", { reviews: 60, ppp: 6000 });
        const shop = await call(shopper, "GET", "/black-market");
        assert.deepEqual(shop.body, { ppp: 6000, reviews: 60, owned: [], wishlist: [], wearing: { name: null, border: null }, hearts: {} });
    });

    test("buying: P-PP only, burned, once; the review requirement checked as it's bought", async () => {
        const buyer = await member("buyer", { reviews: 50, pp: 99999, ppp: 5400 });

        const tooFew = await call(buyer, "POST", "/black-market/buy", { itemId: "name.fire.blue" });
        assert.equal(tooFew.status, 403);
        assert.match(tooFew.body.error, /needs 150 reviews, and you have 50/);

        // 99,999 PP doesn't count: P-PP only.
        const pricey = await call(buyer, "POST", "/black-market/buy", { itemId: "border.ripple.green" });
        assert.equal(pricey.status, 400);
        assert.match(pricey.body.error, /costs 5,500 P-PP, and you have 5,400. The Black Market only takes P-PP/);

        const bought = await call(buyer, "POST", "/black-market/buy", { itemId: "name.neon.blue" });
        assert.equal(bought.status, 201);
        assert.deepEqual(bought.body.done, { item: "name.neon.blue", price: 5000, ppp: 400 });
        assert.deepEqual(await walletOf(buyer), { pp: 99999, ppp: 400, lastPayoutDay: null });
        assert.deepEqual(bought.body.view.owned, ["name.neon.blue"]);
        const receipt = await WalletTx.findOne({ user: buyer._id, reason: "blackMarket" }).lean();
        assert.deepEqual([receipt.pp, receipt.ppp], [0, -5000]);

        const again = await call(buyer, "POST", "/black-market/buy", { itemId: "name.neon.blue" });
        assert.equal(again.status, 409);
        assert.equal((await walletOf(buyer)).ppp, 400);

        const broke = await call(buyer, "POST", "/black-market/buy", { itemId: "name.metal.chrome" });
        assert.equal(broke.status, 400);
        assert.match(broke.body.error, /costs 1,000 P-PP, and you have 400/);
        assert.equal(await CosmeticOwned.countDocuments({ user: buyer._id }), 1, "not paid for: not theirs");

        for (const itemId of ["name.default", "nonsense", 42, null]) {
            assert.ok([400, 404].includes((await call(buyer, "POST", "/black-market/buy", { itemId })).status), String(itemId));
        }
    });

    test("two clicks at once buy it once, and pay once", async () => {
        const quick = await member("quickBuyer", { reviews: 20, ppp: 5000 });
        const results = await Promise.all(Array.from({ length: 4 }, () => call(quick, "POST", "/black-market/buy", { itemId: "border.metal.bronze" })));
        assert.equal(results.filter((result) => result.status === 201).length, 1);
        assert.equal((await walletOf(quick)).ppp, 4000);
        assert.equal(await CosmeticOwned.countDocuments({ user: quick._id }), 1);
    });

    test("wearing: only what you own, the right kind; Default takes it off; it shows on your review cards", async () => {
        const wearer = await member("wearer", { reviews: 25, ppp: 10000 });
        assert.equal((await call(wearer, "PUT", "/black-market/wear", { type: "name", itemId: "name.lava" })).status, 403);

        await call(wearer, "POST", "/black-market/buy", { itemId: "name.lava" });
        await call(wearer, "POST", "/black-market/buy", { itemId: "border.metal.chrome" });
        assert.equal((await call(wearer, "PUT", "/black-market/wear", { type: "border", itemId: "name.lava" })).status, 400);
        assert.equal((await call(wearer, "PUT", "/black-market/wear", { type: "hat", itemId: "name.lava" })).status, 400);

        const worn = await call(wearer, "PUT", "/black-market/wear", { type: "name", itemId: "name.lava" });
        assert.deepEqual(worn.body.done, { name: "name.lava", border: null });
        await call(wearer, "PUT", "/black-market/wear", { type: "border", itemId: "border.metal.chrome" });

        // On their review cards, via the member summary every page gets.
        const one = await Review.findOne({ user: wearer._id }).select("_id").lean();
        const theirs = (await call(wearer, "GET", `/reviews/${one._id}`)).body;
        assert.deepEqual(theirs.user.cosmetics, { name: "name.lava", border: "border.metal.chrome" });

        // Bought for good: fewer reviews later doesn't take it away.
        await Review.deleteMany({ user: wearer._id });
        assert.equal((await call(wearer, "PUT", "/black-market/wear", { type: "name", itemId: "name.lava" })).status, 200);

        const off = await call(wearer, "PUT", "/black-market/wear", { type: "name", itemId: "name.default" });
        assert.deepEqual(off.body.done, { name: null, border: "border.metal.chrome" });
        const offToo = await call(wearer, "PUT", "/black-market/wear", { type: "border", itemId: null });
        assert.deepEqual(offToo.body.view.wearing, { name: null, border: null });
    });

    test("hearts: a wishlist, owned or not, counted for Popular; twice is once; Default and nonsense refused", async () => {
        const fan = await member("fan", { reviews: 60, ppp: 6000 });
        const other = await member("otherFan");
        const heart = (user, itemId, on) => call(user, "PUT", "/black-market/wishlist", { itemId, on });

        const first = await heart(fan, "name.neon.blue", true);
        assert.equal(first.status, 200, JSON.stringify(first.body));
        assert.deepEqual(first.body.done, { item: "name.neon.blue", on: true });
        assert.deepEqual(first.body.view.wishlist, ["name.neon.blue"]);
        assert.equal(first.body.view.hearts["name.neon.blue"], 1);

        // Twice is once; someone else's heart adds to the count.
        await heart(fan, "name.neon.blue", true);
        await heart(other, "name.neon.blue", true);
        await heart(other, "border.rainbow", true);
        const both = (await call(fan, "GET", "/black-market")).body;
        assert.deepEqual(both.wishlist, ["name.neon.blue"]);
        assert.equal(both.hearts["name.neon.blue"], 2);
        assert.equal(both.hearts["border.rainbow"], 1);

        // Bought, it stays hearted.
        assert.equal((await call(fan, "POST", "/black-market/buy", { itemId: "name.neon.blue" })).status, 201);
        assert.deepEqual((await call(fan, "GET", "/black-market")).body.wishlist, ["name.neon.blue"]);

        // Taking it off.
        const off = await heart(fan, "name.neon.blue", false);
        assert.deepEqual(off.body.view.wishlist, []);
        assert.equal(off.body.view.hearts["name.neon.blue"], 1);
        assert.equal((await heart(fan, "name.neon.blue", false)).status, 200);

        assert.equal((await heart(fan, "name.default", true)).status, 400);
        assert.equal((await heart(fan, "name.nonsense", true)).status, 404);
        assert.equal((await heart(fan, "border.rainbow", "yes")).status, 400);
        assert.equal(await CosmeticWish.countDocuments({ user: fan._id }), 0);

        // Deleting an account takes its hearts with it.
        await require("../utils/blackMarket").forgetCosmetics(other._id);
        assert.deepEqual((await call(fan, "GET", "/black-market")).body.hearts, {});
    });

    test("the developer test tool is for admins only", async () => {
        const someone = await member("someone");
        const admin = await member("theAdmin", { role: "admin" });
        assert.equal((await call(someone, "GET", "/black-market/dev")).status, 403);
        assert.deepEqual((await call(admin, "GET", "/black-market/dev")).body, { ok: true });
    });
});
