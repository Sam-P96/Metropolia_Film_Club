const mongoose = require("mongoose");
const LoanOffer = require("../../models/loanOfferModel");
const PlayerDebt = require("../../models/playerDebtModel");
const { LOAN_SHARK } = require("../../config/loanShark");
const { WalletError, changeWallet, dailyPp } = require("../wallet");
const { inSession } = require("../steal/tx");
const { noteLoanBorrowed, noteLoanRepay, noteLoanRepaid } = require("../notify");
const { LoanError, loadAccount, changeAccount, logTx } = require("./account");
const { wholeAmount, reviewsOf } = require("./shark");
const { debtOwed, debtRepayment, drawInterest, percentOf } = require("./math");

// Members lending each other PP (spec §5).
//
// A lender puts up an offer: Fixed (one borrower takes exactly the amount)
// or Flexible (a pool anyone draws from, at least 20 at a time). The PP
// comes out of their wallet while it's up, and still counts towards their
// PP cap at the 12:00 payout, so parking PP in an offer can't save up more
// than the cap. Borrowers get it as PP, past their cap if need be.
//
// Each draw owes its own interest on top. Repayments go to the principal
// first, then the interest; 20% of the interest is income tax (burned),
// and the lender gets the rest, all in P-PP. At 12:00 each lender gets 10%
// of the borrower's daily PP (utils/loanShark/daily.js), and the borrower
// can pay a lender off early.

const RULES = LOAN_SHARK.player;
const MAX_RATE = percentOf(RULES.maxRate);

// --- offers ---

// Puts up an offer: { style: "fixed" | "flexible", amount (PP), rate
// (whole percent, total) }. At most 3 up at once.
async function postOffer(lenderId, { style, amount, rate }) {
    if (style !== "fixed" && style !== "flexible") throw new LoanError("Pick Fixed or Flexible.");
    wholeAmount(amount, "The amount");
    if (amount < RULES.minDraw) throw new LoanError(`An offer has to be at least ${RULES.minDraw} PP.`);
    if (amount > RULES.maxOffer) throw new LoanError(`An offer can be ${RULES.maxOffer.toLocaleString("en-US")} PP at most.`);
    if (!Number.isInteger(rate) || rate < 0 || rate > MAX_RATE) {
        throw new LoanError(`The interest rate is a whole number from 0 to ${MAX_RATE}%.`);
    }

    const before = await loadAccount(lenderId);
    if (before.offers >= RULES.maxOffers) {
        throw new LoanError(`You can have ${RULES.maxOffers} offers up at once. Take one down first.`);
    }

    return inSession(async (session, after) => {
        await changeWallet(
            lenderId,
            (wallet) => {
                if (wallet.pp < amount) throw new LoanError(`You have ${Math.max(0, wallet.pp)} PP to lend. Offers are lent from PP, not P-PP.`);
                return { pp: 0 - amount };
            },
            { reason: "loanOffer", session },
        );

        try {
            await changeAccount(
                lenderId,
                (account) => {
                    if (account.offers >= RULES.maxOffers) {
                        throw new LoanError(`You can have ${RULES.maxOffers} offers up at once. Take one down first.`);
                    }
                    return { inc: { offers: 1 } };
                },
                { session },
            );
        } catch (error) {
            // Another tab got the last slot first: the PP goes back.
            await changeWallet(lenderId, () => ({ pp: amount }), { reason: "loanOfferBack", session });
            throw error;
        }

        const [offer] = await LoanOffer.create([{ lender: lenderId, style, amount, available: amount, rate }], { session });
        await logTx({ user: lenderId, kind: "offerPosted", amount, offer: offer._id }, session);
        return offer.toObject();
    });
}

// Takes an offer down: whatever nobody borrowed goes back to the lender as
// PP. Debts from it carry on as normal. Resolves to { returned }.
async function takeDownOffer(lenderId, offerId) {
    if (!mongoose.isValidObjectId(offerId)) throw new LoanError("That offer doesn't exist.", 404);

    return inSession(async (session) => {
        const offer = await LoanOffer.findOneAndUpdate(
            { _id: offerId, lender: lenderId, status: "active" },
            { $set: { status: "closed", closedReason: "down", closedAt: new Date(), available: 0 } },
            { returnDocument: "before", session },
        ).lean();
        if (!offer) throw new LoanError("That offer isn't up any more.", 404);

        if (offer.available > 0) {
            await changeWallet(lenderId, () => ({ pp: offer.available }), { reason: "loanOfferBack", session });
        }
        await changeAccount(lenderId, (account) => ({ set: { offers: Math.max(0, account.offers - 1) } }), { session });
        await logTx({ user: lenderId, kind: "offerTakenDown", amount: offer.available, offer: offer._id }, session);
        return { returned: offer.available };
    });
}

