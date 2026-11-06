const LoanAccount = require("../../models/loanAccountModel");
const LoanOffer = require("../../models/loanOfferModel");
const PlayerDebt = require("../../models/playerDebtModel");
const { LOAN_SHARK } = require("../../config/loanShark");
const { COLLECTOR_LINES, pickLine } = require("../../../shared/loanShark/lines.js");
const { noteLoanCollector, noteLoanMissed } = require("../notify");
const { changeAccount, emptyShark, logTx } = require("./account");
const { MAX_RATE, ceilShare, checkState, doubled, sharkOwed, sharkSplit } = require("./math");
const { repayDebt, settleRepayment } = require("./player");
const { closeLoan } = require("./shark");

// Loan Shark at the 12:00 payout (spec §6), for one member, as part of
// their payout (utils/wallet.js payMember), in the same transaction:
//   1. their daily PP, as usual (the payout works it out and passes it in)
//   2. each member they owe gets 10% of it (rounded up), or what's left
//   3. the shark check: a payment due and not covered doubles the rate
//   4. at the top rate, Kaveri takes up to 40% of it
//   5. the payout puts what's left of it in their wallet as normal
// Each part only ever happens once a day: the debts remember the day of
// their last repayment, and the account the day of its last check.

// Who the payout has to go through besides members with reviews: anyone
// with a shark loan or a player debt, whose loans still need their check.
async function membersWithLoans() {
    const [accounts, borrowers] = await Promise.all([
        LoanAccount.find({ $or: [{ "shark.borrowed": { $gt: 0 } }, { "player.owed": { $gt: 0 } }] }).distinct("_id"),
        PlayerDebt.distinct("borrower", { status: "active" }),
    ]);
    return [...accounts, ...borrowers];
}

// How much PP each member has up in loan offers, as a Map of user id to
// PP. It still counts towards their PP cap at the payout.
async function lockedInOffers() {
    const rows = await LoanOffer.aggregate([{ $match: { status: "active" } }, { $group: { _id: "$lender", locked: { $sum: "$available" } } }]);
    return new Map(rows.map((row) => [String(row._id), row.locked]));
}

// Steps 2 to 4 for `userId`, whose daily PP is `daily`, at the check on
// `day`. Returns { deducted (out of the daily PP), toLenders, collector,
// missed, rate, cleared }.
async function dailyLoans(userId, daily, day, { session = null, after = (job) => job() } = {}) {
    const outcome = { deducted: 0, toLenders: 0, collector: 0, missed: false, rate: null, cleared: false };
    const account = await LoanAccount.findById(userId).session(session).lean();
    if (!account) return outcome;
    let left = daily;

    // 2. Each lender, oldest debt first.
    const debts = await PlayerDebt.find({ borrower: userId, status: "active" }).sort({ createdAt: 1 }).session(session).lean();
    const share = ceilShare(daily, LOAN_SHARK.player.autoRepay);
    for (const debt of debts) {
        const want = Math.min(share, left);
        if (want <= 0) break;
        const repaid = await repayDebt(debt._id, want, { day, session });
        if (!repaid) continue;
        left -= repaid.paid;
        outcome.toLenders += repaid.paid;
        await settleRepayment(repaid, { auto: true, day, session, after });
    }

    // 3 and 4. The shark.
    const { result: shark } = await changeAccount(
        userId,
        (current) => {
            if (current.lastCheckDay && current.lastCheckDay >= day) return null;
            const set = { lastCheckDay: day };
            const loan = current.shark;
            const owedBefore = sharkOwed(loan);
            if (loan.borrowed === 0 || owedBefore === 0) return { set, result: null };

            // At the top rate there's nothing left to double: Kaveri's
            // collecting, and that's what they hear about instead.
            const { due, covered } = checkState(loan, day);
            const missed = due && !covered && loan.rate < MAX_RATE;
            const rate = missed ? doubled(loan.rate) : loan.rate;
            const owed = sharkOwed({ ...loan, rate });
            const result = { loan: loan.loan, missed, rateFrom: loan.rate, rate, take: 0, left: owed, cleared: false, line: null, split: null };
            if (missed) Object.assign(set, { "shark.rate": rate, "shark.missed": loan.missed + 1 });

            if (rate >= MAX_RATE) {
                const take = Math.min(ceilShare(daily, LOAN_SHARK.shark.collectorTake), owed, left);
                if (take > 0) {
                    const visit = collect(current, { ...loan, rate }, take);
                    Object.assign(result, visit.result);
                    if (visit.result.cleared) return { set: { lastCheckDay: day, ...visit.set }, result };
                    Object.assign(set, visit.set);
                }
            }
            return { set, result };
        },
        { session },
    );

    if (shark) {
        outcome.rate = shark.rate;
        if (shark.missed) {
            outcome.missed = true;
            await logTx({ user: userId, kind: "sharkMissed", rateFrom: shark.rateFrom, rateTo: shark.rate, loan: shark.loan, day }, session);
            after(() => noteLoanMissed(userId, shark.rate, shark.left + shark.take));
        }
        if (shark.take > 0) {
            left -= shark.take;
            outcome.collector = shark.take;
            outcome.cleared = shark.cleared;
            await recordCollector(userId, shark, { day, session, after });
        }
    }

    outcome.deducted = daily - left;
    return outcome;
}

// Kaveri takes `take` (no more than is owed) from a loan already
// at the top rate: what changes on the account, and what happened. The
// last of it ends the loan. Otherwise he picks a line for his notification,
// never the one he used last time.
function collect(account, loan, take) {
    const owed = sharkOwed(loan);
    const result = { take, left: owed - take, split: sharkSplit(loan, take), cleared: false, line: null };
    if (result.left === 0) return { set: { shark: emptyShark() }, result: { ...result, cleared: true } };
    result.line = pickLine(COLLECTOR_LINES.length, account.lastCollectorLine);
    return { set: { lastCollectorLine: result.line, "shark.paid": loan.paid + take }, result };
}

// After a visit: the log, his notification, and closing the loan if that
// was the last of it. `visit` is collect()'s result, with the loan's id.
async function recordCollector(userId, visit, { day = null, session = null, after }) {
    await logTx(
        {
            user: userId,
            kind: "sharkCollector",
            amount: visit.take,
            principal: visit.split.principal,
            interest: visit.split.interest,
            loan: visit.loan,
            day,
        },
        session,
    );
    after(() => noteLoanCollector(userId, visit.take, visit.left, visit.line, visit.cleared));
    if (visit.cleared) await closeLoan(userId, visit.loan, session);
}

module.exports = { membersWithLoans, lockedInOffers, dailyLoans, collect, recordCollector };
