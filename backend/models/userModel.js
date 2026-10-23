const mongoose = require("mongoose");

const Schema = mongoose.Schema;

// A small schema of its own so each favourite doesn't get a pointless _id.
const favouriteFilmSchema = new Schema(
    {
        tmdbId: {type: Number, required: true},
        title: {type: String, required: true},
        posterPath: {type: String, default: null},
    },
    {_id: false}
);

const userSchema = new Schema(
    {
        username: {type: String, required: true, unique: true, trim: true},
        email: {type: String, required: true, unique: true, lowercase: true, trim: true},
        password: {type: String, required: true},

        role: {
            type: String,
            enum: ["user", "moderator", "admin"],
            default: "user",
        },

        memberTitle: {type: String, default: "Human"},
        bio: {type: String, default: "", maxlength: 300},
        avatarUrl: {type: String, default: null},

        // Mongoose treats a key called `type` as a type declaration, which is
        // why this looked like it had to be flattened. Writing the inner value
        // as `{type: String}` tells Mongoose it's a real field called `type`.
        reviewCardBanner: {
            type: {
                type: String,
                enum: ["color", "image"],
                default: "color",
            },
            color: {type: String, default: "#2D1B47"},
            imageUrl: {type: String, default: null},
            style: {
                type: String,
                enum: ["glass", "translucent", "opaque"],
                default: "opaque",
            },
        },

        privacy: {
            type: String,
            enum: ["public", "friends", "private"],
            default: "public",
        },

        // Recorded at signup so we can show, if ever asked, that the member
        // agreed to the privacy policy and which version they saw.
        consent: {
            acceptedPrivacyPolicy: {type: Boolean, default: false},
            acceptedAt: {type: Date, default: null},
            policyVersion: {type: String, default: null},
        },

        favouriteFilms: [favouriteFilmSchema],
    },
    {timestamps: {createdAt: "joinedAt", updatedAt: "updatedAt"}}
);

module.exports = mongoose.model("User", userSchema);