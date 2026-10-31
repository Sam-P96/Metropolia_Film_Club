// Plays a million Box Office Scratch cards with the real game logic
// (games/scratch/engine.js and the numbers in shared/scratch/config.js),
// scratching tiles in a random order, and prints how often each tier came
// up, how often the Golden Ticket was found, and the return to player, next
// to the exact odds. Nothing touches the database.
//
// From backend/:  npm run simulate:scratch
//            or:  node scripts/simulate-scratch.js 200000   (fewer cards)
const crypto = require("crypto");
const { SCRATCH } = require("../../shared/scratch/config.js");
const { scratchOdds } = require("../../shared/scratch/odds.js");
const { GOLDEN, TILE_COUNT, newLayout, scratchTile, tierByKey } = require("../games/scratch/engine");

const CARDS = Number(process.argv[2]) || 1_000_000;

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

const started = Date.now();
const counts = Object.fromEntries(SCRATCH.tiers.map((tier) => [tier.key, 0]));
let losses = 0;
let goldenCards = 0;
let goldenHits = 0;
let paidOut = 0;
let jackpotPaid = 0;
let pool = SCRATCH.jackpotSeed;

for (let i = 0; i < CARDS; i++) {
    // Buying the ticket adds to the pool before it's scratched.
    pool += SCRATCH.jackpotContribution;

    const { tier, golden, hadGolden } = playCard(crypto.randomInt);
    if (hadGolden) goldenCards += 1;

    if (tier) {
        counts[tier] += 1;
        const won = tierByKey(tier);
        paidOut += won.refund ? SCRATCH.ticketPrice : won.ppp;
    } else {
        losses += 1;
    }

    if (golden) {
        goldenHits += 1;
        jackpotPaid += pool;
        pool = SCRATCH.jackpotSeed;
    }
}

const expected = scratchOdds();
const spent = CARDS * SCRATCH.ticketPrice;

console.log(`Box Office Scratch: ${CARDS.toLocaleString("en-US")} cards in ${((Date.now() - started) / 1000).toFixed(1)} s\n`);
console.log("Tier                 Cards       Actual   Expected");
for (const tier of expected.tiers) {
    console.log(
        `${tier.name.padEnd(20)} ${String(counts[tier.key]).padStart(8)}   ${percent(counts[tier.key] / CARDS).padStart(7)}   ${percent(tier.chance).padStart(7)}`
    );
}
console.log(`${SCRATCH.loss.name.padEnd(20)} ${String(losses).padStart(8)}   ${percent(losses / CARDS).padStart(7)}   ${percent(expected.loss).padStart(7)}`);

console.log(`\nCards with a Golden Ticket   1 in ${(CARDS / goldenCards).toFixed(1)}  (expected 1 in ${SCRATCH.goldenTicketOneIn})`);
console.log(`Golden Ticket found          1 in ${(CARDS / goldenHits).toFixed(1)}  (expected 1 in ${expected.goldenOneIn.toFixed(1)}), ${goldenHits} jackpots`);
console.log(`Average jackpot              ${(jackpotPaid / goldenHits).toFixed(1)} P-PP`);

console.log(`\nSpent on tickets             ${spent.toLocaleString("en-US")}`);
console.log(`Paid back, tiers             ${paidOut.toLocaleString("en-US")}  (${percent(paidOut / spent)})`);
console.log(`Paid back, jackpots          ${jackpotPaid.toLocaleString("en-US")}  (${percent(jackpotPaid / spent)})`);
console.log(`Return to player             ${percent((paidOut + jackpotPaid) / spent)}  (expected ${percent(expected.rtp)})`);
