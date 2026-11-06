// Loan Shark: borrowing from King Loan Shark, lending to and borrowing
// from other members, and the jobs that take debt off. The numbers are in
// config/loanShark.js, the lines in shared/loanShark/lines.js.
//   account.js  the versioned account every change goes through, the log
//   math.js     the sums and the 12:00 check dates, with no database
//   shark.js    King Loan Shark: borrowing and paying back
//   player.js   offers, borrowing from them, paying back, the income tax
//   jobs.js     the jobs: picking them, and noticing when they're done
//   daily.js    the 12:00 check, inside the payout (utils/wallet.js)
//   view.js     what the page shows
//   members.js  deleted accounts, the data export, the admin test check
const { LoanError } = require("./account");
const { sharkBorrow, sharkPay } = require("./shark");
const { postOffer, takeDownOffer, borrowFromOffer, payOffDebt } = require("./player");
const { onReviewPosted, beforeDislike, onStealSuccess, undoJobDislikes } = require("./jobs");
const { loanSharkView } = require("./view");
const { forgetLoanMember, loanDataOf, testCheck } = require("./members");

module.exports = {
    LoanError,
    sharkBorrow,
    sharkPay,
    postOffer,
    takeDownOffer,
    borrowFromOffer,
    payOffDebt,
    onReviewPosted,
    beforeDislike,
    onStealSuccess,
    undoJobDislikes,
    loanSharkView,
    forgetLoanMember,
    loanDataOf,
    testCheck,
};
