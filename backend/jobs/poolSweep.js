const cron = require("node-cron");
const { sweepMatches } = require("../utils/pool");

// Every 10 minutes: ends 8 Ball Pool games quiet for three days, expires
// challenges nobody answered, pays out games whose payout failed, refunds
// games that never got going, and settles any bets left on finished games
// (utils/pool.js sweepMatches). Opening a game ends it on the spot too if
// its time is up, so the 10 minutes only matter for games nobody opens.
let task = null;

async function runSweep() {
    try {
        const { forfeited, expired, paid, refunded, bets } = await sweepMatches();
        if (forfeited || expired || paid || refunded || bets) {
            console.log(`Pool sweep: ${forfeited} forfeited, ${expired} expired, ${paid} paid out, ${refunded} refunded, ${bets} games' bets settled.`);
        }
    } catch (error) {
        console.error("Pool sweep failed:", error.message);
    }
}

// Call once, after the database is connected.
function startPoolSweep() {
    if (task) return;
    task = cron.schedule("*/10 * * * *", runSweep, { name: "pool-sweep", noOverlap: true });
    runSweep();
}

module.exports = { startPoolSweep, runSweep };
