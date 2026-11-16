const cron = require("node-cron");
const { announceSiteEvents } = require("../utils/siteEvents");

// The calendar events (shared/events.js): at midnight on Fridays and
// Saturdays (Helsinki), every 10 minutes in case one was missed, and on
// starting, anything that has begun gets its notification to everyone, once
// (utils/siteEvents.js).
let tasks = [];

async function checkSiteEvents() {
    try {
        const announced = await announceSiteEvents();
        if (announced.length > 0) console.log(`Site events: announced ${announced.join(", ")}.`);
    } catch (error) {
        console.error("Site events check failed:", error.message);
    }
}

// Call once, after the database is connected.
function startSiteEvents() {
    if (tasks.length) return;
    tasks = [
        cron.schedule("0 0 * * 5,6", checkSiteEvents, { timezone: "Europe/Helsinki", name: "site-events-midnight", noOverlap: true }),
        cron.schedule("*/10 * * * *", checkSiteEvents, { name: "site-events", noOverlap: true }),
    ];
    checkSiteEvents();
}

module.exports = { startSiteEvents, checkSiteEvents };
