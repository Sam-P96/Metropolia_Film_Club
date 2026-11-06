const mongoose = require("mongoose");
const Review = require("../../models/reviewModel");
const LoanJob = require("../../models/loanJobModel");
const { LOAN_SHARK } = require("../../config/loanShark");
const { changeWallet, dailyPp } = require("../wallet");
const { inSession } = require("../steal/tx");
const { LoanError, emptyShark, loadAccount, changeAccount, logTx } = require("./account");
const { sharkOwed, sharkSplit, coverage, firstDueAt } = require("./math");

// King Loan Shark: borrowing P-PP from the house, and paying it back.
//
// All of a member's shark borrowing is one debt: borrowed x (100 + rate)%,
// rounded up, less what they've paid and what jobs took off. The rate
// starts at 10% and only changes at the 12:00 check, doubling for each
// missed payment (utils/loanShark/daily.js). Everything paid back is
// burned: it goes to nobody. When it reaches 0 the loan ends, and the
// next one starts fresh, with four new jobs.

// A whole number of points above 0, or a LoanError.
function wholeAmount(value, what = "An amount") {
    if (!Number.isInteger(value) || value <= 0) {
        throw new LoanError(`${what} has to be a whole number above 0.`);
    }
    return value;
}

async function reviewsOf(userId, session = null) {
    return Review.countDocuments({ user: userId }).session(session);
}

// The most `reviews` reviews can borrow from the shark in all: 5x daily PP.
const sharkCap = (reviews) => LOAN_SHARK.shark.capTimesDaily * dailyPp(reviews);

// The loan ended (paid off, by them, Kaveri or jobs): jobs still open
// close, and it's in the log. The account itself was already reset.
async function closeLoan(userId, loanId, session = null) {
    await LoanJob.updateMany({ borrower: userId, loan: loanId, status: "open" }, { $set: { status: "closed" } }, { session });
    await logTx({ user: userId, kind: "sharkCleared", loan: loanId }, session);
}

// "Take more loan": `amount` P-PP from King Loan Shark, up to the cap.
// Borrowing with no debt starts a new loan (and its jobs, once it's in).
// Resolves to { loan, isNew, amount }.
async function sharkBorrow(userId, amount, now = new Date()) {
    wholeAmount(amount);
    const reviews = await reviewsOf(userId);
    if (reviews === 0) {
        throw new LoanError("King Loan Shark only lends to members who've posted a review. Post one first.", 403);
    }
    const cap = sharkCap(reviews);

    const result = await inSession(async (session) => {
        const { result: loan } = await changeAccount(
            userId,
            (account) => {
                const shark = account.shark;
                const room = Math.max(0, cap - shark.borrowed);
                if (amount > room) {
                    throw new LoanError(
                        room > 0
                            ? `You can borrow ${room} more P-PP at most.`
                            : "You've borrowed all King Loan Shark will lend you. Pay some back, or post more reviews.",
                    );
                }
                if (shark.borrowed === 0) {
                    const id = new mongoose.Types.ObjectId();
                    return {
                        set: { shark: { ...emptyShark(), loan: id, borrowed: amount, startedAt: now, firstDueAt: firstDueAt(now) } },
                        result: { loan: id, isNew: true },
                    };
                }
                return { inc: { "shark.borrowed": amount }, result: { loan: shark.loan, isNew: false } };
            },
            { session },
        );

        await changeWallet(userId, () => ({ ppp: amount }), { reason: "loanSharkBorrow", session });
        await logTx({ user: userId, kind: "sharkBorrow", amount, loan: loan.loan }, session);
        return { ...loan, amount };
    });

    // The jobs come after, so a failure there never stops the loan.
    if (result.isNew) {
        const { generateJobs } = require("./jobs");
        await generateJobs(userId, result.loan).catch((error) => console.error("Loan Shark couldn't make jobs:", error.message));
    }
    return result;
}

// "Pay back": up to `requested` towards the shark debt (never more than is
// owed), PP first, then P-PP. Each payment covers as many 12:00 checks as
// it and any credit make whole daily minimums; the rest is credit.
// Resolves to { paid, left, cleared, days, paidUntil }.
async function sharkPay(userId, requested, now = new Date()) {
    wholeAmount(requested);

    return inSession(async (session) => {
        const before = await loadAccount(userId, session);
        const owing = sharkOwed(before.shark);
        if (owing === 0) throw new LoanError("You don't owe King Loan Shark anything. Yet.");
        const amount = Math.min(requested, owing);

        // Taken first, so a wallet without enough says so before anything else.
        const taken = await changeWallet(
            userId,
            (wallet) => {
                if (wallet.pp + wallet.ppp < amount) {
                    throw new LoanError(`You need ${amount} points for that, and you have ${Math.max(0, wallet.pp + wallet.ppp)}.`);
                }
                const fromPp = Math.min(Math.max(0, wallet.pp), amount);
                return { pp: 0 - fromPp, ppp: 0 - (amount - fromPp) };
            },
            { reason: "loanSharkRepay", session },
        );

        const { result } = await changeAccount(
            userId,
            (account) => {
                const owed = sharkOwed(account.shark);
                if (owed === 0) return null;
                const pay = Math.min(amount, owed);
                const split = sharkSplit(account.shark, pay);
                const loan = account.shark.loan;
                if (pay === owed) {
                    return { set: { shark: emptyShark() }, result: { paid: pay, left: 0, cleared: true, loan, split, days: 0, paidUntil: null } };
                }
                const cover = coverage(account, pay, now);
                return {
                    set: { "shark.credit": cover.credit, "shark.paidUntil": cover.paidUntil },
                    inc: { "shark.paid": pay },
                    result: { paid: pay, left: owed - pay, cleared: false, loan, split, days: cover.days, paidUntil: cover.paidUntil },
                };
            },
            { session },
        );

        // Kaveri or a job got there in the moment between: the part that's
        // no longer owed goes back, P-PP first (it was taken last).
        const paid = result?.paid ?? 0;
        const refund = amount - paid;
        if (refund > 0) {
            const ppp = Math.min(refund, 0 - taken.ppp);
            await changeWallet(userId, () => ({ pp: refund - ppp, ppp }), { reason: "loanSharkRepay", session });
        }
        if (!result) throw new LoanError("You don't owe King Loan Shark anything any more.");

        await logTx(
            { user: userId, kind: "sharkRepay", amount: paid, principal: result.split.principal, interest: result.split.interest, loan: result.loan },
            session,
        );
        if (result.cleared) await closeLoan(userId, result.loan, session);

        return { paid, left: result.left, cleared: result.cleared, days: result.days, paidUntil: result.paidUntil };
    });
}

module.exports = { wholeAmount, reviewsOf, sharkCap, closeLoan, sharkBorrow, sharkPay };
