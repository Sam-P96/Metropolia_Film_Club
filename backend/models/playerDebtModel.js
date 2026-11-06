const mongoose = require("mongoose");

const Schema = mongoose.Schema;

// What one member owes another from their loan offers
// (utils/loanShark/player.js): one while there's anything owed, however
// many draws it took. Each draw adds its amount and its own interest.
//
// Repayments go to the principal first, then the interest. Of the interest
// part, 20% is income tax (taxBurned, gone to nobody) and the rest goes to
// the lender, in P-PP, with the principal part.
//
// `version` goes up with every change, which only saves if it's still what
// was read, so a payment and the 12:00 check can't both spend the same debt.
//   status        active while owed; paid once it's all back; forgiven if
//                 either of them deleted their account
//   lastAutoDay   the Helsinki day of the last 12:00 repayment
const playerDebtSchema = new Schema({
    borrower: {type: Schema.Types.ObjectId, ref: "User", required: true},
    lender: {type: Schema.Types.ObjectId, ref: "User", required: true},
    status: {type: String, enum: ["active", "paid", "forgiven"], default: "active"},
    principal: {type: Number, default: 0},
    interest: {type: Number, default: 0},
    principalPaid: {type: Number, default: 0},
    interestPaid: {type: Number, default: 0},
    taxBurned: {type: Number, default: 0},
    draws: {
        type: [{
            _id: false,
            offer: {type: Schema.Types.ObjectId, ref: "LoanOffer"},
            amount: Number,
            rate: Number,
            interest: Number,
            at: {type: Date, default: Date.now},
        }],
        default: [],
    },
    lastAutoDay: {type: String, default: null},
    version: {type: Number, default: 0},
    createdAt: {type: Date, default: Date.now},
    closedAt: {type: Date, default: null},
});

// Only one open debt between the same two members.
playerDebtSchema.index({borrower: 1, lender: 1}, {unique: true, partialFilterExpression: {status: "active"}});
playerDebtSchema.index({lender: 1, status: 1});
playerDebtSchema.index({borrower: 1, status: 1});

module.exports = mongoose.model("PlayerDebt", playerDebtSchema);
