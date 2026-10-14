const mongoose = require("mongoose");

const Schema = mongoose.Schema;

// A member's entry for one film: watched it, or plans to. This is where the
// rating lives. A written review is a separate, optional record (reviewModel),
// so a member can rate a film without reviewing it.
const filmLogSchema = new Schema(
    {
        user: {type: Schema.Types.ObjectId, ref: "User", required: true},
        tmdbId: {type: Number, required: true},

        // Copied from TMDB when the entry is made, so lists and leaderboards
        // can be drawn without asking TMDB about every film.
        title: {type: String, required: true},
        year: {type: Number, default: null},
        posterPath: {type: String, default: null},
        genres: {type: [String], default: []},

        status: {type: String, enum: ["plan_to_watch", "completed"], required: true},

        // A completed film they want to see again. Puts it back on their
        // watchlist without pretending they haven't seen it.
        wantsRewatch: {type: Boolean, default: false},

        // 0.5 to 5 in half steps, or null for "watched, not rated".
        rating: {type: Number, default: null, min: 0.5, max: 5},
    },
    {timestamps: true}
);

// One entry per member per film.
filmLogSchema.index({user: 1, tmdbId: 1}, {unique: true});
filmLogSchema.index({tmdbId: 1});

module.exports = mongoose.model("FilmLog", filmLogSchema);
