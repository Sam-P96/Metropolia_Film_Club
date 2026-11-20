// A member pressing Attend or Interested on an event: their followers hear
// about it in Notifications (utils/notify.js noteEventRsvp), as far as the
// member's privacy setting lets them, once per member and event. Against a
// real MongoDB.
//
// From backend/, with a MongoDB running:
//   PowerShell:  $env:MONGO_TEST_URI="mongodb://127.0.0.1:27017/kino_test"; npm test
//   bash:        MONGO_TEST_URI=mongodb://127.0.0.1:27017/kino_test npm test
// The database is wiped first, so its name has to end in "_test".
const { test, describe, before, after } = require("node:test");
const assert = require("node:assert/strict");

process.env.SECRET ??= "event-rsvp-test-secret";
const mongoose = require("mongoose");
const express = require("express");
const jwt = require("jsonwebtoken");

const uri = process.env.MONGO_TEST_URI;
const dbName = uri ? new URL(uri).pathname.slice(1) : "";
const RSVP_TYPES = ["eventAttending", "eventInterested"];

describe("event RSVPs in followers' Notifications", { skip: !uri ? "set MONGO_TEST_URI to run these" : !dbName.endsWith("_test") ? "MONGO_TEST_URI's database must end in _test" : false }, () => {
    let base;
    let server;
    let User;
    let Event;
    let Follow;
    let Notification;
    const tokens = new Map();

    before(async () => {
        await mongoose.connect(uri);
        await mongoose.connection.dropDatabase();
        User = require("../models/userModel");
        Event = require("../models/eventModel");
        Follow = require("../models/followModel");
        Notification = require("../models/notificationModel");
        await Promise.all([User, Event, Follow, Notification].map((model) => model.syncIndexes()));

        const app = express();
        app.use(express.json());
        app.use("/api/events", require("../routes/eventRouter"));
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
    async function member(privacy = "public") {
        count += 1;
        const user = await User.create({ username: `goer${count}`, email: `g${count}@test.invalid`, password: "x", privacy });
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
    const follows = (follower, following) => Follow.create({ follower: follower._id, following: following._id });
    const upcoming = (host, title = "A club night") =>
        Event.create({ title, startsAt: new Date(Date.now() + 3 * 86400000), location: "Kino Helios", createdBy: host._id });
    const rsvp = (user, event, answer) => call(user, "PUT", `/events/${event._id}/rsvp`, { rsvp: answer });
    // What `reader` has heard about members' RSVPs, straight from the database.
    const heard = async (reader) =>
        (await Notification.find({ recipient: reader._id, type: { $in: RSVP_TYPES } }).lean()).map((note) => ({
            _id: String(note._id),
            type: note.type,
            event: String(note.event),
            actor: String(note.actors[0]),
        }));
    const onPage = async (reader, filter) =>
        (await call(reader, "GET", `/feed?filter=${filter}`)).body.items.filter((item) => RSVP_TYPES.includes(item.type));

    test("Attend: every follower hears, with the event and who, under All and Events only", async () => {
        const [goer, fan, otherFan, stranger, host] = [await member(), await member(), await member(), await member(), await member()];
        await follows(fan, goer);
        await follows(otherFan, goer);
        const night = await upcoming(host);

        assert.equal((await rsvp(goer, night, "attending")).status, 200);

        for (const reader of [fan, otherFan]) {
            assert.deepEqual((await heard(reader)).map(({ type, event, actor }) => [type, event, actor]), [["eventAttending", String(night._id), String(goer._id)]]);
        }
        assert.deepEqual(await heard(stranger), [], "not following them");
        assert.deepEqual(await heard(goer), [], "not themselves");
        assert.deepEqual(await heard(host), [], "the host doesn't follow them");

        for (const filter of ["all", "events"]) {
            const [item] = await onPage(fan, filter);
            assert.equal(item?.type, "eventAttending", filter);
            assert.equal(item.event.title, "A club night");
            assert.equal(item.event.location, "Kino Helios");
            assert.equal(item.actors[0].username, goer.username);
        }
        for (const filter of ["reviews", "cuts", "games"]) assert.deepEqual(await onPage(fan, filter), [], filter);
    });

    test("changing their mind replaces it, pressing the same one again doesn't send it again, and neither takes it back", async () => {
        const [goer, fan, host] = [await member(), await member(), await member()];
        await follows(fan, goer);
        const night = await upcoming(host);

        await rsvp(goer, night, "interested");
        const [first] = await heard(fan);
        assert.equal(first.type, "eventInterested");

        await rsvp(goer, night, "interested");
        assert.deepEqual(await heard(fan), [first], "the same one, not sent again");

        await rsvp(goer, night, "attending");
        assert.deepEqual((await heard(fan)).map((note) => note.type), ["eventAttending"], "in place of the old one");

        await rsvp(goer, night, null);
        assert.deepEqual(await heard(fan), [], "taken back");
    });

    test("one per member and event: another event, or another member, is its own", async () => {
        const [goer, pal, fan, host] = [await member(), await member(), await member(), await member()];
        await follows(fan, goer);
        await follows(fan, pal);
        const [night, matinee] = [await upcoming(host), await upcoming(host, "A matinee")];

        await rsvp(goer, night, "attending");
        await rsvp(goer, matinee, "interested");
        await rsvp(pal, night, "attending");
        await rsvp(goer, night, null);

        assert.deepEqual(
            (await heard(fan)).map(({ type, event, actor }) => [type, event, actor]).sort(),
            [["eventAttending", String(night._id), String(pal._id)], ["eventInterested", String(matinee._id), String(goer._id)]].sort()
        );
    });

    test("privacy: a friends-only profile tells only friends, a private one nobody", async () => {
        const [friendsOnly, hidden, friend, follower, host] = [await member("friends"), await member("private"), await member(), await member(), await member()];
        await follows(friend, friendsOnly);
        await follows(friendsOnly, friend);
        await follows(follower, friendsOnly);
        await follows(friend, hidden);
        await follows(hidden, friend);
        await follows(follower, hidden);
        const night = await upcoming(host);

        await rsvp(friendsOnly, night, "attending");
        await rsvp(hidden, night, "attending");

        assert.deepEqual((await heard(friend)).map((note) => note.actor), [String(friendsOnly._id)]);
        assert.deepEqual(await heard(follower), []);
    });

    test("a past event takes no RSVPs, so nobody hears", async () => {
        const [goer, fan, host] = [await member(), await member(), await member()];
        await follows(fan, goer);
        const past = await Event.create({ title: "Last week", startsAt: new Date(Date.now() - 86400000), createdBy: host._id });

        assert.equal((await rsvp(goer, past, "attending")).status, 400);
        assert.deepEqual(await heard(fan), []);
    });

    test("they go with the event, and with the member's account", async () => {
        const { forgetEvent, forgetMember } = require("../utils/notify");
        const [goer, leaver, fan, host] = [await member(), await member(), await member(), await member()];
        await follows(fan, goer);
        await follows(fan, leaver);
        const [night, matinee] = [await upcoming(host), await upcoming(host, "A matinee")];
        await rsvp(goer, night, "attending");
        await rsvp(leaver, matinee, "interested");
        assert.equal((await heard(fan)).length, 2);

        await forgetEvent(night._id);
        assert.deepEqual((await heard(fan)).map((note) => note.actor), [String(leaver._id)]);

        await forgetMember(leaver._id, [], []);
        assert.deepEqual(await heard(fan), []);
    });

    test("one whose event or member has since gone doesn't show", async () => {
        const [goer, fan, host] = [await member(), await member(), await member()];
        await follows(fan, goer);
        const night = await upcoming(host);
        await rsvp(goer, night, "attending");
        assert.equal((await onPage(fan, "events")).length, 1);

        await Event.deleteOne({ _id: night._id });
        assert.deepEqual(await onPage(fan, "events"), [], "the event's gone");
    });
});
