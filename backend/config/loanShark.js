// Loan Shark: every number it runs on, in this one file, so it can be
// rebalanced without touching the code (utils/loanShark/). The page gets
// the ones it needs from GET /api/loan-shark, so they always agree. What
// King Loan Shark and Kaveri Heiwajima say is in shared/loanShark/lines.js.
//
// Rates are always the TOTAL interest on what was borrowed, never daily:
// borrowing 20 at 0.25 means owing 25 in all. Every share of an amount is
// rounded up to a whole point, like the rest of the site's points.
const LOAN_SHARK = {
    // King Loan Shark: borrowing P-PP from the house.
    shark: {
        // The most a member can have borrowed at once, times their daily PP.
        capTimesDaily: 5,
        // The rate a new loan starts at. Each missed payment doubles it,
        // up to maxRate.
        startRate: 0.1,
        maxRate: 1.6,
        // Each day's minimum payment, as a share of the total borrowed.
        minimumPayment: 0.05,
        // At maxRate, Kaveri Heiwajima takes this share of their daily PP
        // every day at 12:00 until it's paid.
        collectorTake: 0.4,
        // The first payment is due at the first 12:00 check at least this
        // long after the loan was taken.
        graceHours: 24,
    },

    // The jobs that come with a shark loan.
    jobs: {
        // How many a new loan comes with, at most.
        perLoan: 4,
        // Each done takes this share of the total borrowed (at the time
        // it's done) off the debt.
        reduction: 0.2,
        // "Convince X to dislike Y's review": the dislike comes off again
        // this long after it was made.
        dislikeHours: 48,
        // Who counts as a quiet member, to be convinced: fewer reviews than
        // this, or nothing (a review, a comment, a like) for this many days.
        fewReviews: 20,
        quietDays: 14,
        // Members never picked for a job, by email (lowercase).
        excludedEmails: ["xxx@xxx.com", "xxx2@xxx.com"],
    },

    // Members lending each other PP.
    player: {
        // The most a borrower can owe across all player loans, interest
        // included, times their daily PP.
        capTimesDaily: 2,
        // How many lenders a borrower can owe at once.
        maxLenders: 2,
        // Each lender gets this share of the borrower's daily PP at 12:00,
        // until they're paid.
        autoRepay: 0.1,
        // Of the interest a lender is paid, this share is income tax, and
        // goes to nobody.
        tax: 0.2,
        // Offers: how many a lender can have up at once, the smallest a
        // Flexible draw can be (and any offer), and the highest rate.
        maxOffers: 3,
        minDraw: 20,
        maxRate: 1,
        // The biggest single offer.
        maxOffer: 100000,
    },
};

module.exports = { LOAN_SHARK };
