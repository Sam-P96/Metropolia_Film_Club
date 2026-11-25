const mongoose = require("mongoose");
const CatflixPet = require("../../models/catflixPetModel");
const CatflixPlayer = require("../../models/catflixPlayerModel");
const CatflixAction = require("../../models/catflixActionModel");
const PetForm = require("../../models/petFormModel");
const Follow = require("../../models/followModel");
const User = require("../../models/userModel");
const { MEMBER_FIELDS, userSummary } = require("../serialize");
const { CATFLIX, weatherFor, weatherSlot } = require("../../../shared/catflix/rules.js");

// Catflix No Chill's pets (shared/catflix/rules.js has the numbers): hatching
// the free egg, a pet's meters catching up with time, care by its owner or on
// a Play Date, and what pets do to each other in the Room Room. The server
// decides every change; the page only shows them and asks.

class CatflixError extends Error {
    constructor(message, status = 400) {
        super(message);
        this.status = status;
    }
}

const HOUR = 60 * 60 * 1000;
const MAX = CATFLIX.meterMax;
const clamp = (value) => Math.max(0, Math.min(MAX, Math.round(value)));
const randomBetween = ([low, high], random = Math.random) => Math.round(low + random() * (high - low));
const pickFrom = (items, random = Math.random) => items[Math.floor(random() * items.length)];

// ---- Time ----

// A pet's meters caught up to `now`, an hour at a time from its clock, as a
// plain object of the fields that change (nothing, if an hour hasn't passed).
//   hunger     drops CATFLIX.hunger.perHour an hour once they're not full
//   happiness  -1 an hour while hunger is below hungryBelow, and -1 for each
//              poop every costEveryHours (on even hours, so it's the same
//              whenever it's worked out)
//   poop       one every poop.everyHours, up to poop.max
//   love       for the owner, -1 an hour while happiness is below ownerBelow;
//              for everyone else, while below othersBelow
// At most 60 days are worked through: a pet left that long is just as sad.
function caughtUp(pet, now = new Date()) {
    const start = new Date(pet.clock).getTime();
    const hours = Math.floor((now.getTime() - start) / HOUR);
    if (hours <= 0) return null;
    const steps = Math.min(hours, 60 * 24);
    const meters = { ...pet.meters };
    let love = pet.love;
    const loveBy = new Map(pet.loveBy instanceof Map ? pet.loveBy : Object.entries(pet.loveBy ?? {}));
    let poops = pet.poops;
    let poopClock = new Date(pet.poopClock).getTime();
    const fullUntil = pet.fullUntil ? new Date(pet.fullUntil).getTime() : 0;
    const { hunger, poop, love: rules } = CATFLIX;

    for (let i = 1; i <= steps; i++) {
        const at = start + i * HOUR;
        if (at > fullUntil) meters.hunger = clamp(meters.hunger - hunger.perHour);
        if (meters.hunger < hunger.hungryBelow) meters.happiness = clamp(meters.happiness - 1);
        while (at - poopClock >= poop.everyHours * HOUR) {
            poopClock += poop.everyHours * HOUR;
            poops = Math.min(poop.max, poops + 1);
        }
        if (Math.floor(at / HOUR) % poop.costEveryHours === 0) meters.happiness = clamp(meters.happiness - poops);
        if (meters.happiness < rules.ownerBelow) love = clamp(love - 1);
        if (meters.happiness < rules.othersBelow) for (const [who, amount] of loveBy) loveBy.set(who, clamp(amount - 1));
    }
    // Hours beyond the 60 days are skipped, not saved up for later.
    const clock = new Date(hours > steps ? now.getTime() - ((now.getTime() - start) % HOUR) : start + steps * HOUR);
    return { meters, love, loveBy, poops, poopClock: new Date(poopClock), clock };
}

