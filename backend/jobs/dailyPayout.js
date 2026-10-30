const cron = require("node-cron");
const { helsinkiHour, payEveryone } = require("../utils/wallet");

// Runs the PP payout every day at 12:00 Helsinki time. node-cron follows
// Finland's summer and winter time by itself.
let task = null;

async function runPayout() {
    try {
        const paid = await payEveryone();
        console.log(`Daily payout: ${paid} member(s) got PP.`);
    } catch (error) {
        console.error("Daily payout failed:", error.message);
    }
}

// Call once, after the database is connected. If the server was down at
// 12:00 (a restart, a deploy), it pays straight away on starting up after
// 12:00. payEveryone pays each member once a day, so this is safe.
function startDailyPayout() {
    if (task) return;

    task = cron.schedule("0 12 * * *", runPayout, { timezone: "Europe/Helsinki", name: "daily-payout" });

    if (helsinkiHour() >= 12) runPayout();
}

// When the next payout is, as a Date, or null if the job isn't running.
function nextPayoutAt() {
    return task?.getNextRun() ?? null;
}

module.exports = { startDailyPayout, runPayout, nextPayoutAt };