const User = require("../models/userModel");
const Review = require("../models/reviewModel");
const WalletTx = require("../models/walletTxModel");
const { notePayout, noteGift } = require("./notify");

// Every member has two kinds of points:
//   PP    Power Points. Paid out at 12:00 each day: 1 per review they've
//         written, up to 3 days' worth (40 reviews: +40 a day, at most 120).
//   P-PP  Premium Power Points, `ppp` in the code. Only won, never capped.
// Bets take PP first, then P-PP. Winnings are always P-PP. Neither can be
// bought or cashed out: they only buy things on the site.

const CAP_DAYS = 3;

// How much PP a member with `reviews` reviews gets a day, and the most they
// can hold.
function dailyPp(reviews) {
    return reviews;
}

function ppCap(reviews) {
    return reviews * CAP_DAYS;
}

// A wallet change that can't happen, like a bet bigger than the wallet. The
// routes send its message back with `status`.
class WalletError extends Error {
    constructor(message, status = 400) {
        super(message);
        this.status = status;
    }
}

// How many times changeWallet tries again when the wallet changed under it.
const TRIES = 5;

// The one place a wallet changes. `decide` gets the wallet as it is now
// ({ pp, ppp, lastPayoutDay }) and returns what to change: { pp, ppp } as
// amounts to add (negative takes away), plus `lastPayoutDay` to set it.
// Returning null changes nothing. Throwing (a WalletError) stops it.
//
// Two changes can land at the same moment (a bet and the daily payout), so
// the update only goes through if the wallet still holds exactly what
// `decide` saw. If it doesn't, someone got there first: read it again and
// decide again. That way two changes can never both spend the same points.
//
// Returns { pp, ppp } (what changed) and `balance` (the wallet after), or
// null if nothing changed.
//
// `session`: a MongoDB transaction to make the change part of, so it only
// happens if everything else in the transaction does (Double or Nothing,
// utils/double.js). Without one, it stands on its own.
//
// Steal and Defend (utils/steal/) adds two things:
//   - While an attack a member is in is being played, their wallet is
//     frozen (wallet.frozenUntil): nothing can take points from it, so
//     neither player can spend their way out of it. Points can still come
//     in. The game's own changes pass `steal: true` to get through.
//   - A fine they can't pay leaves P-PP below 0 (`allowDebt`). Anything
//     coming in pays that off first, since it's added to the same P-PP.
//     Nothing else can take a wallet below 0.
// `stealRef` is the attack, listing or trade, for the receipt.
async function changeWallet(userId, decide, {
    reason, match = null, card = null, game = null, other = null, session = null,
    steal = false, allowDebt = false, stealRef = null,
} = {}) {
    for (let attempt = 0; attempt < TRIES; attempt++) {
        const user = await User.findById(userId).select("wallet").session(session).lean();
        if (!user) throw new WalletError("That member doesn't exist any more.", 404);

        const wallet = {
            pp: user.wallet?.pp ?? 0,
            ppp: user.wallet?.ppp ?? 0,
            lastPayoutDay: user.wallet?.lastPayoutDay ?? null,
            frozenUntil: user.wallet?.frozenUntil ?? null,
        };

        const change = decide(wallet);
        if (!change) return null;

        const pp = change.pp ?? 0;
        const ppp = change.ppp ?? 0;
        const balance = { pp: wallet.pp + pp, ppp: wallet.ppp + ppp };

        if ((pp < 0 || ppp < 0) && !steal && wallet.frozenUntil && wallet.frozenUntil > new Date()) {
            throw new WalletError("Your points are frozen while a Steal and Defend attack you're in is being played. Try again in a few minutes.", 409);
        }

        // A debt can only be paid off, never made bigger, except by the
        // fine that made it.
        if (balance.pp < 0 || (balance.ppp < 0 && ppp < 0 && !allowDebt)) {
            throw new WalletError("That's more points than you have.");
        }

        const set = { "wallet.pp": balance.pp, "wallet.ppp": balance.ppp };
        if ("lastPayoutDay" in change) set["wallet.lastPayoutDay"] = change.lastPayoutDay;

        const result = await User.updateOne(
            {
                _id: userId,
                "wallet.pp": wallet.pp,
                "wallet.ppp": wallet.ppp,
                "wallet.lastPayoutDay": wallet.lastPayoutDay,
                // null also matches wallets from before freezing existed.
                "wallet.frozenUntil": wallet.frozenUntil,
            },
            { $set: set },
            { timestamps: false, session }
        );

        if (result.matchedCount === 0) continue; // changed under us: try again

        if (pp !== 0 || ppp !== 0) {
            await WalletTx.create([{ user: userId, reason, pp, ppp, balance, match, card, game, other, steal: stealRef }], { session });
        }

        return { pp, ppp, balance };
    }

    throw new WalletError("Your points are busy. Try again in a moment.", 409);
}

