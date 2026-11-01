const crypto = require("crypto");
const { DateTime } = require("luxon");
const { DOUBLE } = require("../../../shared/double/config.js");

// Double or Nothing as plain functions, with no database: one round of
// rock, paper, scissors, what a run of rounds adds up to, the week's seed,
// how a Monday reset splits what's left, and when Mondays are. The server
// (utils/double.js) plays the game with these; the tests check them alone.

const THROWS = DOUBLE.throws;
// What each throw beats.
const BEATS = { rock: "scissors", paper: "rock", scissors: "paper" };

// The three ways a game ends.
const WIN = "win"; // 2 round wins: double the bet back
const BAN = "ban"; // lost a round first: the Ban List
const WAIT = "wait"; // 2 draws first: the Waiting List

// A refusal, sent back as JSON: { error: message, code, ...extra }. `code`
// is for the page to act on, like POT_CHANGED; `extra` is anything it needs
// with it, like the bet now.
class DoubleError extends Error {
    constructor(code, status, message, extra = {}) {
        super(message);
        this.code = code;
        this.status = status;
        this.extra = extra;
    }
}

// One round, from the player's side: "win", "draw" or "loss".
function roundResult(playerThrow, houseThrow) {
    if (playerThrow === houseThrow) return "draw";
    return BEATS[playerThrow] === houseThrow ? "win" : "loss";
}

// The house's throw, picked only once the player's is in. `randomInt(max)`
// is crypto.randomInt (it can't be predicted), unless a test passes its own.
function houseThrow(randomInt = crypto.randomInt) {
    return THROWS[randomInt(THROWS.length)];
}

// How the game stands after `results` (round results, in order): WIN, BAN
// or WAIT once it's decided, null while it isn't. It's decided the moment
// it can be: a loss before 2 wins is the Ban List even after a win, and 2
// draws before 2 wins is the Waiting List. Any 3 rounds always decide it.
//   W W, W D W, D W W   win
//   L, W L, D L, ...     ban
//   D D, W D D, D W D    wait
function outcomeOf(results) {
    let wins = 0;
    let draws = 0;
    for (const result of results) {
        if (result === "loss") return BAN;
        if (result === "win" && ++wins >= DOUBLE.winsNeeded) return WIN;
        if (result === "draw" && ++draws >= DOUBLE.drawsToWait) return WAIT;
    }
    return null;
}

// The `p` percentile of `values` (0.75 is the 75th), interpolating between
// the two nearest values like a spreadsheet's PERCENTILE.INC. For 10, 15,
// 20, 25, 30, 40, 60, 80, 120, 200, 350 and 900, the 75th is a quarter of
// the way from 120 to 200: 140.
function percentile(values, p) {
    const sorted = [...values].sort((a, b) => a - b);
    if (sorted.length === 0) return null;
    const rank = p * (sorted.length - 1);
    const below = Math.floor(rank);
    const above = Math.min(below + 1, sorted.length - 1);
    return sorted[below] + (sorted[above] - sorted[below]) * (rank - below);
}

// The week's seed from active members' wallet totals (PP + P-PP): the 75th
// percentile, rounded, kept between DOUBLE.seed.min and max. Nobody active
// gives the minimum.
function seedFrom(totals) {
    const { percentile: p, min, max } = DOUBLE.seed;
    const middle = percentile(totals, p);
    if (middle === null) return min;
    return Math.min(max, Math.max(min, Math.round(middle)));
}

// The Monday reset's sums. `lost` (every bet left in the pot) splits in
// half: one half to the bonus pot, but never past its cap (whatever doesn't
// fit is burned), the other half burned. An odd point burns too, so nothing
// is ever made up. 1 120 lost with 960 in the bonus pot: 560 in (1 520) and
// 560 burned.
function resetSplit(lost, bonusPot) {
    const half = Math.floor(lost / 2);
    const room = Math.max(0, DOUBLE.bonus.cap - bonusPot);
    const toBonus = Math.min(half, room);
    return { toBonus, burned: lost - toBonus, bonusPot: bonusPot + toBonus };
}

// Whether a win at `bet` also wins the bonus pot, in a week seeded `seed`.
function bonusEligible(bet, seed) {
    return bet >= DOUBLE.bonus.betMultiple * seed;
}

// The latest Monday 12:00 in Helsinki at or before `now`. luxon works it
// out in Helsinki's own time, so it's 12:00 there in summer (09:00 UTC) and
// in winter (10:00 UTC) alike.
function lastResetAt(now = new Date()) {
    const { weekday, hour, zone } = DOUBLE.reset;
    const here = DateTime.fromJSDate(now, { zone });
    let reset = here.set({ weekday, hour, minute: 0, second: 0, millisecond: 0 });
    if (reset > here) reset = reset.minus({ weeks: 1 });
    return reset.toJSDate();
}

// The next one after `now`.
function nextResetAt(now = new Date()) {
    const { zone } = DOUBLE.reset;
    return DateTime.fromJSDate(lastResetAt(now), { zone }).plus({ weeks: 1 }).toJSDate();
}

// Who counts as active for the seed: anyone who posted a review since this.
function activeSince(now = new Date()) {
    return DateTime.fromJSDate(now, { zone: DOUBLE.reset.zone }).minus({ months: DOUBLE.seed.activeMonths }).toJSDate();
}

module.exports = {
    THROWS,
    WIN,
    BAN,
    WAIT,
    DoubleError,
    roundResult,
    houseThrow,
    outcomeOf,
    percentile,
    seedFrom,
    resetSplit,
    bonusEligible,
    lastResetAt,
    nextResetAt,
    activeSince,
};
