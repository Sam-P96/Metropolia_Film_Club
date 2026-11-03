const cron = require("node-cron");
const { lastCalculatedAt, recalculateResonance } = require("../utils/resonanceStore");

// Works out everyone's Resonance again every night at 04:00 Helsinki time,
// when hardly anyone is rating films (utils/resonanceStore.js
// recalculateResonance). node-cron follows Finland's summer and winter time
// by itself.
let task = null;
let running = null;

const DAY_MS = 24 * 60 * 60 * 1000;

// One sweep at a time: the startup one and 04:00's never overlap.
function runSweep() {
    running ??= recalculateResonance()
        .then(({ members, pairs }) => console.log(`Resonance sweep: ${pairs} pair(s) between ${members} member(s).`))
        .catch((error) => console.error("Resonance sweep failed:", error.message))
        .finally(() => {
            running = null;
        });

    return running;
}

// Call once, after the database is connected. If the last sweep was more
// than a day ago (the server was down at 04:00), or nothing's stored yet,
// it sweeps straight away too.
function startResonanceSweep() {
    if (task) return;

    task = cron.schedule("0 4 * * *", runSweep, { timezone: "Europe/Helsinki", name: "resonance-sweep" });

    lastCalculatedAt()
        .then((at) => {
            if (!at || Date.now() - at.getTime() >= DAY_MS) runSweep();
        })
        .catch((error) => console.error("Couldn't check the last Resonance sweep:", error.message));
}

module.exports = { startResonanceSweep, runSweep };
