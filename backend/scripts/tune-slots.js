// Makes the Slot Machine's weight tables (games/slots/tables.json): one for
// every whole-percent RTP from FROM to TO, each tuned with the exact RTP
// (games/slots/rtp.js). Run it again after changing the paytable or the
// base weights:
//   node scripts/tune-slots.js
//
// Payouts stay as the paytable says; only how often symbols land changes,
// along one path from the base weights (games/slots/weights.js), steered by
// one number, `r`: the Map, Ring, Gauntlet and logo land r times as often
// as in the base table, and the Ticket, Popcorn and Clapperboard share
// what's left in their base proportions. With only three lower symbols,
// the RTP along r first dips (to about 92.8% at r = 0.816) and only rises
// after that, so the path starts past the dip; from there it rises steadily
// with r, so each target is found by halving. Every table keeps the base
// table's order of rarity, which is checked here and in
// tests/slots.test.js.
const fs = require("fs");
const path = require("path");
const { SLOTS } = require("../../shared/slots/config.js");
const { BASE_WEIGHTS, WEIGHT_TOTAL, keepsRarityOrder } = require("../games/slots/weights");
const { rtpOf } = require("../games/slots/rtp");

// The path: r from LOW to HIGH, about 93% to 110%. FROM to TO is every
// whole percent on it, covering all the RTPs games/slots/luck.js uses.
const LOW = 0.83;
const HIGH = 1.085;
const FROM = 93;
const TO = 110;
const TOLERANCE = 0.003;

const HIGHER = ["map", "ring", "gauntlet", "logo"];
const LOWER = SLOTS.symbols.map((symbol) => symbol.key).filter((key) => !HIGHER.includes(key));
const sum = (weights, keys) => keys.reduce((total, key) => total + weights[key], 0);

// The weights at `r` on the path, as shares of 1.
function weightsAt(r) {
    const higher = sum(BASE_WEIGHTS, HIGHER);
    const lower = sum(BASE_WEIGHTS, LOWER);
    const weights = {};
    for (const key of HIGHER) weights[key] = BASE_WEIGHTS[key] * r;
    for (const key of LOWER) weights[key] = (BASE_WEIGHTS[key] * (1 - higher * r)) / lower;
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
let previous = -Infinity;
for (let r = LOW; r <= HIGH + 1e-9; r += 0.002) {
    const weights = weightsAt(r);
    const rtp = rtpOf(weights);
    if (rtp <= previous) throw new Error(`The RTP doesn't rise at r = ${r.toFixed(3)}`);
    if (!keepsRarityOrder(weights)) throw new Error(`The order of rarity breaks at r = ${r.toFixed(3)}`);
    previous = rtp;
}
const lowest = rtpOf(weightsAt(LOW));
const highest = rtpOf(weightsAt(HIGH));
console.log(`The path runs from ${(lowest * 100).toFixed(2)}% (r = ${LOW}) to ${(highest * 100).toFixed(2)}% (r = ${HIGH}).`);

const tables = {};
for (let percent = FROM; percent <= TO; percent++) {
    const target = percent / 100;
    if (target < lowest || target > highest) throw new Error(`${percent}% is off the path`);

    let low = LOW;
    let high = HIGH;
    for (let i = 0; i < 60; i++) {
        const mid = (low + high) / 2;
        if (rtpOf(weightsAt(mid)) < target) low = mid;
        else high = mid;
    }

    const r = (low + high) / 2;
    const whole = toWhole(weightsAt(r));
    const rtp = rtpOf(whole);
    if (Math.abs(rtp - target) > TOLERANCE) throw new Error(`${percent}%: came out at ${(rtp * 100).toFixed(3)}%`);
    if (!keepsRarityOrder(whole)) throw new Error(`${percent}%: the order of rarity broke`);
    tables[percent] = whole;
    console.log(`${percent}%  ->  ${(rtp * 100).toFixed(4)}%  r = ${r.toFixed(4)}  ${JSON.stringify(whole)}`);
}

const file = path.join(__dirname, "..", "games", "slots", "tables.json");
fs.writeFileSync(file, `${JSON.stringify(tables, null, 2)}\n`);
console.log(`Saved ${Object.keys(tables).length} tables to ${path.relative(process.cwd(), file)}.`);
