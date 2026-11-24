// Lord Gang Orca's rules (utils/orca/). His words are in
// data/lordGangOrcaScripts.js. All times are Helsinki's.

const LORD_GANG_ORCA = {
    // Open Monday to Friday, 16:00 to 23:59 (closed from 23:59 on). Weekdays
    // as Date#getDay(): 0 Sunday ... 6 Saturday. Times as [hour, minute].
    hours: { days: [1, 2, 3, 4, 5], opensAt: [16, 0], closesAt: [23, 59] },
    // An admin's pretend clock (utils/orca/player.js debug, for testing the
    // hours) only lasts this long: after that, the real hours again.
    testClockMs: 2 * 60 * 60 * 1000,

    beg: {
        // Each beg pays this share of the member's daily PP, rounded up, at
        // least 1, in PP (never past their PP cap): half a day's payout.
        share: 0.5,
        perDay: 3,
        cooldownMs: 60 * 60 * 1000,
        // The chance a beg becomes one of his questions instead (it still
        // uses the beg and starts the cooldown). Right: the beg in PP and
        // the same again in P-PP. Wrong: the beg in PP.
        questionChance: 0.1,
    },

    // The secret: each member's favour threshold, a whole number from 750 to
    // 1050 (% of daily PP: what they've begged, 7.5 to 10.5 days' payout).
    // Every beg adds `perBeg`, the beg's share as a %; reaching it starts
    // favour mode. At three begs a day of 50%, that's 15 to 21 begs: 5 to 7
    // days of begging every day. Never sent to the page.
    favour: {
        thresholdMin: 750,
        thresholdMax: 1050,
        perBeg: 50,
        // Jobs to do before begging again, and how many he hands out each
        // day (at 00:00) while favour mode is on.
        needed: 3,
        perDay: 4,
    },

    // A member in the red (P-PP below 0: a Steal and Defend fine they
    // couldn't pay; utils/orca/debt.js): he's open around the clock for
    // begging, whatever the day or hour, and offers `jobs` jobs (the same
    // kinds as favours), each in a slot of its own. A slot's job is
    // replaced `refreshDays` after it was dealt, done or not. Each one done
    // forgives `forgiveShare` of the lowest they've been since going into
    // the red (rounded up), never past 0. Out of the red, everything's as
    // usual again.
    debt: { jobs: 10, refreshDays: 2, forgiveShare: 0.1 },

    jobs: {
        // The odds of each kind, out of 1.
        odds: { challenge: 0.4, review: 0.3, dislike: 0.2, like: 0.1 },
        // A job's dislike comes off again this long after it's done (like
        // King Loan Shark's).
        dislikeHours: 48,
        // The same X at most this many times in one day's jobs, when there
        // are enough members to choose from.
        maxPerX: 2,
    },
};

module.exports = { LORD_GANG_ORCA };
