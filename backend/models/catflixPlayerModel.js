const mongoose = require("mongoose");

const Schema = mongoose.Schema;

// What a member has in Catflix No Chill besides their pet
// (utils/catflix/shop.js): pet food, unopened booster packs, their Spell
// Deck's cards (how many of each registered form), and the aura crystals
// and room styles they've bought. Everything bought with PP is only ever
// cosmetic.
const catflixPlayerSchema = new Schema(
    {
        user: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
        food: { type: Number, default: 0 },
        packs: {
            single: { type: Number, default: 0 },
            triple: { type: Number, default: 0 },
            blackGold: { type: Number, default: 0 },
        },
        // Registered form id -> how many cards of it.
        cards: { type: Map, of: Number, default: () => new Map() },
        // Three Legendaries forged: the Legendaries offered, waiting for them
        // to choose one (utils/catflix/shop.js forgeCards, takeLegendary).
        pending: {
            type: new Schema({ options: [String], at: Date }, { _id: false }),
            default: null,
        },
        // Toys (utils/catflix/toys.js): the knocks each ball they have has
        // left, by kind (shared/catflix/rules.js toys); null or missing when
        // they have none of that kind. `knockedAt`: the last knock counted.
        balls: {
            beach: { type: Number, default: null },
            soccer: { type: Number, default: null },
            basketball: { type: Number, default: null },
            yarn: { type: Number, default: null },
        },
        knockedAt: { type: Date, default: null },
        auras: { type: [String], default: [] },
        styles: { type: [String], default: [] },
        // The free egg, cracked open (its 100 taps done) but not named yet:
        // the registered form it hatches into (utils/catflix/pets.js crackEgg).
        egg: { skinId: { type: String, default: null } },
        // Show auras on pets (theirs and others') in the game.
        aurasOn: { type: Boolean, default: true },
        // Their best Ruin Run, in metres (utils/catflix/ruinRun.js).
        runBest: { type: Number, default: 0 },
    },
    { timestamps: true }
);

module.exports = mongoose.model("CatflixPlayer", catflixPlayerSchema);
