const cron = require("node-cron");
const { jackpotView, sweepScratchCards } = require("../utils/scratch");

// Every 10 minutes: pays Box Office Scratch wins and jackpots that a failure
// left unpaid, and refunds tickets stuck half-bought (utils/scratch.js
// sweepScratchCards). Opening the game pays what's owed on the spot too, so
// this is only for cards nobody comes back to.
let task = null;

async function runSweep() {
    try {
        const { paid, refunded } = await sweepScratchCards();
        if (paid || refunded) console.log(`Scratch sweep: ${paid} paid out, ${refunded} refunded.`);
    } catch (error) {
        console.error("Scratch sweep failed:", error.message);
    }
}

// Call once, after the database is connected. Makes sure the jackpot pool
// exists (at the seed), and sweeps straight away.
function startScratchSweep() {
    if (task) return;

    task = cron.schedule("*/10 * * * *", runSweep, { name: "scratch-sweep", noOverlap: true });
    jackpotView().catch((error) => console.error("Couldn't set up the jackpot:", error.message));
    runSweep();
}

module.exports = { startScratchSweep, runSweep };
