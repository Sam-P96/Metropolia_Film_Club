const TABLES = require("./tables.json");

// The Slot Machine's luck system. Hidden from players: nothing here is ever
// sent to the page, shown, or put in shared/ (which the page reads). The
// page only ever gets what a spin landed on.
//
// Each player's return to player (RTP) depends on where they stand on the
// PP Leaderboard (utils/slots.js works that out). Payouts never change: a
// win always pays exactly what the paytable says. What changes is how often
// each symbol lands, by picking one of the weight tables in tables.json,
// made by scripts/tune-slots.js.

// The numbers to tune.
const LUCK = {
    // A player is active with at least one review in this many days.
    activeDays: 30,
    // Active players, from the richest active player to the poorest, in a
    // straight line by rank between them.
    richestRtp: 0.95,
    poorestRtp: 1.03,
    // The only active player.
    soloRtp: 1.01,
    // Players with no review in activeDays.
    inactiveRtp: 0.95,
};

// The tables there are, as whole percentages ("88" to "114").
const BUCKETS = Object.keys(TABLES).map(Number).sort((a, b) => a - b);

// The RTP a player gets. `active`: they've reviewed lately. `rank`: their
// place among the active players in today's leaderboard order (1 is the
// richest). `count`: how many active players there are.
//   p = (count - rank) / (count - 1): 1 for the richest, 0 for the poorest.
function targetRtp({ active, rank, count }) {
    if (!active) return LUCK.inactiveRtp;
    if (count <= 1) return LUCK.soloRtp;
    const p = (count - rank) / (count - 1);
    return LUCK.poorestRtp + (LUCK.richestRtp - LUCK.poorestRtp) * p;
}

// The weight table nearest `target`, and its bucket (the whole percentage,
// logged with each spin).
function tableFor(target) {
    const wanted = Math.round(target * 100);
    const bucket = BUCKETS.reduce((best, next) => (Math.abs(next - wanted) < Math.abs(best - wanted) ? next : best));
    return { bucket, weights: TABLES[bucket] };
}

module.exports = { LUCK, BUCKETS, TABLES, targetRtp, tableFor };
