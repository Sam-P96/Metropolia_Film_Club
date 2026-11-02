// Makes the Slot Machine's weight tables (games/slots/tables.json): one for
// every whole-percent RTP from FROM to TO, each tuned with the exact RTP
// (games/slots/rtp.js). Run it again after changing the paytable or the
// base weights:
//   node scripts/tune-slots.js
//
// Payouts stay as the paytable says; only how often symbols land changes,
// along one path from the base weights (games/slots/weights.js), steered by
// one number, `s`:
//   -1 to 1   The Kino Kaveri logo lands up to LOGO_SPAN more or less often,
//             the other symbols sharing what's left in their usual
//             proportions. The logo's jackpot makes this the strongest
//             lever, and kept within LOGO_SPAN the logo stays rarer than the
//             Map and commoner than the Ring.
//   -1.9 to -1  Below that, weight moves from the Common symbols to the Film
//             Strip and the Map as well, up to 0.9 x MID_SHIFT. Those two
//             land in a row much less often than the commons, so this
//             lowers the RTP. (Moving weight onto the commons would raise
//             it: they land in a row so often.)
// The RTP rises steadily with `s`, so each target is found by halving.
// Every table keeps the base table's order of rarity, which is checked here
// and in tests/slots.test.js.
const fs = require("fs");
const path = require("path");
const { SLOTS } = require("../../shared/slots/config.js");
const { BASE_WEIGHTS, WEIGHT_TOTAL, keepsRarityOrder } = require("../games/slots/weights");
const { rtpOf } = require("../games/slots/rtp");

const FROM = 88;
const TO = 114;
const LOGO_SPAN = 0.12;
const MID_SHIFT = 0.04;
const TOLERANCE = 0.003;

const LOGO = SLOTS.symbols.find((symbol) => symbol.jackpot).key;
const COMMON = SLOTS.symbols.filter((symbol) => symbol.rarity === "Common").map((symbol) => symbol.key);
const MIDDLE = ["film", "map"];

const clamp = (x, low, high) => Math.min(high, Math.max(low, x));
const sum = (weights, keys) => keys.reduce((total, key) => total + weights[key], 0);

// The weights at `s` on the path, as shares of 1.
function weightsAt(s) {
    const logo = BASE_WEIGHTS[LOGO] * (1 + LOGO_SPAN * clamp(s, -1, 1));
    const weights = {};
    for (const symbol of SLOTS.symbols) {
        weights[symbol.key] = symbol.key === LOGO ? logo : (BASE_WEIGHTS[symbol.key] * (1 - logo)) / (1 - BASE_WEIGHTS[LOGO]);
    }

    const moved = MID_SHIFT * Math.max(0, -1 - s);
    const common = sum(weights, COMMON);
    const middle = sum(weights, MIDDLE);
    for (const key of COMMON) weights[key] -= (moved * weights[key]) / common;
    for (const key of MIDDLE) weights[key] += (moved * weights[key]) / middle;
    return weights;
}

// As whole numbers adding up to exactly WEIGHT_TOTAL (the rounding left
// over goes on the commonest symbol, where it matters least).
function toWhole(weights) {
    const whole = Object.fromEntries(SLOTS.symbols.map((symbol) => [symbol.key, Math.round(weights[symbol.key] * WEIGHT_TOTAL)]));
    const commonest = Object.keys(whole).reduce((a, b) => (whole[a] >= whole[b] ? a : b));
    whole[commonest] += WEIGHT_TOTAL - Object.values(whole).reduce((total, w) => total + w, 0);
    return whole;
}

// The path has to rise all the way and keep the order everywhere.
const LOW = -1.9;
const HIGH = 1;
let previous = -Infinity;
for (let s = LOW; s <= HIGH + 1e-9; s += 0.01) {
    const weights = weightsAt(s);
    const rtp = rtpOf(weights);
    if (rtp <= previous) throw new Error(`The RTP doesn't rise at s = ${s.toFixed(2)}`);
    if (!keepsRarityOrder(weights)) throw new Error(`The order of rarity breaks at s = ${s.toFixed(2)}`);
    previous = rtp;
}
const lowest = rtpOf(weightsAt(LOW));
const highest = rtpOf(weightsAt(HIGH));
console.log(`The path runs from ${(lowest * 100).toFixed(2)}% to ${(highest * 100).toFixed(2)}%.`);

const tables = {};
for (let percent = FROM; percent <= TO; percent++) {
    const target = percent / 100;
    if (target < lowest || target > highest) throw new Error(`${percent}% is off the path`);

    let low = LOW;
    let high = HIGH;
    for (let i = 0; i < 100; i++) {
        const mid = (low + high) / 2;
        if (rtpOf(weightsAt(mid)) < target) low = mid;
        else high = mid;
    }

    const whole = toWhole(weightsAt((low + high) / 2));
    const rtp = rtpOf(whole);
    if (Math.abs(rtp - target) > TOLERANCE) throw new Error(`${percent}%: came out at ${(rtp * 100).toFixed(3)}%`);
    if (!keepsRarityOrder(whole)) throw new Error(`${percent}%: the order of rarity broke`);
    tables[percent] = whole;
    console.log(`${percent}%  ->  ${(rtp * 100).toFixed(4)}%  ${JSON.stringify(whole)}`);
}

const file = path.join(__dirname, "..", "games", "slots", "tables.json");
fs.writeFileSync(file, `${JSON.stringify(tables, null, 2)}\n`);
console.log(`Saved ${Object.keys(tables).length} tables to ${path.relative(process.cwd(), file)}.`);
