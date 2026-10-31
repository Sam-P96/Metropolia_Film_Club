const mongoose = require("mongoose");

const Schema = mongoose.Schema;

// The Box Office Scratch jackpot: a single document, "main". `amount` is
// the pool in P-PP: every ticket adds to it, and finding the Golden Ticket
// wins all of it and puts it back to the seed (shared/scratch/config.js).
// `recent` are the latest wins, newest first, for "Recent jackpots"; each
// win is added in the same step that empties the pool (utils/scratch.js
// claimJackpot), so the two can never disagree.
const jackpotWinSchema = new Schema(
    {
        user: {type: Schema.Types.ObjectId, ref: "User"},
        username: String,
        amount: Number,
        card: {type: Schema.Types.ObjectId, ref: "ScratchCard"},
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
