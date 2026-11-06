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
// export, and the admin's test tools (the next 12:00 check now, and
// sending Kaveri now).

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

// Admins only, for development: Kaveri comes for the member right
// now, to see him at work and his notifications. Their rate goes straight
// to the top (160%), and he takes what he would at 12:00, 40% of their
// daily PP, out of their wallet instead (PP first, then P-PP), since
// there's no payout to take it from. It goes towards the debt like any
// payment, and no payout day is used up. Resolves to { take, left,
// cleared, rate }.
async function devCollectorVisit(userId) {
    const { changeWallet, dailyPp } = require("../wallet");
    const { inSession } = require("../steal/tx");
    const { LOAN_SHARK } = require("../../config/loanShark");
    const { MAX_RATE, ceilShare, sharkOwed } = require("./math");
    const { collect, recordCollector } = require("./daily");

    const daily = dailyPp(await Review.countDocuments({ user: userId }));
    const want = ceilShare(daily, LOAN_SHARK.shark.collectorTake);
    if (want === 0) throw new LoanError("Kaveri takes 40% of your daily PP, and you have none yet. Post a review first.");

    return inSession(async (session, after) => {
        const before = await loadAccount(userId, session);
        if (sharkOwed(before.shark) === 0) {
            throw new LoanError("Kaveri only comes for members who owe King Loan Shark. Take a loan first.");
        }
        const atTop = sharkOwed({ ...before.shark, rate: Math.max(before.shark.rate, MAX_RATE) });

        const taken = await changeWallet(
            userId,
            (wallet) => {
                const can = Math.min(want, atTop, Math.max(0, wallet.pp + wallet.ppp));
                if (can <= 0) throw new LoanError("Your wallet's empty: Kaveri found nothing to take. Come back after a payout.");
                const fromPp = Math.min(Math.max(0, wallet.pp), can);
                return { pp: 0 - fromPp, ppp: 0 - (can - fromPp) };
            },
            { reason: "loanCollector", session },
        );
        const take = 0 - (taken.pp + taken.ppp);

        const { result: visit } = await changeAccount(
            userId,
            (account) => {
                const loan = { ...account.shark, rate: Math.max(account.shark.rate, MAX_RATE) };
                const owed = sharkOwed(loan);
                if (owed === 0) return null;
                const { set, result } = collect(account, loan, Math.min(take, owed));
                const rateSet = !result.cleared && account.shark.rate < MAX_RATE ? { "shark.rate": MAX_RATE } : {};
                return { set: { ...set, ...rateSet }, result: { ...result, loan: account.shark.loan, rateFrom: account.shark.rate } };
            },
            { session },
        );

        // Owing less than he took (a payment landed in between): the rest back.
        const refund = take - (visit?.take ?? 0);
        if (refund > 0) {
            const ppp = Math.min(refund, 0 - taken.ppp);
            await changeWallet(userId, () => ({ pp: refund - ppp, ppp }), { reason: "loanCollector", session });
        }
        if (!visit) throw new LoanError("You don't owe King Loan Shark anything any more.");

        if (visit.rateFrom < MAX_RATE) {
            await logTx({ user: userId, kind: "devRate", rateFrom: visit.rateFrom, rateTo: MAX_RATE, loan: visit.loan }, session);
        }
        await recordCollector(userId, visit, { session, after });
        return { take: visit.take, left: visit.left, cleared: visit.cleared, rate: visit.cleared ? null : MAX_RATE };
    });
}

module.exports = { forgetLoanMember, loanDataOf, testCheck, devCollectorVisit };
