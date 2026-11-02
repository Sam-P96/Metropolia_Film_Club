// The Slot Machine's exact RTP: for the base weights and every saved table,
// or for a table of your own.
//   node scripts/slots-rtp.js                 base and every table
//   node scripts/slots-rtp.js '{"ticket":25,...}'   any weights (shared by their total)
//   node scripts/slots-rtp.js --simulate 1000000    also simulate the base
//                                                    table's hit rate and feel
// The RTP is always worked out exactly (games/slots/rtp.js). Simulation is
// only for the hit rate and how wins feel: the jackpot is far too rare for
// it to measure the RTP.
const crypto = require("crypto");
const { SLOTS } = require("../../shared/slots/config.js");
const { BASE_WEIGHTS, WEIGHT_TOTAL, keepsRarityOrder } = require("../games/slots/weights");
const { TABLES } = require("../games/slots/luck");
const { rtpOf, jackpotShare } = require("../games/slots/rtp");
const { drawGrid, evaluate } = require("../games/slots/engine");

const percent = (x) => `${(x * 100).toFixed(3)}%`;

function report(label, weights) {
    console.log(
        `${label.padEnd(8)} RTP ${percent(rtpOf(weights)).padStart(9)}   jackpot share ${percent(jackpotShare(weights)).padStart(8)}   rarity order ${keepsRarityOrder(weights) ? "kept" : "BROKEN"}`
    );
}

const args = process.argv.slice(2);
const simulateAt = args.indexOf("--simulate");
const spins = simulateAt >= 0 ? Number(args[simulateAt + 1]) || 1_000_000 : 0;
const custom = args.find((arg, i) => arg.startsWith("{") && i !== simulateAt + 1);

if (custom) {
    report("custom", JSON.parse(custom));
} else {
    report("base", BASE_WEIGHTS);
    for (const [bucket, weights] of Object.entries(TABLES)) report(`${bucket}%`, weights);
}

if (spins > 0) {
    // The base table as whole numbers, to draw from.
    const whole = Object.fromEntries(SLOTS.symbols.map((symbol) => [symbol.key, Math.round(BASE_WEIGHTS[symbol.key] * WEIGHT_TOTAL)]));
    let hits = 0;
    let big = 0;
    let paid = 0;
    let jackpots = 0;
    const bet = 100;
    for (let i = 0; i < spins; i++) {
        const result = evaluate(drawGrid(whole, crypto.randomInt), bet);
        if (result.win > 0) hits += 1;
        if (result.multiplier >= SLOTS.bigWinMultiple) big += 1;
        if (result.jackpot) jackpots += 1;
        paid += result.win;
    }
    console.log(`\nSimulated ${spins.toLocaleString("en-US")} spins at the base weights:`);
    console.log(`  a win on 1 spin in ${(spins / hits).toFixed(2)}, a big win (${SLOTS.bigWinMultiple}x+) on 1 in ${big ? Math.round(spins / big).toLocaleString("en-US") : "-"}`);
    console.log(`  paid back ${percent(paid / (spins * bet))} (jackpots: ${jackpots}; the exact RTP above counts them properly)`);
}
