// Plays Crash rounds with the real engine (games/crash/engine.js) and
// prints what they come to. Every return should be about 0.99 (within
// sampling noise): the multiplier is a fair random walk from 0.99, so no
// way of cashing out does better or worse on average.
//
//   npm run sim:crash                (200,000 rounds)
//   node scripts/simulate-crash.js 1000000
//
// Returns here are for exact multipliers (bet x multiplier, unrounded).
// Real payouts are whole points rounded down, which costs small bets more:
// those are shown too, for a few bet sizes, at a 2x target.
const { CRASH, CrashRound, secureRandom } = require("../games/crash/engine");

const ROUNDS = Number(process.argv[2]) || 200000;
const TARGETS = [1.2, 1.5, 2, 3, 5, 10, 25];
const REACH = [2, 5, 10, 25];
const DIP = 0.8;
const BETS = [1, 2, 5, 10, 50];

const random = secureRandom();
let ticks = 0;
const reached = new Map(REACH.map((x) => [x, 0]));
let dipped = 0;
const ends = { crash: 0, cap: 0, time: 0 };
const returns = new Map(TARGETS.map((t) => [t, 0]));
let rideOut = 0;
const rounded = new Map(BETS.map((bet) => [bet, 0]));

const started = Date.now();
for (let i = 0; i < ROUNDS; i++) {
    const round = new CrashRound(random);
    let peak = round.multiplier;
    let low = round.multiplier;
    const paid = new Map();

    while (!round.ended) {
        const { multiplier, ended } = round.step();
        if (ended !== "crash") {
            peak = Math.max(peak, multiplier);
            low = Math.min(low, multiplier);
            // Auto-cash-out: the first tick at or above the target, paid at
            // that tick's multiplier.
            for (const target of TARGETS) if (!paid.has(target) && multiplier >= target) paid.set(target, multiplier);
        }
    }

    ticks += round.tick;
    ends[round.ended] += 1;
    for (const x of REACH) if (peak >= x) reached.set(x, reached.get(x) + 1);
    if (low < DIP) dipped += 1;

    // A target never met: the round ended first. At the cap or the time
    // limit everyone still in is cashed out at the multiplier; a crash pays 0.
    const atEnd = round.ended === "crash" ? 0 : round.multiplier;
    for (const target of TARGETS) returns.set(target, returns.get(target) + (paid.get(target) ?? atEnd));
    rideOut += atEnd;
    const atTwo = paid.get(2) ?? atEnd;
    for (const bet of BETS) rounded.set(bet, rounded.get(bet) + Math.floor(bet * atTwo + 1e-9) / bet);
}

const pct = (n) => `${((n / ROUNDS) * 100).toFixed(2)}%`;
const avg = (sum) => (sum / ROUNDS).toFixed(4);

console.log(`Crash: ${ROUNDS.toLocaleString("en-US")} rounds in ${((Date.now() - started) / 1000).toFixed(1)} s`);
console.log(`  h ${CRASH.crashChance}, s ${CRASH.swing}, d ${CRASH.drift.toFixed(6)}, start ${CRASH.start}x, cap ${CRASH.cap}x, ${CRASH.maxTicks} ticks of ${CRASH.tickMs} ms`);
console.log("");
console.log(`Average round:      ${((ticks / ROUNDS) * CRASH.tickMs / 1000).toFixed(2)} s (${(ticks / ROUNDS).toFixed(1)} ticks)`);
console.log(`Ended by:           crash ${pct(ends.crash)} · 25x cap ${pct(ends.cap)} · 60 s limit ${pct(ends.time)}`);
for (const x of REACH) console.log(`Reached ${String(x).padEnd(3)}x:       ${pct(reached.get(x))}`);
console.log(`Dipped below ${DIP}x: ${pct(dipped)}`);
console.log("");
console.log("Average return per 1 bet (exact multipliers):");
for (const target of TARGETS) console.log(`  auto-cash-out ${String(target).padEnd(4)}x  ${avg(returns.get(target))}`);
console.log(`  never cash out     ${avg(rideOut)}`);
console.log("");
console.log("At a 2x target with real payouts (whole points, rounded down):");
for (const bet of BETS) console.log(`  bet ${String(bet).padEnd(3)}  ${avg(rounded.get(bet))}`);
