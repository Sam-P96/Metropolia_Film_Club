const mongoose = require("mongoose");

const Schema = mongoose.Schema;

// A member's offer to lend PP to other members (utils/loanShark/player.js),
// on the Loan Shark page's postings.
//   fixed     one borrower takes exactly `amount`, and it closes
//   flexible  a pool: anyone draws what they like from it (at least 20 at a
//             time), until it's empty
// The PP still to be borrowed (`available`) is taken out of the lender's
// wallet while the offer is up, and goes back if they take it down. `rate`
// is the total interest in whole percent: 25 means borrowing 20 costs 25.
// Offers never expire.
//   closedReason  taken (a Fixed one), empty (a Flexible one drawn dry),
//                 down (the lender took it down)
const loanOfferSchema = new Schema({
    lender: {type: Schema.Types.ObjectId, ref: "User", required: true},
    style: {type: String, enum: ["fixed", "flexible"], required: true},
    amount: {type: Number, required: true},
    available: {type: Number, required: true},
    rate: {type: Number, required: true},
    status: {type: String, enum: ["active", "closed"], default: "active"},
    closedReason: {type: String, enum: ["taken", "empty", "down", null], default: null},
    createdAt: {type: Date, default: Date.now},
    closedAt: {type: Date, default: null},
});

loanOfferSchema.index({status: 1, createdAt: -1});
loanOfferSchema.index({lender: 1, status: 1});

module.exports = mongoose.model("LoanOffer", loanOfferSchema);
