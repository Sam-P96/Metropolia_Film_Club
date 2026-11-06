const mongoose = require("mongoose");

const Schema = mongoose.Schema;

// Every Loan Shark transaction (utils/loanShark/), so the economy can be
// audited: what was lent, paid back, burned and taken off. `user` is whose
// loan it's about (the borrower; the lender for an offer), `other` the
// other member in a player loan. Amounts are whole points.
//   sharkBorrow     borrowed `amount` P-PP from King Loan Shark
//   sharkRepay      paid `amount` back (PP first, then P-PP): `principal`
//                   of it the loan, `interest` the interest, all burned
//   sharkCollector  Kaveri took `amount` of their daily PP
//                   (split and burned the same way)
//   sharkMissed     a missed payment: the rate went from `rateFrom` to `rateTo`
//   sharkJob        a job done took `amount` off the debt
//   sharkCleared    the debt reached 0 and the loan ended
//   offerPosted     put up an offer of `amount` PP (`offer`), out of their wallet
//   offerTakenDown  took it down: `amount` PP back, the part not borrowed
//   playerBorrow    borrowed `amount` PP from `other`'s `offer`, owing
//                   `interest` on top
//   playerRepay     paid `amount` back to `other` (`auto`: at 12:00, out of
//                   the daily PP): `principal` and `interest` of it, `tax`
//                   of the interest burned, `toLender` paid to them in P-PP
//   playerForgiven  `amount` still owed was let go: one of them left the club
//   devRate         an admin's development button put the rate straight from
//                   `rateFrom` to `rateTo` (to send Kaveri)
const loanTxSchema = new Schema({
    user: {type: Schema.Types.ObjectId, ref: "User", required: true},
    other: {type: Schema.Types.ObjectId, ref: "User", default: null},
    kind: {
        type: String,
        enum: [
            "sharkBorrow", "sharkRepay", "sharkCollector", "sharkMissed", "sharkJob", "sharkCleared",
            "offerPosted", "offerTakenDown", "playerBorrow", "playerRepay", "playerForgiven", "devRate",
        ],
        required: true,
    },
    amount: {type: Number, default: 0},
    principal: {type: Number, default: 0},
    interest: {type: Number, default: 0},
    tax: {type: Number, default: 0},
    toLender: {type: Number, default: 0},
    rateFrom: {type: Number, default: null},
    rateTo: {type: Number, default: null},
    auto: {type: Boolean, default: false},
    loan: {type: Schema.Types.ObjectId, default: null},
    offer: {type: Schema.Types.ObjectId, ref: "LoanOffer", default: null},
    debt: {type: Schema.Types.ObjectId, ref: "PlayerDebt", default: null},
    job: {type: Schema.Types.ObjectId, ref: "LoanJob", default: null},
    day: {type: String, default: null},
    at: {type: Date, default: Date.now},
});

loanTxSchema.index({user: 1, at: -1});
loanTxSchema.index({kind: 1, at: -1});

module.exports = mongoose.model("LoanTx", loanTxSchema);
