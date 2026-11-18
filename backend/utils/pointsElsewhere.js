const SlotMachine = require("../models/slotMachineModel");
const PokerSeat = require("../models/pokerSeatModel");
const LoanOffer = require("../models/loanOfferModel");
const PlayerDebt = require("../models/playerDebtModel");
const FarkleMatch = require("../models/farkleMatchModel");
const GomokuMatch = require("../models/gomokuMatchModel");
const PoolMatch = require("../models/poolMatchModel");
const PoolBet = require("../models/poolBetModel");
const DoubleGame = require("../models/doubleGameModel");
const StealTrade = require("../models/stealTradeModel");

// Points a member has put somewhere other than their wallet that can still
// come back to them: Kino Kasino credits, chips at the Kino Poker table,
// loan offers still up and loans still owed to them, stakes riding on games
// still going (Kino Farkle, Infinite Gomoku, 8 Ball Pool and its side bets,
// Double or Nothing), and points held in Steal and Defend trade offers.
//
// Box Office Crash's "all in" (games/crash/rooms.js) won't go while there's
// any: all in means all of it, so nobody can stash points first and keep
// them safe. Resolves to [{ points, where }], biggest first, whole points.

const paidOf = (paid) => (paid?.pp ?? 0) + (paid?.ppp ?? 0);
const LIVE = ["starting", "active"];

async function pointsElsewhere(userId) {
    const me = String(userId);
    const stakeIn = (matches) => matches.reduce((sum, match) => sum + paidOf(match.players.find((player) => String(player.user) === me)?.paid), 0);
    const [slot, seat, offers, debts, farkle, gomoku, pool, sideBets, double, trades] = await Promise.all([
        SlotMachine.findOne({ user: userId }).select("pp ppp").lean(),
        PokerSeat.findById(userId).select("stack funds").lean(),
        LoanOffer.find({ lender: userId, status: "active" }).select("available").lean(),
        PlayerDebt.find({ lender: userId, status: "active" }).select("principal interest principalPaid interestPaid").lean(),
        FarkleMatch.find({ "players.user": userId, status: { $in: LIVE } }).select("players").lean(),
        GomokuMatch.find({ "players.user": userId, status: { $in: LIVE } }).select("players").lean(),
        PoolMatch.find({ "players.user": userId, status: { $in: LIVE } }).select("players").lean(),
        PoolBet.find({ $or: [{ bettor: userId, status: { $in: ["open", "matched"] } }, { taker: userId, status: "matched" }] })
            .select("bettor paid takerPaid")
            .lean(),
        DoubleGame.find({ userId, status: "in_progress" }).select("bet").lean(),
        StealTrade.find({ from: userId, status: "pending" }).select("give.held").lean(),
    ]);

    const places = [
        // The Slot Machine keeps hundredths of a point.
        { where: "in Kino Kasino credits", points: Math.floor(((slot?.pp ?? 0) + (slot?.ppp ?? 0)) / 100) },
        { where: "at the Kino Poker table", points: seat ? seat.stack || paidOf(seat.funds) : 0 },
        { where: "in loan offers still up", points: offers.reduce((sum, offer) => sum + offer.available, 0) },
        { where: "lent out and still owed to you", points: debts.reduce((sum, debt) => sum + debt.principal + debt.interest - debt.principalPaid - debt.interestPaid, 0) },
        { where: "riding on Kino Farkle", points: stakeIn(farkle) },
        { where: "riding on Infinite Gomoku", points: stakeIn(gomoku) },
        { where: "riding on 8 Ball Pool", points: stakeIn(pool) },
        { where: "on 8 Ball Pool side bets", points: sideBets.reduce((sum, bet) => sum + (String(bet.bettor) === me ? paidOf(bet.paid) : paidOf(bet.takerPaid)), 0) },
        { where: "riding on Double or Nothing", points: double.reduce((sum, game) => sum + game.bet, 0) },
        { where: "held in Steal and Defend trade offers", points: trades.reduce((sum, trade) => sum + paidOf(trade.give?.held), 0) },
    ];
    return places.filter((place) => place.points > 0).sort((a, b) => b.points - a.points);
}

module.exports = { pointsElsewhere };