// Changes a pet: `change(pet)` gets it caught up with time (a plain object)
// and returns what to set, or throws to say no. Saved only if nobody changed
// the pet meanwhile (its updatedAt), else tried again with the new one.
// Resolves to the pet as saved.
async function changePet(filter, change, now = new Date()) {
    for (let attempt = 0; attempt < 6; attempt++) {
        const pet = await CatflixPet.findOne(filter).lean();
        if (!pet) throw new CatflixError("That pet doesn't exist.", 404);
        const fresh = { ...pet, ...(caughtUp(pet, now) ?? {}) };
        const set = { ...(await change(fresh)) };
        const merged = { ...fresh, ...set };
        const update = {
            meters: merged.meters,
            love: merged.love,
            loveBy: merged.loveBy instanceof Map ? Object.fromEntries(merged.loveBy) : merged.loveBy,
            poops: merged.poops,
            poopClock: merged.poopClock,
            clock: merged.clock,
            fullUntil: merged.fullUntil,
            feeds: merged.feeds,
            lastScold: merged.lastScold,
            roomStyle: merged.roomStyle,
            aura: merged.aura,
            skinId: merged.skinId,
            name: merged.name,
        };
        const saved = await CatflixPet.findOneAndUpdate({ _id: pet._id, updatedAt: pet.updatedAt }, { $set: update }, { returnDocument: "after" }).lean();
        if (saved) return saved;
    }
    throw new CatflixError("Your pet is busy: try again.", 409);
}

// A member's pet, caught up with time (and saved so), or null.
async function petOf(userId, now = new Date()) {
    const pet = await CatflixPet.findOne({ owner: userId }).lean();
    if (!pet || !caughtUp(pet, now)) return pet;
    return changePet({ _id: pet._id }, () => ({}), now);
}

// ---- What the page sees ----

const loveMapOf = (pet) => (pet.loveBy instanceof Map ? pet.loveBy : new Map(Object.entries(pet.loveBy ?? {})));

// A pet for `viewerId`: its meters, love for its owner and for the viewer,
// poop, whether it's full, and its looks. `owner`: their summary, if known.
function petView(pet, viewerId = null, owner = null) {
    if (!pet) return null;
    const mine = viewerId && String(pet.owner) === String(viewerId);
    return {
        _id: pet._id,
        owner: owner ?? { _id: pet.owner },
        mine: Boolean(mine),
        name: pet.name,
        skinId: pet.skinId,
        meters: pet.meters,
        love: pet.love,
        // How much it loves the viewer, when that isn't its owner.
        loveForMe: !mine && viewerId ? (loveMapOf(pet).get(String(viewerId)) ?? 0) : null,
        poops: pet.poops,
        full: Boolean(pet.fullUntil && new Date(pet.fullUntil) > new Date()),
        roomStyle: pet.roomStyle,
        aura: pet.aura,
    };
}

// ---- Hatching ----

// A random Common registered form, or any if there are no Commons yet: what
// the free egg hatches into.
async function eggForm(random) {
    const forms = await PetForm.find().select("rarity").lean();
    const commons = forms.filter((form) => form.rarity === "common");
    const pool = commons.length > 0 ? commons : forms;
    if (pool.length === 0) throw new CatflixError("No pets have been made yet: come back soon.", 409);
    return pickFrom(pool, random)._id;
}

// The free egg cracks (its 100 taps done on the page): what it hatches into
// is chosen now, and kept, so the page shows the cat that will be theirs.
// Resolves to { skinId }.
async function crackEgg(userId, { random = Math.random } = {}) {
    if (await CatflixPet.exists({ owner: userId })) throw new CatflixError("You have a pet already.", 409);
    const player = await CatflixPlayer.findOneAndUpdate({ user: userId }, { $setOnInsert: { user: userId } }, { upsert: true, returnDocument: "after" }).lean();
    if (player.egg?.skinId && (await PetForm.exists({ _id: player.egg.skinId }))) return { skinId: player.egg.skinId };
    const skinId = await eggForm(random);
    await CatflixPlayer.updateOne({ user: userId }, { $set: { "egg.skinId": skinId } });
    return { skinId };
}

