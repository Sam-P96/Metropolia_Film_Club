const cron = require("node-cron");
const { sweepForrestRuns } = require("../utils/forrest");

// Every 10 minutes: Forrest Bounce runs nobody came back to finish (a page
// closed mid-run) are let go, and their entries go to the Box Office
// Scratch jackpots (utils/forrest.js sweepForrestRuns). A member's next run
// lets theirs go too, so this is only for runs nobody comes back for.
let task = null;

async function runSweep() {
    try {
        const count = await sweepForrestRuns();
        if (count) console.log(`Forrest sweep: ${count} unfinished run${count === 1 ? "" : "s"} let go.`);
    } catch (error) {
        console.error("Forrest sweep failed:", error.message);
    }
}

// Call once, after the database is connected. Sweeps straight away too.
function startForrestSweep() {
    if (task) return;

    task = cron.schedule("*/10 * * * *", runSweep, { name: "forrest-sweep", noOverlap: true });
    runSweep();
}

module.exports = { startForrestSweep, runSweep };
