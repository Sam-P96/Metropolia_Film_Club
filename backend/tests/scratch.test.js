// Box Office Scratch tests: the game logic, and the routes against a real
// MongoDB, including double taps and requests racing each other.
//
// From backend/, with a MongoDB running:
//   PowerShell:  $env:MONGO_TEST_URI="mongodb://127.0.0.1:27017/kino_test"; npm test
//   bash:        MONGO_TEST_URI=mongodb://127.0.0.1:27017/kino_test npm test
// The database is wiped first, so its name has to end in "_test". Without
// MONGO_TEST_URI only the game logic tests run.
const { test, describe, before, after } = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("crypto");

process.env.SECRET ??= "scratch-test-secret";
const mongoose = require("mongoose");
const express = require("express");
const jwt = require("jsonwebtoken");

const { SCRATCH } = require("../../shared/scratch/config.js");
const engine = require("../games/scratch/engine");

const STAR = "star";
const BLANK = "blank";
const GOLDEN = "golden";

// A layout with stars where we want them.
function layoutWith({ stars = [], golden = null }) {
    const layout = Array(engine.TILE_COUNT).fill(BLANK);
    for (const tile of stars) layout[tile] = STAR;
    if (golden !== null) layout[golden] = GOLDEN;
    return layout;
}

describe("the game logic", () => {
    test("a new card has 16 tiles, exactly 5 stars, and at most one Golden Ticket, never on a star", () => {
        for (let i = 0; i < 5000; i++) {
            const layout = engine.newLayout();
            assert.equal(layout.length, SCRATCH.rows * SCRATCH.cols);
            assert.equal(layout.filter((tile) => tile === STAR).length, SCRATCH.stars);
            assert.ok(layout.filter((tile) => tile === GOLDEN).length <= 1);
        }
    });

    test("the Golden Ticket goes on a blank when the 1 in 200 comes up", () => {
        // A "random" source that always says 0: the stars land first, and the golden check passes.
        const layout = engine.newLayout(() => 0);
        assert.equal(layout.filter((tile) => tile === STAR).length, SCRATCH.stars);
        assert.equal(layout.filter((tile) => tile === GOLDEN).length, 1);
    });

    test("the seal is sha256 of the layout and the salt, and changes with either", () => {
        const layout = engine.newLayout();
        const { salt, hash } = engine.sealLayout(layout);
        const expected = crypto.createHash("sha256").update(JSON.stringify(layout) + salt).digest("hex");
        assert.equal(hash, expected);
        assert.notEqual(engine.hashLayout(layout, `${salt}x`), hash);
    });

    for (const tier of SCRATCH.tiers) {
        test(`the 3rd star on scratch ${tier.scratch} locks in ${tier.name}`, () => {
            // Blanks first, then the three stars, the last on scratch `tier.scratch`.
            const order = [5, 6, 7, 8, 9, 10, 11];
            const stars = [0, 1, 2];
            const scratches = [...order.slice(0, tier.scratch - 3), ...stars];
            const card = { layout: layoutWith({ stars: [0, 1, 2, 3, 4] }), scratched: [], starsFound: 0, tier: null };
            let locked = null;
            for (const tile of scratches) {
                const result = engine.scratchTile(card, tile);
                card.scratched.push(tile);
                card.starsFound = result.starsFound;
                if (result.tier) locked = result.tier;
            }
            assert.equal(locked, tier.key);
        });
    }

    test("after the tier is locked, more stars pay nothing extra", () => {
        const card = { layout: layoutWith({ stars: [0, 1, 2, 3, 4] }), scratched: [0, 1, 2], starsFound: 3, tier: "smash" };
        const result = engine.scratchTile(card, 3);
        assert.equal(result.starsFound, 4);
        assert.equal(result.tier, null);
    });

    test("only two stars in seven scratches is a loss", () => {
        const card = { layout: layoutWith({ stars: [0, 1, 2, 3, 4] }), scratched: [], starsFound: 0, tier: null };
        for (const tile of [0, 1, 5, 6, 7, 8, 9]) {
            const result = engine.scratchTile(card, tile);
            card.scratched.push(tile);
            card.starsFound = result.starsFound;
            assert.equal(result.tier, null);
        }
    });

    for (const [label, tile] of [["-1", -1], ["16", 16], ["1.5", 1.5], ['"3"', "3"], ["nothing", undefined]]) {
        test(`tile ${label} is refused`, () => {
            const card = { layout: layoutWith({}), scratched: [], starsFound: 0, tier: null };
            assert.throws(() => engine.scratchTile(card, tile), engine.ScratchError);
        });
    }
});

const uri = process.env.MONGO_TEST_URI;
const dbName = uri ? new URL(uri).pathname.slice(1) : "";