// The free egg, hatched and named `name`: the form it cracked into (or a new
// pick, if it hasn't cracked), with meters somewhere in CATFLIX.startMeters.
// One pet a member.
async function hatch(userId, name, { random = Math.random, now = new Date() } = {}) {
    const clean = typeof name === "string" ? name.trim().slice(0, 30) : "";
    if (!clean) throw new CatflixError("Give your cat a name.");
    if (await CatflixPet.exists({ owner: userId })) throw new CatflixError("You have a pet already.", 409);
    const player = await CatflixPlayer.findOne({ user: userId }).select("egg").lean();
    const cracked = player?.egg?.skinId && (await PetForm.exists({ _id: player.egg.skinId })) ? player.egg.skinId : null;
    const skinId = cracked ?? (await eggForm(random));
    try {
        const pet = await CatflixPet.create({
            owner: userId,
            name: clean,
            skinId,
            meters: { happiness: randomBetween(CATFLIX.startMeters, random), hunger: randomBetween(CATFLIX.startMeters, random), confidence: randomBetween(CATFLIX.startMeters, random) },
            love: randomBetween(CATFLIX.startMeters, random),
            clock: now,
            poopClock: now,
        });
        await CatflixPlayer.updateOne({ user: userId }, { $set: { "egg.skinId": null } }, { upsert: true });
        return pet.toObject();
    } catch (error) {
        if (error.code === 11000) throw new CatflixError("You have a pet already.", 409);
        throw error;
    }
}

// ---- Once an hour ----

// Claims `action` on `petId` for `actorId` for the next hour: throws if
// they've done it within the hour. Atomic, so two taps can't both count.
async function claimAction(actorId, petId, action, now = new Date()) {
    try {
        await CatflixAction.findOneAndUpdate(
            { actor: actorId, pet: petId, action, until: { $lte: now } },
            { $set: { until: new Date(now.getTime() + CATFLIX.actionEveryMs) } },
            { upsert: true }
        );
    } catch (error) {
        if (error.code !== 11000) throw error;
        const row = await CatflixAction.findOne({ actor: actorId, pet: petId, action }).lean();
        const minutes = row ? Math.max(1, Math.ceil((new Date(row.until) - now) / 60000)) : 60;
        throw new CatflixError(`You've done that to this pet in the last hour: again in ${minutes} minute${minutes === 1 ? "" : "s"}.`, 429);
    }
}

// Gives a claimed action back (it couldn't happen after all).
const releaseAction = (actorId, petId, action) => CatflixAction.deleteOne({ actor: actorId, pet: petId, action });

// ---- Care ----

const CARE = ["feed", "brush", "scoop", "praise", "scold"];

// Love for whoever cared: the owner's own meter, or theirs on the pet, which
// only grows while the pet is unhappy (below love.othersEarnBelow).
function withLove(pet, actorId, amount) {
    if (String(pet.owner) === String(actorId)) return { love: clamp(pet.love + amount) };
    if (pet.meters.happiness >= CATFLIX.love.othersEarnBelow) return {};
    const loveBy = new Map(loveMapOf(pet));
    loveBy.set(String(actorId), clamp((loveBy.get(String(actorId)) ?? 0) + amount));
    return { loveBy };
}

