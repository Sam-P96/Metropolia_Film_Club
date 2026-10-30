const mongoose = require("mongoose");

const Schema = mongoose.Schema;

// One change to a member's wallet: how much PP and P-PP it added (positive)
// or took away (negative), why, and what the wallet held right after. The
// wallet itself lives on the user (models/userModel.js); this is the
// receipt, so any balance can be explained.
//   dailyPayout   the 12:00 payout (jobs/dailyPayout.js)
//   bet           points put up for a Farkle game
//   win           a Farkle win, always paid in P-PP
//   refund        a bet handed back (a cancelled or expired game)
//   shop          P-PP spent on a badge or trophy
//   admin         changed by hand by an admin
//   giftSent      P-PP gifted to `other`, plus the 1 point fee ("Gift PP")
//   giftReceived  P-PP gifted by `other`
const walletTxSchema = new Schema({
    user: {type: Schema.Types.ObjectId, ref: "User", required: true},
    reason: {
        type: String,
        enum: ["dailyPayout", "bet", "win", "refund", "shop", "admin", "giftSent", "giftReceived"],
        required: true,
    },
    pp: {type: Number, default: 0},
    ppp: {type: Number, default: 0},
    balance: {
        pp: {type: Number, required: true},
        ppp: {type: Number, required: true},
    },
    // The Farkle game a bet, win or refund belongs to.
    match: {type: Schema.Types.ObjectId, ref: "FarkleMatch", default: null},
    // The other member in a gift: who it went to, or came from.
    other: {type: Schema.Types.ObjectId, ref: "User", default: null},
    at: {type: Date, default: Date.now},
});

walletTxSchema.index({user: 1, at: -1});

module.exports = mongoose.model("WalletTx", walletTxSchema);