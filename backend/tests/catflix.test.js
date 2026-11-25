// Catflix No Chill (utils/catflix/, routes/catflixRouter.js): pets' meters
// with time, hatching, care at home and on Play Dates, the Room Room, the pet
// shop and the Spell Deck. Time on its own first; then through the real API,
// against a real MongoDB.
//
// From backend/, with a MongoDB running:
//   PowerShell:  $env:MONGO_TEST_URI="mongodb://127.0.0.1:27017/kino_test"; npm test
//   bash:        MONGO_TEST_URI=mongodb://127.0.0.1:27017/kino_test npm test
// The database is wiped first, so its name has to end in "_test".
const { test, describe, before, after } = require("node:test");
const assert = require("node:assert/strict");

process.env.SECRET ??= "catflix-test-secret";
const { caughtUp, HOUR } = require("../utils/catflix/pets");
const { CATFLIX, weatherFor, weatherSlot, rollRarity } = require("../../shared/catflix/rules.js");

// A pet as the database has it, at `t0`, never hungry and never pooping
// unless a test says otherwise.
const T0 = Math.floor(Date.UTC(2026, 0, 1) / (2 * HOUR)) * 2 * HOUR; // an even hour
const petAt = (extra = {}) => ({
    meters: { happiness: 80, hunger: 100, confidence: 50 },
    love: 60,
    loveBy: new Map(),
    poops: 0,
    poopClock: new Date(T0 + 10000 * HOUR),
    fullUntil: new Date(T0 + 10000 * HOUR),
    clock: new Date(T0),
    ...extra,
});
const hoursOn = (pet, hours) => caughtUp(pet, new Date(T0 + hours * HOUR));

describe("time and weather (no database)", () => {
    test("hunger: full for 24 hours, then 4 an hour; below 15, 1 happiness an hour", () => {
        const pet = petAt({ fullUntil: new Date(T0 + 24 * HOUR) });
        assert.equal(caughtUp(pet, new Date(T0 + 59 * 60000)), null, "under an hour: nothing yet");
        assert.equal(hoursOn(pet, 24).meters.hunger, 100, "still full");
        assert.equal(hoursOn(pet, 30).meters.hunger, 76);
        assert.deepEqual([hoursOn(pet, 46).meters.hunger, hoursOn(pet, 46).meters.happiness], [12, 79], "below 15 for one hour");
        assert.deepEqual([hoursOn(pet, 50).meters.hunger, hoursOn(pet, 50).meters.happiness], [0, 75], "five hungry hours");
        assert.equal(hoursOn(pet, 50).clock.getTime(), T0 + 50 * HOUR);
    });

    test("poop: one every 8 hours, up to 5, each costing 1 happiness every 2 hours", () => {
        const pet = petAt({ happiness: 100, poopClock: new Date(T0), meters: { happiness: 100, hunger: 100, confidence: 50 } });
        assert.equal(hoursOn(pet, 7).poops, 0);
        assert.equal(hoursOn(pet, 8).poops, 1);
        // One poop at hours 8, 10, 12 and 14; two at 16.
        assert.deepEqual([hoursOn(pet, 16).poops, hoursOn(pet, 16).meters.happiness], [2, 94]);
        assert.equal(hoursOn(pet, 80).poops, CATFLIX.poop.max, "five at most");
    });

    test("love: the owner's drops while happiness is under 50, everyone else's under 25", () => {
        const sad = petAt({ meters: { happiness: 40, hunger: 100, confidence: 50 }, loveBy: new Map([["a", 10], ["b", 30]]) });
        assert.deepEqual([hoursOn(sad, 5).love, Object.fromEntries(hoursOn(sad, 5).loveBy)], [55, { a: 10, b: 30 }]);
        const sadder = petAt({ meters: { happiness: 20, hunger: 100, confidence: 50 }, loveBy: new Map([["a", 3], ["b", 30]]) });
        assert.deepEqual([hoursOn(sadder, 5).love, Object.fromEntries(hoursOn(sadder, 5).loveBy)], [55, { a: 0, b: 25 }]);
    });

    test("weather: the same for everyone for 4 hours, 6 times a day; none indoors; only Christmas snows", () => {
        assert.equal(weatherSlot(new Date("2026-11-24T10:00:00Z")), "2026-11-24#3", "12:00 in Helsinki: the 4th 4 hours");
        assert.equal(weatherSlot(new Date("2026-11-24T21:59:00Z")), "2026-11-24#5");
        assert.equal(weatherFor("theatre", "2026-11-24#3"), null);
        assert.equal(weatherFor("cafeteria", "2026-11-24#3"), null);
        const seen = { christmas: new Set(), school: new Set() };
        for (let day = 1; day <= 28; day++) for (let slot = 0; slot < 6; slot++) for (const map of ["christmas", "school"]) seen[map].add(weatherFor(map, `2026-02-${String(day).padStart(2, "0")}#${slot}`));
        assert.deepEqual([...seen.christmas].sort(), ["snow", "sunny"]);
        assert.deepEqual([...seen.school].sort(), ["rain", "sunny", "thunder"]);
        assert.equal(weatherFor("school", "2026-02-03#1"), weatherFor("school", "2026-02-03#1"), "the same every time");
    });

    test("card odds: 40 / 30 / 19 / 10 / 1", () => {
        assert.deepEqual([0, 0.39, 0.4, 0.69, 0.7, 0.88, 0.89, 0.98, 0.99].map((roll) => rollRarity(() => roll)), ["common", "common", "uncommon", "uncommon", "rare", "rare", "epic", "epic", "legendary"]);
    });
});

