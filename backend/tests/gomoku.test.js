// Infinite Gomoku: the rules and the engine on their own, then the routes
// against a real MongoDB (challenges, counters, stakes, five in a row, a
// draw, what's been seen, the sweep, the shop, notifications and the
// developer tools).
//
// From backend/, with a MongoDB running:
//   PowerShell:  $env:MONGO_TEST_URI="mongodb://127.0.0.1:27017/kino_test"; npm test
//   bash:        MONGO_TEST_URI=mongodb://127.0.0.1:27017/kino_test npm test
// The database is wiped first, so its name has to end in "_test".
const { test, describe, before, after } = require("node:test");
const assert = require("node:assert/strict");

process.env.SECRET ??= "gomoku-test-secret";

const { boardOf, winningLine, isFull, stakeProblem, prizeFor, seatToMove, emptyBoard } = require("../../shared/gomoku/rules.js");
const { ALL_ITEMS, DEFAULTS, gomokuItem, loadoutOf, pieceAgainst } = require("../../shared/gomoku/catalogue.js");
const { MoveError, placeStone, resign, forfeit } = require("../games/gomoku/engine");

const newGame = (size = 15) => ({ size, moves: [], current: 0, status: "active", winner: null, winLine: [], endedBy: null });
// Plays [x, y] points in turn, seat 0 first.
const play = (game, points) => points.reduce((g, [x, y]) => placeStone(g, g.current, x, y), game);

describe("the rules", () => {
    test("five in a row wins in all four directions, six too, four doesn't", () => {
        const lineOf = (cells) => {
            const board = boardOf(15, cells.map(([x, y]) => ({ x, y, seat: 1 })));
            const [x, y] = cells[2];
            return winningLine(board, 15, x, y);
        };
        const run = (dx, dy, n = 5, from = [5, 5]) => Array.from({ length: n }, (_, i) => [from[0] + dx * i, from[1] + dy * i]);
        for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [1, -1]]) {
            const cells = run(dx, dy);
            assert.deepEqual(lineOf(cells), cells, `${dx},${dy}`);
            assert.equal(lineOf(run(dx, dy, 4)), null);
        }
        assert.equal(lineOf(run(1, 0, 6)).length, 6);
        // Against the edge of the board.
        assert.deepEqual(lineOf(run(1, 0, 5, [10, 14])), run(1, 0, 5, [10, 14]));
        // A gap breaks it; the other player's stone does too.
        const board = boardOf(15, [...run(1, 0, 2).map(([x, y]) => ({ x, y, seat: 0 })), { x: 7, y: 5, seat: 1 }, { x: 8, y: 5, seat: 0 }, { x: 9, y: 5, seat: 0 }]);
        assert.equal(winningLine(board, 15, 8, 5), null);
    });

    test("stakes: For Fun is 0; otherwise whole points from 2 up to the poorer player's; the winner takes both", () => {
        assert.equal(stakeProblem(0, 0), "");
        assert.equal(stakeProblem(2, 100), "");
        assert.match(stakeProblem(1, 100), /smallest/);
        assert.match(stakeProblem(2.5, 100), /whole/);
        assert.match(stakeProblem(101, 100), /most you two/);
        assert.match(stakeProblem(5, 1), /fewer than 2/);
        assert.equal(prizeFor(250), 500);
        assert.equal(seatToMove(0), 0);
        assert.equal(seatToMove(3), 1);
        assert.equal(isFull(emptyBoard(15)), false);
    });
});

