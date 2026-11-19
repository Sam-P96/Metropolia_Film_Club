const { JACKPOT_FEED } = require("../config/jackpotFeed");

// Shares of what's lost elsewhere going into the Box Office Scratch
// jackpots (config/jackpotFeed.js): from stakes lost to Clanker at Kino
// Farkle (utils/farkle.js), from what King Loan Shark takes
// (utils/loanShark/), from Box Office Crash rounds (utils/crash.js) and
// from Forrest Bounce runs (utils/forrest.js). The pools themselves are
// utils/scratch.js's.

// `share` (0.75) of `amount`, rounded up to a whole point, without floating
// point surprises.
function feedShare(amount, share) {
    if (!(amount > 0)) return 0;
    const basisPoints = Math.round(share * 10000);
    return Math.floor((amount * basisPoints + 9999) / 10000);
}

// Feeds `amount` into the pools. Never throws: the game or the loan it
// came from has already happened, and the pools only miss this share.
// Resolves to the shares fed ({ standard, premium, vip }), or null.
async function feed(amount, from) {
    if (!(amount > 0)) return null;
    try {
        // Here, not at the top: utils/scratch.js reaches the wallet, which
        // reaches Loan Shark.
        const { feedJackpots } = require("./scratch");
        return await feedJackpots(amount);
    } catch (error) {
        console.error(`Couldn't feed the scratch jackpots from ${from}:`, error.message);
        return null;
    }
}

// A stake of `stake` points was lost to Clanker.
const feedFromClanker = (stake) => feed(feedShare(stake, JACKPOT_FEED.farkleClanker), "Kino Farkle");

// King Loan Shark took `taken` points: a repayment, or Kaveri's collecting.
const feedFromLoanShark = (taken) => feed(feedShare(taken, JACKPOT_FEED.loanShark), "Loan Shark");

// A Box Office Crash round lost `lost` points, all its players together.
const feedFromCrash = (lost) => feed(feedShare(lost, JACKPOT_FEED.crash), "Box Office Crash");

// A Forrest Bounce run lost `lost` points.
const feedFromForrest = (lost) => feed(feedShare(lost, JACKPOT_FEED.forrest), "Forrest Bounce");

module.exports = { feedShare, feedFromClanker, feedFromLoanShark, feedFromCrash, feedFromForrest };
