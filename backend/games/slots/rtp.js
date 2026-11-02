const { SLOTS } = require("../../../shared/slots/config.js");
const { readLine } = require("./engine");

// The exact return to player (RTP) of a weight table: what a spin pays back
// on average, as a share of the bet (1.01 is 101%). Worked out, not
// simulated: the jackpot is far too rare for a simulation to settle.
//
// Every cell is drawn on its own, so one line is 5 symbols drawn on their
// own: 8^5 = 32,768 possible lines. Each is read exactly as a spin reads it
// (engine.js readLine, Gauntlet link included), and weighted by its chance,
// the product of its symbols' chances. A mixed link line is paid as Maps or
// as Rings on a fair coin, so it counts as the average of the two. The RTP
// is a line's average pay times the number of lines: averages add up
// across lines even though the lines share cells.

const KEYS = SLOTS.symbols.map((symbol) => symbol.key);
const OUTCOMES = KEYS.length ** SLOTS.reels;

// Every line that pays something, read once (what pays doesn't depend on
// the weights): its symbols as indexes into KEYS, its average pay, and how
// much of that is the jackpot.
const PAYING = (() => {
    const paying = [];
    for (let outcome = 0; outcome < OUTCOMES; outcome++) {
        const symbols = [];
        for (let reel = 0, rest = outcome; reel < SLOTS.reels; reel++, rest = Math.floor(rest / KEYS.length)) {
            symbols.push(rest % KEYS.length);
        }
        const keys = symbols.map((index) => KEYS[index]);
        const asMap = readLine(keys, () => SLOTS.link.links[0]);
        const asRing = readLine(keys, () => SLOTS.link.links[1]);
        const pay = ((asMap?.multiplier ?? 0) + (asRing?.multiplier ?? 0)) / 2;
        if (pay > 0) {
            const jackpot = ((asMap?.jackpot ? asMap.multiplier : 0) + (asRing?.jackpot ? asRing.multiplier : 0)) / 2;
            paying.push({ symbols, pay, jackpot, asMap, asRing });
        }
    }
    return paying;
})();

// Each symbol's chance, in KEYS order, from `weights` ({ ticket: ..., ... },
// any positive numbers, shared out by their total).
function chances(weights) {
    const total = KEYS.reduce((sum, key) => sum + weights[key], 0);
    return KEYS.map((key) => weights[key] / total);
}

const chanceOf = (line, q) => line.symbols.reduce((product, index) => product * q[index], 1);

// One line's average pay, as a multiple of the bet.
function lineEv(weights) {
    const q = chances(weights);
    return PAYING.reduce((ev, line) => ev + line.pay * chanceOf(line, q), 0);
}

function rtpOf(weights) {
    return SLOTS.paylines.length * lineEv(weights);
}

// How much of the RTP comes from the jackpot alone.
function jackpotShare(weights) {
    const q = chances(weights);
    return SLOTS.paylines.length * PAYING.reduce((sum, line) => sum + line.jackpot * chanceOf(line, q), 0);
}

// For the RTP script: the chance one line wins at all, and, by the symbol
// it pays as, the chance it wins as that symbol (a mixed link line counts
// half for Maps and half for Rings).
function lineOdds(weights) {
    const q = chances(weights);
    const bySymbol = Object.fromEntries(KEYS.map((key) => [key, 0]));
    let win = 0;
    for (const line of PAYING) {
        const chance = chanceOf(line, q);
        win += chance;
        for (const reading of [line.asMap, line.asRing]) {
            if (reading) bySymbol[reading.symbol] += chance / 2;
        }
    }
    return { win, bySymbol };
}

module.exports = { lineEv, rtpOf, jackpotShare, lineOdds };
