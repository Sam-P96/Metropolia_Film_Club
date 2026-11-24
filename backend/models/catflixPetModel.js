const mongoose = require("mongoose");

const Schema = mongoose.Schema;

// A member's pet in Catflix No Chill (utils/catflix/pets.js): one each,
// hatched from the free egg. What it looks like is a registered form from
// Pet Forge (`skinId`), changed with Spell Deck cards. Its meters run 0 to
// 100 and change with care, with the Room Room, and with time: hunger,
// poop and love are caught up to the present each time the pet is loaded
// (`clock`), an hour at a time (shared/catflix/rules.js).
const catflixPetSchema = new Schema(
    {
        owner: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
        name: { type: String, required: true, maxlength: 30 },
        // A registered form's id (models/petFormModel.js).
        skinId: { type: String, required: true },
        meters: {
            happiness: { type: Number, default: 50 },
            hunger: { type: Number, default: 50 },
            confidence: { type: Number, default: 50 },
        },
        // Love for the owner, and for each other player who has cared for
        // them (by their user id).
        love: { type: Number, default: 50 },
        loveBy: { type: Map, of: Number, default: () => new Map() },
        // Poop in the room (0 to 5), and when the last one came.
        poops: { type: Number, default: 0 },
        poopClock: { type: Date, default: Date.now },
        // Full until then (three feeds, or hunger reaching 100), and feeds
        // since they were last full.
        fullUntil: { type: Date, default: null },
        feeds: { type: Number, default: 0 },
        // The meters are right up to this moment; the rest is caught up
        // when the pet is next loaded.
        clock: { type: Date, default: Date.now },
        // The last scold, for scold-then-praise.
        lastScold: {
            by: { type: Schema.Types.ObjectId, ref: "User", default: null },
            at: { type: Date, default: null },
        },
        roomStyle: { type: String, default: "cozy" },
        aura: { type: String, default: null },
    },
    { timestamps: true }
);

module.exports = mongoose.model("CatflixPet", catflixPetSchema);
