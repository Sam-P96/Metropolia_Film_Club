const mongoose = require("mongoose");

const Schema = mongoose.Schema;

// One Box Office Scratch ticket. games/scratch/engine.js plays it and
// utils/scratch.js saves it and pays out.
//   pending   just bought, the price not taken yet: can't be scratched
//   active    being scratched
//   complete  all scratches used, or collected early
// `layout` and `salt` never leave the server while the card is active: the
// page only ever gets the tiles already scratched (utils/scratch.js
// cardView). `hash` is sha256(JSON.stringify(layout) + salt), shown from the
// moment the card is bought, so that once it's done and the layout and salt
// are revealed, anyone can check the layout was never changed.
const scratchCardSchema = new Schema(
    {
        user: {type: Schema.Types.ObjectId, ref: "User", required: true},
        status: {type: String, enum: ["pending", "active", "complete"], default: "pending"},

        layout: {type: [String], required: true},
        salt: {type: String, required: true},
        hash: {type: String, required: true},

        // What the ticket cost, and what that took from their wallet, so the
        // Straight to DVD tier can hand back exactly that.
        price: {type: Number, required: true},
        spent: {
            pp: {type: Number, default: 0},
            ppp: {type: Number, default: 0},
        },

        // The tiles scratched, in the order they were.
        scratched: {type: [Number], default: []},
        starsFound: {type: Number, default: 0},

        // The tier locked in when the last needed star turned up (its key in
        // shared/scratch/config.js), and whether it's been paid.
        tier: {type: String, default: null},
        prizePaid: {type: Boolean, default: false},

        // The Golden Ticket: found, how much of the jackpot it won, and
        // whether that's been paid.
        goldenFound: {type: Boolean, default: false},
        jackpotAmount: {type: Number, default: null},
        jackpotPaid: {type: Boolean, default: false},

        // The member's id while this card is pending or active, missing once
        // it's done. It's unique, so the database itself stops anyone having
        // two cards going at once, even with two taps on Buy.
        activeFor: {type: Schema.Types.ObjectId, ref: "User"},

        completedAt: {type: Date, default: null},
        // When they pressed "Reveal card".
        revealedAt: {type: Date, default: null},
    },
    {timestamps: true}
);

scratchCardSchema.index({activeFor: 1}, {unique: true, sparse: true});
scratchCardSchema.index({user: 1, status: 1, completedAt: -1});
// For the sweep: cards stuck pending, and prizes not yet paid.
scratchCardSchema.index({status: 1, createdAt: 1});

module.exports = mongoose.model("ScratchCard", scratchCardSchema);