// Takes a bet of `amount` from a member: their PP first, then P-PP for the
// rest. 40 PP and 100 P-PP, betting 60: 40 PP and 20 P-PP go.
// `async` so a bad amount comes back as a rejected promise, like every
// other failure here, instead of a throw that a .catch() would miss.
async function spend(userId, amount, { reason = "bet", match = null, card = null, game = null, session = null } = {}) {
    if (!Number.isInteger(amount) || amount <= 0) {
        throw new WalletError("A bet has to be a whole number above 0.");
    }

    return changeWallet(
        userId,
        (wallet) => {
            const total = wallet.pp + wallet.ppp;
            if (total < amount) {
                throw new WalletError(`You need ${amount} points for that, and you have ${total}.`);
            }

            const fromPp = Math.min(wallet.pp, amount);
            const fromPpp = amount - fromPp;
            // 0 - x, not -x: when x is 0, -x is JavaScript's "negative zero",
            // which would end up saved on the receipt as -0.
            return { pp: 0 - fromPp, ppp: 0 - fromPpp };
        },
        { reason, match, card, game, session }
    );
}

// Gives a member `ppp` P-PP, like a win. Async for the same reason as spend.
async function credit(userId, ppp, { reason = "win", match = null, card = null, game = null, session = null } = {}) {
    if (!Number.isInteger(ppp) || ppp <= 0) {
        throw new WalletError("Can only add a whole number of P-PP above 0.");
    }

    return changeWallet(userId, () => ({ ppp }), { reason, match, card, game, session });
}

// What a gift costs on top of the gift itself, whatever its size.
const GIFT_FEE = 1;

// "Gift PP": `amount` P-PP from one member to another (it's called Gift PP,
// but only P-PP can be given). The 1 point fee is taken like a bet, PP if
// they have any, otherwise P-PP, and goes to nobody. 50 P-PP to Maria with
// 10 PP and 100 P-PP: 1 PP and 50 P-PP go, and Maria gets 50 P-PP. If the
// gift can't reach them (their account has just gone), everything, fee
// included, goes back. Returns what it took from the giver.
async function giftPpp(fromId, toId, amount) {
    if (!Number.isInteger(amount) || amount < 1) {
        throw new WalletError("A gift is a whole number of P-PP, at least 1.");
    }
    if (String(fromId) === String(toId)) {
        throw new WalletError("You can't gift yourself.");
    }
    if (!(await User.exists({ _id: toId }))) {
        throw new WalletError("That member doesn't exist any more.", 404);
    }

    const taken = await changeWallet(
        fromId,
        (wallet) => {
            const feeFromPp = wallet.pp >= GIFT_FEE ? GIFT_FEE : 0;
            const feeFromPpp = GIFT_FEE - feeFromPp;
            if (wallet.ppp < amount + feeFromPpp) {
                throw new WalletError(
                    feeFromPpp
                        ? `With no PP for the fee, that's ${amount + feeFromPpp} P-PP, and you have ${wallet.ppp}.`
                        : `You have ${wallet.ppp} P-PP to give.`
                );
            }
            return { pp: 0 - feeFromPp, ppp: 0 - amount - feeFromPpp };
        },
        { reason: "giftSent", other: toId }
    );

    try {
        await changeWallet(toId, () => ({ ppp: amount }), { reason: "giftReceived", other: fromId });
    } catch (error) {
        await changeWallet(fromId, () => ({ pp: 0 - taken.pp, ppp: 0 - taken.ppp }), { reason: "refund", other: toId });
        throw error;
    }

    await noteGift(toId, fromId, amount);
    return taken;
}

// The PP Leaderboard's order, as aggregation stages: each member's PP and
// P-PP added together as `pp`, most first, ties A to Z by username.
// `fields`: what else to keep, as a $project ({ username: 1, ... }). The
// leaderboard (controllers/walletController.js) and the Slot Machine's
// daily snapshot (utils/slots.js) both use it, so they always agree.
function leaderboardStages(fields = {}) {
    return [
        { $project: { ...fields, pp: { $add: [{ $ifNull: ["$wallet.pp", 0] }, { $ifNull: ["$wallet.ppp", 0] }] } } },
        { $sort: { pp: -1, username: 1 } },
    ];
}

