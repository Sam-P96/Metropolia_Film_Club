const mongoose = require("mongoose");

const Schema = mongoose.Schema;

// A film both members rated, for their Resonance card.
const sharedFilmSchema = new Schema(
    {
        tmdbId: {type: Number, required: true},
        title: {type: String, required: true},
        posterPath: {type: String, default: null},
    },
    {_id: false}
);

// How alike two members' film ratings are (utils/resonance.js), worked out
// for every pair each night (jobs/resonanceSweep.js). One document per
// pair: userA is whichever of the two ids sorts first, so a pair is only
// ever stored once. Who may see it is decided when it's asked for
// (utils/resonanceStore.js), not here.
const resonanceSchema = new Schema({
    userA: {type: Schema.Types.ObjectId, ref: "User", required: true},
    userB: {type: Schema.Types.ObjectId, ref: "User", required: true},

    // 0 to 100.
    percent: {type: Number, required: true, min: 0, max: 100},
    // The two factors the card shows, as percentages: Movies (their ratings
    // of the films both rated) and Genre (how they rate each genre).
    movies: {type: Number, required: true, min: 0, max: 100},
    genre: {type: Number, required: true, min: 0, max: 100},

    sharedCount: {type: Number, required: true, min: 0},
    sharedFilms: {type: [sharedFilmSchema], default: []},

    // The sweep that worked it out. Pairs it didn't reach are removed.
    computedAt: {type: Date, required: true},
});

resonanceSchema.index({userA: 1, userB: 1}, {unique: true});
// One member's pairs are the ones with them on either side.
resonanceSchema.index({userB: 1});
resonanceSchema.index({computedAt: 1});

module.exports = mongoose.model("Resonance", resonanceSchema);
