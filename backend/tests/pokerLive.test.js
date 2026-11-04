// Kino Poker over real sockets, like several browser windows: members log
// in, watch the table, sit down, queue, see only their own cards, drop out
// and leave, against a real MongoDB for the wallet. The table's timers are
// shortened so hands play in a moment.
//
// From backend/, with a MongoDB running:
//   PowerShell:  $env:MONGO_TEST_URI="mongodb://127.0.0.1:27017/kino_test"; npm test
//   bash:        MONGO_TEST_URI=mongodb://127.0.0.1:27017/kino_test npm test
// The database is wiped first, so its name has to end in "_test".
const { test, describe, before, after } = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const http = require("http");

process.env.SECRET ??= "poker-test-secret";
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");

const uri = process.env.MONGO_TEST_URI;
const dbName = uri ? new URL(uri).pathname.slice(1) : "";

// The browser client, from the frontend's packages.
const { io: connect } = require(path.join(__dirname, "..", "..", "frontend", "node_modules", "socket.io-client"));

const FAST = {
    timers: { actSeconds: 0.5, drawSeconds: 0.5, firstHandSeconds: 0.2, nextHandSeconds: 0.3, dealSeconds: 0.1, reconnectSeconds: 0.6 },
    thinkMs: [5, 15],
};

