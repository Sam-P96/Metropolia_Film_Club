const cron = require("node-cron");
const { sweepIdleMachines } = require("../utils/slots");

// Every minute: Slot Machines left alone for SLOTS.idleCashOutMinutes cash
// themselves out (utils/slots.js sweepIdleMachines). What today's cap
// allows goes back to the wallet; the rest is gone.
let task = null;

async function runSweep() {
    try {
        const cashedOut = await sweepIdleMachines();
        if (cashedOut) console.log(`Slot sweep: ${cashedOut} idle machine${cashedOut === 1 ? "" : "s"} cashed out.`);
    } catch (error) {
        console.error("Slot sweep failed:", error.message);
    }
}

// Call once, after the database is connected.
function startSlotSweep() {
    if (task) return;
    task = cron.schedule("* * * * *", runSweep, { name: "slot-sweep", noOverlap: true });
    runSweep();
}

module.exports = { startSlotSweep, runSweep };
