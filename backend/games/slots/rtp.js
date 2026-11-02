const { SLOTS } = require("../../../shared/slots/config.js");
const { multiplierFor } = require("./engine");

// The exact return to player (RTP) of a weight table: what a spin pays back
// on average, as a share of the bet (1.01 is 101%). Worked out, not
// simulated: the jackpot is far too rare for a simulation to settle.
//
// Every cell is drawn on its own, so on one line, for a symbol drawn with
// chance q, the chance of exactly n in a row from the left is
// q^n * (1 - q) for n = 3 and 4, and q^5 for all five. A line's average pay
// is the sum of chance x pay over every symbol and length, and the RTP is
// that times the number of lines: averages add up across lines even though
// the lines share cells.

// `weights`: { ticket: ..., ... }, any positive numbers (they're shared out
// by their total).
function lineEv(weights) {
    const total = SLOTS.symbols.reduce((sum, symbol) => sum + weights[symbol.key], 0);
    let ev = 0;

    for (const symbol of SLOTS.symbols) {
        const q = weights[symbol.key] / total;
        for (let n = 3; n < SLOTS.reels; n++) ev += q ** n * (1 - q) * multiplierFor(symbol.key, n);
        ev += q ** SLOTS.reels * multiplierFor(symbol.key, SLOTS.reels);
    }

    return ev;
}

function rtpOf(weights) {
    return SLOTS.paylines.length * lineEv(weights);
}

// How much of the RTP comes from the jackpot alone.
function jackpotShare(weights) {
    const total = SLOTS.symbols.reduce((sum, symbol) => sum + weights[symbol.key], 0);
    const jackpot = SLOTS.symbols.find((symbol) => symbol.jackpot);
    return SLOTS.paylines.length * (weights[jackpot.key] / total) ** SLOTS.reels * SLOTS.jackpotMultiplier;
}

module.exports = { lineEv, rtpOf, jackpotShare };
