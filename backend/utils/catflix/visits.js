const mongoose = require("mongoose");
const User = require("../../models/userModel");
const CatflixPet = require("../../models/catflixPetModel");
const CatflixPresence = require("../../models/catflixPresenceModel");
const { MEMBER_FIELDS, userSummary } = require("../serialize");
const { CatflixError, caughtUp, petView } = require("./pets");

// Who's on a Play Date in whose pet room, right now: the visitor's page
// says "I'm here" every few seconds while they're in the room (and "I've
// gone" when they go home), and the owner's pet room shows each visitor's
// cat while they're there.

// A visitor not heard from in this long has gone.
const HERE_FOR_MS = 45 * 1000;
// The most visitors' cats the owner's room shows at once.
const MAX_GUESTS = 6;

// `visitorId` is in the room of pet `hostPetId` (not their own): noted now.
async function here(visitorId, hostPetId, now = new Date()) {
    if (!mongoose.isValidObjectId(hostPetId)) throw new CatflixError("That pet doesn't exist.", 404);
    const host = await CatflixPet.findById(hostPetId).select("owner").lean();
    if (!host) throw new CatflixError("That pet doesn't exist.", 404);
    if (String(host.owner) === String(visitorId)) return;
    await CatflixPresence.updateOne({ host: host._id, visitor: visitorId }, { $set: { seenAt: now } }, { upsert: true });
}

// `visitorId` went home from pet `hostPetId`'s room.
async function leave(visitorId, hostPetId) {
    if (!mongoose.isValidObjectId(hostPetId)) return;
    await CatflixPresence.deleteOne({ host: hostPetId, visitor: visitorId });
}

// The cats visiting `ownerId`'s pet right now, each with its owner, newest
// arrival last: [petView]. None without a pet of their own.
async function guestsOf(ownerId, now = new Date()) {
    const mine = await CatflixPet.findOne({ owner: ownerId }).select("_id").lean();
    if (!mine) return [];
    const rows = await CatflixPresence.find({ host: mine._id, seenAt: { $gte: new Date(now.getTime() - HERE_FOR_MS) } })
        .sort({ _id: 1 })
        .limit(MAX_GUESTS)
        .lean();
    if (!rows.length) return [];
    const visitors = rows.map((row) => row.visitor);
    const [pets, users] = await Promise.all([CatflixPet.find({ owner: { $in: visitors } }).lean(), User.find({ _id: { $in: visitors } }).select(MEMBER_FIELDS).lean()]);
    const petBy = new Map(pets.map((pet) => [String(pet.owner), pet]));
    const userBy = new Map(users.map((user) => [String(user._id), user]));
    return visitors
        .filter((id) => petBy.has(String(id)) && userBy.has(String(id)))
        .map((id) => {
            const pet = petBy.get(String(id));
            return petView({ ...pet, ...(caughtUp(pet, now) ?? {}) }, ownerId, userSummary(userBy.get(String(id))));
        });
}

module.exports = { here, leave, guestsOf, HERE_FOR_MS, MAX_GUESTS };
