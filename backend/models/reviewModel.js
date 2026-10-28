const mongoose = require("mongoose");
const {votable} = require("./votable");

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

        // The author can turn comments off for this one review. They're
        // hidden, not deleted. See also allowComments on the user.
        allowComments: {type: Boolean, default: true},

        // When it first passed the trending line and went out in members'
        // Feeds. It only goes out once.
        trendingAt: {type: Date, default: null},
    },
    {timestamps: true}
);

// likeCount, dislikeCount, and who voted. See votable.js.
reviewSchema.plugin(votable);

// A member gets one review per film. Writing again edits the same one.
reviewSchema.index({user: 1, tmdbId: 1}, {unique: true});
reviewSchema.index({tmdbId: 1, createdAt: -1});
reviewSchema.index({createdAt: -1});
// "Top" reviews: most liked first. "Controversial": most disliked first.
reviewSchema.index({likeCount: -1, createdAt: -1});
reviewSchema.index({dislikeCount: -1, createdAt: -1});

module.exports = mongoose.model("Review", reviewSchema);
