const crypto = require("crypto");
const { SLOTS, SYMBOL_BY_KEY } = require("../../../shared/slots/config.js");

// The Slot Machine as plain functions, with no database: drawing a grid
// from a weight table, and what it pays. The server (utils/slots.js), the
// RTP script and the tests all use these, so they agree.
//
// Money: the machine keeps PP in hundredths (cents), as whole numbers, so
// sums never pick up floating-point dust. A bet is whole PP, or everything
// in the machine (MAX), which can have cents. Wins are the paytable exactly,
// to the cent: only 2.5x of a bet with an odd number of cents has a half
// cent, and that half is dropped.

const CENTS = 100;

const toCents = (pp) => Math.round(pp * CENTS);
const toPp = (cents) => cents / CENTS;

// A spin or a machine change that isn't allowed. The routes send `message`
// back with `status`.
class SlotError extends Error {
    constructor(message, status = 400) {
        super(message);
        this.status = status;
    }
}

// A weight table ({ ticket: 250000, ... }, whole numbers) as what drawing
// needs: the symbols in config order with running totals.
function drawTable(weights) {
    let total = 0;
    const steps = SLOTS.symbols.map((symbol) => {
        const weight = weights[symbol.key];
        if (!Number.isInteger(weight) || weight <= 0) throw new Error(`Bad slot weight for ${symbol.key}: ${weight}`);
        total += weight;
        return { key: symbol.key, upTo: total };
    });
    return { steps, total };
}

// One symbol, drawn by weight. `randomInt(max)` gives a whole number from 0
// to max - 1: crypto.randomInt, which can't be predicted, unless a test
// passes its own.
function drawSymbol(table, randomInt) {
    const roll = randomInt(table.total);
    return table.steps.find((step) => roll < step.upTo).key;
}

// A whole grid: grid[reel][row], every cell drawn on its own.
function drawGrid(weights, randomInt = crypto.randomInt) {
    const table = drawTable(weights);
    return Array.from({ length: SLOTS.reels }, () =>
        Array.from({ length: SLOTS.rows }, () => drawSymbol(table, randomInt))
    );
}

// What `symbolKey` pays for `count` in a row, as a multiple of the bet
// (0 for fewer than 3).
function multiplierFor(symbolKey, count) {
    if (count < 3) return 0;
    const symbol = SYMBOL_BY_KEY[symbolKey];
    if (count === SLOTS.reels && symbol.jackpot) return SLOTS.jackpotMultiplier;
    return symbol.pays[count - 3];
}

// What `grid` pays on a bet of `betCents`: each winning line ({ line, symbol,
// count, multiplier, cells: [[reel, row], ...] }), the total win in cents,
// and whether any line hit the jackpot.
function evaluate(grid, betCents) {
    const lines = [];

    SLOTS.paylines.forEach((payline, line) => {
        const symbol = grid[0][payline.rows[0]];
        let count = 1;
        while (count < SLOTS.reels && grid[count][payline.rows[count]] === symbol) count += 1;

        const multiplier = multiplierFor(symbol, count);
        if (multiplier > 0) {
            lines.push({
                line,
                symbol,
                count,
                multiplier,
                cells: payline.rows.slice(0, count).map((row, reel) => [reel, row]),
            });
        }
    });

    const multiplier = lines.reduce((sum, win) => sum + win.multiplier, 0);
    return {
        lines,
        multiplier,
        win: Math.floor(multiplier * betCents),
        jackpot: lines.some((win) => win.multiplier === SLOTS.jackpotMultiplier),
    };
}

// Takes `betCents` from a machine holding { pp, ppp } (cents): its PP first,
// then P-PP for the rest. Returns what comes from each.
function splitBet(machine, betCents) {
    const fromPp = Math.min(machine.pp, betCents);
    return { pp: fromPp, ppp: betCents - fromPp };
}

// Checks a bet against what's in the machine (`balanceCents`). A bet is
// whole PP from minBet up, or exactly everything in the machine (MAX, cents
// and all). Returns the bet in cents.
function checkBet(bet, balanceCents) {
    if (typeof bet !== "number" || !Number.isFinite(bet) || bet <= 0) {
        throw new SlotError("Pick a bet above 0.");
    }

    const betCents = toCents(bet);
    if (Math.abs(betCents - bet * CENTS) > 1e-6) {
        throw new SlotError("Bets go to the cent at most.");
    }
    if (betCents > balanceCents) {
        throw new SlotError(balanceCents === 0 ? "Add credits first." : "That's more than the machine holds. Lower your bet.");
    }

    const allIn = betCents === balanceCents;
    if (!allIn && (betCents % CENTS !== 0 || betCents < SLOTS.minBet * CENTS)) {
        throw new SlotError(`Bets are whole PP, from ${SLOTS.minBet}, or everything in the machine with MAX.`);
    }

    return betCents;
}

module.exports = {
    CENTS,
    toCents,
    toPp,
    SlotError,
    drawTable,
    drawGrid,
    multiplierFor,
    evaluate,
    splitBet,
    checkBet,
};
