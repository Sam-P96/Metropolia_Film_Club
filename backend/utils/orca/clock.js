const { LORD_GANG_ORCA } = require("../../config/lordGangOrca");
const { helsinkiDay, helsinkiHour } = require("../wallet");

// Lord Gang Orca keeps Helsinki hours: open Monday to Friday, 16:00 to
// 23:59. His day (begs, jobs) starts at 00:00 Helsinki time.

const WEEKDAYS = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

// The weekday in Helsinki at `date`: 0 Sunday ... 6 Saturday.
function helsinkiWeekday(date = new Date()) {
    return WEEKDAYS[new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Helsinki", weekday: "short" }).format(date)];
}

// The minute past the hour in Helsinki, 0 to 59.
function helsinkiMinute(date = new Date()) {
    return Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Helsinki", minute: "2-digit" }).format(date));
}

// Whether an admin's pretend clock still counts: set less than
// testClockMs ago. One saved without a time it was set (from before they
// expired) never does, so it can't keep him open for good.
function pretending(date, fake) {
    if (!fake || !Number.isInteger(fake.weekday) || !Number.isInteger(fake.hour) || !fake.setAt) return false;
    const age = date.getTime() - new Date(fake.setAt).getTime();
    return age >= 0 && age < LORD_GANG_ORCA.testClockMs;
}

// Where the clock is for him: { weekday, hour, minute }, real, or an
// admin's pretend one (utils/orca/player.js debug, on the hour) for testing
// the hours, while it lasts.
function clockOf(date = new Date(), fake = null) {
    if (pretending(date, fake)) return { weekday: fake.weekday, hour: fake.hour, minute: 0 };
    return { weekday: helsinkiWeekday(date), hour: helsinkiHour(date), minute: helsinkiMinute(date) };
}

// Open: a weekday, from 16:00 up to (not including) 23:59.
const minutesOf = ([hour, minute]) => hour * 60 + minute;
function isOpen({ weekday, hour, minute = 0 }) {
    const { days, opensAt, closesAt } = LORD_GANG_ORCA.hours;
    const now = hour * 60 + minute;
    return days.includes(weekday) && now >= minutesOf(opensAt) && now < minutesOf(closesAt);
}

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
        const at = new Date(startOfDay(key).getTime() + minutesOf(LORD_GANG_ORCA.hours.opensAt) * 60 * 1000);
        if (at > date && LORD_GANG_ORCA.hours.days.includes(helsinkiWeekday(at))) return at;
    }
    return null;
}

module.exports = { helsinkiWeekday, clockOf, isOpen, startOfDay, nextMidnight, nextOpening, today: helsinkiDay };