describe("Kino Poker, live", { skip: !uri ? "set MONGO_TEST_URI to run these" : !dbName.endsWith("_test") ? "MONGO_TEST_URI's database must end in _test" : false }, () => {
    let server;
    let url;
    let User;
    let WalletTx;
    let PokerSeat;
    let table;
    const sockets = [];

    before(async () => {
        await mongoose.connect(uri);
        await mongoose.connection.dropDatabase();
        User = require("../models/userModel");
        WalletTx = require("../models/walletTxModel");
        PokerSeat = require("../models/pokerSeatModel");
        const GameBan = require("../models/gameBanModel");
        await Promise.all([User, WalletTx, PokerSeat, GameBan].map((model) => model.syncIndexes()));

        server = http.createServer();
        const io = require("../games/farkle/live").startLive(server);
        table = require("../games/poker/live").startPoker(io, FAST);
        await new Promise((resolve) => server.listen(0, resolve));
        url = `http://127.0.0.1:${server.address().port}`;
    });

    after(async () => {
        for (const socket of sockets) socket.disconnect();
        // Stop the table's timers before the database goes.
        await table?.run(() => table.reset());
        await new Promise((resolve) => setTimeout(resolve, 100));
        server?.close();
        await mongoose.connection.dropDatabase().catch(() => {});
        await mongoose.disconnect();
    });

    let count = 0;
    async function member(wallet) {
        count += 1;
        const user = await User.create({ username: `card${count}`, email: `card${count}@test.invalid`, password: "x" });
        await User.collection.updateOne({ _id: user._id }, { $set: { wallet: { pp: 0, ppp: 0, lastPayoutDay: null, ...wallet } } });
        return { user, token: jwt.sign({ _id: user._id }, process.env.SECRET) };
    }

    // A browser window: connected, watching the table, keeping its latest view.
    async function windowFor(account) {
        const socket = connect(url, { auth: { token: account.token }, transports: ["websocket"], forceNew: true });
        sockets.push(socket);
        const page = { socket, state: null, events: [] };
        socket.on("poker:state", (state) => (page.state = state));
        socket.on("poker:event", (event) => page.events.push(event));
        await new Promise((resolve, reject) => {
            socket.on("connect", resolve);
            socket.on("connect_error", reject);
        });
        const watched = await emit(page, "poker:watch");
        page.state = watched.state;
        return page;
    }

    const emit = (page, event, payload = {}) => new Promise((resolve) => page.socket.emit(event, payload, resolve));

    async function until(check, what, ms = 8000) {
        const end = Date.now() + ms;
        while (Date.now() < end) {
            if (check()) return;
            await new Promise((resolve) => setTimeout(resolve, 20));
        }
        throw new Error(`Timed out waiting for ${what}`);
    }

    const walletOf = async (account) => (await User.findById(account.user._id).lean()).wallet;
    const mySeat = (page) => page.state?.seats.find((seat) => seat.seat === page.state.you.seat);

    test("a whole session: sit down, queue, see only your own cards, drop out, leave, get paid", async () => {
        const first = await member({ pp: 30, ppp: 50 });
        const second = await member({ pp: 100, ppp: 0 });
        const watcher = await member({ pp: 0, ppp: 0 });
        const one = await windowFor(first);
        const two = await windowFor(second);
        const three = await windowFor(watcher);

        // An empty table; the first member sits down with three bots. PP first.
        assert.equal(one.state.status, "empty");
        const sat = await emit(one, "poker:join", { buyIn: 40 });
        assert.equal(sat.ok, true, JSON.stringify(sat));
        assert.deepEqual(await walletOf(first), { pp: 0, ppp: 40, lastPayoutDay: null });
        assert.ok(await WalletTx.exists({ user: first.user._id, reason: "pokerBuyIn", pp: -30, ppp: -10 }));
        assert.ok(await PokerSeat.exists({ _id: first.user._id }));
        await until(() => one.state?.seats.length === 4, "three bots to join");
        assert.equal(one.state.seats.filter((seat) => seat.kind === "bot").length, 3);

        // A hand: their own cards only; the watcher sees none at all. The
        // first one opens with every bot saying hello.
        await until(() => one.state?.hand?.phase === "bet1" || one.state?.hand?.phase === "draw", "a hand to start");
        await until(() => one.events.filter((event) => event.type === "say" && event.event === "start").length === 3, "every bot to say hello");
        assert.equal(mySeat(one).cards.length, 5);
        assert.ok(mySeat(one).cards.every((card) => card.code));
        assert.ok(one.state.seats.filter((seat) => seat.kind === "bot" && seat.inHand).every((seat) => seat.cards.every((card) => card.code === null)));
        assert.ok(three.state.seats.every((seat) => seat.cards.every((card) => card.code === null)));
        assert.equal(three.state.you.seat, null);

        // A second member joins mid-hand: queued, then seated between hands in a bot's place.
        if (table.status === "playing") {
            const queued = await emit(two, "poker:join", { buyIn: 50 });
            assert.equal(queued.queued, 1);
        } else {
            await emit(two, "poker:join", { buyIn: 50 });
        }
        await until(() => two.state?.you.seat !== null && two.state?.you.seat !== undefined, "the second member to sit down");
        await until(() => two.state.seats.filter((seat) => seat.kind === "bot").length === 2, "a bot to leave");
        assert.equal(two.state.seats.length, 4);

        // Only one seat each.
        const again = await emit(two, "poker:join", { buyIn: 50 });
        assert.equal(again.code, "SEATED");

        // Emoji: one, shown to everyone; nonsense refused.
        assert.equal((await emit(one, "poker:emoji", { emoji: "😘" })).ok, true);
        assert.equal((await emit(two, "poker:emoji", { emoji: "hello" })).code, "BAD_EMOJI");
        await until(() => three.events.some((event) => event.type === "emoji" && event.emoji === "😘"), "the emoji to reach the watcher");

        // The first member's window closes: they fold, then leave with their chips.
        one.socket.disconnect();
        await until(() => !table.seatOf(first.user._id), "the first member to be cashed out", 12000);
        const paid = await WalletTx.findOne({ user: first.user._id, reason: "pokerCashOut" }).lean();
        const back = await walletOf(first);
        const cashed = paid ? paid.pp + paid.ppp : 0;
        assert.ok(paid, "they were paid out");
        assert.equal(back.pp + back.ppp, 40 + cashed, "wallet = the 40 P-PP left after buying in + what came back");
        assert.ok(back.pp <= 0 + Math.min(30, cashed), "PP only ever comes back up to the PP that went in");
        assert.equal(await PokerSeat.exists({ _id: first.user._id }), null);
        await until(() => two.state.seats.length >= 4 && two.state.seats.filter((seat) => seat.kind === "bot").length === 3, "bots to fill back to four");

        // The last member leaves: the table resets.
        const left = await emit(two, "poker:leave");
        assert.equal(left.ok, true);
        await until(() => table.status === "empty", "the table to reset");
        await until(() => two.state?.status === "empty", "the pages to hear it");
        const secondBack = await walletOf(second);
        const secondOut = await WalletTx.findOne({ user: second.user._id, reason: "pokerCashOut" }).lean();
        assert.equal(secondBack.pp + secondBack.ppp, 100 - 50 + (secondOut ? secondOut.pp + secondOut.ppp : 0));
    });
});
