const SiteEvent = require("../models/siteEventModel");
const { blackFridaySale, doublePrizeWeekend } = require("../../shared/events.js");
const { noteSiteEvent } = require("./notify");

// The calendar events (shared/events.js) and the notification everyone gets
// when one starts: the Black Market's Black Friday Sale ("blackFriday") and
// Box Office Scratch's Double Prize Weekend ("doublePrizes"). Checked every
// few minutes and on starting (jobs/siteEvents.js); each event is claimed
// by its key first, so it's only ever announced once.
const EVENTS = [
    { type: "blackFriday", at: blackFridaySale },
    { type: "doublePrizes", at: doublePrizeWeekend },
];

// Announces whatever has started by `now` and hasn't been yet. Resolves to
// the types announced.
async function announceSiteEvents(now = new Date()) {
    const announced = [];
    for (const event of EVENTS) {
        const { on, key } = event.at(now);
        if (!on) continue;
        try {
            await SiteEvent.create({ _id: key, type: event.type, at: now });
        } catch (error) {
            if (error.code === 11000) continue; // already announced
            throw error;
        }
        await noteSiteEvent(event.type);
        announced.push(event.type);
    }
    return announced;
}

module.exports = { announceSiteEvents, EVENT_TYPES: EVENTS.map((event) => event.type) };
