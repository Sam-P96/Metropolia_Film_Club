const mongoose = require("mongoose");

const Schema = mongoose.Schema;

// The written part of a member's take on a film. The rating is copied here
// from their film log entry whenever the review is saved, so a review card
// can be drawn from this one record.
const reviewSchema = new Schema(
    {
        user: {type: Schema.Types.ObjectId, ref: "User", required: true},
        tmdbId: {type: Number, required: true},

        filmTitle: {type: String, required: true},
        filmYear: {type: Number, default: null},
        posterPath: {type: String, default: null},
        genres: {type: [String], default: []},

        rating: {type: Number, default: null, min: 0.5, max: 5},
        text: {type: String, required: true, trim: true, maxlength: 4000},
        containsSpoilers: {type: Boolean, default: false},
        likeCount: {type: Number, default: 0},
    },
    {timestamps: true}
);

// A member gets one review per film. Writing again edits the same one.
reviewSchema.index({user: 1, tmdbId: 1}, {unique: true});
reviewSchema.index({tmdbId: 1, createdAt: -1});
reviewSchema.index({createdAt: -1});

module.exports = mongoose.model("Review", reviewSchema);
