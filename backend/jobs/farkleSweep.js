const cron = require("node-cron");
const { sweepMatches } = require("../utils/farkle");

// Every 10 minutes: ends Farkle games quiet for three days, pays winners
// whose payout failed, and refunds games that never got going (see
// utils/farkle.js sweepMatches). Opening a game ends it on the spot too if
// its time is up, so the 10 minutes only matter for games nobody opens.
let task = null;

async function runSweep() {
    try {
        const { forfeited, paid, refunded } = await sweepMatches();
        if (forfeited || paid || refunded) {
            console.log(`Farkle sweep: ${forfeited} forfeited, ${paid} paid out, ${refunded} refunded.`);
        }
    } catch (error) {
        console.error("Farkle sweep failed:", error.message);
    }
}

// Call once, after the database is connected. Also sweeps straight away,
// for anything that came due while the server was down.
function startFarkleSweep() {
    if (task) return;

    task = cron.schedule("*/10 * * * *", runSweep, { name: "farkle-sweep", noOverlap: true });
    runSweep();
}

module.exports = { startFarkleSweep, runSweep };
