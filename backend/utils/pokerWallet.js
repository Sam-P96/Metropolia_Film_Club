const PokerSeat = require("../models/pokerSeatModel");
const { WalletError, changeWallet, spend } = require("./wallet");
const { activeBansOf, banFor, banMessage } = require("./steal/moderation");
const { PokerError } = require("../games/poker/betting");

// Kino Poker and the wallet (backend/games/poker/table.js uses these):
// buying in takes PP first, then P-PP, like every bet on the site; cashing
// out gives the stake back as it went in and everything won as P-PP, like
// the Slot Machine. Each member's chips are saved between hands
// (models/pokerSeatModel.js), so a restart hands them straight back.

// What a stack cashes out as, from what went in (`funds`: { pp, ppp }).
// Losses come out of the PP first (it was spent first), and anything over
// the buy-in is winnings, in P-PP. 40 PP + 20 P-PP in, 100 out: 40 PP and
// 60 P-PP. 50 out: 30 PP and 20 P-PP.
function cashOutSplit(funds, stack) {
    const pp = funds?.pp ?? 0;
    const ppp = funds?.ppp ?? 0;
    const lost = Math.max(0, pp + ppp - stack);
    const ppBack = Math.max(0, pp - lost);
    return { pp: ppBack, ppp: Math.max(0, stack - ppBack) };
}

// Takes `amount` for a seat. Refused for an admin's "All games" (or
// site-wide) ban, a frozen wallet (Steal and Defend), or not enough points.
async function buyIn(user, amount) {
    const ban = banFor(await activeBansOf(user._id), "games");
    if (ban) throw new PokerError(banMessage(ban, "games"), "BANNED");
    try {
        const taken = await spend(user._id, amount, { reason: "pokerBuyIn" });
        return { pp: 0 - taken.pp, ppp: 0 - taken.ppp };
    } catch (error) {
        if (error instanceof WalletError) throw new PokerError(error.message, "WALLET");
        throw error;
    }
}

async function cashOut(userId, funds, stack) {
    const back = cashOutSplit(funds, stack);
    if (back.pp + back.ppp > 0) {
        try {
            await changeWallet(userId, () => back, { reason: "pokerCashOut" });
        } catch (error) {
            // A member whose account has just gone: nobody to pay.
            console.error(`Kino Poker couldn't cash out ${userId}:`, error.message);
        }
    }
    return back;
}

// The chips at the table, kept between hands.
const store = {
    save: (seat) =>
        PokerSeat.updateOne(
            { _id: seat.userId },
            { $set: { funds: seat.funds, stack: seat.stack, at: new Date() } },
            { upsert: true }
        ),
    remove: (userId) => PokerSeat.deleteOne({ _id: userId }),
};

// After a restart the table starts empty, so anyone who was sitting at it
// gets their chips back: their stack from the end of the last hand (a hand
// cut short by the restart doesn't count).
async function refundAll() {
    const seats = await PokerSeat.find().lean();
    for (const seat of seats) {
        await cashOut(seat._id, seat.funds, seat.stack);
        await PokerSeat.deleteOne({ _id: seat._id });
    }
    return seats.length;
}

module.exports = { cashOutSplit, buyIn, cashOut, store, refundAll };
