const SlotMachine = require("../../models/slotMachineModel");
const PokerSeat = require("../../models/pokerSeatModel");
const LoanOffer = require("../../models/loanOfferModel");
const PlayerDebt = require("../../models/playerDebtModel");

// The PP a member has outside their wallet, in whole points, so a thief
// can't dodge a failed attack's fine by parking it somewhere first:
//   slots     the credits in their Slot Machine (kept in cents)
//   poker     their chips at the Kino Poker table
//   lending   what's still up for grabs in their loan offers (it left
//             their wallet when the offer went up)
//   lent      what members still owe them back from those offers (the
//             principal only: the interest was never theirs to park)
// One query at a time: a transaction can't run them side by side.
async function moneyElsewhere(userId, session = null) {
    const machine = await SlotMachine.findOne({ user: userId }).select("pp ppp").session(session).lean();
    const seat = await PokerSeat.findById(userId).select("stack").session(session).lean();
    const offers = await LoanOffer.find({ lender: userId, status: "active" }).select("available").session(session).lean();
    const debts = await PlayerDebt.find({ lender: userId, status: "active" }).select("principal principalPaid").session(session).lean();

    const parts = {
        slots: machine ? Math.floor(((machine.pp ?? 0) + (machine.ppp ?? 0)) / 100) : 0,
        poker: Math.max(0, Math.floor(seat?.stack ?? 0)),
        lending: offers.reduce((sum, offer) => sum + Math.max(0, offer.available ?? 0), 0),
        lent: debts.reduce((sum, debt) => sum + Math.max(0, (debt.principal ?? 0) - (debt.principalPaid ?? 0)), 0),
    };
    return { ...parts, total: parts.slots + parts.poker + parts.lending + parts.lent };
}

module.exports = { moneyElsewhere };
