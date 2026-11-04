const mongoose = require("mongoose");

const Schema = mongoose.Schema;

// One Steal and Defend item someone owns (utils/steal/inventory.js). What
// it is and does comes from the items file, by `key`; this is the copy:
// whose it is, how much durability it has left, and what it first cost.
//   owned    in their inventory (and maybe equipped: models/stealPlayerModel.js)
//   listed   up for sale on the player market
//   escrow   held in a trade offer until it's answered
const stealItemSchema = new Schema(
    {
        owner: {type: Schema.Types.ObjectId, ref: "User", required: true},
        key: {type: String, required: true},
        durability: {type: Number, required: true, min: 0},
        maxDurability: {type: Number, required: true, min: 1},
        // What the first buyer paid the shop. It stays with the item through
        // trades, so selling it back is worth the same whoever has it.
        originalPrice: {type: Number, required: true, min: 1},
        state: {type: String, enum: ["owned", "listed", "escrow"], default: "owned"},
        // An Infinity Stone: only one of each can exist (the index below).
        unique: {type: Boolean, default: false},
        // When the current owner got it.
        acquiredAt: {type: Date, default: Date.now},
    },
    {timestamps: true}
);

stealItemSchema.index({owner: 1, createdAt: 1});
// Only one of each Infinity Stone on the whole site.
stealItemSchema.index({key: 1}, {unique: true, partialFilterExpression: {unique: true}});

module.exports = mongoose.model("StealItem", stealItemSchema);