// One kind of care for `petId` by `actorId`: feed (uses a serving of their
// food), brush, scoop (a poop), praise or scold. Their own pet as often as
// they like; anyone else's on a Play Date, each kind once an hour. Resolves
// to the pet as it is now.
async function care(actorId, petId, kind, now = new Date()) {
    if (!CARE.includes(kind)) throw new CatflixError("That isn't a way to care for a pet.");
    if (!mongoose.isValidObjectId(petId)) throw new CatflixError("That pet doesn't exist.", 404);
    const pet = await CatflixPet.findById(petId).select("owner").lean();
    if (!pet) throw new CatflixError("That pet doesn't exist.", 404);
    const mine = String(pet.owner) === String(actorId);
    if (!mine) await claimAction(actorId, petId, kind, now);
    let fed = false;
    try {
        if (kind === "feed") {
            const player = await CatflixPlayer.findOneAndUpdate({ user: actorId, food: { $gte: 1 } }, { $inc: { food: -1 } });
            if (!player) throw new CatflixError("You have no pet food: buy some in the shop.");
            fed = true;
        }
        const { care: rules, hunger } = CATFLIX;
        return await changePet(
            { _id: petId },
            (current) => {
                const meters = { ...current.meters };
                if (kind === "feed") {
                    meters.hunger = clamp(meters.hunger + rules.feed.hunger);
                    const feeds = current.feeds + 1;
                    const full = feeds >= hunger.feedsToFill || meters.hunger >= MAX;
                    return { meters, feeds: full ? 0 : feeds, fullUntil: full ? new Date(now.getTime() + hunger.fullHours * HOUR) : current.fullUntil, ...withLove(current, actorId, rules.feed.love) };
                }
                if (kind === "brush") {
                    meters.happiness = clamp(meters.happiness + rules.brush.happiness);
                    return { meters, ...withLove(current, actorId, rules.brush.love) };
                }
                if (kind === "scoop") {
                    if (current.poops < 1) throw new CatflixError("There's nothing to scoop.");
                    return { poops: current.poops - 1, ...withLove(current, actorId, rules.scoop.love) };
                }
                if (kind === "scold") {
                    meters.confidence = clamp(meters.confidence + rules.scold.confidence);
                    meters.happiness = clamp(meters.happiness + rules.scold.happiness);
                    return { meters, lastScold: { by: actorId, at: now } };
                }
                // Praise: after a scold by the same player, within comboMinutes,
                // it's a scold-then-praise.
                const combo = current.lastScold?.by && String(current.lastScold.by) === String(actorId) && now - new Date(current.lastScold.at) <= rules.comboMinutes * 60000;
                if (!combo) {
                    meters.happiness = clamp(meters.happiness + rules.praise.happiness);
                    return { meters };
                }
                const both = rules.scoldThenPraise;
                const loved = withLove(current, actorId, both.love);
                meters.happiness = clamp(meters.happiness + both.happiness);
                meters.confidence = clamp(meters.confidence + both.confidence);
                return { meters, ...loved, lastScold: { by: null, at: null } };
            },
            now
        );
    } catch (error) {
        if (fed) await CatflixPlayer.updateOne({ user: actorId }, { $inc: { food: 1 } });
        if (!mine) await releaseAction(actorId, petId, kind);
        throw error;
    }
}

// ---- The Room Room ----

const ACTIONS = ["play", "pet", "bully"];

// What `actorId`'s pet does to the pet `targetId`, once an hour each:
//   play   both +1 happiness
//   pet    theirs +2 happiness and +1 confidence
//   bully  yours more confident: yours +1 confidence, both -1 happiness;
//          theirs as confident or more: both -1 confidence and happiness
// Resolves to { mine, theirs, outcome } ("won" or "lost" for a bully).
async function act(actorId, targetId, action, now = new Date()) {
    if (!ACTIONS.includes(action)) throw new CatflixError("Pets can play, pet or bully.");
    const mine = await petOf(actorId, now);
    if (!mine) throw new CatflixError("You need a pet first: hatch your egg.", 409);
    if (!mongoose.isValidObjectId(targetId) || String(targetId) === String(mine._id)) throw new CatflixError("Pick another pet.");
    const found = await CatflixPet.findById(targetId).lean();
    if (!found) throw new CatflixError("That pet doesn't exist.", 404);
    const target = { ...found, ...(caughtUp(found, now) ?? {}) };
    await claimAction(actorId, target._id, action, now);

    try {
        let outcome = null;
        if (action === "bully") outcome = mine.meters.confidence > target.meters.confidence ? "won" : "lost";
        const shift = (deltas) => (pet) => {
            const meters = { ...pet.meters };
            for (const [meter, delta] of Object.entries(deltas)) meters[meter] = clamp(meters[meter] + delta);
            return { meters };
        };
        const [mineDeltas, theirDeltas] =
            action === "play"
                ? [{ happiness: 1 }, { happiness: 1 }]
                : action === "pet"
                  ? [{}, { happiness: 2, confidence: 1 }]
                  : outcome === "won"
                    ? [{ confidence: 1, happiness: -1 }, { happiness: -1 }]
                    : [{ confidence: -1, happiness: -1 }, { confidence: -1, happiness: -1 }];
        const theirs = await changePet({ _id: target._id }, shift(theirDeltas), now);
        const ours = Object.keys(mineDeltas).length ? await changePet({ _id: mine._id }, shift(mineDeltas), now) : mine;
        return { mine: ours, theirs, outcome };
    } catch (error) {
        await releaseAction(actorId, target._id, action);
        throw error;
    }
}

