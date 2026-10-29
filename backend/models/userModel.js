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

        // How "Level: X" looks on their review card when someone hovers over
        // their avatar. The fonts match frontend/src/utils/levelStyle.js.
        levelStyle: {
            textColor: {type: String, default: "#FFFFFF"},
            effect: {type: String, enum: ["none", "shadow", "glow"], default: "shadow"},
            effectColor: {type: String, default: "#000000"},
            backing: {type: String, enum: ["none", "glass", "frosted"], default: "none"},
            shape: {type: String, enum: ["round", "rounded", "sharp"], default: "round"},
            font: {
                type: String,
                enum: ["default", "bebas", "cinzel", "playfair", "orbitron", "pixel", "monoton", "pacifico", "marker"],
                default: "default",
            },
        },

        // PVP on: they can dislike, and be disliked by others with it on.
        // Off: likes only, their dislikes are hidden and don't count.
        pvp: {type: Boolean, default: false},

        // Off hides the comments under all their reviews (without deleting
        // them). Each review can also turn its own off.
        allowComments: {type: Boolean, default: true},

        // A gold, silver or bronze ring around their avatar on review cards
        // while they're in the top 3 on the Critics Leaderboard.
        showRank: {type: Boolean, default: true},

        // Who can open their Followers and Following lists. Friends (mutual
        // follows) can always open them, but with "nobody" they only see
        // themselves in them.
        // What's behind their Notifications page: the Upcoming events GIF ("default"),
        // plain white, or the site's usual dark purple ("dark").
        feedBackground: {
            type: String,
            enum: ["default", "white", "dark"],
            default: "default",
        },

        // What moderators and admins have stopped them doing with the Ban
        // Hammer, each on its own (utils/bans.js).
        bans: {
            reviews: {type: Boolean, default: false},
            dislikeReviews: {type: Boolean, default: false},
            comments: {type: Boolean, default: false},
            dislikeComments: {type: Boolean, default: false},
            reports: {type: Boolean, default: false},
            cuts: {type: Boolean, default: false},
        },

        followPrivacy: {
            type: String,
            enum: ["public", "friends", "nobody"],
            default: "public",
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