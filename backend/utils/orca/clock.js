const { LORD_GANG_ORCA } = require("../../config/lordGangOrca");
const { helsinkiDay, helsinkiHour } = require("../wallet");

// Lord Gang Orca keeps Helsinki hours: open Monday to Friday, 16:00 to
// midnight. His day (begs, jobs) starts at 00:00 Helsinki time.

const WEEKDAYS = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

// The weekday in Helsinki at `date`: 0 Sunday ... 6 Saturday.
function helsinkiWeekday(date = new Date()) {
    return WEEKDAYS[new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Helsinki", weekday: "short" }).format(date)];
}

// Where the clock is for him: { weekday, hour }, real, or an admin's
// pretend one (utils/orca/debug.js) for testing the hours.
function clockOf(date = new Date(), fake = null) {
    if (fake && Number.isInteger(fake.weekday) && Number.isInteger(fake.hour)) return { weekday: fake.weekday, hour: fake.hour };
    return { weekday: helsinkiWeekday(date), hour: helsinkiHour(date) };
}

const isOpen = ({ weekday, hour }) => LORD_GANG_ORCA.hours.days.includes(weekday) && hour >= LORD_GANG_ORCA.hours.opensAt;

// The moment a Helsinki date ("2026-11-18") starts: its 00:00, as a Date.
// Helsinki is 2 or 3 hours ahead of UTC, so it's one of those two.
function startOfDay(day) {
    const midnightUtc = Date.parse(`${day}T00:00:00Z`);
    for (const hours of [2, 3]) {
        const at = new Date(midnightUtc - hours * 60 * 60 * 1000);
        if (helsinkiDay(at) === day && helsinkiHour(at) === 0) return at;
    }
    return new Date(midnightUtc - 2 * 60 * 60 * 1000);
}

// The next 00:00 in Helsinki after `date`.
function nextMidnight(date = new Date()) {
    const next = new Date(`${helsinkiDay(date)}T00:00:00Z`);
    next.setUTCDate(next.getUTCDate() + 1);
    return startOfDay(next.toISOString().slice(0, 10));
}

// When he next opens after `date` (for the page): the next weekday 16:00.
function nextOpening(date = new Date()) {
    for (let ahead = 0; ahead < 8; ahead++) {
        const day = new Date(`${helsinkiDay(date)}T00:00:00Z`);
        day.setUTCDate(day.getUTCDate() + ahead);
        const key = day.toISOString().slice(0, 10);
        const at = new Date(startOfDay(key).getTime() + LORD_GANG_ORCA.hours.opensAt * 60 * 60 * 1000);
        if (at > date && LORD_GANG_ORCA.hours.days.includes(helsinkiWeekday(at))) return at;
    }
    return null;
}

module.exports = { helsinkiWeekday, clockOf, isOpen, startOfDay, nextMidnight, nextOpening, today: helsinkiDay };
