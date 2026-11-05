const mongoose = require("mongoose");

const Schema = mongoose.Schema;

// A Box Office Scratch jackpot: one document per ticket type, "main" for
// Standard (the pool from before there were ticket types), "premium" and
// "vip" (utils/scratch.js jackpotId). `amount` is the pool in P-PP: every
// ticket of that type adds to it, and finding the Golden Ticket on one wins
// all of it and puts it back to the type's seed (shared/scratch/config.js).
// `recent` are the latest wins, newest first, for "Recent jackpots"; each
// win is added in the same step that empties the pool (utils/scratch.js
// claimJackpot), so the two can never disagree. A win's `ticketType` is the
// pool's; wins from before there were ticket types don't have one, and were
// all Standard.
const jackpotWinSchema = new Schema(
    {
        user: {type: Schema.Types.ObjectId, ref: "User"},
        username: String,
        amount: Number,
        card: {type: Schema.Types.ObjectId, ref: "ScratchCard"},
        ticketType: String,
        at: Date,
    },
    {_id: false}
);

const jackpotSchema = new Schema({
    _id: {type: String},
    amount: {type: Number, required: true},
    recent: {type: [jackpotWinSchema], default: []},
});

module.exports = mongoose.model("Jackpot", jackpotSchema);
