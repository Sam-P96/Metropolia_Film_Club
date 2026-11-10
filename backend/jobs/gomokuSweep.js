const cron = require("node-cron");
const { sweepMatches } = require("../utils/gomoku");

// Every 10 minutes: ends Infinite Gomoku games quiet for three days,
// expires challenges nobody answered, pays out games whose payout failed,
// and refunds games that never got going (see utils/gomoku.js
// sweepMatches). Opening a game ends it on the spot too if its time is up,
// so the 10 minutes only matter for games nobody opens.
let task = null;

async function runSweep() {
    try {
        const { forfeited, expired, paid, refunded } = await sweepMatches();
        if (forfeited || expired || paid || refunded) {
            console.log(`Gomoku sweep: ${forfeited} forfeited, ${expired} expired, ${paid} paid out, ${refunded} refunded.`);
        }
    } catch (error) {
        console.error("Gomoku sweep failed:", error.message);
    }
}

// Call once, after the database is connected. Also sweeps straight away,
// for anything that came due while the server was down.
function startGomokuSweep() {
    if (task) return;
    task = cron.schedule("*/10 * * * *", runSweep, { name: "gomoku-sweep", noOverlap: true });
    runSweep();
}

module.exports = { startGomokuSweep, runSweep };