const uri = process.env.MONGO_TEST_URI;
const dbName = uri ? new URL(uri).pathname.slice(1) : "";

describe("Catflix No Chill", { skip: !uri ? "set MONGO_TEST_URI to run these" : !dbName.endsWith("_test") ? "MONGO_TEST_URI's database must end in _test" : false }, () => {
    const mongoose = require("mongoose");
    const express = require("express");
    const jwt = require("jsonwebtoken");
    let base;
    let server;
    let User;
    let Follow;
    let CatflixPet;
    let CatflixPlayer;
    let WalletTx;
    let pets;
    let shop;
    const tokens = new Map();

    before(async () => {
        await mongoose.connect(uri);
        await mongoose.connection.dropDatabase();
        User = require("../models/userModel");
        Follow = require("../models/followModel");
        CatflixPet = require("../models/catflixPetModel");
        CatflixPlayer = require("../models/catflixPlayerModel");
        WalletTx = require("../models/walletTxModel");
        pets = require("../utils/catflix/pets");
        shop = require("../utils/catflix/shop");
        await Promise.all([User, Follow, CatflixPet, CatflixPlayer, require("../models/catflixActionModel"), require("../models/petFormModel")].map((model) => model.syncIndexes()));

        // The pets there are to be: one base form, and forms of each rarity.
        await require("../models/petBaseFormModel").create({ _id: "catbase1", name: "Cat", anims: {}, fur: [] });
        const PetForm = require("../models/petFormModel");
        for (const [id, rarity] of [["common1", "common"], ["common2", "common"], ["uncomm1", "uncommon"], ["rare001", "rare"], ["legend1", "legendary"], ["legend2", "legendary"]]) {
            await PetForm.create({ _id: id, name: id, baseFormId: "catbase1", rarity });
        }

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
    async function member({ pp = 0, ppp = 0 } = {}) {
        count += 1;
        const user = await User.create({ username: `cat${count}`, email: `cf${count}@test.invalid`, password: "x", wallet: { pp, ppp } });
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
    const walletOf = async (user) => {
        const { wallet } = await User.findById(user._id).select("wallet").lean();
        return { pp: wallet.pp, ppp: wallet.ppp };
    };
    async function withPet(user, meters = {}) {
        await call(user, "POST", "/egg/hatch", { name: `Pet of ${user.username}` });
        const pet = await CatflixPet.findOneAndUpdate({ owner: user._id }, { $set: Object.fromEntries(Object.entries(meters).map(([key, value]) => [`meters.${key}`, value])) }, { returnDocument: "after" }).lean();
        return pet;
    }
    const setPet = (pet, set) => CatflixPet.updateOne({ _id: pet._id }, { $set: set });
    const meters = async (pet) => (await CatflixPet.findById(pet._id).lean()).meters;

    test("hatching: the free egg, a random Common, once; named", async () => {
        const kid = await member();
        assert.deepEqual((await call(kid, "GET", "/me")).body.pet, null, "the egg to hatch");
        assert.match((await call(kid, "POST", "/egg/hatch", { name: "  " })).body.error, /name/);
        const hatched = await call(kid, "POST", "/egg/hatch", { name: "Mochi" });
        assert.equal(hatched.status, 200);
        const { pet } = hatched.body;
        assert.ok(["common1", "common2"].includes(pet.skinId), pet.skinId);
        assert.equal(pet.name, "Mochi");
        for (const value of Object.values(pet.meters)) assert.ok(value >= 35 && value <= 75, `starts ${value}`);
        assert.equal(pet.roomStyle, "cozy");
        assert.equal((await call(kid, "POST", "/egg/hatch", { name: "Again" })).status, 409, "one pet each");
        assert.equal((await call(kid, "POST", "/egg/crack")).status, 409, "no second egg");

        // The egg cracks at 100 taps: the cat it shows is the one they get.
        const other = await member();
        const cracked = (await call(other, "POST", "/egg/crack")).body.skinId;
        assert.ok(["common1", "common2"].includes(cracked));
        assert.equal((await call(other, "POST", "/egg/crack")).body.skinId, cracked, "the same cat every time");
        assert.equal((await call(other, "POST", "/egg/hatch", { name: "Bean" })).body.pet.skinId, cracked);
        assert.equal(typeof (await call(other, "GET", "/me")).body.points, "number");
    });

    test("care at home, as often as you like: food (3 a bag, 100 PP), 3 feeds fill them for a day, scooping, scold then praise", async () => {
        const owner = await member({ pp: 1000 });
        const pet = await withPet(owner, { hunger: 20, happiness: 60, confidence: 50 });
        assert.match((await call(owner, "POST", "/care", { petId: pet._id, kind: "feed" })).body.error, /no pet food/);
        assert.equal((await call(owner, "POST", "/shop/buy", { item: "food" })).body.player.food, 3);
        assert.deepEqual(await walletOf(owner), { pp: 900, ppp: 0 }, "100 PP");
        for (let i = 0; i < 3; i++) assert.equal((await call(owner, "POST", "/care", { petId: pet._id, kind: "feed" })).status, 200);
        const fed = (await call(owner, "GET", "/me")).body;
        assert.deepEqual([fed.pet.meters.hunger, fed.pet.full, fed.player.food], [100, true, 0]);
        const full = await CatflixPet.findById(pet._id).lean();
        assert.ok(Math.abs(new Date(full.fullUntil) - Date.now() - 24 * HOUR) < 60000, "full for 24 hours");

        assert.match((await call(owner, "POST", "/care", { petId: pet._id, kind: "scoop" })).body.error, /nothing to scoop/);
        await setPet(pet, { poops: 2 });
        const scooped = (await call(owner, "POST", "/care", { petId: pet._id, kind: "scoop" })).body.pet;
        assert.equal(scooped.poops, 1);

        const loveBefore = scooped.love;
        const scolded = (await call(owner, "POST", "/care", { petId: pet._id, kind: "scold" })).body.pet;
        assert.deepEqual([scolded.meters.confidence, scolded.meters.happiness], [52, 59], "scold alone: +2 confidence, -1 happiness");
        const praised = (await call(owner, "POST", "/care", { petId: pet._id, kind: "praise" })).body.pet;
        assert.deepEqual([praised.meters.happiness, praised.meters.confidence, praised.love], [61, 51, loveBefore + 2], "then praise: +2 love and happiness, -1 confidence");
        const praisedAgain = (await call(owner, "POST", "/care", { petId: pet._id, kind: "praise" })).body.pet;
        assert.equal(praisedAgain.meters.happiness, 62, "praise alone: +1 happiness");
        for (let i = 0; i < 4; i++) assert.equal((await call(owner, "POST", "/care", { petId: pet._id, kind: "brush" })).status, 200, "your own pet: no limit");
    });

    test("Play Dates: each kind of care once an hour; love for you grows only while they're unhappy", async () => {
        const [owner, visitor] = [await member(), await member({ pp: 500 })];
        const pet = await withPet(owner, { happiness: 70 });
        const brushed = await call(visitor, "POST", "/care", { petId: pet._id, kind: "brush" });
        assert.equal(brushed.body.pet.loveForMe, 0, "happy: no love for a visitor");
        const again = await call(visitor, "POST", "/care", { petId: pet._id, kind: "brush" });
        assert.equal(again.status, 429);
        assert.match(again.body.error, /last hour: again in 60 minutes/);

        await setPet(pet, { "meters.happiness": 30 });
        await call(visitor, "POST", "/shop/buy", { item: "food" });
        const fed = await call(visitor, "POST", "/care", { petId: pet._id, kind: "feed" });
        assert.deepEqual([fed.body.pet.loveForMe, fed.body.player.food], [1, 2], "unhappy: a feed earns love, and uses your food");
        const visit = await call(visitor, "GET", `/visit/${pet._id}`);
        assert.deepEqual([visit.body.pet.loveForMe, visit.body.pet.mine, visit.body.pet.owner.username], [1, false, owner.username]);
        const ownerLove = (await CatflixPet.findById(pet._id).lean()).love;
        assert.equal(ownerLove, pet.love, "the owner's love doesn't change");

        // A scold that can't happen (no such kind) gives nothing away.
        assert.equal((await call(visitor, "POST", "/care", { petId: pet._id, kind: "tickle" })).status, 400);
    });

    // ---- Toys (utils/catflix/toys.js) ----

    // A knock counted, as if the last one was long enough ago.
    const knock = async (user, pet, ball) => {
        await CatflixPlayer.updateOne({ user: user._id }, { $set: { knockedAt: null } });
        return call(user, "POST", "/toy/knock", { petId: pet._id, ball });
    };

    test("toys: four balls at 1,000 / 2,000 / 3,000 / 10,000 PP lasting 10 / 20 / 30 / 100 knocks; one of each at a time", async () => {
        const { CATFLIX } = require("../../shared/catflix/rules.js");
        assert.deepEqual(
            Object.entries(CATFLIX.toys.balls).map(([kind, ball]) => [kind, ball.price, ball.durability]),
            [["beach", 1000, 10], ["soccer", 2000, 20], ["basketball", 3000, 30], ["yarn", 10000, 100]]
        );
        const buyer = await member({ pp: 5000, ppp: 20000 });
        const bought = await call(buyer, "POST", "/shop/buy", { item: "ball", kind: "beach" });
        assert.deepEqual(bought.body.player.balls, { beach: 10, soccer: null, basketball: null, yarn: null });
        assert.deepEqual(await walletOf(buyer), { pp: 4000, ppp: 20000 }, "1,000, PP first");
        const again = await call(buyer, "POST", "/shop/buy", { item: "ball", kind: "beach" });
        assert.equal(again.status, 409);
        assert.match(again.body.error, /Beach ball already: one at a time/);
        assert.deepEqual(await walletOf(buyer), { pp: 4000, ppp: 20000 }, "nothing taken");
        await call(buyer, "POST", "/shop/buy", { item: "ball", kind: "yarn" });
        assert.deepEqual(await walletOf(buyer), { pp: 0, ppp: 14000 }, "10,000: the PP, then P-PP");
        assert.equal((await call(buyer, "POST", "/shop/buy", { item: "ball", kind: "golf" })).status, 400);
        assert.equal((await call(buyer, "POST", "/shop/buy", { item: "ball", kind: "__proto__" })).status, 400);

        const poor = await member({ pp: 999 });
        assert.equal((await call(poor, "POST", "/shop/buy", { item: "ball", kind: "beach" })).status, 400);
        assert.equal((await call(poor, "GET", "/me")).body.player.balls.beach, null, "not enough PP: no ball");
    });

    test("toys: each knock is +5 happiness for the pet that knocked it and one knock off the ball; worn out, it's gone and can be bought again", async () => {
        const owner = await member({ pp: 3000 });
        const pet = await withPet(owner, { happiness: 40 });
        assert.match((await knock(owner, pet, "beach")).body.error, /don't have a Beach ball/);
        await call(owner, "POST", "/shop/buy", { item: "ball", kind: "beach" });

        const first = await knock(owner, pet, "beach");
        assert.deepEqual([first.body.pet.meters.happiness, first.body.left, first.body.player.balls.beach], [45, 9, 9]);
        for (let i = 0; i < 8; i++) await knock(owner, pet, "beach");
        assert.equal((await meters(pet)).happiness, 85);
        const last = await knock(owner, pet, "beach");
        assert.deepEqual([last.body.left, last.body.player.balls.beach, last.body.pet.meters.happiness], [0, null, 90], "the tenth: worn out");
        assert.equal((await knock(owner, pet, "beach")).status, 409, "gone");
        assert.equal((await call(owner, "POST", "/shop/buy", { item: "ball", kind: "beach" })).body.player.balls.beach, 10, "another, once it's worn out");
        await setPet(pet, { "meters.happiness": 98 });
        assert.equal((await knock(owner, pet, "beach")).body.pet.meters.happiness, 100, "never past 100");
    });

    test("toys: on a Play Date, your ball's knocks count for their pet too; at most one knock a second; a pet that isn't there costs nothing", async () => {
        const [owner, visitor] = [await member(), await member({ pp: 2000 })];
        const theirs = await withPet(owner, { happiness: 30 });
        const mine = await withPet(visitor, { happiness: 30 });
        await call(visitor, "POST", "/shop/buy", { item: "ball", kind: "soccer" });
        const hit = await knock(visitor, theirs, "soccer");
        assert.equal(hit.body.pet.meters.happiness, 35, "their pet");
        assert.equal(hit.body.pet.loveForMe, 1, "and it loves you a little more: +1 a knock");
        const quick = await call(visitor, "POST", "/toy/knock", { petId: mine._id, ball: "soccer" });
        assert.equal(quick.status, 429, "too soon after the last");
        assert.equal((await meters(mine)).happiness, 30);
        const loveBefore = (await CatflixPet.findById(mine._id).lean()).love;
        const own = await knock(visitor, mine, "soccer");
        assert.equal(own.body.pet.meters.happiness, 35, "and yours, tagging along");
        assert.equal(own.body.pet.love, loveBefore, "your own pet's love isn't what a knock changes");
        assert.equal((await knock(visitor, theirs, "soccer")).body.pet.loveForMe, 2, "+1 again on the next knock");
        assert.equal((await CatflixPet.findById(theirs._id).lean()).loveBy[String(visitor._id)], 2);
        assert.equal((await CatflixPet.findById(theirs._id).lean()).loveBy[String(owner._id)], undefined, "its owner's love is its own meter");
        assert.equal((await CatflixPlayer.findOne({ user: visitor._id }).lean()).balls.soccer, 17);
        assert.equal((await knock(visitor, { _id: new mongoose.Types.ObjectId() }, "soccer")).status, 404);
        assert.equal((await CatflixPlayer.findOne({ user: visitor._id }).lean()).balls.soccer, 17, "no knock used");
    });

    test("the Room Room: Play, Pet and Bully, once an hour each, for each pet", async () => {
        const [me, them] = [await member(), await member()];
        const mine = await withPet(me, { happiness: 50, confidence: 60 });
        const theirs = await withPet(them, { happiness: 50, confidence: 40 });

        await call(me, "POST", "/room/act", { targetId: theirs._id, action: "play" });
        assert.deepEqual([(await meters(mine)).happiness, (await meters(theirs)).happiness], [51, 51], "play: both +1");
        const petted = await call(me, "POST", "/room/act", { targetId: theirs._id, action: "pet" });
        assert.deepEqual([petted.body.theirs.meters.happiness, petted.body.theirs.meters.confidence, petted.body.mine.meters.happiness], [53, 41, 51], "pet: theirs +2 happiness, +1 confidence");
        assert.equal((await call(me, "POST", "/room/act", { targetId: theirs._id, action: "pet" })).status, 429, "once an hour");

        const bullied = await call(me, "POST", "/room/act", { targetId: theirs._id, action: "bully" });
        assert.equal(bullied.body.outcome, "won");
        assert.deepEqual([(await meters(mine)).confidence, (await meters(mine)).happiness, (await meters(theirs)).happiness], [61, 50, 52], "more confident: yours +1 confidence, both -1 happiness");
        // They bully back, less confident: both lose.
        const back = await call(them, "POST", "/room/act", { targetId: mine._id, action: "bully" });
        assert.equal(back.body.outcome, "lost");
        assert.deepEqual([(await meters(mine)).confidence, (await meters(theirs)).confidence, (await meters(mine)).happiness, (await meters(theirs)).happiness], [60, 40, 49, 51]);
        assert.match((await call(me, "POST", "/room/act", { targetId: mine._id, action: "play" })).body.error, /another pet/);
        const lonely = await member();
        assert.match((await call(lonely, "POST", "/room/act", { targetId: theirs._id, action: "play" })).body.error, /need a pet/);
    });

    test("a Room Room visit: yours and 6 others, never twice, friends' pets half the time, School by default, the weather everywhere", async () => {
        const me = await member();
        await withPet(me);
        const friends = [];
        for (let i = 0; i < 3; i++) {
            const friend = await member();
            await withPet(friend);
            await Follow.create([{ follower: me._id, following: friend._id }, { follower: friend._id, following: me._id }]);
            friends.push(String(friend._id));
        }
        // Friends first while there are any (the coin always lands on "friend").
        const visit = await pets.roomVisit(me._id, "nowhere", { random: () => 0.1 });
        assert.equal(visit.map, "school");
        assert.equal(visit.pets.length, 7);
        assert.equal(String(visit.pets[0].owner._id), String(me._id), "yours first");
        assert.equal(new Set(visit.pets.map((pet) => String(pet._id))).size, 7, "never the same pet twice");
        assert.deepEqual(visit.pets.slice(1, 4).map((pet) => String(pet.owner._id)).sort(), [...friends].sort());
        assert.ok(visit.pets.slice(1, 4).every((pet) => pet.friend) && visit.pets.slice(4).every((pet) => !pet.friend));
        assert.deepEqual(Object.keys(visit.weather).sort(), Object.keys(CATFLIX.maps).sort());
        assert.equal(visit.weather.theatre, null);
        const api = await call(me, "GET", "/room?map=christmas");
        assert.equal(api.body.map, "christmas");
        assert.ok(["sunny", "snow"].includes(api.body.weather.christmas));
    });

    test("the shop: packs (cards rolled on the server), auras at 500,000 (Rain Cloud 800,000, half in the Black Friday Sale), food up to 100, room styles; never charged twice", async () => {
        const rich = await member({ pp: 600000, ppp: 1500000 });
        await withPet(rich);
        assert.match((await call(rich, "POST", "/packs/open", { kind: "single" })).body.error, /no Single Packs/);
        await call(rich, "POST", "/shop/buy", { item: "pack", kind: "single" });
        await call(rich, "POST", "/shop/buy", { item: "pack", kind: "blackGold" });
        assert.deepEqual(await walletOf(rich), { pp: 350000, ppp: 1500000 }, "50,000 and 200,000, PP first");
        const single = await call(rich, "POST", "/packs/open", { kind: "single" });
        assert.equal(single.body.cards.length, 1);
        assert.equal(single.body.cards[0].isNew, true);
        const seven = await shop.openPack(rich._id, "blackGold", { random: () => 0.995 });
        assert.deepEqual(seven.cards.map((card) => card.rarity), Array(7).fill("legendary"), "rolled from the odds: all legendary at 0.995");
        assert.deepEqual(seven.player.packs, { single: 0, triple: 0, blackGold: 0 });

        assert.equal(shop.auraPrice("ember"), 500000);
        assert.equal(shop.auraPrice("rain"), 800000);
        const { blackFridayOf } = require("../../shared/events.js");
        const sale = new Date(`${blackFridayOf(2026)}T12:00:00+02:00`);
        assert.deepEqual([shop.auraPrice("ember", sale), shop.auraPrice("rain", sale)], [250000, 400000]);
        await call(rich, "POST", "/shop/buy", { item: "aura", aura: "rain" });
        const twice = await call(rich, "POST", "/shop/buy", { item: "aura", aura: "rain" });
        assert.equal(twice.status, 409);
        assert.equal((await walletOf(rich)).pp + (await walletOf(rich)).ppp, 1850000 - 800000, "charged once");
        assert.equal((await WalletTx.countDocuments({ user: rich._id, reason: "catflixShop" })), 3);

        const poor = await member({ pp: 1000 });
        const broke = await call(poor, "POST", "/shop/buy", { item: "aura", aura: "ember" });
        assert.match(broke.body.error, /You need 500000 points/);
        assert.deepEqual((await call(poor, "GET", "/me")).body.player.auras, [], "nothing kept when the PP couldn't be taken");

        await CatflixPlayer.updateOne({ user: poor._id }, { $set: { food: 98 } });
        assert.match((await call(poor, "POST", "/shop/buy", { item: "food" })).body.error, /100 servings/);
        await CatflixPlayer.updateOne({ user: poor._id }, { $set: { food: 97 } });
        assert.equal((await call(poor, "POST", "/shop/buy", { item: "food" })).body.player.food, 100);

        await withPet(poor);
        assert.match((await call(poor, "POST", "/pet/style", { style: "gothic" })).body.error, /Buy that room style/);
        assert.match((await call(poor, "POST", "/shop/buy", { item: "style", style: "cozy" })).body.error, /everyone's/);
        await call(poor, "POST", "/shop/buy", { item: "style", style: "gothic" });
        const styled = await call(poor, "POST", "/pet/style", { style: "gothic" });
        assert.deepEqual([styled.body.pet.roomStyle, styled.body.player.styles], ["gothic", ["cozy", "gothic"]]);
        assert.equal((await walletOf(poor)).pp, 1000 - 100 - 500);
        assert.equal((await call(poor, "POST", "/pet/aura", { aura: "rain" })).status, 400, "not theirs");
        assert.equal((await call(rich, "POST", "/pet/aura", { aura: "rain" })).body.pet.aura, "rain");
    });

    test("the Spell Forge: three cards for one a rarity above the lowest; three Legendaries offer a choice; casting a card", async () => {
        const kid = await member();
        await withPet(kid);
        await CatflixPlayer.updateOne({ user: kid._id }, { $set: { cards: { common1: 2, uncomm1: 1, legend1: 2, legend2: 1 } } });
        const forged = await call(kid, "POST", "/deck/forge", { ids: ["common1", "common1", "uncomm1"] });
        assert.equal(forged.body.card.rarity, "uncommon", "the lowest was Common");
        assert.deepEqual(forged.body.player.cards, { uncomm1: 1, legend1: 2, legend2: 1 }, "the three are used up; an uncommon comes back");
        assert.match((await call(kid, "POST", "/deck/forge", { ids: ["common1", "common1", "common1"] })).body.error, /don't have those cards/);

        const legendary = await call(kid, "POST", "/deck/forge", { ids: ["legend1", "legend1", "legend2"] });
        assert.deepEqual(legendary.body.options.sort(), ["legend1", "legend2"]);
        assert.match((await call(kid, "POST", "/deck/forge", { ids: ["uncomm1", "uncomm1", "uncomm1"] })).body.error, /Choose your Legendary first/);
        assert.equal((await call(kid, "POST", "/deck/legendary", { formId: "common1" })).status, 409);
        const taken = await call(kid, "POST", "/deck/legendary", { formId: "legend2" });
        assert.deepEqual([taken.body.player.cards.legend2, taken.body.player.pending], [1, null]);

        const cast = await call(kid, "POST", "/deck/cast", { formId: "legend2" });
        assert.equal(cast.body.pet.skinId, "legend2");
        assert.match((await call(kid, "POST", "/deck/cast", { formId: "rare001" })).body.error, /isn't in your deck/);
        const shown = await call(kid, "GET", `/pets?users=${kid._id},nope`);
        assert.deepEqual(Object.keys(shown.body.pets), [String(kid._id)]);
        assert.equal(shown.body.pets[String(kid._id)].skinId, "legend2");
    });
});
