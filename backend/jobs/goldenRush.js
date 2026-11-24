const cron = require("node-cron");
const { goldenRushNotice } = require("../utils/scratch");

// Every minute: when a Box Office Scratch Golden Rush window has just
// started with a big enough jackpot, one member hears about it, and notices
// whose window is over come off the top of Notifications (utils/scratch.js
// goldenRushNotice).
let task = null;

async function runCheck() {
    try {
        const told = await goldenRushNotice();
        if (told) console.log("Golden Rush: one member told.");
    } catch (error) {
        console.error("Golden Rush check failed:", error.message);
    }
}

// Call once, after the database is connected.
function startGoldenRush() {
    if (task) return;
    task = cron.schedule("* * * * *", runCheck, { name: "golden-rush", noOverlap: true });
    runCheck();
}

module.exports = { startGoldenRush, runCheck };
