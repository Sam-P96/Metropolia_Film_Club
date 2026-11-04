const mongoose = require("mongoose");

const Schema = mongoose.Schema;

// A member's Steal and Defend settings (utils/steal/players.js), with their
// user id as its _id, made the first time they need one (a class, an item
// equipped, an attack). Whether they're in the game at all is their PVP
// setting (User.pvp), the same switch as for dislikes.
const stealPlayerSchema = new Schema(
    {
        _id: {type: Schema.Types.ObjectId, ref: "User"},

        // When they've turned PVP off with steals to take back (for the
        // admins' refund-pattern flag).
        takebacks: {type: [Date], default: []},

        // "warrior", "mage" or "rogue" (shared/steal/config.js), changeable
        // once a week. null: they've never picked, so STEAL.defaultClass
        // (Warrior).
        playerClass: {type: String, enum: ["warrior", "mage", "rogue", null], default: null},
        classChangedAt: {type: Date, default: null},

        // Up to 3 of their items in use, attack and defense alike, never two
        // of the same item (`key` is its id in the items file).
        equipped: {
            type: [{_id: false, item: {type: Schema.Types.ObjectId, ref: "StealItem"}, key: String}],
            default: [],
        },

        // Their attacks today: the shop day ("2026-11-04") and how many.
        // Claimed in one step when an attack starts, so two clicks at once
        // can't start two.
        attackDay: {type: String, default: null},
        attackCount: {type: Number, default: 0},

        // Victims they've stolen from and then unfollowed: each unfollow
        // doubles how long they have to follow them again before attacking.
        // Never resets.
        penalties: {
            type: [{_id: false, victim: {type: Schema.Types.ObjectId, ref: "User"}, unfollows: Number}],
            default: [],
        },
    },
    {timestamps: true}
);

module.exports = mongoose.model("StealPlayer", stealPlayerSchema);
