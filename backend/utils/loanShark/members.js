const User = require("../../models/userModel");
const Review = require("../../models/reviewModel");
const LoanAccount = require("../../models/loanAccountModel");
const LoanOffer = require("../../models/loanOfferModel");
const PlayerDebt = require("../../models/playerDebtModel");
const LoanJob = require("../../models/loanJobModel");
const LoanTx = require("../../models/loanTxModel");
const { changeAccount, loadAccount, logTx, LoanError } = require("./account");
const { addDays, debtOwed, nextCheckDay } = require("./math");

// Loan Shark and members coming and going: deleting an account, the GDPR
// export, and the admin's test check.

// An account is being deleted (controllers/userControllers.js
// deleteAccount). Their offers come down (the PP in them goes with the
// account), what they owe and are owed is let go, jobs about them close,
// and their account and log go. Members they owed, or who owed them, have
// that taken off their own totals.
async function forgetLoanMember(userId) {
    await LoanOffer.updateMany({ lender: userId, status: "active" }, { $set: { status: "closed", closedReason: "down", closedAt: new Date(), available: 0 } });

    const debts = await PlayerDebt.find({ status: "active", $or: [{ borrower: userId }, { lender: userId }] }).lean();
    for (const debt of debts) {
        const closed = await PlayerDebt.updateOne({ _id: debt._id, status: "active" }, { $set: { status: "forgiven", closedAt: new Date() } });
        if (closed.modifiedCount === 0) continue;
        const owed = debtOwed(debt);
        // They were the lender: the borrower owes that much less, and one
        // lender fewer.
        if (String(debt.lender) === String(userId)) {
            await changeAccount(debt.borrower, (account) => ({
                set: { "player.owed": Math.max(0, account.player.owed - owed) },
                pull: { "player.lenders": debt.lender },
            }));
            await logTx({ user: debt.borrower, kind: "playerForgiven", amount: owed, debt: debt._id });
        }
    }

    await LoanJob.updateMany({ status: "open", $or: [{ x: userId }, { y: userId }] }, { $set: { status: "closed" } });
    await LoanJob.deleteMany({ borrower: userId });
    await LoanTx.deleteMany({ user: userId });
    await LoanTx.updateMany({ other: userId }, { $set: { other: null } });
    await LoanAccount.deleteOne({ _id: userId });
}

// Everything Loan Shark holds about a member, for their data export.
async function loanDataOf(userId) {
    const [account, offers, debts, jobs, log] = await Promise.all([
        LoanAccount.findById(userId).lean(),
        LoanOffer.find({ lender: userId }).sort({ createdAt: -1 }).lean(),
        PlayerDebt.find({ $or: [{ borrower: userId }, { lender: userId }] }).sort({ createdAt: -1 }).lean(),
        LoanJob.find({ borrower: userId }).sort({ createdAt: -1 }).lean(),
        LoanTx.find({ user: userId }).sort({ at: -1 }).lean(),
    ]);
    return { account, offers, debts, jobs, log };
}

// Admins only, for testing: runs a member's next 12:00 check right now,
// payout and all, as if it were noon on that day. Their loans' next check,
// or the day after their last payout if that's later. Each day is still
// only ever paid once: the real payout skips a day already paid this way.
// Resolves to { day, result }.
async function testCheck(target) {
    const { payMember, helsinkiDay } = require("../wallet");
    const { lockedInOffers } = require("./daily");
    const user = await User.findById(target).select("wallet.lastPayoutDay").lean();
    if (!user) throw new LoanError("There's no member with that name.", 404);

    const account = await loadAccount(target);
    let day = nextCheckDay(new Date(), account.lastCheckDay);
    const lastPaid = user.wallet?.lastPayoutDay;
    if (lastPaid && lastPaid >= day) day = addDays(lastPaid, 1);
    if (day < helsinkiDay()) day = helsinkiDay();

    const [reviews, locked] = await Promise.all([Review.countDocuments({ user: target }), lockedInOffers()]);
    const result = await payMember(target, day, { reviews, locked: locked.get(String(target)) ?? 0 });
    return { day, result };
}

module.exports = { forgetLoanMember, loanDataOf, testCheck };
