const crypto = require("crypto");
const { SLOTS, SYMBOL_BY_KEY } = require("../../../shared/slots/config.js");

// The Slot Machine as plain functions, with no database: drawing a grid
// from a weight table, and what it pays. The server (utils/slots.js), the
// RTP script and the tests all use these, so they agree.
//
// Money: the machine keeps PP in hundredths (cents), as whole numbers, so
// sums never pick up floating-point dust. A bet is whole PP, or everything
// in the machine (MAX), which can have cents. Pays are added up in
// hundredths of a multiple too (1.2x is 120), so a win is the paytable
// exactly, to the cent: only a fraction of a cent from a pay like 1.3x on
// a bet with cents is dropped.

const CENTS = 100;
// Multiples of the bet are added up in hundredths: every pay has at most
// two decimals.
const PAY_SCALE = 100;

const toCents = (pp) => Math.round(pp * CENTS);
const toPp = (cents) => cents / CENTS;

const GAUNTLET = SLOTS.link.by;
const [MAP, RING] = SLOTS.link.links;
const LINKED = new Set([GAUNTLET, ...SLOTS.link.links]);
const INFINITY = "INFINITY";
const CRITICAL_HIT = "CRITICAL HIT!";

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

// The coin for a mixed link line: "map" or "ring", 50:50, from
// crypto.randomInt unless a test passes its own.
const fairFlip = () => (crypto.randomInt(2) === 0 ? MAP : RING);

// What one line pays: the symbols along it, left to right, read the best
// way they can be, or null if nothing pays. Two readings, both from the
// leftmost reel:
//   The same symbol 3, 4 or 5 in a row. 3+ Gauntlets on their own are
//   INFINITY (lightning).
//   The Gauntlet link: a run of only Maps, Rings and Gauntlets, 3 or more
//   long, with at least one Gauntlet and at least one Map or Ring. Only
//   Maps beside the Gauntlets: it pays as Maps of that length (fireworks).
//   Only Rings: as Rings (lightning). Both: `flip()` decides, "map" (as
//   Maps, fireworks) or "ring" (as Rings, lightning and a CRITICAL HIT!).
// The link never takes in the logo or a Common or Uncommon symbol, so the
// jackpot is still only 5 logos. The higher reading pays (the first, on a
// tie), and the effect and text are that reading's. Returns { symbol,
// count, multiplier, effect, text, jackpot }: `symbol` is what it paid as.
function readLine(symbols, flip = fairFlip) {
    const first = symbols[0];
    let same = 1;
    while (same < symbols.length && symbols[same] === first) same += 1;

    let best = null;
    const plain = multiplierFor(first, same);
    if (plain > 0) {
        const infinity = first === GAUNTLET;
        best = {
            symbol: first,
            count: same,
            multiplier: plain,
            effect: infinity ? "lightning" : null,
            text: infinity ? INFINITY : null,
            jackpot: same === SLOTS.reels && Boolean(SYMBOL_BY_KEY[first].jackpot),
        };
    }

    let run = 0;
    while (run < symbols.length && LINKED.has(symbols[run])) run += 1;
    if (run >= 3) {
        const linked = symbols.slice(0, run);
        const hasMap = linked.includes(MAP);
        const hasRing = linked.includes(RING);
        if (linked.includes(GAUNTLET) && (hasMap || hasRing)) {
            const as = hasMap && hasRing ? flip() : hasMap ? MAP : RING;
            const link = {
                symbol: as,
                count: run,
                multiplier: multiplierFor(as, run),
                effect: as === MAP ? "fireworks" : "lightning",
                text: hasMap && hasRing && as === RING ? CRITICAL_HIT : null,
                jackpot: false,
            };
            if (!best || link.multiplier > best.multiplier) best = link;
        }
    }

    return best;
}

// What `grid` pays on a bet of `betCents`, flipping a coin of its own for
// each mixed link line (`flip`): each winning line ({ line, symbol, count,
// multiplier, cells: [[reel, row], ...], effect, text, gauntlets: the
// Gauntlet cells among them }), the total multiple of the bet, the total
// win in cents, and whether any line hit the jackpot.
function evaluate(grid, betCents, flip = fairFlip) {
    const lines = [];

    SLOTS.paylines.forEach((payline, line) => {
        const symbols = payline.rows.map((row, reel) => grid[reel][row]);
        const reading = readLine(symbols, flip);
        if (!reading) return;

        const cells = payline.rows.slice(0, reading.count).map((row, reel) => [reel, row]);
        lines.push({
            line,
            symbol: reading.symbol,
            count: reading.count,
            multiplier: reading.multiplier,
            cells,
            effect: reading.effect,
            text: reading.text,
            gauntlets: cells.filter(([reel, row]) => grid[reel][row] === GAUNTLET),
            jackpot: reading.jackpot,
        });
    });

    const scaled = lines.reduce((sum, won) => sum + Math.round(won.multiplier * PAY_SCALE), 0);
    return {
        lines: lines.map(({ jackpot, ...won }) => won),
        multiplier: scaled / PAY_SCALE,
        win: Math.floor((scaled * betCents) / PAY_SCALE),
        jackpot: lines.some((won) => won.jackpot),
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
    PAY_SCALE,
    INFINITY,
    CRITICAL_HIT,
    toCents,
    toPp,
    SlotError,
    drawTable,
    drawGrid,
    multiplierFor,
    fairFlip,
    readLine,
    evaluate,
    splitBet,
    checkBet,
};
