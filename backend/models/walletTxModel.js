const mongoose = require("mongoose");

const Schema = mongoose.Schema;

// One change to a member's wallet: how much PP and P-PP it added (positive)
// or took away (negative), why, and what the wallet held right after. The
// wallet itself lives on the user (models/userModel.js); this is the
// receipt, so any balance can be explained.
//   dailyPayout   the 12:00 payout (jobs/dailyPayout.js)
//   bet           points put up for a Farkle game
//   win           a Farkle win, always paid in P-PP
//   refund        a bet handed back (a cancelled or expired game)
//   shop          P-PP spent on a badge or trophy
//   admin         changed by hand by an admin
//   giftSent      P-PP gifted to `other`, plus the 1 point fee ("Gift PP")
//   giftReceived  P-PP gifted by `other`
//   scratchTicket   a Box Office Scratch ticket bought (`card`)
//   scratchWin      a Box Office Scratch tier won, in P-PP
//   scratchRefund   the Straight to DVD tier: the ticket price handed back
//   jackpot         the Box Office Scratch jackpot, in P-PP
//   doubleBet       a Double or Nothing bet (`game`)
//   doubleWin       a Double or Nothing win: twice the bet, in P-PP
//   doubleBonus     the Double or Nothing bonus pot, won with a win
//   slotCredits     points moved into the Slot Machine (PP first, then P-PP)
//   slotCashOut     the Slot Machine cashed out: PP back as PP, P-PP as P-PP
// Steal and Defend (utils/steal/), with the attack, listing or trade in `steal`:
//   stealWin        a successful steal, crit and Rogue extras included, in P-PP
//   stealLoss       robbed: what the victim lost (PP first, then P-PP)
//   stealWilson     Wilson giving a robbed victim some back, in P-PP
//   stealFine       a failed thief's fine (and Revenge Dagger), into debt if need be
//   stealFineWon    the defender's share of that fine, in P-PP
//   stealBuy        an item bought from the shop or the player market
//   stealSell       an item sold back to the shop, or to another player, in P-PP
//   stealTrade      PP in a trade: put in escrow, handed back, paid or received
//   stealTakeback   turning PvP off: steals taken back, or a victim paid back
//   pokerBuyIn      chips for the Kino Poker table (PP first, then P-PP)
//   pokerCashOut    leaving the table: the stake back as it went in, winnings as P-PP
// Loan Shark (utils/loanShark/), with the other member in `other`:
//   loanSharkBorrow  borrowed from King Loan Shark, in P-PP
//   loanSharkRepay   paid King Loan Shark back (PP first, then P-PP)
//   loanOffer        PP put up as a loan offer, out of the wallet until borrowed
//   loanOfferBack    an offer taken down: the PP nobody borrowed, back
//   loanBorrow       borrowed from `other`'s offer, in PP
//   loanRepay        paid `other` back early ("Pay off now"), PP first, then P-PP
//   loanRepaid       `other` paid back what they borrowed, less income tax, in P-PP
//   blackMarket      a cosmetic bought at the Black Market, in P-PP (burned)
// Infinite Gomoku (utils/gomoku.js, utils/gomokuShop.js), with the game in `gomoku`:
//   gomokuBet        a stake put up (PP first, then P-PP)
//   gomokuWin        a win: both stakes, in P-PP
//   gomokuRefund     a stake handed back: a draw, or a game that never got going
//   gomokuShop       a piece, shockwave, board or grid bought (PP first, then P-PP)
//   loanCollector    Kaveri took it for King Loan Shark, out of the
//                    wallet: only ever an admin's development button (at 12:00
//                    he takes it from the payout before it reaches the wallet)
const walletTxSchema = new Schema({
    user: {type: Schema.Types.ObjectId, ref: "User", required: true},
    reason: {
        type: String,
        enum: [
            "dailyPayout", "bet", "win", "refund", "shop", "admin", "giftSent", "giftReceived",
            "scratchTicket", "scratchWin", "scratchRefund", "jackpot",
            "doubleBet", "doubleWin", "doubleBonus",
            "slotCredits", "slotCashOut",
            "stealWin", "stealLoss", "stealWilson", "stealFine", "stealFineWon",
            "stealBuy", "stealSell", "stealTrade", "stealTakeback",
            "pokerBuyIn", "pokerCashOut",
            "loanSharkBorrow", "loanSharkRepay", "loanOffer", "loanOfferBack", "loanBorrow", "loanRepay", "loanRepaid", "loanCollector", "blackMarket",
            "gomokuBet", "gomokuWin", "gomokuRefund", "gomokuShop",
        ],
        required: true,
    },
    pp: {type: Number, default: 0},
    ppp: {type: Number, default: 0},
    balance: {
        pp: {type: Number, required: true},
        ppp: {type: Number, required: true},
    },
    // The Farkle game a bet, win or refund belongs to.
    match: {type: Schema.Types.ObjectId, ref: "FarkleMatch", default: null},
    // The Box Office Scratch card a ticket, win, refund or jackpot belongs to.
    card: {type: Schema.Types.ObjectId, ref: "ScratchCard", default: null},
    // The Double or Nothing game a bet, win or bonus belongs to.
    game: {type: Schema.Types.ObjectId, ref: "DoubleGame", default: null},
    // The other member in a gift: who it went to, or came from.
    other: {type: Schema.Types.ObjectId, ref: "User", default: null},
    // Steal and Defend: the attack, shop listing, market listing or trade.
    steal: {type: Schema.Types.ObjectId, default: null},
    // The Infinite Gomoku game a bet, win or refund belongs to.
    gomoku: {type: Schema.Types.ObjectId, ref: "GomokuMatch", default: null},
    at: {type: Date, default: Date.now},
});

walletTxSchema.index({user: 1, at: -1});

module.exports = mongoose.model("WalletTx", walletTxSchema);