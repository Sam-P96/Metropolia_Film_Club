const cron = require("node-cron");
const { SCORING_VERSION } = require("../utils/resonance");
const { lastSweep, recalculateResonance } = require("../utils/resonanceStore");

// Works out everyone's Resonance again every night at 04:00 Helsinki time,
// when hardly anyone is rating films (utils/resonanceStore.js
// recalculateResonance). node-cron follows Finland's summer and winter time
// by itself.
let task = null;
let running = null;

const DAY_MS = 24 * 60 * 60 * 1000;

// One sweep at a time: the startup one, 04:00's and one a moderator starts
// from /SECRETresonance never overlap; asking while one runs waits for that
// one. Resolves to { members, pairs, at } (recalculateResonance), or null
// if it failed.
function runSweep() {
    running ??= recalculateResonance()
        .then((result) => {
            console.log(`Resonance sweep: ${result.pairs} pair(s) between ${result.members} member(s).`);
            return result;
        })
        .catch((error) => {
            console.error("Resonance sweep failed:", error.message);
            return null;
        })
        .finally(() => {
            running = null;
        });

    return running;
}

// Whether to sweep on starting up, from lastSweep(): nothing's stored yet,
// the last sweep was more than a day ago (the server was down at 04:00), or
// it used different scoring settings (the weights have changed since).
function needsSweep(last, now = Date.now()) {
    return !last || now - last.at.getTime() >= DAY_MS || last.version !== SCORING_VERSION;
}

// Call once, after the database is connected.
function startResonanceSweep() {
    if (task) return;

    task = cron.schedule("0 4 * * *", runSweep, { timezone: "Europe/Helsinki", name: "resonance-sweep" });

    lastSweep()
        .then((last) => {
            if (needsSweep(last)) runSweep();
        })
        .catch((error) => console.error("Couldn't check the last Resonance sweep:", error.message));
}

module.exports = { startResonanceSweep, runSweep, needsSweep };
