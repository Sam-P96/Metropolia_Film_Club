const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const paidSchema = {
    pp: {type: Number, default: 0},
    ppp: {type: Number, default: 0},
};

// A bet between two members watching a game of 8 Ball Pool
// (utils/poolBets.js). One of them (`bettor`) offers it: `amount` on the
// player in seat `side` to win. It's taken from them straight away and
// waits, for everyone watching to see, until someone else (`taker`) puts up
// the same on the other player.
//   open       offered, waiting for someone to take the other side. The
//              bettor can take it back.
//   matched    taken: both amounts are held until the game ends, and
//              whoever backed the winner gets both, in P-PP
//   withdrawn  taken back by the bettor before anyone took it: handed back
//   refunded   the game ended before anyone took it: handed back. (Or it
//              was matched after the game had already ended: both back.)
//   settled    the game ended: `won` is "bettor" or "taker"
// `paid` and `takerPaid` are what each bet took from their wallet (PP
// first, then P-PP), so it can be handed back exactly.
const poolBetSchema = new Schema({
    match: {type: Schema.Types.ObjectId, ref: "PoolMatch", required: true},
    bettor: {type: Schema.Types.ObjectId, ref: "User", required: true},
    side: {type: Number, enum: [0, 1], required: true},
    amount: {type: Number, required: true, min: 1},
    paid: paidSchema,
    status: {type: String, enum: ["open", "matched", "withdrawn", "refunded", "settled"], default: "open"},
    taker: {type: Schema.Types.ObjectId, ref: "User", default: null},
    takerPaid: paidSchema,
    matchedAt: {type: Date, default: null},
    won: {type: String, enum: ["bettor", "taker", null], default: null},
    createdAt: {type: Date, default: Date.now},
    closedAt: {type: Date, default: null},
});

poolBetSchema.index({match: 1, status: 1, createdAt: 1});
poolBetSchema.index({bettor: 1, match: 1, status: 1});

module.exports = mongoose.model("PoolBet", poolBetSchema);
