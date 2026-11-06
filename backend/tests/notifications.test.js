// Unread notifications: what lights up the bell in the nav (purple for
// anything new, red for games), marking them seen, and unread jackpots
// coming first on the Notifications page. Against a real MongoDB.
//
// From backend/, with a MongoDB running:
//   PowerShell:  $env:MONGO_TEST_URI="mongodb://127.0.0.1:27017/kino_test"; npm test
//   bash:        MONGO_TEST_URI=mongodb://127.0.0.1:27017/kino_test npm test
// The database is wiped first, so its name has to end in "_test".
const { test, describe, before, after } = require("node:test");
const assert = require("node:assert/strict");

process.env.SECRET ??= "notifications-test-secret";
const mongoose = require("mongoose");
const express = require("express");
const jwt = require("jsonwebtoken");

const uri = process.env.MONGO_TEST_URI;
const dbName = uri ? new URL(uri).pathname.slice(1) : "";
const later = () => new Promise((resolve) => setTimeout(resolve, 5));

describe("unread notifications", { skip: !uri ? "set MONGO_TEST_URI to run these" : !dbName.endsWith("_test") ? "MONGO_TEST_URI's database must end in _test" : false }, () => {
    let base;
    let server;
    let User;
    let Notification;
    let FarkleMatch;
    let Report;
    const tokens = new Map();

    before(async () => {
        await mongoose.connect(uri);
        await mongoose.connection.dropDatabase();
        User = require("../models/userModel");
        Notification = require("../models/notificationModel");
        FarkleMatch = require("../models/farkleMatchModel");
        Report = require("../models/reportModel");
        await Promise.all([User, Notification, FarkleMatch, Report].map((model) => model.syncIndexes()));

        const app = express();
        app.use(express.json());
        app.use("/api/feed", require("../routes/feedRouter"));
        app.use((error, req, res, next) => {
            console.error(error);
            res.status(500).json({ error: "Something went wrong" });
        });
        server = app.listen(0);
        base = `http://127.0.0.1:${server.address().port}/api/feed`;
    });

    after(async () => {
        server?.close();
        await mongoose.disconnect();
    });

    let count = 0;
    async function member(role = "user") {
        count += 1;
        const user = await User.create({ username: `reader${count}`, email: `r${count}@test.invalid`, password: "x", role });
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
    const unread = async (user) => (await call(user, "GET", "/unread")).body;
    // Opens their Notifications page, as the page does: load it, then mark it seen.
    async function openPage(user) {
        const page = (await call(user, "GET", "/")).body;
        await call(user, "POST", "/seen", { until: page.now });
        return page;
    }
    const notify = (recipient, type, extra = {}) => Notification.create({ recipient: recipient._id, type, ...extra });
    const seenAt = async (user) => (await User.findById(user._id).select("notificationsSeenAt").lean()).notificationsSeenAt;

    test("nothing there: the bell stays dark", async () => {
        const user = await member();
        assert.deepEqual(await unread(user), { unread: false, games: false });
    });

    test("a new follower glows purple, not red; opening Notifications puts it out", async () => {
        const [user, fan] = [await member(), await member()];
        await notify(user, "follow", { actors: [fan._id] });
        assert.deepEqual(await unread(user), { unread: true, games: false });

        await openPage(user);
        assert.deepEqual(await unread(user), { unread: false, games: false });

        // Something new after that lights it up again.
        await later();
        await notify(user, "follow", { actors: [(await member())._id] });
        assert.deepEqual(await unread(user), { unread: true, games: false });
    });

    for (const type of ["farkleOver", "farkleResult", "farkleChallenge", "scratchWin", "scratchJackpot"]) {
        test(`an unread ${type} is a game notification: red`, async () => {
            const [user, other] = [await member(), await member()];
            await notify(user, type, { actors: [other._id] });
            assert.deepEqual(await unread(user), { unread: true, games: true });
        });
    }

    test("the old farkleTurn notices, which aren't shown any more, never count", async () => {
        const [user, other] = [await member(), await member()];
        await notify(user, "farkleTurn", { actors: [other._id] });
        assert.deepEqual(await unread(user), { unread: false, games: false });
    });

    test("a Farkle game come round to your turn since you looked is red; the other player's turn isn't", async () => {
        const [me, them] = [await member(), await member()];
        await openPage(me);
        await later();
        const game = await FarkleMatch.create({
            mode: "pvp",
            status: "active",
            players: [{ user: them._id }, { user: me._id }],
            target: 2000,
            stake: 5,
            prize: 10,
            current: 0,
            lastMoveAt: new Date(),
        });
        assert.deepEqual(await unread(me), { unread: false, games: false });

        await FarkleMatch.updateOne({ _id: game._id }, { $set: { current: 1, lastMoveAt: new Date() } });
        assert.deepEqual(await unread(me), { unread: true, games: true });

        // Opening Notifications counts as having seen it's your turn.
        await later();
        await openPage(me);
        assert.deepEqual(await unread(me), { unread: false, games: false });
    });

    test("moderators: a new report glows; ordinary members don't hear about it", async () => {
        const [moderator, user] = [await member("moderator"), await member()];
        await openPage(moderator);
        await openPage(user);
        await later();
        await Report.create({ review: new mongoose.Types.ObjectId(), reporter: user._id });
        assert.deepEqual(await unread(moderator), { unread: true, games: false });
        assert.deepEqual(await unread(user), { unread: false, games: false });
    });

    test("seen never moves back, and never past right now", async () => {
        const user = await member();
        const page = await openPage(user);
        const first = await seenAt(user);
        assert.equal(first.toISOString(), page.now);

        await call(user, "POST", "/seen", { until: new Date(Date.parse(page.now) - 60_000).toISOString() });
        assert.equal((await seenAt(user)).toISOString(), page.now);

        await call(user, "POST", "/seen", { until: "2999-01-01T00:00:00.000Z" });
        assert.ok((await seenAt(user)) <= new Date());

        await call(user, "POST", "/seen", { until: "not a date" });
        assert.ok((await seenAt(user)) <= new Date());
    });

    test("unread jackpots come with the first page, until they've been seen", async () => {
        const [user, winner] = [await member(), await member()];
        const jackpot = await notify(user, "scratchJackpot", { actors: [winner._id], amount: 420 });
        await later();
        await notify(user, "follow", { actors: [winner._id] });

        const page = (await call(user, "GET", "/")).body;
        assert.equal(page.seenAt, null);
        assert.deepEqual(page.jackpots.map((item) => item._id), [String(jackpot._id)]);
        assert.equal(page.jackpots[0].amount, 420);
        // Still in the list by its date too (the page leaves it out there).
        assert.ok(page.items.some((item) => item._id === String(jackpot._id)));

        await call(user, "POST", "/seen", { until: page.now });
        const again = (await call(user, "GET", "/")).body;
        assert.deepEqual(again.jackpots, []);
        assert.equal(again.seenAt, page.now);
    });

    test("only the first page carries the games and jackpots, so Load more keeps them", async () => {
        const [user, other] = [await member(), await member()];
        for (let i = 0; i < 12; i++) await notify(user, "follow", { actors: [other._id] });
        const second = (await call(user, "GET", "/?skip=10")).body;
        assert.equal(second.items.length, 2);
        for (const key of ["promoted", "games", "jackpots", "seenAt", "now"]) assert.ok(!(key in second), key);
    });

    test("a promoted event waits at the very top until it's been seen, then takes its place by date", async () => {
        const Event = require("../models/eventModel");
        const { noteRepostedEvent, notePromotedEvent } = require("../utils/notify");
        const [user, host] = [await member(), await member()];
        const soon = () => new Date(Date.now() + 86400000);
        const clubNight = await Event.create({ title: "A club night", startsAt: soon(), createdBy: host._id });
        const screening = await Event.create({ title: "A screening", startsAt: soon(), createdBy: host._id, official: false });
        const plain = await Event.create({ title: "Just posted", startsAt: soon(), createdBy: host._id });

        // Posted, then promoted with the Promote button: it goes out again in
        // place of the first. A screening made official is promoted too. One
        // only posted waits in line as ever.
        await notify(user, "event", { actors: [host._id], event: clubNight._id });
        await notify(user, "event", { actors: [host._id], event: plain._id });
        await later();
        await noteRepostedEvent(clubNight);
        await later();
        await notePromotedEvent(screening);
        await later();
        await notify(user, "follow", { actors: [host._id] });

        const page = (await call(user, "GET", "/")).body;
        assert.deepEqual(page.promoted.map((item) => item.event._id), [String(screening._id), String(clubNight._id)]);
        // With every filter, as events show with every one.
        for (const filter of ["events", "reviews", "cuts", "games"]) {
            assert.equal((await call(user, "GET", `/?filter=${filter}`)).body.promoted.length, 2, filter);
        }
        // In the list by date too (the page leaves them out there), once each.
        assert.deepEqual(page.items.filter((item) => item.type === "event").map((item) => item.event.title).sort(), ["A club night", "A screening", "Just posted"]);

        // Once seen, they wait in line by their date like everything else.
        await call(user, "POST", "/seen", { until: page.now });
        assert.deepEqual((await call(user, "GET", "/")).body.promoted, []);
    });

    // Every page of a filter, as names: the type, or "viralCut" for a cut that went viral.
    async function shown(user, filter) {
        const names = [];
        for (let skip = 0; ; ) {
            const { body } = await call(user, "GET", `/?skip=${skip}${filter ? `&filter=${filter}` : ""}`);
            names.push(...body.items.map((item) => (item.type === "cut" && item.cut.viral ? "viralCut" : item.type)));
            if (!body.hasMore) return names.sort();
            skip = body.next;
        }
    }

    test("the filters: each shows its own kind, and all of them show events and big news", async () => {
        const Review = require("../models/reviewModel");
        const Cut = require("../models/cutModel");
        const Event = require("../models/eventModel");
        const DoubleGame = require("../models/doubleGameModel");
        const [user, other] = [await member(), await member()];
        const review = await Review.create({ user: user._id, tmdbId: 4242, filmTitle: "A Film", rating: 4, text: "Good." });
        const plainCut = await Cut.create({ user: other._id, text: "A take." });
        const viralCut = await Cut.create({ user: other._id, text: "A hot take.", viralAt: new Date() });
        const event = await Event.create({ title: "A screening", startsAt: new Date(Date.now() + 86400000), createdBy: other._id });
        const game = (outcome) =>
            DoubleGame.create({
                userId: other._id,
                bet: 40,
                seed: 20,
                rounds: [{ playerThrow: "rock", houseThrow: outcome === "win" ? "scissors" : "paper", result: outcome === "win" ? "win" : "loss" }],
                status: "finished",
                outcome,
                payout: outcome === "win" ? 80 : 0,
                newBet: outcome === "win" ? 20 : 80,
                roundDeadline: new Date(),
                finishedAt: new Date(),
            });

        const kinds = {
            follow: { actors: [other._id] },
            pvp: { actors: [other._id] },
            payout: { amount: 3 },
            gift: { actors: [other._id], amount: 5 },
            cut: { actors: [other._id], cut: plainCut._id },
            viralCut: { type: "cut", actors: [other._id], cut: viralCut._id },
            event: { actors: [other._id], event: event._id },
            like: { actors: [other._id], review: review._id },
            trending: { actors: [user._id], review: review._id },
            scratchWin: { actors: [other._id], tier: "smash", amount: 80 },
            scratchJackpot: { actors: [other._id], amount: 400 },
            doublePlay: { actors: [other._id], doubleGame: (await game("ban"))._id },
            doubleWin: { actors: [other._id], doubleGame: (await game("win"))._id, amount: 80 },
        };
        for (const [name, fields] of Object.entries(kinds)) await notify(user, name, fields);

        const big = ["event", "trending", "scratchJackpot", "doubleWin", "viralCut"];
        const expect = (names) => [...new Set(names)].sort();
        assert.deepEqual(await shown(user), expect(Object.keys(kinds)));
        assert.deepEqual(await shown(user, "all"), expect(Object.keys(kinds)));
        assert.deepEqual(await shown(user, "events"), expect(big));
        assert.deepEqual(await shown(user, "reviews"), expect(["like", "trending", "pvp", ...big]));
        assert.deepEqual(await shown(user, "cuts"), expect(["cut", ...big]));
        assert.deepEqual(await shown(user, "games"), expect(["payout", "gift", "scratchWin", "scratchJackpot", "doublePlay", "doubleWin", ...big]));
        // Anything else is "all", even names JavaScript objects have built in.
        for (const odd of ["nonsense", "constructor", "__proto__"]) assert.deepEqual(await shown(user, odd), expect(Object.keys(kinds)), odd);

        const doubleItem = (await call(user, "GET", "/?filter=games")).body.items.find((item) => item.type === "doublePlay");
        assert.deepEqual([doubleItem.game.bet, doubleItem.game.outcome, doubleItem.game.results], [40, "ban", ["loss"]]);
    });

    test("the games being played show with All and Games; open reports with All and Reviews", async () => {
        const Review = require("../models/reviewModel");
        const [moderator, rival] = [await member("moderator"), await member()];
        await FarkleMatch.create({
            mode: "pvp",
            status: "active",
            players: [{ user: moderator._id }, { user: rival._id }],
            target: 2000,
            stake: 5,
            prize: 10,
            lastMoveAt: new Date(),
        });
        const review = await Review.create({ user: rival._id, tmdbId: 777, filmTitle: "Reported", rating: 1, text: "Hmm." });
        await Report.create({ review: review._id, reporter: moderator._id });

        const page = async (filter) => (await call(moderator, "GET", `/?filter=${filter}`)).body;
        assert.deepEqual(
            await Promise.all(["all", "events", "reviews", "games"].map(async (filter) => [(await page(filter)).games.length, (await page(filter)).reports.length])),
            [[1, 1], [0, 0], [0, 1], [1, 0]]
        );
    });

    test("a Kino Poker win goes to every member, red, with All and Games", async () => {
        const { notePokerWin } = require("../utils/notify");
        const [winner, reader] = [await member(), await member()];
        await openPage(reader);
        await later();
        await notePokerWin(winner._id, 85, { hands: 6, best: "Full house, Kings over Fours" });

        assert.ok(await Notification.exists({ recipient: winner._id, type: "pokerWin" }), "the winner hears too");
        assert.deepEqual(await unread(reader), { unread: true, games: true });
        const shown = async (filter) => (await call(reader, "GET", `/?filter=${filter}`)).body.items.find((item) => item.type === "pokerWin");
        const win = await shown("all");
        assert.equal(win.amount, 85);
        assert.deepEqual(win.poker, { hands: 6, best: "Full house, Kings over Fours" });
        assert.equal(String(win.actors[0]._id), String(winner._id));
        assert.ok(await shown("games"));
        assert.equal(await shown("reviews"), undefined);
    });

    test("while members are playing Kino Poker, the page shows the table at the top, with a way in", async () => {
        // The live table, on a stand-in for socket.io.
        const quiet = { emit() {} };
        const io = { on() {}, to: () => quiet, in: () => ({ fetchSockets: async () => [] }) };
        const table = require("../games/poker/live").startPoker(io, { timers: { firstHandSeconds: 600 } });
        try {
            const [player, reader] = [await member(), await member()];
            assert.equal((await call(reader, "GET", "/")).body.poker, null, "nobody playing: no card");

            await User.collection.updateOne({ _id: player._id }, { $set: { wallet: { pp: 100, ppp: 0, lastPayoutDay: null } } });
            await table.join({ _id: player._id, username: player.username, avatarUrl: null }, 40);

            const page = async (who, filter = "all") => (await call(who, "GET", `/?filter=${filter}`)).body.poker;
            const live = await page(reader);
            assert.deepEqual(live.members.map((seat) => seat.username), [player.username]);
            assert.equal(live.bots, 3);
            assert.equal(live.you, null);
            assert.equal((await page(player)).you, "seated");
            assert.ok(await page(reader, "games"));
            assert.equal(await page(reader, "events"), null);
        } finally {
            await table.run(() => table.reset());
        }
    });

    test("logged out: 401", async () => {
        assert.equal((await fetch(`${base}/unread`)).status, 401);
        assert.equal((await fetch(`${base}/seen`, { method: "POST" })).status, 401);
    });
});
