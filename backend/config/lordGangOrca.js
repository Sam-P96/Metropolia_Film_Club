// Lord Gang Orca's rules (utils/orca/). His words are in
// data/lordGangOrcaScripts.js. All times are Helsinki's.

const LORD_GANG_ORCA = {
    // Open Monday to Friday, 16:00 to midnight. Weekdays as Date#getDay():
    // 0 Sunday ... 6 Saturday.
    hours: { days: [1, 2, 3, 4, 5], opensAt: 16 },

    beg: {
        // Each beg pays this share of the member's daily PP, rounded up, at
        // least 1, in PP (never past their PP cap).
        share: 0.1,
        perDay: 3,
        cooldownMs: 60 * 60 * 1000,
        // The chance a beg becomes one of his questions instead (it still
        // uses the beg and starts the cooldown). Right: the beg in PP and
        // the same again in P-PP. Wrong: the beg in PP.
        questionChance: 0.1,
    },

    // The secret: each member's favour threshold, a whole number from 150 to
    // 300 (% of daily PP). Every beg adds `perBeg`; reaching it starts
    // favour mode. Never sent to the page.
    favour: {
        thresholdMin: 150,
        thresholdMax: 300,
        perBeg: 10,
        // Jobs to do before begging again, and how many he hands out each
        // day (at 00:00) while favour mode is on.
        needed: 3,
        perDay: 4,
    },

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
