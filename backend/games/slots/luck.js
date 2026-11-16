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
    richestRtp: 0.99,
    poorestRtp: 1.15,
    // The only active player.
    soloRtp: 1.03,
    // Players with no review in activeDays.
    inactiveRtp: 0.95,
};

// The last chance: a player whose wallet is empty and who bets everything
// in the machine (MAX) wins something on `winChance` of those spins, for
// their first `perDay` such spins each Slot Machine day (12:00 to 12:00,
// utils/slots.js slotDay). "Something" is any win at all, drawn from their
// own table (`tries` draws at most; it never takes more than a few). Like
// the rest of this file, never told to players.
const LAST_CHANCE = { perDay: 3, winChance: 0.75, tries: 500 };

// The tables there are, as whole percentages ("93" to "120").
const BUCKETS = Object.keys(TABLES).map(Number).sort((a, b) => a - b);

// The RTP a player gets. `active`: they've reviewed lately. `rank`: their
// place among the active players in today's leaderboard order (1 is the
// richest). `count`: how many active players there are. `luck`: the
// numbers to use, LUCK unless it's happy hour (games/happyHours.js).
//   p = (count - rank) / (count - 1): 1 for the richest, 0 for the poorest.
// With a `topRtp` (happy hour), the richest gets that instead, and the line
// from richestRtp to poorestRtp runs over everyone else: the second richest
// to the poorest.
function targetRtp({ active, rank, count }, luck = LUCK) {
    if (!active) return luck.inactiveRtp;
    if (count <= 1) return luck.soloRtp;
    if (luck.topRtp !== undefined) {
        if (rank === 1) return luck.topRtp;
        if (count === 2) return luck.poorestRtp;
        const p = (count - rank) / (count - 2);
        return luck.poorestRtp + (luck.richestRtp - luck.poorestRtp) * p;
    }
    const p = (count - rank) / (count - 1);
    return luck.poorestRtp + (luck.richestRtp - luck.poorestRtp) * p;
}

// The weight table nearest `target`, and its bucket (the whole percentage,
// logged with each spin).
function tableFor(target) {
    const wanted = Math.round(target * 100);
    const bucket = BUCKETS.reduce((best, next) => (Math.abs(next - wanted) < Math.abs(best - wanted) ? next : best));
    return { bucket, weights: TABLES[bucket] };
}

module.exports = { LUCK, LAST_CHANCE, BUCKETS, TABLES, targetRtp, tableFor };
