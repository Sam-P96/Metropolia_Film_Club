// Booster packs admins award (utils/catflix/awards.js): an event page's
// Reward Mode (one member, or everyone attending or interested, once every
// 30 seconds each), the notification, and the admin panel's Award booster
// packs tool. Against a real MongoDB.
//
// From backend/, with a MongoDB running:
//   bash: MONGO_TEST_URI=mongodb://127.0.0.1:27017/kino_test npm test
// The database is wiped first, so its name has to end in "_test".
const { test, describe, before, after } = require("node:test");
const assert = require("node:assert/strict");

process.env.SECRET ??= "pack-awards-test-secret";
const mongoose = require("mongoose");
const express = require("express");
const jwt = require("jsonwebtoken");

const uri = process.env.MONGO_TEST_URI;
const dbName = uri ? new URL(uri).pathname.slice(1) : "";

describe("booster packs awarded by admins", { skip: !uri ? "set MONGO_TEST_URI to run these" : !dbName.endsWith("_test") ? "MONGO_TEST_URI's database must end in _test" : false }, () => {
    let base;
    let server;
    let User;
    let Event;
    let CatflixPlayer;
    let Notification;
    let PackAward;

    before(async () => {
        await mongoose.connect(uri);
        await mongoose.connection.dropDatabase();
        User = require("../models/userModel");
        Event = require("../models/eventModel");
        CatflixPlayer = require("../models/catflixPlayerModel");
        Notification = require("../models/notificationModel");
        PackAward = require("../models/packAwardModel");
        await Promise.all([User, Event, CatflixPlayer, Notification, PackAward].map((model) => model.syncIndexes()));
        const app = express();
        app.use(express.json());
        app.use("/api/events", require("../routes/eventRouter"));
        app.use("/api/admin", require("../routes/adminRouter"));
        app.use("/api/feed", require("../routes/feedRouter"));
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

    let count = 0;
    async function member({ role = "user", privacy = "public", name = null } = {}) {
        count += 1;
        return User.create({ username: name ?? `goer${count}`, email: `pa${count}@test.invalid`, password: "x", role, privacy });
    }
    async function call(user, method, path, body) {
        const response = await fetch(base + path, {
            method,
            headers: { Authorization: `Bearer ${jwt.sign({ _id: user._id }, process.env.SECRET)}`, "Content-Type": "application/json" },
            body: body === undefined ? undefined : JSON.stringify(body),
        });
        return { status: response.status, body: await response.json().catch(() => null) };
    }
    const packsOf = async (user) => (await CatflixPlayer.findOne({ user: user._id }).lean())?.packs ?? {};
    const screening = (attending = [], interested = []) =>
        Event.create({ title: "Heat at Kino Helios", startsAt: new Date(Date.now() - 3600000), createdBy: attending[0]?._id ?? new mongoose.Types.ObjectId(), attending: attending.map((u) => u._id), interested: interested.map((u) => u._id) });
    // As if their last event award was long enough ago.
    const cooledDown = (user) => CatflixPlayer.updateOne({ user: user._id }, { $set: { awardedAt: new Date(Date.now() - 31000) } });

    test("Award: a Black & Gold pack for them, and a notification saying it's for attending the event; admins only", async () => {
        const [admin, mod, goer] = [await member({ role: "admin" }), await member({ role: "moderator" }), await member()];
        const event = await screening([goer]);
        assert.equal((await call(mod, "POST", `/events/${event._id}/awards`, { userId: goer._id })).status, 403, "moderators can't");
        assert.equal((await call(goer, "GET", `/events/${event._id}/awards`)).status, 403);

        const awarded = await call(admin, "POST", `/events/${event._id}/awards`, { userId: goer._id });
        assert.equal(awarded.status, 200);
        assert.deepEqual(awarded.body.awards, { [String(goer._id)]: 1 });
        assert.equal((await packsOf(goer)).blackGold, 1);
        const notice = await Notification.findOne({ recipient: goer._id, type: "packAward" }).lean();
        assert.deepEqual([notice.packKind, notice.note, String(notice.actors[0])], ["blackGold", "Heat at Kino Helios", String(admin._id)]);
        assert.deepEqual((await call(admin, "GET", `/events/${event._id}/awards`)).body.awards, { [String(goer._id)]: 1 });

        // A member who has never played Catflix No Chill gets a whole record, food and all.
        const player = await CatflixPlayer.findOne({ user: goer._id }).lean();
        assert.equal(player.food, 0);
    });

    test("once every 30 seconds a member, whichever admin and event", async () => {
        const [admin, other, goer] = [await member({ role: "admin" }), await member({ role: "admin" }), await member()];
        const [first, second] = [await screening([goer]), await screening([goer])];
        assert.equal((await call(admin, "POST", `/events/${first._id}/awards`, { userId: goer._id })).status, 200);
        const again = await call(other, "POST", `/events/${second._id}/awards`, { userId: goer._id });
        assert.equal(again.status, 429);
        assert.match(again.body.error, /moments ago: again in (29|30) seconds/);
        assert.equal((await packsOf(goer)).blackGold, 1, "nothing given");
        await cooledDown(goer);
        assert.deepEqual((await call(admin, "POST", `/events/${first._id}/awards`, { userId: goer._id })).body.awards, { [String(goer._id)]: 2 }, "awarded again, 30 seconds on");
        assert.equal((await packsOf(goer)).blackGold, 2);
    });

    test("Award All Attending and Award All Interested: everyone on the list, private profiles too, except anyone awarded moments ago", async () => {
        const admin = await member({ role: "admin" });
        const [a, b, hidden] = [await member(), await member(), await member({ privacy: "private" })];
        const [c, d] = [await member(), await member()];
        const event = await screening([a, b, hidden], [c, d]);
        await call(admin, "POST", `/events/${event._id}/awards`, { userId: b._id });

        const all = await call(admin, "POST", `/events/${event._id}/awards/all`, { list: "attending" });
        assert.deepEqual([all.body.awarded, all.body.skipped], [2, 1], "b was awarded moments ago");
        assert.deepEqual(all.body.awards, { [String(a._id)]: 1, [String(b._id)]: 1, [String(hidden._id)]: 1 });
        assert.equal((await packsOf(hidden)).blackGold, 1, "a private profile too");

        const interested = await call(admin, "POST", `/events/${event._id}/awards/all`, { list: "interested" });
        assert.deepEqual([interested.body.awarded, interested.body.skipped], [2, 0]);
        assert.equal((await call(admin, "POST", `/events/${event._id}/awards/all`, { list: "everyone" })).status, 400);
        assert.equal((await call(admin, "POST", `/events/${new mongoose.Types.ObjectId()}/awards/all`, { list: "attending" })).status, 404);
        assert.equal((await call(admin, "POST", `/events/${event._id}/awards`, { userId: new mongoose.Types.ObjectId() })).status, 404);
    });

    test("in Notifications under All and Games: the pack, the event, and how many of it they have to open", async () => {
        const [admin, goer] = [await member({ role: "admin" }), await member()];
        const event = await screening([goer]);
        await call(admin, "POST", `/events/${event._id}/awards`, { userId: goer._id });
        for (const filter of ["all", "games"]) {
            const item = (await call(goer, "GET", `/feed?filter=${filter}`)).body.items.find((entry) => entry.type === "packAward");
            assert.deepEqual([item.pack, item.eventTitle, item.actors[0].username], [{ kind: "blackGold", unopened: 1 }, "Heat at Kino Helios", admin.username], filter);
        }
        assert.equal((await call(goer, "GET", "/feed?filter=events")).body.items.some((entry) => entry.type === "packAward"), false);
        await CatflixPlayer.updateOne({ user: goer._id }, { $set: { "packs.blackGold": 0 } });
        const opened = (await call(goer, "GET", "/feed")).body.items.find((entry) => entry.type === "packAward");
        assert.equal(opened.pack.unopened, 0, "opened in the shop: none left");
    });

    test("the admin panel: every member A to Z, 30 at a time, searchable; any pack for anyone, from the panel", async () => {
        const admin = await member({ role: "admin", name: "Zed Admin" });
        await member({ name: "alfred" });
        await member({ name: "Alfreda" });
        await member({ name: "bob" });
        assert.equal((await call(await member(), "GET", "/admin/members")).status, 403);

        const found = (await call(admin, "GET", "/admin/members?q=ALFRED")).body;
        assert.deepEqual(found.members.map((user) => user.username), ["alfred", "Alfreda"], "any case, A to Z");
        assert.equal(found.hasMore, false);
        for (let i = 0; i < 30; i++) await member();
        const first = (await call(admin, "GET", "/admin/members")).body;
        assert.deepEqual([first.members.length, first.hasMore], [30, true]);
        const next = (await call(admin, "GET", "/admin/members?skip=30")).body;
        assert.ok(next.members.length > 0 && !next.members.some((user) => first.members.some((seen) => seen._id === user._id)), "the next page, no repeats");
        assert.deepEqual((await call(admin, "GET", "/admin/members?q=(.*")).body.members, [], "the search is plain text");

        const bob = await User.findOne({ username: "bob" }).lean();
        const sent = await call(admin, "POST", "/admin/packs", { userId: bob._id, kind: "triple" });
        assert.deepEqual([sent.status, sent.body.awarded.kind, sent.body.awarded.user.username], [201, "triple", "bob"]);
        assert.equal((await packsOf(bob)).triple, 1);
        const notice = await Notification.findOne({ recipient: bob._id, type: "packAward" }).lean();
        assert.deepEqual([notice.packKind, notice.note ?? null], ["triple", null], "from the panel: no event");
        assert.equal((await call(admin, "POST", "/admin/packs", { userId: bob._id, kind: "triple" })).status, 201, "no 30 seconds from the panel");
        assert.equal((await call(admin, "POST", "/admin/packs", { userId: bob._id, kind: "golden" })).status, 400);
    });
});