describe("the engine", () => {
    test("turns alternate, seat 0 first; taken points, points off the board and bad numbers are refused", () => {
        const game = play(newGame(), [[7, 7]]);
        assert.equal(game.current, 1);
        assert.throws(() => placeStone(game, 0, 1, 1), (error) => error instanceof MoveError && error.status === 409);
        assert.throws(() => placeStone(game, 1, 7, 7), /already a stone/);
        assert.throws(() => placeStone(game, 1, 15, 0), /isn't on the board/);
        assert.throws(() => placeStone(game, 1, "3", 4), /isn't on the board/);
        assert.throws(() => placeStone(game, 1, 2.5, 4), /isn't on the board/);
        // Nothing changed in place.
        assert.equal(game.moves.length, 1);
    });

    test("five in a row ends it; so does resigning (either player, any time) and running out of time", () => {
        const won = play(newGame(), [[0, 0], [0, 1], [1, 0], [1, 1], [2, 0], [2, 1], [3, 0], [3, 1], [4, 0]]);
        assert.deepEqual([won.status, won.winner, won.endedBy], ["over", 0, "five"]);
        assert.deepEqual(won.winLine, [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]]);
        assert.throws(() => placeStone(won, 1, 9, 9), /over/);

        const going = play(newGame(), [[0, 0]]);
        assert.deepEqual([resign(going, 0).winner, resign(going, 0).endedBy], [1, "resign"]);
        assert.deepEqual([forfeit(going).winner, forfeit(going).endedBy], [0, "forfeit"]);
    });
});

describe("the catalogue", () => {
    test("prices: Infinity Stones 1,000, emoji 200, the Gauntlet 10,000, shockwaves 500, boards and grids 300; ids are unique", () => {
        const price = (id) => gomokuItem(id).price;
        assert.equal(price("piece.gem.soul"), 1000);
        assert.equal(ALL_ITEMS.filter((item) => item.id.startsWith("piece.gem.")).length, 6);
        assert.equal(price("piece.emoji.wolf"), 200);
        assert.equal(ALL_ITEMS.filter((item) => item.id.startsWith("piece.emoji.")).length, 21);
        assert.equal(price("piece.gauntlet"), 10000);
        assert.equal(price("wave.fire"), 500);
        assert.equal(price("board.black-glass"), 300);
        assert.equal(price("grid.rainbow"), 300);
        for (const id of Object.values(DEFAULTS)) assert.equal(price(id), 0);
        assert.equal(new Set(ALL_ITEMS.map((item) => item.id)).size, ALL_ITEMS.length);
    });

    test("the other player's piece: theirs, unless it's yours too: the other stone colour, or the same piece in negative", () => {
        assert.deepEqual(pieceAgainst("piece.black", "piece.gem.mind"), { id: "piece.gem.mind", invert: false });
        assert.deepEqual(pieceAgainst("piece.black", "piece.white"), { id: "piece.white", invert: false });
        assert.deepEqual(pieceAgainst("piece.black", "piece.black"), { id: "piece.white", invert: false });
        assert.deepEqual(pieceAgainst("piece.white", "piece.white"), { id: "piece.black", invert: false });
        assert.deepEqual(pieceAgainst("piece.emoji.wolf", "piece.emoji.wolf"), { id: "piece.emoji.wolf", invert: true });
        assert.deepEqual(loadoutOf({ piece: "piece.nonsense", board: "grid.gold", grid: "grid.gold" }), { ...DEFAULTS, grid: "grid.gold" });
    });
});

const uri = process.env.MONGO_TEST_URI;
const dbName = uri ? new URL(uri).pathname.slice(1) : "";

describe("Infinite Gomoku against a database", { skip: !uri ? "set MONGO_TEST_URI to run these" : !dbName.endsWith("_test") ? "MONGO_TEST_URI's database must end in _test" : false }, () => {
    const mongoose = require("mongoose");
    const express = require("express");
    const jwt = require("jsonwebtoken");

    let base;
    let server;
    let User;
    let GomokuMatch;
    let Notification;
    let WalletTx;
    let Follow;
    const tokens = new Map();

    before(async () => {
        await mongoose.connect(uri);
        await mongoose.connection.dropDatabase();
        User = require("../models/userModel");
        GomokuMatch = require("../models/gomokuMatchModel");
        Notification = require("../models/notificationModel");
        WalletTx = require("../models/walletTxModel");
        Follow = require("../models/followModel");
        const GomokuOwned = require("../models/gomokuOwnedModel");
        await Promise.all([User, GomokuMatch, Notification, WalletTx, Follow, GomokuOwned].map((model) => model.syncIndexes()));

        const app = express();
        app.use(express.json());
        app.use("/api/gomoku", require("../routes/gomokuRouter"));
        app.use("/api/feed", require("../routes/feedRouter"));
        app.use((error, req, res, next) => {
            console.error(error);
            res.status(500).json({ error: "Something went wrong" });
        });
        await new Promise((resolve) => {
            server = app.listen(0, "127.0.0.1", resolve);
        });
        base = `http://127.0.0.1:${server.address().port}/api`;
    });

    after(async () => {
        delete process.env.GOMOKU_DEV_TOOLS;
        server?.close();
        await mongoose.disconnect();
    });

    let count = 0;
    async function member(pp = 0, ppp = 0) {
        count += 1;
        const user = await User.create({ username: `gomoku${count}`, email: `g${count}@test.invalid`, password: "x", wallet: { pp, ppp } });
        tokens.set(String(user._id), jwt.sign({ _id: user._id }, process.env.SECRET));
        return user;
    }
    async function call(user, method, path, body, headers = {}) {
        const response = await fetch(base + path, {
            method,
            headers: { ...(user && { Authorization: `Bearer ${tokens.get(String(user._id))}` }), ...(body && { "Content-Type": "application/json" }), ...headers },
            body: body ? JSON.stringify(body) : undefined,
        });
        return { status: response.status, body: await response.json().catch(() => null) };
    }
    const walletOf = async (user) => {
        const { wallet } = await User.findById(user._id).lean();
        return { pp: wallet.pp, ppp: wallet.ppp };
    };
    const challenge = (from, to, terms) => call(from, "POST", "/gomoku/challenges", { opponent: to._id, ...terms });
    const answer = (user, game, kind, terms = {}) => call(user, "POST", `/gomoku/matches/${game._id}/${kind}`, { version: game.version, ...terms });
    const move = async (user, gameId, x, y) => {
        const now = (await call(user, "GET", `/gomoku/matches/${gameId}`)).body;
        return call(user, "POST", `/gomoku/matches/${gameId}/moves`, { version: now.version, type: "place", x, y });
    };

    test("For PP: counter, accept (both stakes held, the accepter moves first), five in a row takes the pot", async () => {
        const a = await member(100);
        const b = await member(50, 30);

        const sent = await challenge(a, b, { size: 15, stake: 50 });
        assert.equal(sent.status, 201, JSON.stringify(sent.body));
        assert.deepEqual([sent.body.forFun, sent.body.prize, sent.body.myAnswer], [false, 100, false]);
        assert.equal(await Notification.countDocuments({ recipient: b._id, type: "gomokuChallenge", pinned: true }), 1);
        // Nothing taken yet; one challenge per pair; nobody plays themselves.
        assert.deepEqual(await walletOf(a), { pp: 100, ppp: 0 });
        assert.equal((await challenge(b, a, { size: 15, stake: 10 })).status, 409);
        assert.equal((await challenge(a, a, { size: 15, stake: 10 })).status, 400);
        assert.match((await challenge(a, await member(5), { size: 15, stake: 50 })).body.error, /most you two/);
        // Only the 15 x 15 board; leaving the size out means it.
        assert.match((await challenge(a, await member(), { size: 19, stake: 0 })).body.error, /15 x 15 board/);
        assert.equal((await challenge(a, await member(), { stake: 0 })).body.size, 15);

        // b counters: 60 each. Now it waits on a.
        const seen = (await call(b, "GET", `/gomoku/matches/${sent.body._id}`)).body;
        assert.deepEqual([seen.myAnswer, seen.counterMax, seen.acceptStake], [true, 80, 50]);
        assert.equal((await answer(b, seen, "counter", { stake: 50 })).status, 400);
        assert.equal((await answer(b, seen, "counter", { size: 19, stake: 60 })).status, 400);
        const countered = await answer(b, seen, "counter", { stake: 60 });
        assert.equal(countered.status, 200, JSON.stringify(countered.body));
        assert.equal(await Notification.countDocuments({ recipient: b._id, type: "gomokuChallenge" }), 0);
        assert.equal(await Notification.countDocuments({ recipient: a._id, type: "gomokuChallenge", pinned: true }), 1);
        // An old version is refused, with the game as it is now.
        const stale = await answer(a, sent.body, "accept");
        assert.equal(stale.status, 409);
        assert.equal(stale.body.match.stake, 60);

        const now = (await call(a, "GET", `/gomoku/matches/${sent.body._id}`)).body;
        const accepted = await answer(a, now, "accept");
        assert.equal(accepted.status, 200, JSON.stringify(accepted.body));
        assert.deepEqual([accepted.body.status, accepted.body.mySeat, accepted.body.current, accepted.body.stake, accepted.body.prize], ["active", 0, 0, 60, 120]);
        assert.deepEqual(await walletOf(a), { pp: 40, ppp: 0 });
        assert.deepEqual(await walletOf(b), { pp: 0, ppp: 20 });
        const held = await GomokuMatch.findById(sent.body._id).lean();
        assert.deepEqual(held.players.map((player) => player.paid), [{ pp: 60, ppp: 0 }, { pp: 50, ppp: 10 }]);
        assert.equal(await Notification.countDocuments({ recipient: b._id, type: "gomokuAccepted" }), 1);

        // b moved second: not their turn yet.
        assert.equal((await move(b, sent.body._id, 9, 9)).status, 409);
        assert.equal((await move(a, sent.body._id, 0, 0)).status, 200);
        assert.equal((await move(b, sent.body._id, 0, 0)).status, 400);
        for (const [who, x, y] of [[b, 0, 1], [a, 1, 0], [b, 1, 1], [a, 2, 0], [b, 2, 1], [a, 3, 0], [b, 3, 1]]) {
            assert.equal((await move(who, sent.body._id, x, y)).status, 200);
        }
        const won = await move(a, sent.body._id, 4, 0);
        assert.equal(won.status, 200);
        assert.deepEqual([won.body.status, won.body.winner, won.body.endedBy, won.body.winLine.length], ["over", 0, "five", 5]);
        assert.deepEqual(await walletOf(a), { pp: 40, ppp: 120 });
        assert.equal(await WalletTx.countDocuments({ user: a._id, reason: "gomokuWin", gomoku: sent.body._id }), 1);
        assert.equal(await Notification.countDocuments({ gomoku: sent.body._id, type: "gomokuOver" }), 2);
        // Over: they can play each other again.
        assert.equal((await challenge(b, a, { size: 15, stake: 0 })).status, 201);
    });

    test("For Fun: nothing taken or paid; decline and withdraw; followers don't hear about it", async () => {
        const a = await member(0);
        const b = await member(0);
        const fan = await member();
        await Follow.create({ follower: fan._id, following: a._id });

        const first = (await challenge(a, b, { size: 15 })).body;
        assert.deepEqual([first.forFun, first.stake, first.prize], [true, 0, 0]);
        const declined = await answer(b, (await call(b, "GET", `/gomoku/matches/${first._id}`)).body, "decline");
        assert.equal(declined.body.status, "declined");
        assert.equal(await Notification.countDocuments({ recipient: a._id, type: "gomokuDeclined" }), 1);

        const second = (await challenge(a, b, { stake: 0 })).body;
        assert.equal((await answer(b, second, "withdraw")).status, 403);
        assert.equal((await answer(a, second, "withdraw")).body.status, "withdrawn");

        const third = (await challenge(a, b, { size: 15, stake: 0 })).body;
        const game = (await answer(b, (await call(b, "GET", `/gomoku/matches/${third._id}`)).body, "accept")).body;
        assert.equal(game.status, "active");
        const resigned = await call(a, "POST", `/gomoku/matches/${third._id}/moves`, { version: game.version, type: "resign" });
        assert.deepEqual([resigned.body.status, resigned.body.winner, resigned.body.endedBy], ["over", 0, "resign"]);
        assert.equal(await WalletTx.countDocuments({ gomoku: third._id }), 0);
        assert.equal(await Notification.countDocuments({ recipient: fan._id, type: "gomokuResult" }), 0);
    });

    test("a full board with no five is a draw: both stakes go back exactly as paid, once", async () => {
        const a = await member(0);
        const b = await member(0);
        const seatAt = (x, y) => ((x + 2 * y) % 4 < 2 ? 0 : 1);
        const cells = [[], []];
        for (let y = 0; y < 15; y++) for (let x = 0; x < 15; x++) if (x || y) cells[seatAt(x, y)].push({ x, y, seat: seatAt(x, y) });
        const moves = cells[0].flatMap((cell, i) => [cell, cells[1][i]]);
        const game = await GomokuMatch.create({
            status: "active",
            players: [{ user: a._id, paid: { pp: 10, ppp: 5 } }, { user: b._id, paid: { pp: 15, ppp: 0 } }],
            size: 15,
            stake: 15,
            prize: 30,
            moves,
            current: 0,
        });

        const drawn = await move(a, game._id, 0, 0);
        assert.equal(drawn.status, 200, JSON.stringify(drawn.body));
        assert.deepEqual([drawn.body.status, drawn.body.winner, drawn.body.endedBy], ["over", null, "draw"]);
        assert.deepEqual(await walletOf(a), { pp: 10, ppp: 5 });
        assert.deepEqual(await walletOf(b), { pp: 15, ppp: 0 });
        // Paying out again changes nothing.
        await GomokuMatch.updateOne({ _id: game._id }, { $set: { settled: false } });
        await require("../utils/gomoku").settleMatch(game._id);
        assert.deepEqual(await walletOf(a), { pp: 10, ppp: 5 });
        assert.equal(await WalletTx.countDocuments({ gomoku: game._id, reason: "gomokuRefund" }), 2);
    });

    test("the other player's newest stone stays unseen until the page says it landed; your own move is seen", async () => {
        const a = await member();
        const b = await member();
        const sent = (await challenge(a, b, { size: 15, stake: 0 })).body;
        const game = (await answer(b, (await call(b, "GET", `/gomoku/matches/${sent._id}`)).body, "accept")).body;

        assert.equal((await move(b, game._id, 7, 7)).body.seen, 1);
        const away = (await call(a, "GET", `/gomoku/matches/${game._id}`)).body;
        assert.deepEqual([away.moveCount, away.seen, away.lastMove], [1, 0, { x: 7, y: 7, seat: 0 }]);
        // Still unseen when opened again: only the page saying so marks it.
        assert.equal((await call(a, "GET", `/gomoku/matches/${game._id}`)).body.seen, 0);
        assert.equal((await call(a, "POST", `/gomoku/matches/${game._id}/seen`, { moves: 99 })).body.seen, 1);
        assert.equal((await call(a, "GET", `/gomoku/matches/${game._id}`)).body.seen, 1);
        assert.equal((await call(a, "POST", `/gomoku/matches/${game._id}/seen`, { moves: 0 })).body.seen, 1);

        // It shows at the top of Notifications, and lights the bell while it's their turn.
        const feed = (await call(a, "GET", "/feed")).body;
        assert.deepEqual(feed.gomoku.map((item) => String(item._id)), [String(game._id)]);
        assert.equal(feed.items.find((item) => item.type === "gomokuAccepted")?.gomoku.status, "active");
        assert.equal((await call(a, "GET", "/feed/unread")).body.games, true);
    });

    test("three days without a move: the player to move loses; three days unanswered: the challenge expires", async () => {
        const { sweepMatches } = require("../utils/gomoku");
        const a = await member(20);
        const b = await member(20);
        const c = await member();
        const sent = (await challenge(a, b, { size: 15, stake: 10 })).body;
        const game = (await answer(b, (await call(b, "GET", `/gomoku/matches/${sent._id}`)).body, "accept")).body;
        await move(b, game._id, 7, 7);
        const waiting = (await challenge(c, a, { size: 15, stake: 0 })).body;

        const counts = await sweepMatches(Date.now() + 4 * 24 * 60 * 60 * 1000);
        assert.equal(counts.forfeited >= 1 && counts.expired >= 1, true);
        const ended = await GomokuMatch.findById(game._id).lean();
        assert.deepEqual([ended.status, ended.winner, ended.endedBy], ["over", 0, "forfeit"]);
        assert.deepEqual(await walletOf(b), { pp: 10, ppp: 20 });
        assert.equal((await GomokuMatch.findById(waiting._id).lean()).status, "expired");
        assert.equal(await Notification.countDocuments({ recipient: c._id, type: "gomokuExpired" }), 1);
    });

    test("the shop: PP first, then P-PP; each item once; only what you own goes on; others see your piece", async () => {
        const shopper = await member(150, 900);
        const buy = (itemId) => call(shopper, "POST", "/gomoku/shop/buy", { itemId });
        const equip = (kind, itemId) => call(shopper, "PUT", "/gomoku/shop/equip", { kind, itemId });

        const start = (await call(shopper, "GET", "/gomoku/shop")).body;
        assert.deepEqual([start.points, start.owned, start.equipped], [1050, [], DEFAULTS]);

        const gem = await buy("piece.gem.soul");
        assert.equal(gem.status, 201, JSON.stringify(gem.body));
        assert.deepEqual(await walletOf(shopper), { pp: 0, ppp: 50 });
        assert.deepEqual(gem.body.view.owned, ["piece.gem.soul"]);
        assert.equal((await buy("piece.gem.soul")).status, 409);
        const short = await buy("piece.gauntlet");
        assert.equal(short.status, 400);
        assert.match(short.body.error, /10,000 points/);
        assert.equal((await buy("piece.black")).status, 400);
        assert.equal((await buy("piece.nope")).status, 404);
        assert.deepEqual(await walletOf(shopper), { pp: 0, ppp: 50 });

        assert.equal((await equip("piece", "piece.gem.soul")).body.done.piece, "piece.gem.soul");
        assert.equal((await equip("piece", "piece.emoji.wolf")).status, 403);
        assert.equal((await equip("board", "grid.gold")).status, 400);
        assert.equal((await equip("grid", "grid.classic")).status, 200);
        assert.equal((await equip("shield", null)).status, 400);

        // Their opponent sees the gem on them.
        const other = await member();
        const game = (await challenge(other, shopper, { size: 15, stake: 0 })).body;
        assert.equal(game.players[1].look.piece, "piece.gem.soul");
        assert.equal(game.myLook.piece, "piece.black");

        assert.equal((await equip("piece", null)).body.done.piece, DEFAULTS.piece);
    });

    test("the developer tools: a 404 unless switched on, from this computer, and only For Fun games", async () => {
        const me = await member(500);
        const them = await member(500);
        assert.equal((await call(me, "GET", "/gomoku/dev")).status, 404);

        process.env.GOMOKU_DEV_TOOLS = "true";
        try {
            assert.deepEqual((await call(me, "GET", "/gomoku/dev")).body, { on: true });
            // Through a proxy (a hosting provider's): as if it weren't there.
            assert.equal((await call(me, "GET", "/gomoku/dev", null, { "X-Forwarded-For": "203.0.113.9" })).status, 404);

            const sent = (await challenge(me, them, { size: 15, stake: 0 })).body;
            const started = await call(me, "POST", `/gomoku/dev/matches/${sent._id}/accept`);
            assert.equal(started.status, 200, JSON.stringify(started.body));
            assert.deepEqual([started.body.status, started.body.mySeat, started.body.current], ["active", 1, 0]);

            const theirs = await call(me, "POST", `/gomoku/dev/matches/${sent._id}/their-move`, { x: 7, y: 7 });
            assert.deepEqual(theirs.body.lastMove, { x: 7, y: 7, seat: 0 });
            assert.equal((await call(me, "POST", `/gomoku/dev/matches/${sent._id}/their-move`)).status, 409);
            assert.equal((await GomokuMatch.findById(sent._id).lean()).devPlayed, true);

            await call(me, "POST", `/gomoku/matches/${sent._id}/seen`, { moves: 1 });
            assert.equal((await call(me, "POST", `/gomoku/dev/matches/${sent._id}/unsee`)).body.seen, 0);

            // Never a game for points.
            const other = await member(100);
            const pp = (await challenge(me, other, { size: 15, stake: 10 })).body;
            assert.equal((await call(me, "POST", `/gomoku/dev/matches/${pp._id}/accept`)).status, 403);

            // A finished game's replay, deleted early.
            await call(me, "POST", `/gomoku/matches/${sent._id}/moves`, { version: (await call(me, "GET", `/gomoku/matches/${sent._id}`)).body.version, type: "resign" });
            const forgotten = await call(me, "POST", `/gomoku/dev/matches/${sent._id}/forget-replay`);
            assert.deepEqual([forgotten.body.replay.available, forgotten.body.replay.deleted], [false, true]);
            assert.equal((await call(me, "POST", `/gomoku/dev/matches/${pp._id}/forget-replay`)).status, 409);

            // The shop, undone: every item gone and its points back as they were paid.
            const buyer = await member(100, 200);
            await call(buyer, "POST", "/gomoku/shop/buy", { itemId: "board.dark" });
            await call(buyer, "PUT", "/gomoku/shop/equip", { kind: "board", itemId: "board.dark" });
            assert.deepEqual(await walletOf(buyer), { pp: 0, ppp: 0 });
            const undone = await call(buyer, "POST", "/gomoku/dev/shop/refund");
            assert.deepEqual(undone.body.done, { items: 1, pp: 100, ppp: 200 });
            assert.deepEqual([undone.body.view.owned, undone.body.view.equipped.board], [[], DEFAULTS.board]);
            assert.deepEqual(await walletOf(buyer), { pp: 100, ppp: 200 });
            assert.deepEqual((await call(buyer, "POST", "/gomoku/dev/shop/refund")).body.done, { items: 0, pp: 0, ppp: 0 });
        } finally {
            delete process.env.GOMOKU_DEV_TOOLS;
        }
    });

    test("a finished game's replay is kept for a week, then only the final position is left", async () => {
        const { forgetOldReplays, REPLAY_KEEP_MS } = require("../utils/gomoku");
        const a = await member();
        const b = await member();
        const sent = (await challenge(a, b, { stake: 0 })).body;
        await answer(b, (await call(b, "GET", `/gomoku/matches/${sent._id}`)).body, "accept");
        const played = [[b, 7, 7], [a, 0, 0], [b, 8, 7], [a, 0, 1], [b, 9, 7], [a, 0, 2], [b, 10, 7], [a, 0, 3], [b, 11, 7]];
        for (const [who, x, y] of played) assert.equal((await move(who, sent._id, x, y)).status, 200);

        const over = (await call(a, "GET", `/gomoku/matches/${sent._id}`)).body;
        assert.equal(over.status, "over");
        assert.deepEqual(over.moves.map(({ x, y }) => [x, y]), played.map(([, x, y]) => [x, y]));
        assert.equal(over.replay.available, true);
        assert.equal(new Date(over.replay.until) - new Date(over.endedAt), REPLAY_KEEP_MS);
        // It shows in the lobby's finished games too.
        assert.equal((await call(a, "GET", "/gomoku/lobby")).body.recent.find((game) => game._id === sent._id).replay.available, true);

        // Six days on, still there; eight days on, gone.
        assert.equal(await forgetOldReplays(Date.now() + 6 * 24 * 60 * 60 * 1000), 0);
        assert.ok((await forgetOldReplays(Date.now() + 8 * 24 * 60 * 60 * 1000)) >= 1);
        const stored = await GomokuMatch.findById(sent._id).lean();
        assert.equal(stored.replayGone, true);
        assert.ok(stored.moves.every((stone) => stone.at === undefined));
        const order = stored.moves.map(({ x, y }) => y * 15 + x);
        assert.deepEqual(order, [...order].sort((p, q) => p - q));
        const after = (await call(a, "GET", `/gomoku/matches/${sent._id}`)).body;
        assert.deepEqual([after.replay.available, after.replay.deleted, after.lastMove], [false, true, null]);
        // The final position is all still there, and so is how it ended.
        assert.deepEqual(new Set(after.moves.map(({ x, y, seat }) => `${x},${y},${seat}`)), new Set(over.moves.map(({ x, y, seat }) => `${x},${y},${seat}`)));
        assert.deepEqual([after.winner, after.winLine.length], [0, 5]);

        // A game that ended before replays were kept goes a week after it ended.
        const old = await GomokuMatch.create({
            status: "over",
            players: [{ user: a._id }, { user: b._id }],
            size: 15,
            stake: 0,
            prize: 0,
            moves: [{ x: 1, y: 1, seat: 0 }, { x: 0, y: 0, seat: 1 }],
            winner: 0,
            endedBy: "resign",
            endedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
        });
        assert.equal(await forgetOldReplays(), 1);
        assert.deepEqual((await GomokuMatch.findById(old._id).lean()).moves.map(({ x, y }) => [x, y]), [[0, 0], [1, 1]]);
    });

    test("leaving the club: an open challenge closes, a game being played goes to the other player", async () => {
        const { forgetGomokuPlayer } = require("../utils/gomoku");
        const leaver = await member(30);
        const stayer = await member(30);
        const asked = await member();
        const sent = (await challenge(leaver, stayer, { size: 15, stake: 10 })).body;
        const game = (await answer(stayer, (await call(stayer, "GET", `/gomoku/matches/${sent._id}`)).body, "accept")).body;
        const open = (await challenge(leaver, asked, { size: 15, stake: 0 })).body;

        await forgetGomokuPlayer(leaver._id);
        const ended = await GomokuMatch.findById(game._id).lean();
        assert.deepEqual([ended.status, ended.winner, ended.endedBy], ["over", 0, "left"]);
        assert.deepEqual(await walletOf(stayer), { pp: 20, ppp: 20 });
        assert.equal((await GomokuMatch.findById(open._id).lean()).status, "withdrawn");
    });
});
