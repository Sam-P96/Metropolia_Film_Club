// Catflix No Chill's Trade Spell (utils/catflix/trades.js): a card (and
// points) offered to a friend, their answer, taking it or not, and trades
// that run out of time. Through the real API, against a real MongoDB.
//
// From backend/, with a MongoDB running:
//   PowerShell:  $env:MONGO_TEST_URI="mongodb://127.0.0.1:27017/kino_test"; npm test
//   bash:        MONGO_TEST_URI=mongodb://127.0.0.1:27017/kino_test npm test
// The database is wiped first, so its name has to end in "_test".
const { test, describe, before, after } = require("node:test");
const assert = require("node:assert/strict");

process.env.SECRET ??= "catflix-trades-test-secret";

const uri = process.env.MONGO_TEST_URI;
const dbName = uri ? new URL(uri).pathname.slice(1) : "";

describe("Trade Spell", { skip: !uri ? "set MONGO_TEST_URI to run these" : !dbName.endsWith("_test") ? "MONGO_TEST_URI's database must end in _test" : false }, () => {
    const mongoose = require("mongoose");
    const express = require("express");
    const jwt = require("jsonwebtoken");
    let base;
    let server;
    let User;
    let Follow;
    let CatflixPet;
    let CatflixPlayer;
    let CatflixTrade;
    let Notification;
    let WalletTx;
    let trades;
    const tokens = new Map();

    before(async () => {
        await mongoose.connect(uri);
        await mongoose.connection.dropDatabase();
        User = require("../models/userModel");
        Follow = require("../models/followModel");
        CatflixPet = require("../models/catflixPetModel");
        CatflixPlayer = require("../models/catflixPlayerModel");
        CatflixTrade = require("../models/catflixTradeModel");
        Notification = require("../models/notificationModel");
        WalletTx = require("../models/walletTxModel");
        trades = require("../utils/catflix/trades");
        await Promise.all([User, Follow, CatflixPet, CatflixPlayer, CatflixTrade, require("../models/petFormModel")].map((model) => model.syncIndexes()));
        await require("../models/petBaseFormModel").create({ _id: "catbase1", name: "Cat", anims: {}, fur: [] });
        const PetForm = require("../models/petFormModel");
        for (const [id, rarity] of [["common1", "common"], ["rare001", "rare"], ["legend1", "legendary"]]) await PetForm.create({ _id: id, name: `Form ${id}`, baseFormId: "catbase1", rarity });

        const app = express();
        app.use(express.json());
        app.use("/api/catflix", require("../routes/catflixRouter"));
        app.use((error, req, res, next) => {
            console.error(error);
            res.status(500).json({ error: "Something went wrong" });
        });
        server = app.listen(0);
        base = `http://127.0.0.1:${server.address().port}/api/catflix`;
    });

    after(async () => {
        server?.close();
        await mongoose.disconnect();
    });

    let count = 0;
    // A member with points and cards (form id -> how many).
    async function member({ pp = 0, ppp = 0, cards = {} } = {}) {
        count += 1;
        const user = await User.create({ username: `trader${count}`, email: `tr${count}@test.invalid`, password: "x", wallet: { pp, ppp } });
        tokens.set(String(user._id), jwt.sign({ _id: user._id }, process.env.SECRET));
        await CatflixPlayer.create({ user: user._id, cards });
        return user;
    }
    const befriend = (a, b) => Follow.create([{ follower: a._id, following: b._id }, { follower: b._id, following: a._id }]);
    async function call(user, method, path, body) {
        const response = await fetch(base + path, {
            method,
            headers: { Authorization: `Bearer ${tokens.get(String(user._id))}`, "Content-Type": "application/json" },
            body: body === undefined ? undefined : JSON.stringify(body),
        });
        return { status: response.status, body: await response.json().catch(() => null) };
    }
    const walletOf = async (user) => {
        const { wallet } = await User.findById(user._id).select("wallet").lean();
        return { pp: wallet.pp, ppp: wallet.ppp };
    };
    const cardsOf = async (user) => {
        const player = await CatflixPlayer.findOne({ user: user._id }).lean();
        return Object.fromEntries(Object.entries(player.cards ?? {}).filter(([, n]) => n > 0));
    };
    const notes = (user, type) => Notification.find({ recipient: user._id, type }).lean();

    test("only friends; a card has to be offered; the card and points are held from the offer; the friend's notice is pinned", async () => {
        const [sam, ana, stranger] = [await member({ pp: 300, ppp: 1000, cards: { common1: 2 } }), await member(), await member()];
        await befriend(sam, ana);
        await Follow.create({ follower: sam._id, following: stranger._id });

        assert.equal((await call(sam, "POST", "/trades", { to: stranger._id, card: "common1" })).status, 403, "following isn't enough: both ways");
        assert.match((await call(sam, "POST", "/trades", { to: ana._id, points: 50 })).body.error, /Pick a card/);
        assert.equal((await call(sam, "POST", "/trades", { to: ana._id, card: "rare001" })).status, 409, "not in their deck");
        assert.equal((await call(sam, "POST", "/trades", { to: sam._id, card: "common1" })).status, 400);

        const sent = await call(sam, "POST", "/trades", { to: ana._id, card: "common1", points: 500 });
        assert.equal(sent.status, 200);
        assert.deepEqual(await cardsOf(sam), { common1: 1 }, "one copy held");
        assert.deepEqual(await walletOf(sam), { pp: 0, ppp: 800 }, "PP first, then P-PP");
        assert.equal(sent.body.trades.length, 1);
        assert.equal(sent.body.trades[0].status, "offered");
        assert.equal(sent.body.trades[0].yourTurn, false);
        assert.deepEqual(sent.body.friends.map((f) => f.username), [ana.username], "friends to trade with");

        const offer = await notes(ana, "tradeOffer");
        assert.equal(offer.length, 1);
        assert.equal(offer[0].pinned, true, "at the top of their notifications");
        const seen = await call(ana, "GET", "/trades");
        assert.equal(seen.body.trades[0].yourTurn, true);
        assert.deepEqual(seen.body.trades[0].offer, { card: "common1", cardName: "Form common1", rarity: "common", points: 500 });
    });

    test("the friend answers (just PP, a card, or both), the one who offered takes it: each gets the other's side", async () => {
        const [sam, ana] = [await member({ ppp: 1000, cards: { common1: 1 } }), await member({ pp: 100, ppp: 400, cards: { legend1: 1 } })];
        await befriend(sam, ana);
        const { body } = await call(sam, "POST", "/trades", { to: ana._id, card: "common1", points: 200 });
        const id = body.trades[0].id;

        assert.match((await call(ana, "POST", `/trades/${id}/counter`, {})).body.error, /card, points, or both/);
        assert.equal((await call(sam, "POST", `/trades/${id}/counter`, { points: 5 })).status, 404, "not theirs to answer");
        const answered = await call(ana, "POST", `/trades/${id}/counter`, { card: "legend1", points: 300 });
        assert.equal(answered.status, 200);
        assert.deepEqual(await cardsOf(ana), {}, "their card held");
        assert.deepEqual(await walletOf(ana), { pp: 0, ppp: 200 });
        assert.equal((await notes(ana, "tradeOffer")).length, 0, "the offer's notice goes");
        const answer = await notes(sam, "tradeCounter");
        assert.equal(answer.length, 1);
        assert.equal(answer[0].pinned, true);
        assert.equal((await call(ana, "POST", `/trades/${id}/accept`)).status, 404, "only the one who offered takes it");
        assert.equal((await call(ana, "POST", `/trades/${id}/decline`)).status, 409, "they've answered: it's up to them");

        const done = await call(sam, "POST", `/trades/${id}/accept`);
        assert.equal(done.status, 200);
        assert.deepEqual(done.body.trades, [], "nothing open");
        assert.deepEqual(await cardsOf(sam), { legend1: 1 });
        assert.deepEqual(await cardsOf(ana), { common1: 1 });
        assert.deepEqual(await walletOf(sam), { pp: 100, ppp: 1000 }, "300 of theirs, as they paid it (100 PP, 200 P-PP), for the 200 put in");
        assert.deepEqual(await walletOf(ana), { pp: 0, ppp: 400 });
        assert.equal((await notes(sam, "tradeCounter")).length, 0);
        assert.equal((await notes(ana, "tradeDone")).length, 1);
        assert.equal(await WalletTx.countDocuments({ reason: "catflixTrade", other: { $in: [sam._id, ana._id] } }), 4, "in and across, each side");
        assert.equal((await call(sam, "POST", `/trades/${id}/accept`)).status, 404, "once");
    });

    test("turned down, taken back, or answered with just PP: everything held goes back where it came from", async () => {
        const [sam, ana] = [await member({ ppp: 500, cards: { rare001: 1 } }), await member({ ppp: 500, cards: { common1: 1 } })];
        await befriend(sam, ana);

        // The friend turns the offer down.
        let id = (await call(sam, "POST", "/trades", { to: ana._id, card: "rare001", points: 100 })).body.trades[0].id;
        assert.equal((await call(ana, "POST", `/trades/${id}/decline`)).status, 200);
        assert.deepEqual([await cardsOf(sam), await walletOf(sam)], [{ rare001: 1 }, { pp: 0, ppp: 500 }]);
        assert.equal((await notes(sam, "tradeDeclined")).length, 1);
        assert.equal((await notes(ana, "tradeOffer")).length, 0);

        // Taken back before an answer: nobody's told.
        id = (await call(sam, "POST", "/trades", { to: ana._id, card: "rare001" })).body.trades[0].id;
        assert.equal((await call(sam, "POST", `/trades/${id}/decline`)).status, 200);
        assert.equal((await CatflixTrade.findById(id).lean()).status, "cancelled");
        assert.deepEqual(await cardsOf(sam), { rare001: 1 });
        assert.equal((await notes(ana, "tradeDeclined")).length, 0);

        // Answered with just PP, then turned down by the one who offered: both get theirs back.
        id = (await call(sam, "POST", "/trades", { to: ana._id, card: "rare001" })).body.trades[0].id;
        assert.equal((await call(ana, "POST", `/trades/${id}/counter`, { points: 250 })).status, 200);
        assert.deepEqual(await walletOf(ana), { pp: 0, ppp: 250 });
        assert.equal((await call(sam, "POST", `/trades/${id}/decline`)).status, 200);
        assert.deepEqual([await cardsOf(sam), await cardsOf(ana), await walletOf(ana)], [{ rare001: 1 }, { common1: 1 }, { pp: 0, ppp: 500 }]);
        assert.equal((await notes(ana, "tradeDeclined")).length, 1);
        assert.equal(await WalletTx.countDocuments({ user: ana._id, reason: "catflixTradeBack" }), 1);
    });

    test("never the only copy of the card your cat's wearing; at most 10 open trades", async () => {
        const sam = await member({ cards: { common1: 1, rare001: 12 } });
        const ana = await member();
        await befriend(sam, ana);
        await CatflixPet.create({ owner: sam._id, name: "Mochi", skinId: "common1" });
        assert.match((await call(sam, "POST", "/trades", { to: ana._id, card: "common1" })).body.error, /wearing your only copy/);
        for (let i = 0; i < 10; i++) assert.equal((await call(sam, "POST", "/trades", { to: ana._id, card: "rare001" })).status, 200);
        assert.equal((await call(sam, "POST", "/trades", { to: ana._id, card: "rare001" })).status, 409, "10 open at most");
    });

    test("3 days to answer, then 3 days to take it: not answered in time, everything goes back and whoever was waiting hears", async () => {
        const [sam, ana] = [await member({ ppp: 100, cards: { common1: 1 } }), await member({ ppp: 100, cards: { rare001: 1 } })];
        await befriend(sam, ana);
        const day = 24 * 60 * 60 * 1000;

        // Not answered.
        let id = (await call(sam, "POST", "/trades", { to: ana._id, card: "common1", points: 40 })).body.trades[0].id;
        const sent = await CatflixTrade.findById(id).lean();
        assert.ok(Math.abs(sent.expiresAt - sent.createdAt - 3 * day) < 5000, "3 days to answer");
        assert.equal(await trades.sweepTrades(new Date(Date.now() + 2 * day)), 0, "not yet");
        // (Earlier tests' open trades end too.)
        assert.ok((await trades.sweepTrades(new Date(Date.now() + 3 * day + 1000))) >= 1);
        assert.equal((await CatflixTrade.findById(id).lean()).status, "expired");
        assert.deepEqual([await cardsOf(sam), await walletOf(sam)], [{ common1: 1 }, { pp: 0, ppp: 100 }]);
        assert.equal((await notes(sam, "tradeExpired")).length, 1, "the one who offered hears");
        assert.equal((await notes(ana, "tradeOffer")).length, 0, "the offer's notice is gone");

        // Answered, not taken.
        id = (await call(sam, "POST", "/trades", { to: ana._id, card: "common1" })).body.trades[0].id;
        await call(ana, "POST", `/trades/${id}/counter`, { card: "rare001", points: 60 });
        assert.equal(await trades.sweepTrades(new Date(Date.now() + 3 * day + 1000)), 1);
        assert.deepEqual([await cardsOf(sam), await cardsOf(ana), await walletOf(ana)], [{ common1: 1 }, { rare001: 1 }, { pp: 0, ppp: 100 }]);
        assert.equal((await notes(ana, "tradeExpired")).length, 1, "the friend who answered hears");
        assert.equal((await notes(sam, "tradeCounter")).length, 0);
    });

    test("a member deleting their account: the other side's things come back", async () => {
        const [sam, ana] = [await member({ ppp: 100, cards: { common1: 1 } }), await member({ ppp: 100, cards: { rare001: 1 } })];
        await befriend(sam, ana);
        const id = (await call(sam, "POST", "/trades", { to: ana._id, card: "common1", points: 30 })).body.trades[0].id;
        await call(ana, "POST", `/trades/${id}/counter`, { card: "rare001" });
        await require("../utils/catflix/data").forgetCatflixPlayer(ana._id);
        assert.deepEqual([await cardsOf(sam), await walletOf(sam)], [{ common1: 1 }, { pp: 0, ppp: 100 }]);
        assert.equal(await CatflixTrade.countDocuments({ _id: id }), 0);
        assert.equal(await Notification.countDocuments({ trade: id }), 0);
    });
});
