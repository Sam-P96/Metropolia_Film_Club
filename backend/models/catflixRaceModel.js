const mongoose = require("mongoose");

const Schema = mongoose.Schema;

// One Nekomusume: Kitty Race in Catflix No Chill (utils/catflix/kittyRace.js).
//   open       waiting: its host (and, if it isn't solo, the host's friends)
//              are in with their bets, taken as they joined
//   started    the server picked the field, the lanes and the finishing
//              order, and paid the winner, all at once; the race plays out
//              in everyone's page from `startAt` to `endsAt`
//   cancelled  the host left before the start: every bet went back
// `version` goes up with every change to the entries, so the start (which
// reads them, then saves) can tell if someone joined or left in between.

// A member in it: their pet, their bet and how it was paid (PP first, then
// P-PP), and what they got back (the winner: `pays` times the bet).
const entrySchema = new Schema(
    {
        user: { type: Schema.Types.ObjectId, ref: "User", default: null },
        username: { type: String, default: "" },
        pet: { type: Schema.Types.ObjectId, ref: "CatflixPet", default: null },
        name: { type: String, required: true },
        skinId: { type: String, default: null },
        bet: { type: Number, required: true },
        paid: {
            pp: { type: Number, default: 0 },
            ppp: { type: Number, default: 0 },
        },
        payout: { type: Number, default: 0 },
        joinedAt: { type: Date, default: Date.now },
    },
    { _id: false }
);

// A cat in a lane: a member's pet (`owner`), or a house cat (no owner).
const racerSchema = new Schema(
    {
        owner: { type: Schema.Types.ObjectId, ref: "User", default: null },
        username: { type: String, default: "" },
        name: { type: String, required: true },
        skinId: { type: String, default: null },
    },
    { _id: false }
);

const catflixRaceSchema = new Schema(
    {
        host: { type: Schema.Types.ObjectId, ref: "User", default: null },
        solo: { type: Boolean, default: false },
        status: { type: String, enum: ["open", "started", "cancelled"], default: "open" },
        map: { type: String, required: true },
        weather: { type: String, default: null },
        entries: { type: [entrySchema], default: [] },
        version: { type: Number, default: 0 },
        // Set at the start: the lanes (index = lane), the finishing order
        // (lane numbers, the winner first), the seed the pages script the
        // race with, and when it plays.
        racers: { type: [racerSchema], default: [] },
        order: { type: [Number], default: [] },
        // Its mishaps (utils/catflix/kittyRace.js mishapsFor), by lane:
        // { brawl: { attacker, victim, atMs } | null, celebrate: { lane } | null }.
        mishaps: { type: Schema.Types.Mixed, default: null },
        seed: { type: Number, default: 0 },
        startAt: { type: Date, default: null },
        endsAt: { type: Date, default: null },
        settledAt: { type: Date, default: null },
    },
    { timestamps: true }
);

catflixRaceSchema.index({ status: 1, createdAt: 1 });
catflixRaceSchema.index({ "entries.user": 1, status: 1 });
catflixRaceSchema.index({ host: 1, status: 1 });

module.exports = mongoose.model("CatflixRace", catflixRaceSchema);
