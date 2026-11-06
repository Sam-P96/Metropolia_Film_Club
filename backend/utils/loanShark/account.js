const LoanAccount = require("../../models/loanAccountModel");
const LoanTx = require("../../models/loanTxModel");
const { START_RATE } = require("./math");

// Something the member can't do (borrow past the cap, pay with no debt).
// The routes send `message` back with `status`.
class LoanError extends Error {
    constructor(message, status = 400) {
        super(message);
        this.status = status;
    }
}

// A shark loan as it is with none: what a new one starts from, and what a
// paid-off one goes back to.
function emptyShark() {
    return {
        loan: null,
        borrowed: 0,
        rate: START_RATE,
        paid: 0,
        jobReduction: 0,
        credit: 0,
        paidUntil: null,
        startedAt: null,
        firstDueAt: null,
        missed: 0,
    };
}

// The member's account as a plain object, made the first time it's asked
// for.
async function loadAccount(userId, session = null) {
    const found = await LoanAccount.findById(userId).session(session).lean();
    if (found) return found;
    try {
        await LoanAccount.create([{ _id: userId }], { session });
    } catch (error) {
        // Made at the same moment by another request: fine, read that one.
        if (error.code !== 11000) throw error;
    }
    return LoanAccount.findById(userId).session(session).lean();
}

const TRIES = 8;

// The one place an account changes. `decide(account)` gets it as it is now
// and returns what to do: { set, inc, addToSet, pull } (MongoDB update
// parts) and `result` (passed back), or null to change nothing. Throwing (a
// LoanError) stops it. It only saves if nobody changed the account since it
// was read (`version`); if they did, it reads it again and decides again,
// like utils/wallet.js changeWallet. Returns { account, result }: the
// account as `decide` saw it.
async function changeAccount(userId, decide, { session = null } = {}) {
    for (let attempt = 0; attempt < TRIES; attempt++) {
        const account = await loadAccount(userId, session);
        const change = decide(account);
        if (!change) return { account, result: null };

        const update = { $inc: { version: 1, ...(change.inc ?? {}) } };
        if (change.set) update.$set = change.set;
        if (change.addToSet) update.$addToSet = change.addToSet;
        if (change.pull) update.$pull = change.pull;

        const saved = await LoanAccount.updateOne({ _id: userId, version: account.version }, update, { session });
        if (saved.matchedCount === 1) return { account, result: change.result };
    }
    throw new LoanError("King Loan Shark is busy counting. Try again in a moment.", 409);
}

// One entry in the audit log (models/loanTxModel.js).
function logTx(entry, session = null) {
    return LoanTx.create([entry], { session });
}

module.exports = { LoanError, emptyShark, loadAccount, changeAccount, logTx };