// --- borrowing ---

// The most `reviews` reviews can owe across player loans: 2x daily PP.
const playerCap = (reviews) => RULES.capTimesDaily * dailyPp(reviews);

// Borrows from someone else's offer: all of a Fixed one, or `requested`
// from a Flexible one (at least 20, or what's left if that's less).
// Resolves to { amount, interest, owed (to this lender, in all) }.
async function borrowFromOffer(borrowerId, offerId, requested, now = new Date()) {
    const offer = mongoose.isValidObjectId(offerId) ? await LoanOffer.findById(offerId).lean() : null;
    if (!offer || offer.status !== "active") throw new LoanError("That offer isn't up any more.", 404);
    if (String(offer.lender) === String(borrowerId)) throw new LoanError("You can't borrow from your own offer.");

    const reviews = await reviewsOf(borrowerId);
    if (reviews === 0) throw new LoanError("You need to post a review before you can borrow.", 403);

    let amount;
    if (offer.style === "fixed") {
        amount = offer.available;
    } else {
        wholeAmount(requested, "The amount");
        const smallest = Math.min(RULES.minDraw, offer.available);
        if (requested < smallest) throw new LoanError(`You have to borrow at least ${smallest} PP from this offer.`);
        if (requested > offer.available) throw new LoanError(`There's only ${offer.available} PP left in this offer.`);
        amount = requested;
    }

    const interest = drawInterest(amount, offer.rate);
    const owes = amount + interest;
    const cap = playerCap(reviews);
    const lender = offer.lender;

    return inSession(async (session, after) => {
        // Room under both caps, reserved in one step.
        const { result: hadLender } = await changeAccount(
            borrowerId,
            (account) => {
                const lenders = account.player.lenders.map(String);
                const already = lenders.includes(String(lender));
                if (!already && lenders.length >= RULES.maxLenders) {
                    throw new LoanError(`You already owe ${RULES.maxLenders} members. Pay one of them off first.`);
                }
                const room = Math.max(0, cap - account.player.owed);
                if (owes > room) {
                    throw new LoanError(
                        `That would mean owing ${owes} PP. You can owe ${cap} PP across player loans, interest included, and have ${room} PP of room left.`,
                    );
                }
                return { inc: { "player.owed": owes }, addToSet: { "player.lenders": lender }, result: already };
            },
            { session },
        );

        const taken = await LoanOffer.findOneAndUpdate(
            { _id: offer._id, status: "active", available: offer.style === "fixed" ? amount : { $gte: amount } },
            { $inc: { available: 0 - amount } },
            { returnDocument: "after", session },
        ).lean();

        if (!taken) {
            // Someone else borrowed it first: the room goes back.
            await changeAccount(
                borrowerId,
                (account) => ({
                    set: { "player.owed": Math.max(0, account.player.owed - owes) },
                    ...(hadLender ? {} : { pull: { "player.lenders": lender } }),
                }),
                { session },
            );
            throw new LoanError("Someone else borrowed that first. Have another look at the offers.", 409);
        }

        if (taken.available === 0) {
            await LoanOffer.updateOne(
                { _id: offer._id, status: "active" },
                { $set: { status: "closed", closedReason: offer.style === "fixed" ? "taken" : "empty", closedAt: now } },
                { session },
            );
            await changeAccount(lender, (account) => ({ set: { offers: Math.max(0, account.offers - 1) } }), { session });
        }

        const debt = await addDraw({ borrowerId, lender, offer, amount, interest, now, session });
        // Again, in case a payoff closed their old debt to this lender in between.
        await changeAccount(borrowerId, () => ({ addToSet: { "player.lenders": lender } }), { session });

        await changeWallet(borrowerId, () => ({ pp: amount }), { reason: "loanBorrow", other: lender, session });
        await logTx({ user: borrowerId, other: lender, kind: "playerBorrow", amount, interest, offer: offer._id, debt: debt._id }, session);
        after(() => noteLoanBorrowed(lender, borrowerId, amount));

        return { amount, interest, owed: debtOwed(debt) };
    });
}

// Adds a draw to the borrower's open debt to this lender, starting one if
// there's none.
async function addDraw({ borrowerId, lender, offer, amount, interest, now, session }) {
    const update = {
        $inc: { principal: amount, interest, version: 1 },
        $push: { draws: { offer: offer._id, amount, rate: offer.rate, interest, at: now } },
        $setOnInsert: { createdAt: now },
    };
    const filter = { borrower: borrowerId, lender, status: "active" };
    try {
        return await PlayerDebt.findOneAndUpdate(filter, update, { upsert: true, returnDocument: "after", session }).lean();
    } catch (error) {
        // Two draws started it at the same moment: add to the one that won.
        if (error.code !== 11000) throw error;
        return PlayerDebt.findOneAndUpdate(filter, update, { returnDocument: "after", session }).lean();
    }
}