// Today's date in Helsinki, like "2026-10-30". The payout uses it to pay
// each member once a day, however many times it runs.
function helsinkiDay(date = new Date()) {
    return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Helsinki" }).format(date);
}

// The hour in Helsinki right now, 0 to 23.
function helsinkiHour(date = new Date()) {
    return Number(
        new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Helsinki", hour: "2-digit", hourCycle: "h23" }).format(date)
    );
}

// The daily payout: each member who has written reviews gets 1 PP per
// review, but never past their cap, and only once per Helsinki day. A
// member already at their cap still counts as paid, but isn't told, since
// they got nothing. Returns how many members got PP.
//
// Loan Shark (utils/loanShark/daily.js) goes first, out of the day's PP:
// what they owe other members and Kaveri Heiwajima's collecting, then the
// shark's missed-payment check. So members with loans but no reviews (none
// left) are gone through too, with a daily PP of 0. PP put up in loan
// offers still counts towards the cap.
//
// A member in debt from Steal and Defend (P-PP below 0) has it paid off
// first out of what's left, as P-PP; the rest comes in as usual.
async function payEveryone(day = helsinkiDay()) {
    const { membersWithLoans, lockedInOffers } = require("./loanShark/daily");
    const writers = await Review.aggregate([{ $group: { _id: "$user", reviews: { $sum: 1 } } }]);
    const reviewsOf = new Map(writers.map((row) => [String(row._id), row.reviews]));
    const members = new Map([...writers.map((row) => row._id), ...(await membersWithLoans())].map((id) => [String(id), id]));
    const locked = await lockedInOffers();

    let paid = 0;

    for (const [key, userId] of members) {
        try {
            const result = await payMember(userId, day, { reviews: reviewsOf.get(key) ?? 0, locked: locked.get(key) ?? 0 });
            if (result?.credited > 0) paid += 1;
        } catch (error) {
            // One member's trouble (say, their account was just deleted)
            // mustn't stop everyone else's payout.
            console.error(`Daily payout skipped ${userId}:`, error.message);
        }
    }

    return paid;
}

// Someone else paid them for `day` in the moment between.
class AlreadyPaid extends Error {}

// One member's payout for `day` (`reviews`: how many they've written,
// `locked`: their PP up in loan offers), loans and all, as one
// transaction where the database can (utils/steal/tx.js). Days are
// compared as text ("2026-11-06"), so a day already paid, or one paid
// ahead by an admin's Loan Shark test check, is never paid again. Returns
// { daily, deducted, credited, loans }, or null if they'd been paid.
async function payMember(userId, day, { reviews = 0, locked = 0 } = {}) {
    const { dailyLoans } = require("./loanShark/daily");
    const { inSession } = require("./steal/tx");
    const daily = dailyPp(reviews);

    try {
        return await inSession(async (session, after) => {
            const user = await User.findById(userId).select("wallet.lastPayoutDay").session(session).lean();
            if (!user || (user.wallet?.lastPayoutDay ?? "") >= day) return null;

            const loans = await dailyLoans(userId, daily, day, { session, after });
            const kept = daily - loans.deducted;

            const result = await changeWallet(
                userId,
                (wallet) => {
                    if ((wallet.lastPayoutDay ?? "") >= day) throw new AlreadyPaid();
                    const toDebt = wallet.ppp < 0 ? Math.min(kept, 0 - wallet.ppp) : 0;
                    const room = Math.max(0, ppCap(reviews) - wallet.pp - locked);
                    return { pp: Math.min(kept - toDebt, room), ppp: toDebt, lastPayoutDay: day };
                },
                { reason: "dailyPayout", session }
            );

            const credited = (result?.pp ?? 0) + (result?.ppp ?? 0);
            if (credited > 0) after(() => notePayout(userId, credited));
            return { daily, deducted: loans.deducted, credited, loans };
        });
    } catch (error) {
        if (error instanceof AlreadyPaid) return null;
        throw error;
    }
}

// Members who signed up before wallets existed have none saved. Gives each
// of them an empty one, so changeWallet's checks find a real 0.
function giveEveryoneAWallet() {
    return User.updateMany(
        { wallet: { $exists: false } },
        { $set: { wallet: { pp: 0, ppp: 0, lastPayoutDay: null } } },
        { timestamps: false }
    );
}

module.exports = {
    CAP_DAYS,
    WalletError,
    dailyPp,
    ppCap,
    changeWallet,
    spend,
    credit,
    GIFT_FEE,
    giftPpp,
    leaderboardStages,
    helsinkiDay,
    helsinkiHour,
    payEveryone,
    payMember,
    giveEveryoneAWallet,
};