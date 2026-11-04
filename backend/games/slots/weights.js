const { SLOTS } = require("../../../shared/slots/config.js");

// How often each of the Slot Machine's 7 symbols lands at the base RTP
// (about 101%), as shares of 1. Server only, like everything about the odds
// (luck.js). The tuning script (scripts/tune-slots.js) makes every other
// table from these by shifting weight between the four higher symbols and
// the three lower ones, keeping their order: the logo is the rarest.
const BASE_WEIGHTS = {
    ticket: 0.259,
    popcorn: 0.2175,
    clapper: 0.1657,
    map: 0.1239,
    ring: 0.0963,
    gauntlet: 0.0826,
    logo: 0.055,
};

// The saved tables are whole numbers out of this, for drawing with
// crypto.randomInt.
const WEIGHT_TOTAL = 1_000_000;

// The symbols from most to least likely: the order no table may change.
function rarityOrder(weights) {
    return SLOTS.symbols.map((symbol) => symbol.key).sort((a, b) => weights[b] - weights[a]);
}

// Whether `weights` keeps the base table's order, every step strictly.
function keepsRarityOrder(weights) {
    const order = rarityOrder(BASE_WEIGHTS);
    return order.every((key, i) => i === 0 || weights[order[i - 1]] > weights[key]);
}

module.exports = { BASE_WEIGHTS, WEIGHT_TOTAL, rarityOrder, keepsRarityOrder };
