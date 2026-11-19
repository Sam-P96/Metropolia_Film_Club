// What fills the Box Office Scratch jackpots besides the tickets themselves
// (shared/scratch/config.js jackpotContribution): a share of what's lost
// elsewhere on the site (utils/jackpotFeed.js). Each share is rounded up to
// a whole point.
const JACKPOT_FEED = {
    // How each amount fed in is shared between the three pools. Adds up to
    // 1, so all of it goes in (utils/scratch.js splitFeed).
    split: { standard: 0.15, premium: 0.35, vip: 0.5 },

    // Of a stake (PP and P-PP) lost to Clanker at Kino Farkle, however the
    // game was lost: beaten, resigned, left or timed out.
    farkleClanker: 0.75,

    // Of everything King Loan Shark takes (PP and P-PP): what members pay
    // him back, and what Kaveri collects.
    loanShark: 0.5,

    // Of what a Box Office Crash round loses (PP and P-PP): each player's
    // bet, less whatever came back to them (half of it, in a protected
    // round). Lord Gang Orca's all in too.
    crash: 0.9,

    // Of what a Forrest Bounce run loses (PP and P-PP): its entry, less what
    // its cash-out paid. All of it for a run thrown away, let go when a new
    // one started, not counted, or never finished.
    forrest: 1,
};

module.exports = { JACKPOT_FEED };
