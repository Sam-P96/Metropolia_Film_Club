const { LOAN_SHARK } = require("../../config/loanShark");
const { helsinkiDay, helsinkiHour } = require("../wallet");

// Loan Shark's sums and dates, with no database: what's owed, the daily
// minimum, how many 12:00 checks a payment covers, and how a repayment
// splits into principal, interest and income tax. Every amount is a whole
// number of points, and every share of one is rounded up, like the rest of
// the site's points (games/steal/rules.js).

// a / b rounded up, for whole numbers a >= 0 and b > 0, without floating
// point surprises.
const ceilDiv = (a, b) => Math.floor((a + b - 1) / b);

// A share from the config (0.05) of `amount`, rounded up.
function ceilShare(amount, share) {
    const basisPoints = Math.round(share * 10000);
    return ceilDiv(amount * basisPoints, 10000);
}

// A config rate (0.1) as whole percent (10).
const percentOf = (share) => Math.round(share * 100);

const START_RATE = percentOf(LOAN_SHARK.shark.startRate);
const MAX_RATE = percentOf(LOAN_SHARK.shark.maxRate);

// --- the shark ---

// What a shark loan comes to in all: borrowed x (100 + rate)%, rounded up.
const sharkTotal = (shark) => ceilDiv(shark.borrowed * (100 + shark.rate), 100);

// What's still owed: the total, less what's been paid and what jobs took
// off. Never below 0.
const sharkOwed = (shark) => (shark.borrowed > 0 ? Math.max(0, sharkTotal(shark) - shark.paid - shark.jobReduction) : 0);

// Each day's minimum payment: 5% of the total borrowed, rounded up, or
// what's left if that's less.
const sharkMinimum = (shark) => Math.min(ceilShare(shark.borrowed, LOAN_SHARK.shark.minimumPayment), sharkOwed(shark));

// A missed payment doubles the rate, up to the top.
const doubled = (rate) => Math.min(MAX_RATE, rate * 2);

// How a payment of `amount` towards a shark loan splits: the borrowed
// amount first, then the interest. Both are burned; this is for the log.
function sharkSplit(shark, amount) {
    const principalLeft = Math.max(0, shark.borrowed - shark.paid);
    const principal = Math.min(amount, principalLeft);
    return { principal, interest: amount - principal };
}

// --- player loans ---

// The interest on drawing `amount` at `rate` %: rounded up.
const drawInterest = (amount, rate) => ceilDiv(amount * rate, 100);

const debtOwed = (debt) => debt.principal + debt.interest - debt.principalPaid - debt.interestPaid;

// The income tax on `interest` points of interest paid, rounded up.
const taxOn = (interest) => ceilShare(interest, LOAN_SHARK.player.tax);

// A repayment of `amount` on a player debt: the principal first, then the
// interest. The tax is worked out on all the interest paid so far, so lots
// of small payments are taxed the same as one big one. Returns what to add
// to the debt, and what the lender gets.
function debtRepayment(debt, amount) {
    const principal = Math.min(amount, debt.principal - debt.principalPaid);
    const interest = Math.min(amount - principal, debt.interest - debt.interestPaid);
    const taxTotal = taxOn(debt.interestPaid + interest);
    const tax = Math.max(0, taxTotal - debt.taxBurned);
    return { principal, interest, tax, toLender: principal + interest - tax, paid: principal + interest };
}

// What the lending form's preview says: borrowing `amount` at `rate` %
// costs `payBack`; the lender's profit, the tax on it, and what they keep.
function lendPreview(amount, rate) {
    const profit = drawInterest(amount, rate);
    const tax = taxOn(profit);
    return { amount, payBack: amount + profit, profit, tax, keep: profit - tax };
}

// --- the 12:00 checks, as Helsinki days ("2026-11-06") ---

function addDays(day, count) {
    const [year, month, date] = day.split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, date + count)).toISOString().slice(0, 10);
}

// 12:00 in Helsinki on `day`, as a Date: 09:00 UTC in summer time, 10:00
// in winter. (The clocks change at night, so noon is never ambiguous.)
function noonOf(day) {
    const [year, month, date] = day.split("-").map(Number);
    for (const utcHour of [9, 10]) {
        const candidate = new Date(Date.UTC(year, month - 1, date, utcHour));
        if (helsinkiHour(candidate) === 12 && helsinkiDay(candidate) === day) return candidate;
    }
    return new Date(Date.UTC(year, month - 1, date, 10));
}

// The first 12:00 check at least `graceHours` after `startedAt`, as a Date.
function firstDueAt(startedAt, graceHours = LOAN_SHARK.shark.graceHours) {
    const earliest = new Date(startedAt.getTime() + graceHours * 60 * 60 * 1000);
    const day = helsinkiDay(earliest);
    return noonOf(day) >= earliest ? noonOf(day) : noonOf(addDays(day, 1));
}

// The next 12:00 check still to go through a member's loans: today's, if
// it's before noon or today's hasn't reached them yet; tomorrow's if it
// has. `lastCheckDay` is the last one that did (it can be ahead of the
// calendar after an admin's test check).
function nextCheckDay(now, lastCheckDay) {
    const today = helsinkiDay(now);
    let day = now < noonOf(today) || (lastCheckDay ?? "") < today ? today : addDays(today, 1);
    if (lastCheckDay && lastCheckDay >= day) day = addDays(lastCheckDay, 1);
    return day;
}

// The first 12:00 check a shark loan has to be paid for and isn't: the
// next check, or the first one due if that's later, or the day after what
// payments already cover.
function firstUncoveredDay(account, now) {
    let day = nextCheckDay(now, account.lastCheckDay);
    const shark = account.shark;
    if (shark.firstDueAt) {
        const dueDay = helsinkiDay(shark.firstDueAt);
        if (dueDay > day) day = dueDay;
    }
    if (shark.paidUntil) {
        const paidDay = helsinkiDay(shark.paidUntil);
        if (paidDay >= day) day = addDays(paidDay, 1);
    }
    return day;
}

// A payment of `amount` (not the last of it): how many checks it and the
// credit already there cover, and the new credit and paidUntil.
// floor((payment + credit) / minimum) checks; the rest is credit.
function coverage(account, amount, now) {
    const shark = account.shark;
    const minimum = ceilShare(shark.borrowed, LOAN_SHARK.shark.minimumPayment);
    const pot = amount + shark.credit;
    const days = minimum > 0 ? Math.floor(pot / minimum) : 0;
    const credit = minimum > 0 ? pot % minimum : 0;
    if (days === 0) return { days, credit, paidUntil: shark.paidUntil };
    const from = firstUncoveredDay(account, now);
    return { days, credit, paidUntil: noonOf(addDays(from, days - 1)) };
}

// Whether the check on `day` is one a payment was due at, and whether
// payments cover it.
function checkState(shark, day) {
    const due = Boolean(shark.firstDueAt) && day >= helsinkiDay(shark.firstDueAt);
    const covered = Boolean(shark.paidUntil) && helsinkiDay(shark.paidUntil) >= day;
    return { due, covered };
}

module.exports = {
    START_RATE,
    MAX_RATE,
    ceilDiv,
    ceilShare,
    percentOf,
    sharkTotal,
    sharkOwed,
    sharkMinimum,
    sharkSplit,
    doubled,
    drawInterest,
    debtOwed,
    taxOn,
    debtRepayment,
    lendPreview,
    addDays,
    noonOf,
    firstDueAt,
    nextCheckDay,
    firstUncoveredDay,
    coverage,
    checkState,
};
