const cron = require("node-cron");
const { sweep } = require("../utils/orca/jobs");

// Every minute: Lord Gang Orca's jobs past 00:00 (Helsinki) expire, members
// in favour mode get the day's four new ones, and job dislikes 48 hours old
// come off again (utils/orca/jobs.js sweep). His page deals the day's jobs
// itself too, if it's opened before the sweep gets there.
let task = null;

async function runSweep() {
    try {
        const dealt = await sweep();
        if (dealt) console.log(`Lord Gang Orca dealt jobs to ${dealt} member${dealt === 1 ? "" : "s"}.`);
    } catch (error) {
        console.error("Lord Gang Orca's sweep failed:", error.message);
    }
}

// Call once, after the database is connected.
function startOrcaSweep() {
    if (task) return;
    task = cron.schedule("* * * * *", runSweep, { name: "orca-sweep", noOverlap: true });
    runSweep();
}

module.exports = { startOrcaSweep, runSweep };