describe("the scratch routes", { skip: !uri ? "set MONGO_TEST_URI to run these" : !dbName.endsWith("_test") ? "MONGO_TEST_URI's database must end in _test" : false }, () => {
    let base;
    let server;
    let User;
    let ScratchCard;
    let Jackpot;
    let WalletTx;
    let Notification;
    let Follow;
    const tokens = new Map();

    before(async () => {
        await mongoose.connect(uri);
        await mongoose.connection.dropDatabase();
        User = require("../models/userModel");
        ScratchCard = require("../models/scratchCardModel");
        Jackpot = require("../models/jackpotModel");
        WalletTx = require("../models/walletTxModel");
        Notification = require("../models/notificationModel");
        Follow = require("../models/followModel");
        await Promise.all([User, ScratchCard, Jackpot, WalletTx, Notification].map((model) => model.syncIndexes()));

        const app = express();
        app.use(express.json());
        app.use("/api/scratch", require("../routes/scratchRouter"));
        app.use((error, req, res, next) => {
            console.error(error);
            res.status(500).json({ error: "Something went wrong" });
        });
        server = app.listen(0);
        base = `http://127.0.0.1:${server.address().port}/api/scratch`;
    });

    after(async () => {
        server?.close();
        await mongoose.disconnect();
    });

    let count = 0;
    async function member(pp, ppp = 0) {
        count += 1;
        const user = await User.create({ username: `scratcher${count}`, email: `s${count}@test.invalid`, password: "x", wallet: { pp, ppp } });
        tokens.set(String(user._id), jwt.sign({ _id: user._id }, process.env.SECRET));
        return user;
    }
    async function call(user, method, path, body) {
        const response = await fetch(base + path, {
            method,
            headers: { Authorization: `Bearer ${tokens.get(String(user._id))}`, "Content-Type": "application/json" },
            body: body === undefined ? undefined : JSON.stringify(body),
        });
        return { status: response.status, body: await response.json().catch(() => null) };
    }
    const buy = (user) => call(user, "POST", "/cards");
    const scratch = (user, card, tile) => call(user, "POST", `/cards/${card._id}/scratch`, { tile });
    const walletOf = async (user) => (await User.findById(user._id).select("wallet").lean()).wallet;
    const pool = async () => (await Jackpot.findById("main").lean())?.amount;
    const rig = (card, layout) => ScratchCard.updateOne({ _id: card._id }, { $set: { layout } });

    test("buying takes PP first, then P-PP, records it, seals the card and adds to the jackpot", async () => {
        const user = await member(4, 50);
        const before = (await call(user, "GET", "/jackpot")).body.amount;
        const { status, body } = await buy(user);
        assert.equal(status, 201);
        assert.deepEqual(body.spent, { pp: 4, ppp: 6 });
        assert.deepEqual(await walletOf(user), { pp: 0, ppp: 44, lastPayoutDay: null });
        assert.match(body.hash, /^[0-9a-f]{64}$/);
        assert.equal(await pool(), before + SCRATCH.jackpotContribution);
        const receipt = await WalletTx.findOne({ user: user._id, reason: "scratchTicket" }).lean();
        assert.deepEqual([receipt.pp, receipt.ppp, String(receipt.card)], [-4, -6, String(body._id)]);
    });

    test("the card never carries what's under unscratched tiles", async () => {
        const user = await member(100);
        const { body } = await buy(user);
        const text = JSON.stringify(body);
        assert.ok(!("layout" in body) && !("salt" in body));
        assert.ok(body.tiles.every((tile) => tile === null));
        // No tile value anywhere ("starsFound" is a field name, so look for the quoted values).
        assert.doesNotMatch(text, /"(star|golden)"/);
        const current = (await call(user, "GET", "/card")).body.card;
        assert.ok(!("layout" in current) && current.tiles.every((tile) => tile === null));
    });

    test("not enough points: 400, nothing taken, no card left behind", async () => {
        const user = await member(3, 6);
        const { status, body } = await buy(user);
        assert.equal(status, 400);
        assert.match(body.error, /you have 9/);
        assert.equal(await ScratchCard.countDocuments({ user: user._id }), 0);
        assert.deepEqual(await walletOf(user), { pp: 3, ppp: 6, lastPayoutDay: null });
    });

    test("double-clicking Buy buys one card and charges once", async () => {
        const user = await member(100);
        const results = await Promise.all([buy(user), buy(user), buy(user)]);
        assert.deepEqual(results.map((r) => r.status).sort(), [201, 409, 409]);
        assert.equal(await ScratchCard.countDocuments({ user: user._id }), 1);
        assert.equal((await walletOf(user)).pp, 100 - SCRATCH.ticketPrice);
        assert.equal(await WalletTx.countDocuments({ user: user._id, reason: "scratchTicket" }), 1);
    });

    test("one card at a time, and coming back resumes it", async () => {
        const user = await member(100);
        const card = (await buy(user)).body;
        await scratch(user, card, 5);
        assert.equal((await buy(user)).status, 409);
        const current = (await call(user, "GET", "/card")).body.card;
        assert.equal(current._id, card._id);
        assert.deepEqual(current.scratched, [5]);
    });

    test("a scratch reveals that tile only", async () => {
        const user = await member(100);
        const card = (await buy(user)).body;
        await rig(card, layoutWith({ stars: [0, 1, 2, 3, 4] }));
        const { status, body } = await scratch(user, card, 2);
        assert.equal(status, 200);
        assert.deepEqual(body.tile, { index: 2, content: STAR });
        assert.deepEqual(body.card.tiles.map((tile, i) => (tile === null ? null : i)).filter((i) => i !== null), [2]);
        assert.equal(body.card.starsFound, 1);
        assert.equal(body.card.scratchesLeft, SCRATCH.scratches - 1);
    });

    for (const [label, tile] of [["-1", -1], ["16", 16], ["1.5", 1.5], ['"3"', "3"], ["missing", undefined]]) {
        test(`scratching tile ${label} -> 400`, async () => {
            const user = await member(100);
            const card = (await buy(user)).body;
            assert.equal((await scratch(user, card, tile)).status, 400);
        });
    }

    test("someone else's card, or a nonsense id -> 404", async () => {
        const owner = await member(100);
        const other = await member(100);
        const card = (await buy(owner)).body;
        assert.equal((await scratch(other, card, 0)).status, 404);
        assert.equal((await scratch(owner, { _id: "nope" }, 0)).status, 404);
        assert.equal((await call(other, "GET", `/cards/${card._id}/reveal`)).status, 404);
    });

    test("a tile already scratched -> 409", async () => {
        const user = await member(100);
        const card = (await buy(user)).body;
        await scratch(user, card, 4);
        assert.equal((await scratch(user, card, 4)).status, 409);
    });

    test("double-tapping a tile reveals it once", async () => {
        const user = await member(100);
        const card = (await buy(user)).body;
        const results = await Promise.all([scratch(user, card, 7), scratch(user, card, 7), scratch(user, card, 7)]);
        assert.deepEqual(results.map((r) => r.status).sort(), [200, 409, 409]);
        assert.deepEqual((await ScratchCard.findById(card._id).lean()).scratched, [7]);
    });

    test("scratching several tiles at once only lets one through", async () => {
        const user = await member(100);
        const card = (await buy(user)).body;
        const results = await Promise.all([0, 1, 2, 3, 4, 5].map((tile) => scratch(user, card, tile)));
        const ok = results.filter((r) => r.status === 200).length;
        assert.equal(ok, 1);
        assert.equal((await ScratchCard.findById(card._id).lean()).scratched.length, 1);
    });

    test("no scratches after the 7th: the card is complete", async () => {
        const user = await member(100);
        const card = (await buy(user)).body;
        let last;
        for (let tile = 0; tile < SCRATCH.scratches; tile++) last = await scratch(user, card, tile);
        assert.equal(last.body.card.status, "complete");
        assert.equal(last.body.card.scratchesLeft, 0);
        assert.equal((await scratch(user, card, 10)).status, 409);
        assert.equal((await buy(user)).status, 201, "a new card can be bought once it's done");
    });

    test("Box Office Smash: 80 P-PP the moment the 3rd star turns up on scratch 3; followers hear", async () => {
        const user = await member(100);
        const fan = await member(0);
        await Follow.create({ follower: fan._id, following: user._id });
        const card = (await buy(user)).body;
        await rig(card, layoutWith({ stars: [0, 1, 2, 3, 4] }));
        await scratch(user, card, 0);
        await scratch(user, card, 1);
        const { body } = await scratch(user, card, 2);
        assert.equal(body.card.tier.key, "smash");
        assert.equal(body.card.status, "active", "the card goes on: the Golden Ticket hunt");
        assert.deepEqual(await walletOf(user), { pp: 90, ppp: 80, lastPayoutDay: null });
        const notice = await Notification.findOne({ recipient: fan._id, type: "scratchWin" }).lean();
        assert.deepEqual([notice.tier, notice.amount, String(notice.actors[0])], ["smash", 80, String(user._id)]);
        // More stars pay nothing extra.
        await scratch(user, card, 3);
        assert.equal((await walletOf(user)).ppp, 80);
        assert.equal(await WalletTx.countDocuments({ user: user._id, reason: "scratchWin" }), 1);
    });

    test("Straight to DVD hands back exactly what the ticket took, PP as PP and P-PP as P-PP", async () => {
        const user = await member(3, 50);
        const card = (await buy(user)).body; // 3 PP + 7 P-PP
        await rig(card, layoutWith({ stars: [10, 11, 12, 13, 14] }));
        for (const tile of [0, 1, 2, 3, 10, 11]) await scratch(user, card, tile);
        const { body } = await scratch(user, card, 12);
        assert.equal(body.card.tier.key, "dvd");
        assert.deepEqual(await walletOf(user), { pp: 3, ppp: 50, lastPayoutDay: null });
        const refund = await WalletTx.findOne({ user: user._id, reason: "scratchRefund" }).lean();
        assert.deepEqual([refund.pp, refund.ppp], [3, 7]);
    });

    test("fewer than 3 stars after 7 scratches: Box Office Bomb, nothing paid", async () => {
        const user = await member(10);
        const card = (await buy(user)).body;
        await rig(card, layoutWith({ stars: [10, 11, 12, 13, 14] }));
        let last;
        for (const tile of [0, 1, 2, 3, 4, 10, 11]) last = await scratch(user, card, tile);
        assert.equal(last.body.card.tier, null);
        assert.equal(last.body.card.status, "complete");
        assert.deepEqual(await walletOf(user), { pp: 0, ppp: 0, lastPayoutDay: null });
    });

    test("the Golden Ticket wins the whole pool, which goes back to the seed; everyone hears", async () => {
        const user = await member(100);
        const bystander = await member(0);
        const card = (await buy(user)).body;
        const won = await pool();
        await rig(card, layoutWith({ stars: [0, 1, 2, 3, 4], golden: 9 }));
        const { body } = await scratch(user, card, 9);
        assert.equal(body.tile.content, GOLDEN);
        assert.equal(body.card.jackpotAmount, won);
        assert.equal((await walletOf(user)).ppp, won);
        assert.equal(await pool(), SCRATCH.jackpotSeed);
        const recent = (await call(user, "GET", "/jackpot")).body.recent[0];
        assert.deepEqual([recent.username, recent.amount], [user.username, won]);
        assert.ok(await Notification.findOne({ recipient: bystander._id, type: "scratchJackpot", amount: won }).lean());
    });

    test("two Golden Tickets found at the same moment can't both take the same pool", async () => {
        const a = await member(100);
        const b = await member(100);
        const cardA = (await buy(a)).body;
        const cardB = (await buy(b)).body;
        await rig(cardA, layoutWith({ stars: [0, 1, 2, 3, 4], golden: 9 }));
        await rig(cardB, layoutWith({ stars: [0, 1, 2, 3, 4], golden: 9 }));
        const inPool = await pool();
        await Promise.all([scratch(a, cardA, 9), scratch(b, cardB, 9)]);
        const paid = [(await walletOf(a)).ppp, (await walletOf(b)).ppp].sort((x, y) => x - y);
        assert.deepEqual(paid, [SCRATCH.jackpotSeed, inPool], "one gets the pool, the other the fresh seed");
        assert.equal(await pool(), SCRATCH.jackpotSeed);
    });

    test("Collect ends the card early; the scratches left can't be used", async () => {
        const user = await member(100);
        const card = (await buy(user)).body;
        await scratch(user, card, 0);
        const { status, body } = await call(user, "POST", `/cards/${card._id}/collect`);
        assert.equal(status, 200);
        assert.equal(body.status, "complete");
        assert.equal((await scratch(user, card, 1)).status, 409);
        assert.equal((await call(user, "POST", `/cards/${card._id}/collect`)).status, 409);
    });

    test("Reveal: only once the card is done, and the layout and salt match the seal", async () => {
        const user = await member(100);
        const card = (await buy(user)).body;
        assert.equal((await call(user, "GET", `/cards/${card._id}/reveal`)).status, 409);
        await call(user, "POST", `/cards/${card._id}/collect`);
        const { status, body } = await call(user, "GET", `/cards/${card._id}/reveal`);
        assert.equal(status, 200);
        assert.equal(body.layout.length, engine.TILE_COUNT);
        const check = crypto.createHash("sha256").update(JSON.stringify(body.layout) + body.salt).digest("hex");
        assert.equal(check, card.hash);
    });

    test("the sweep pays a win a failure left unpaid, once", async () => {
        const { sweepScratchCards } = require("../utils/scratch");
        const user = await member(100);
        const card = (await buy(user)).body;
        // As if the server stopped right after locking the tier in.
        await ScratchCard.updateOne({ _id: card._id }, { $set: { tier: "darling", prizePaid: false } });
        await Promise.all([sweepScratchCards(), sweepScratchCards()]);
        assert.equal((await walletOf(user)).ppp, 40);
        assert.equal(await WalletTx.countDocuments({ user: user._id, reason: "scratchWin" }), 1);
    });
});
