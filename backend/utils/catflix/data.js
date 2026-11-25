const CatflixPet = require("../../models/catflixPetModel");
const CatflixPlayer = require("../../models/catflixPlayerModel");
const CatflixAction = require("../../models/catflixActionModel");
const CatflixRun = require("../../models/catflixRunModel");
const CatflixRunDay = require("../../models/catflixRunDayModel");
const CatflixPresence = require("../../models/catflixPresenceModel");
const CatflixRace = require("../../models/catflixRaceModel");
const { leaveRace } = require("./kittyRace");

// A member's Catflix No Chill, for their data export and for deleting their
// account (controllers/userControllers.js).

// Everything kept about them: their pet, their things, what they did to
// other pets this past day, their Ruin Runs and their Kitty Races.
async function catflixDataOf(userId) {
    const [pet, player, actions, runs, runDays, races] = await Promise.all([
        CatflixPet.findOne({ owner: userId }).select("-__v").lean(),
        CatflixPlayer.findOne({ user: userId }).select("-_id -__v").lean(),
        CatflixAction.find({ actor: userId }).select("-_id -__v -actor").lean(),
        CatflixRun.find({ user: userId }).sort({ startedAt: -1 }).select("-seed -user -__v").lean(),
        CatflixRunDay.find({ user: userId }).sort({ day: -1 }).select("day cashOuts -_id").lean(),
        CatflixRace.find({ "entries.user": userId }).sort({ createdAt: -1 }).lean(),
    ]);
    return {
        pet,
        player,
        actions,
        ruinRuns: runs,
        ruinRunDays: runDays,
        kittyRaces: races.map((race) => ({
            at: race.createdAt,
            status: race.status,
            map: race.map,
            hosted: String(race.host) === String(userId),
            entry: race.entries.find((entry) => String(entry.user) === String(userId)),
        })),
    };
}

// Forgets them: an open race they're in is left (one they host is called
// off, everyone's bet back), past races keep their cats but not who they
// were, and their pet, things, runs and the love other pets had for them go.
async function forgetCatflixPlayer(userId) {
    const open = await CatflixRace.find({ "entries.user": userId, status: "open" }).select("_id").lean();
    for (const { _id } of open) await leaveRace(userId, _id).catch(() => {});
    await CatflixRace.updateMany({ "entries.user": userId }, { $set: { "entries.$[e].user": null, "entries.$[e].username": "" } }, { arrayFilters: [{ "e.user": userId }] });
    await CatflixRace.updateMany({ "racers.owner": userId }, { $set: { "racers.$[r].owner": null, "racers.$[r].username": "" } }, { arrayFilters: [{ "r.owner": userId }] });
    await CatflixRace.updateMany({ host: userId }, { $set: { host: null } });

    const pet = await CatflixPet.findOne({ owner: userId }).select("_id").lean();
    await Promise.all([
        CatflixPet.deleteOne({ owner: userId }),
        CatflixPlayer.deleteOne({ user: userId }),
        CatflixAction.deleteMany({ $or: [{ actor: userId }, ...(pet ? [{ pet: pet._id }] : [])] }),
        CatflixRun.deleteMany({ user: userId }),
        CatflixRunDay.deleteMany({ user: userId }),
        CatflixPresence.deleteMany({ $or: [{ visitor: userId }, ...(pet ? [{ host: pet._id }] : [])] }),
        CatflixPet.updateMany({ [`loveBy.${userId}`]: { $exists: true } }, { $unset: { [`loveBy.${userId}`]: 1 } }, { timestamps: false }),
        CatflixPet.updateMany({ "lastScold.by": userId }, { $set: { "lastScold.by": null, "lastScold.at": null } }, { timestamps: false }),
    ]);
}

module.exports = { catflixDataOf, forgetCatflixPlayer };