// Their friends: members they follow who follow them back.
async function friendIdsOf(userId) {
    const followed = await Follow.find({ follower: userId }).distinct("following");
    return Follow.find({ following: userId, follower: { $in: followed } }).distinct("follower");
}

// A visit to the Room Room on `map`: their pet and up to CATFLIX.room.pets
// - 1 others, never the same pet twice, each a friend's half the time
// (CATFLIX.room.friendShare) while there are friends' pets left to pick,
// anyone's otherwise. Picked again every visit. A pet with no happiness left
// (0) is only ever on the graveyard (CATFLIX.mood.gloomMap): theirs too
// (`away`: it's at home on this map). With the weather on every map for
// the next 4 hours. Resolves to { map, weather, pets, away }.
async function roomVisit(userId, map = CATFLIX.room.defaultMap, { random = Math.random, now = new Date() } = {}) {
    const room = CATFLIX.maps[map] ? map : CATFLIX.room.defaultMap;
    const gloomy = room === CATFLIX.mood.gloomMap;
    // Here at all: anywhere with some happiness, only the graveyard without.
    const here = (pet) => gloomy || pet.meters.happiness > 0;
    const caught = (pet) => ({ ...pet, ...(caughtUp(pet, now) ?? {}) });
    const owned = await petOf(userId, now);
    const mine = owned && here(owned) ? owned : null;
    const others = CATFLIX.room.pets - 1;
    const friends = await friendIdsOf(userId);
    // Happiness only falls with time, so a pet saved at 0 is at 0 now; one saved above it may have got there since
    // (caught up below), so twice as many are sampled.
    const away = gloomy ? {} : { "meters.happiness": { $gt: 0 } };
    const [friendSample, otherSample] = await Promise.all([
        CatflixPet.aggregate([{ $match: { owner: { $in: friends }, ...away } }, { $sample: { size: others * 2 } }]),
        CatflixPet.aggregate([{ $match: { owner: { $nin: [...friends, new mongoose.Types.ObjectId(String(userId))] }, ...away } }, { $sample: { size: others * 2 } }]),
    ]);
    const friendPets = friendSample.map(caught).filter(here);
    const otherPets = otherSample.map(caught).filter(here);
    const chosen = [];
    while (chosen.length < others && (friendPets.length || otherPets.length)) {
        const fromFriends = friendPets.length > 0 && (otherPets.length === 0 || random() < CATFLIX.room.friendShare);
        chosen.push(fromFriends ? friendPets.splice(Math.floor(random() * friendPets.length), 1)[0] : otherPets.splice(Math.floor(random() * otherPets.length), 1)[0]);
    }
    const pets = [...(mine ? [mine] : []), ...chosen];
    const owners = await User.find({ _id: { $in: pets.map((pet) => pet.owner) } }).select(MEMBER_FIELDS).lean();
    const ownerById = new Map(owners.map((owner) => [String(owner._id), userSummary(owner)]));
    const friendSet = new Set(friends.map(String));
    const slot = weatherSlot(now);
    return {
        map: room,
        weather: Object.fromEntries(Object.keys(CATFLIX.maps).map((key) => [key, weatherFor(key, slot)])),
        pets: pets.map((pet) => ({ ...petView(pet, userId, ownerById.get(String(pet.owner)) ?? null), friend: friendSet.has(String(pet.owner)) })),
        away: Boolean(owned && !mine),
    };
}

module.exports = { CatflixError, HOUR, caughtUp, changePet, petOf, petView, crackEgg, hatch, claimAction, care, act, roomVisit, friendIdsOf, CARE, ACTIONS };