// --- paying back ---

const TRIES = 8;

// Pays up to `amount` off a debt: the principal first, then the interest.
// `day`: the 12:00 repayment for that day, once only. Returns what it did
// ({ debt, paid, principal, interest, tax, toLender, left, closes }), or
// null if there was nothing to do.
async function repayDebt(debtId, amount, { day = null, session = null } = {}) {
    for (let attempt = 0; attempt < TRIES; attempt++) {
        const debt = await PlayerDebt.findById(debtId).session(session).lean();
        if (!debt || debt.status !== "active") return null;
        if (day && debt.lastAutoDay && debt.lastAutoDay >= day) return null;

        const owed = debtOwed(debt);
        const pay = Math.min(amount, owed);
        if (pay <= 0) return null;

        const split = debtRepayment(debt, pay);
        const closes = split.paid === owed;
        const set = {};
        if (day) set.lastAutoDay = day;
        if (closes) Object.assign(set, { status: "paid", closedAt: new Date() });

        const saved = await PlayerDebt.updateOne(
            { _id: debt._id, version: debt.version },
            { $inc: { version: 1, principalPaid: split.principal, interestPaid: split.interest, taxBurned: split.tax }, $set: set },
            { session },
        );
        if (saved.matchedCount === 1) return { debt, ...split, left: owed - split.paid, closes };
    }
    throw new LoanError("That loan is busy. Try again in a moment.", 409);
}

// After a repayment: the lender's share in P-PP, the borrower's cached
// total (and lender list, once it's paid), the log, and the notifications.
async function settleRepayment(repaid, { auto, day = null, session, after }) {
    const { debt } = repaid;
    if (repaid.toLender > 0) {
        try {
            await changeWallet(debt.lender, () => ({ ppp: repaid.toLender }), { reason: "loanRepaid", other: debt.borrower, session });
        } catch (error) {
            // The lender has just left the club: their share goes to nobody.
            if (!(error instanceof WalletError && error.status === 404)) throw error;
        }
    }
    await changeAccount(
        debt.borrower,
        (account) => ({
            set: { "player.owed": Math.max(0, account.player.owed - repaid.paid) },
            ...(repaid.closes ? { pull: { "player.lenders": debt.lender } } : {}),
        }),
        { session },
    );
    await logTx(
        {
            user: debt.borrower,
            other: debt.lender,
            kind: "playerRepay",
            amount: repaid.paid,
            principal: repaid.principal,
            interest: repaid.interest,
            tax: repaid.tax,
            toLender: repaid.toLender,
            auto,
            debt: debt._id,
            day,
        },
        session,
    );
    after(() => noteLoanRepaid(debt.lender, debt.borrower, repaid.toLender, repaid.tax, repaid.left, auto));
    if (auto) after(() => noteLoanRepay(debt.borrower, debt.lender, repaid.paid, repaid.left, true));
}

// "Pay off now": everything still owed on one debt, PP first, then P-PP.
// Resolves to { paid }.
async function payOffDebt(borrowerId, debtId) {
    const debt = mongoose.isValidObjectId(debtId) ? await PlayerDebt.findOne({ _id: debtId, borrower: borrowerId }).lean() : null;
    if (!debt || debt.status !== "active") throw new LoanError("You don't owe anything on that loan.", 404);
    const owed = debtOwed(debt);

    return inSession(async (session, after) => {
        const taken = await changeWallet(
            borrowerId,
            (wallet) => {
                if (wallet.pp + wallet.ppp < owed) {
                    throw new LoanError(`Paying it off takes ${owed} points, and you have ${Math.max(0, wallet.pp + wallet.ppp)}.`);
                }
                const fromPp = Math.min(Math.max(0, wallet.pp), owed);
                return { pp: 0 - fromPp, ppp: 0 - (owed - fromPp) };
            },
            { reason: "loanRepay", other: debt.lender, session },
        );

        const repaid = await repayDebt(debt._id, owed, { session });
        const paid = repaid?.paid ?? 0;
        // The 12:00 repayment landed in between: the difference goes back.
        const refund = owed - paid;
        if (refund > 0) {
            const ppp = Math.min(refund, 0 - taken.ppp);
            await changeWallet(borrowerId, () => ({ pp: refund - ppp, ppp }), { reason: "loanRepay", other: debt.lender, session });
        }
        if (!repaid) throw new LoanError("That loan is already paid off.");

        await settleRepayment(repaid, { auto: false, session, after });
        return { paid };
    });
}

module.exports = { MAX_RATE, playerCap, postOffer, takeDownOffer, borrowFromOffer, repayDebt, settleRepayment, payOffDebt };
