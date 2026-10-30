const User = require("../models/userModel");
const Review = require("../models/reviewModel");
const WalletTx = require("../models/walletTxModel");
const { notePayout } = require("./notify");

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
async function changeWallet(userId, decide, { reason, match = null } = {}) {
    for (let attempt = 0; attempt < TRIES; attempt++) {
        const user = await User.findById(userId).select("wallet").lean();
        if (!user) throw new WalletError("That member doesn't exist any more.", 404);

        const wallet = {
            pp: user.wallet?.pp ?? 0,
            ppp: user.wallet?.ppp ?? 0,
            lastPayoutDay: user.wallet?.lastPayoutDay ?? null,
        };

        const change = decide(wallet);
        if (!change) return null;

        const pp = change.pp ?? 0;
        const ppp = change.ppp ?? 0;
        const balance = { pp: wallet.pp + pp, ppp: wallet.ppp + ppp };

        if (balance.pp < 0 || balance.ppp < 0) {
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
            },
            { $set: set },
            { timestamps: false }
        );

        if (result.matchedCount === 0) continue; // changed under us: try again

        if (pp !== 0 || ppp !== 0) {
            await WalletTx.create({ user: userId, reason, pp, ppp, balance, match });
        }

        return { pp, ppp, balance };
    }

    throw new WalletError("Your points are busy. Try again in a moment.", 409);
}

// Takes a bet of `amount` from a member: their PP first, then P-PP for the
// rest. 40 PP and 100 P-PP, betting 60: 40 PP and 20 P-PP go.
// `async` so a bad amount comes back as a rejected promise, like every
// other failure here, instead of a throw that a .catch() would miss.
async function spend(userId, amount, { reason = "bet", match = null } = {}) {
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
        { reason, match }
    );
}

// Gives a member `ppp` P-PP, like a win. Async for the same reason as spend.
async function credit(userId, ppp, { reason = "win", match = null } = {}) {
    if (!Number.isInteger(ppp) || ppp <= 0) {
        throw new WalletError("Can only add a whole number of P-PP above 0.");
    }

    return changeWallet(userId, () => ({ ppp }), { reason, match });
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
async function payEveryone(day = helsinkiDay()) {
    const writers = await Review.aggregate([{ $group: { _id: "$user", reviews: { $sum: 1 } } }]);

    let paid = 0;

    for (const { _id: userId, reviews } of writers) {
        try {
            const result = await changeWallet(
                userId,
                (wallet) => {
                    if (wallet.lastPayoutDay === day) return null;
                    const room = Math.max(0, ppCap(reviews) - wallet.pp);
                    return { pp: Math.min(dailyPp(reviews), room), lastPayoutDay: day };
                },
                { reason: "dailyPayout" }
            );
            if (result?.pp > 0) {
                paid += 1;
                await notePayout(userId, result.pp);
            }
        } catch (error) {
            // One member's trouble (say, their account was just deleted)
            // mustn't stop everyone else's payout.
            console.error(`Daily payout skipped ${userId}:`, error.message);
        }
    }

    return paid;
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
    helsinkiDay,
    helsinkiHour,
    payEveryone,
    giveEveryoneAWallet,
};