const mongoose = require("mongoose");

const Schema = mongoose.Schema;

// A Spell Deck trade in Catflix No Chill between two friends
// (utils/catflix/trades.js). `from` offers a card (and points, if they
// like) to `to`; `to` answers with what they'll give for it (a card, a
// card and points, or just points); `from` takes it or not. Whatever each
// side puts in is held here from the moment they do (taken out of their
// deck and wallet), and goes back if the trade doesn't happen.
//   offered    waiting for `to` to answer, until expiresAt (3 days)
//   countered  `to` answered: waiting for `from` to take it, until expiresAt
//              (3 days from the answer)
//   accepted   done: each has the other's side
//   declined   turned down (by `to` before answering, or `from` after)
//   cancelled  taken back by `from` before `to` answered
//   expired    not answered in time
const sideSchema = new Schema(
    {
        // A registered form's id: the card, or null for none.
        card: { type: String, default: null },
        // Points, and how they were paid (PP first, then P-PP): what goes
        // back, or across, is the same coins.
        points: { type: Number, default: 0 },
        paid: {
            pp: { type: Number, default: 0 },
            ppp: { type: Number, default: 0 },
        },
    },
    { _id: false }
);

const catflixTradeSchema = new Schema(
    {
        from: { type: Schema.Types.ObjectId, ref: "User", required: true },
        to: { type: Schema.Types.ObjectId, ref: "User", required: true },
        offer: { type: sideSchema, required: true },
        counter: { type: sideSchema, default: null },
        status: { type: String, enum: ["offered", "countered", "accepted", "declined", "cancelled", "expired"], default: "offered" },
        expiresAt: { type: Date, required: true },
        counteredAt: { type: Date, default: null },
        settledAt: { type: Date, default: null },
    },
    { timestamps: true }
);

catflixTradeSchema.index({ from: 1, status: 1 });
catflixTradeSchema.index({ to: 1, status: 1 });
// For the sweep: open trades past their time.
catflixTradeSchema.index({ status: 1, expiresAt: 1 });

module.exports = mongoose.model("CatflixTrade", catflixTradeSchema);
