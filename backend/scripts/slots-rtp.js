// The Slot Machine's exact RTP: for the base weights and every saved table,
// or for a table of your own.
//   node scripts/slots-rtp.js                 base and every table
//   node scripts/slots-rtp.js '{"ticket":25,...}'   any weights (shared by their total)
//   node scripts/slots-rtp.js --simulate 2000000    also play that many spins
//                                                    on the base table
// The RTP is always worked out exactly (games/slots/rtp.js), by reading
// every possible line. The simulation plays real spins through the game
// itself (games/slots/engine.js, coin flips included), to compare with the
// exact numbers and to see how often spins win: the jackpot is too rare for
// a simulation to pin the RTP down on its own, so it also prints how far
// off chance alone would leave it.
const crypto = require("crypto");
const { SLOTS } = require("../../shared/slots/config.js");
const { BASE_WEIGHTS, WEIGHT_TOTAL, keepsRarityOrder } = require("../games/slots/weights");
const { TABLES } = require("../games/slots/luck");
const { rtpOf, jackpotShare, lineOdds } = require("../games/slots/rtp");
const { drawGrid, evaluate } = require("../games/slots/engine");

const percent = (x, digits = 3) => `${(x * 100).toFixed(digits)}%`;

function report(label, weights) {
    console.log(
        `${label.padEnd(8)} RTP ${percent(rtpOf(weights)).padStart(9)}   jackpot share ${percent(jackpotShare(weights)).padStart(7)}   rarity order ${keepsRarityOrder(weights) ? "kept" : "BROKEN"}`
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
    const keys = SLOTS.symbols.map((symbol) => symbol.key);
    const bet = 100;
    let hits = 0;
    let big = 0;
    let jackpots = 0;
    let paid = 0;
    let paidSquared = 0;
    let lineWins = 0;
    let smallest = Infinity;
    const spinsWith = Object.fromEntries(keys.map((key) => [key, 0]));
    const linesAs = Object.fromEntries(keys.map((key) => [key, 0]));
    const effects = { fireworks: 0, lightning: 0, "CRITICAL HIT!": 0, INFINITY: 0 };

    for (let i = 0; i < spins; i++) {
        const result = evaluate(drawGrid(whole, crypto.randomInt), bet);
        paid += result.win;
        paidSquared += result.win * result.win;
        if (result.win > 0) {
            hits += 1;
            smallest = Math.min(smallest, result.multiplier);
        }
        if (result.multiplier >= SLOTS.bigWinMultiple) big += 1;
        if (result.jackpot) jackpots += 1;
        lineWins += result.lines.length;
        for (const key of new Set(result.lines.map((won) => won.symbol))) spinsWith[key] += 1;
        for (const won of result.lines) {
            linesAs[won.symbol] += 1;
            if (won.effect) effects[won.effect] += 1;
            if (won.text) effects[won.text] += 1;
        }
    }

    const exact = rtpOf(BASE_WEIGHTS);
    const simulated = paid / (spins * bet);
    const spread = Math.sqrt(paidSquared / spins / (bet * bet) - simulated ** 2) / Math.sqrt(spins);
    const odds = lineOdds(BASE_WEIGHTS);
    const lineCount = spins * SLOTS.paylines.length;

    console.log(`\nSimulated ${spins.toLocaleString("en-US")} spins at the base weights:`);
    console.log(`  RTP: simulated ${percent(simulated)}, exact ${percent(exact)} (chance alone moves the simulation about ±${percent(spread)}; ${jackpots} jackpots)`);
    console.log(`  a line wins: simulated ${percent(lineWins / lineCount)}, exact ${percent(odds.win)}`);
    console.log(`  spins that win: ${percent(hits / spins, 2)} (1 in ${(spins / hits).toFixed(2)}); the smallest win was ${smallest}x the bet`);
    console.log(`  big wins (${SLOTS.bigWinMultiple}x+): 1 in ${big ? Math.round(spins / big).toLocaleString("en-US") : "-"}`);
    console.log("  by the symbol a line paid as:    spins with one    lines (simulated / exact)");
    for (const key of keys) {
        console.log(
            `    ${key.padEnd(9)} ${percent(spinsWith[key] / spins, 2).padStart(26)}    ${percent(linesAs[key] / lineCount, 4)} / ${percent(odds.bySymbol[key], 4)}`
        );
    }
    console.log(
        `  effects, per spin: fireworks ${percent(effects.fireworks / spins, 3)}, lightning ${percent(effects.lightning / spins, 3)}, CRITICAL HIT! ${percent(effects["CRITICAL HIT!"] / spins, 3)}, INFINITY ${percent(effects.INFINITY / spins, 3)}`
    );
}
