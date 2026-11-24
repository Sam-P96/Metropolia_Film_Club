const cron = require("node-cron");
const { sweepRuns } = require("../utils/catflix/ruinRun");
const { startDue } = require("../utils/catflix/kittyRace");
const { giftRound } = require("../utils/catflix/gifts");

// Every minute, for Catflix No Chill: Kitty Races whose friends have had
// their 5 minutes to join start by themselves (utils/catflix/kittyRace.js
// startDue; anyone looking at the races starts them too), and Ruin Runs
// nobody came back to finish (a page closed mid-run) are let go, their bets
// to the Box Office Scratch jackpots (utils/catflix/ruinRun.js sweepRuns).
// And once a play day (the first sweep after 12:00 Helsinki), friends' cats
// that love you may steal for you (utils/catflix/gifts.js giftRound).
let task = null;

async function runSweep() {
    try {
        const started = await startDue();
        if (started) console.log(`Catflix sweep: ${started} Kitty Race${started === 1 ? "" : "s"} started.`);
        const count = await sweepRuns();
        if (count) console.log(`Catflix sweep: ${count} unfinished Ruin Run${count === 1 ? "" : "s"} let go.`);
        const gifts = await giftRound();
        if (gifts) console.log(`Catflix sweep: ${gifts} cat${gifts === 1 ? "" : "s"} stole for a friend today.`);
    } catch (error) {
        console.error("Catflix sweep failed:", error.message);
    }
}

// Call once, after the database is connected. Sweeps straight away too.
function startCatflixSweep() {
    if (task) return;

    task = cron.schedule("* * * * *", runSweep, { name: "catflix-sweep", noOverlap: true });
    runSweep();
}

module.exports = { startCatflixSweep, runSweep };
