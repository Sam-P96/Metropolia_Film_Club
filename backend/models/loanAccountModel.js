const mongoose = require("mongoose");

const Schema = mongoose.Schema;

// A member's Loan Shark account (utils/loanShark/), one each, its _id
// their user id. Made the first time anything needs it.
//
// Every change goes through utils/loanShark/account.js changeAccount,
// which only saves if `version` is still what it read, and adds 1 to it:
// two changes at the same moment (two tabs, a payment and the 12:00 check)
// can never both go through on the same numbers.
//
//   shark      their debt to King Loan Shark. borrowed 0 means none, and
//              then everything else in it is as a new loan starts.
//     loan          this loan's id, a new one each time a loan starts (the
//                   jobs belong to it)
//     borrowed      the total borrowed, in P-PP
//     rate          the total interest, in whole percent (10, 20, ... 160).
//                   Owed = borrowed x (100 + rate)%, rounded up, less what
//                   they've paid and what jobs took off.
//     paid          paid back so far, by them or Kaveri Heiwajima
//     jobReduction  what jobs done have taken off, in all
//     credit        paid towards the next day's minimum, not yet a whole day
//     paidUntil     the last 12:00 check their payments cover, or null
//     startedAt     when this loan was first taken
//     firstDueAt    the first 12:00 check a payment is due at: the first
//                   one at least 24 hours after startedAt
//     missed        missed payments so far on this loan
//   lastCheckDay      the Helsinki day of the last 12:00 check that went
//                     through their loans ("2026-11-06")
//   lastCollectorLine the line Kaveri's last notification used, so the
//                     next is a different one
//   player     what they owe other members, kept here so the caps can be
//              checked and reserved in one step
//     owed      across all player loans, interest included
//     lenders   the members they owe (at most 2)
//   offers     how many loan offers they have up
const loanAccountSchema = new Schema({
    _id: {type: Schema.Types.ObjectId, ref: "User"},
    version: {type: Number, default: 0},
    shark: {
        loan: {type: Schema.Types.ObjectId, default: null},
        borrowed: {type: Number, default: 0},
        rate: {type: Number, default: 10},
        paid: {type: Number, default: 0},
        jobReduction: {type: Number, default: 0},
        credit: {type: Number, default: 0},
        paidUntil: {type: Date, default: null},
        startedAt: {type: Date, default: null},
        firstDueAt: {type: Date, default: null},
        missed: {type: Number, default: 0},
    },
    lastCheckDay: {type: String, default: null},
    lastCollectorLine: {type: Number, default: null},
    player: {
        owed: {type: Number, default: 0},
        lenders: {type: [{type: Schema.Types.ObjectId, ref: "User"}], default: []},
    },
    offers: {type: Number, default: 0},
});

// The 12:00 check goes through everyone with a shark loan or player debt.
loanAccountSchema.index({"shark.borrowed": 1});
loanAccountSchema.index({"player.owed": 1});

module.exports = mongoose.model("LoanAccount", loanAccountSchema);
