// Plays a million Box Office Scratch cards of each ticket type with the real
// game logic (games/scratch/engine.js and the numbers in
// shared/scratch/config.js), scratching tiles in a random order, and prints
// how often each tier came up, how often the Golden Ticket was found, and
// the return to player, next to the exact odds (shared/scratch/odds.js).
// Each type has its own jackpot pool, as in the game. Nothing touches the
// database.
//
// From backend/:  npm run simulate:scratch                     (every type)
//            or:  node scripts/simulate-scratch.js vip          (one type)
//            or:  node scripts/simulate-scratch.js premium 200000
//            or:  node scripts/simulate-scratch.js 200000       (every type, fewer cards)
const crypto = require("crypto");
const { SCRATCH } = require("../../shared/scratch/config.js");
const { scratchOdds } = require("../../shared/scratch/odds.js");
const { TICKET_TYPES, isTicketType, ticketType } = require("../../shared/scratch/tickets.js");
const { GOLDEN, TILE_COUNT, newLayout, scratchTile, tierByKey } = require("../games/scratch/engine");

const args = process.argv.slice(2);
const typeArg = args.find((arg) => !/^\d+$/.test(arg));
const CARDS = Number(args.find((arg) => /^\d+$/.test(arg))) || 1_000_000;

if (typeArg && typeArg !== "all" && !isTicketType(typeArg)) {
    console.error(`No ticket type "${typeArg}". Pick one of: ${TICKET_TYPES.join(", ")}, or "all".`);
    process.exit(1);
}
const TYPES = !typeArg || typeArg === "all" ? TICKET_TYPES : [typeArg];

// One card, all its scratches used, tiles picked in a random order.
function playCard(randomInt) {
    const card = { layout: newLayout(randomInt), scratched: [], starsFound: 0, tier: null };
    const order = [...Array(TILE_COUNT).keys()];
    let golden = false;

    for (let i = 0; i < SCRATCH.scratches; i++) {
        const j = i + randomInt(TILE_COUNT - i);
        [order[i], order[j]] = [order[j], order[i]];

        const result = scratchTile(card, order[i]);
        card.scratched.push(order[i]);
        card.starsFound = result.starsFound;
        if (result.tier) card.tier = result.tier;
        if (result.golden) golden = true;
    }

    return { tier: card.tier, golden, hadGolden: card.layout.includes(GOLDEN) };
}

const percent = (n) => `${(n * 100).toFixed(2)}%`;

// Plays CARDS cards of `key`, prints how it went, and returns the measured
// and expected return to player, with the margin the measurement could be
// off by from chance alone (two standard errors, about 95% sure).
function simulate(key) {
    const type = ticketType(key);
    const started = Date.now();
    const counts = Object.fromEntries(SCRATCH.tiers.map((tier) => [tier.key, 0]));
    let losses = 0;
    let goldenCards = 0;
    let goldenHits = 0;
    let paidOut = 0;
    let jackpotPaid = 0;
    let pool = type.jackpotSeed;
    // Each card's return, as a share of its price, for the margin.
    let sumSquares = 0;

    for (let i = 0; i < CARDS; i++) {
        // Buying the ticket adds to its type's pool before it's scratched.
        pool += type.jackpotContribution;

        const { tier, golden, hadGolden } = playCard(crypto.randomInt);
        if (hadGolden) goldenCards += 1;

        let back = 0;
        if (tier) {
            counts[tier] += 1;
            const won = tierByKey(tier, key);
            back += won.refund ? type.price : won.ppp;
        } else {
            losses += 1;
        }
        paidOut += back;

        if (golden) {
            goldenHits += 1;
            jackpotPaid += pool;
            back += pool;
            pool = type.jackpotSeed;
        }
        sumSquares += (back / type.price) ** 2;
    }

    const expected = scratchOdds(key);
    const spent = CARDS * type.price;
    const rtp = (paidOut + jackpotPaid) / spent;
    const margin = 2 * Math.sqrt((sumSquares / CARDS - rtp ** 2) / CARDS);

    console.log(`\n=== ${type.name}: ${type.price} points a ticket ===`);
    console.log(`${CARDS.toLocaleString("en-US")} cards in ${((Date.now() - started) / 1000).toFixed(1)} s\n`);
    console.log("Tier                 Cards       Actual   Expected   Pays");
    for (const tier of expected.tiers) {
        console.log(
            `${tier.name.padEnd(20)} ${String(counts[tier.key]).padStart(8)}   ${percent(counts[tier.key] / CARDS).padStart(7)}   ${percent(tier.chance).padStart(7)}    ${
                tier.refund ? "price back" : `${tier.ppp} P-PP`
            }`
        );
    }
    console.log(`${SCRATCH.loss.name.padEnd(20)} ${String(losses).padStart(8)}   ${percent(losses / CARDS).padStart(7)}   ${percent(expected.loss).padStart(7)}`);

    console.log(`\nCards with a Golden Ticket   1 in ${(CARDS / goldenCards).toFixed(1)}  (expected 1 in ${SCRATCH.goldenTicketOneIn})`);
    console.log(`Golden Ticket found          1 in ${(CARDS / goldenHits).toFixed(1)}  (expected 1 in ${expected.goldenOneIn.toFixed(1)}), ${goldenHits} jackpots`);
    console.log(`Average jackpot              ${(jackpotPaid / goldenHits).toFixed(1)} P-PP  (seed ${type.jackpotSeed}, +${type.jackpotContribution} a ticket)`);

    console.log(`\nSpent on tickets             ${spent.toLocaleString("en-US")}`);
    console.log(`Paid back, tiers             ${paidOut.toLocaleString("en-US")}  (${percent(paidOut / spent)})`);
    console.log(`Paid back, jackpots          ${jackpotPaid.toLocaleString("en-US")}  (${percent(jackpotPaid / spent)})`);
    console.log(`Return to player             ${percent(rtp)} ± ${percent(margin)}  (expected ${percent(expected.rtp)})`);

    return { name: type.name, rtp, margin, expected: expected.rtp };
}

console.log(`Box Office Scratch: ${CARDS.toLocaleString("en-US")} cards of each type`);
const results = TYPES.map(simulate);

if (results.length > 1) {
    console.log("\n=== Return to player ===");
    console.log("Type        Measured             Expected   Within the margin");
    for (const { name, rtp, margin, expected } of results) {
        const within = Math.abs(rtp - expected) <= margin;
        console.log(`${name.padEnd(10)}  ${`${percent(rtp)} ± ${percent(margin)}`.padEnd(19)}  ${percent(expected).padStart(7)}    ${within ? "yes" : "NO"}`);
    }
}
