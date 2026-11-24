const crypto = require("crypto");

// Happy hours: hour-long windows, at different times every day, when some
// games quietly run kinder. Server only, and never told to players: nothing
// here is sent to the page, shown, or put in shared/ (which the page reads).
// The odds the pages show stay as they are. The one exception is the
// Golden Rush's notice, which tells one member (utils/scratch.js).
//
//   goldenRush  two windows a day: one between 10:00 and 16:00, the other
//               between 16:00 and 23:00. One card in 50 hides the Golden
//               Ticket instead of one in 200, on every ticket type
//               (utils/scratch.js goldenOdds). When one starts with a
//               jackpot of a ticket on sale past `notifyAt`, one member
//               chosen at random (never the richest) is told about it
//               (utils/scratch.js goldenRushNotice).
//   clanker     four windows a day between 11:00 and 23:00. Kino Farkle's
//               bot busts on the third roll of a turn 50% of the time, and
//               70% on its 3rd and 5th turns (controllers/farkleController.js,
//               games/farkle/engine.js).
//   slots       one window a day between 12:00 and 20:00. RTP 95% for the
//               richest active player, and from 110% (the second richest) to
//               120% (the poorest) for everyone else; inactive players 99%
//               (utils/slots.js, games/slots/luck.js).
//
// Each `spans` entry is a stretch of the day and how many windows fall in
// it, never overlapping, each `minutes` long and wholly inside it. Where
// they fall is random, picked afresh for each Helsinki day (windowsFor). A
// window takes in its first minute but not its last: 10:37 to 11:37 is
// 10:37:00 up to 11:36:59. Summer and winter time make no difference: it
// goes by the clock in Helsinki.
const HAPPY_HOURS = {
    goldenRush: {
        minutes: 60,
        spans: [
            { from: "10:00", to: "16:00", count: 1 },
            { from: "16:00", to: "23:00", count: 1 },
        ],
        oneIn: 50,
        // A jackpot this big or bigger, on a ticket on sale when a window
        // starts, and one member hears about it.
        notifyAt: { standard: 10000, premium: 30000, vip: 50000 },
    },
    clanker: {
        minutes: 60,
        spans: [{ from: "11:00", to: "23:00", count: 4 }],
        onRoll: 3,
        bust: 0.5,
        worseTurns: [3, 5],
        worseBust: 0.7,
    },
    slots: {
        minutes: 60,
        spans: [{ from: "12:00", to: "20:00", count: 1 }],
        luck: { topRtp: 0.95, richestRtp: 1.1, poorestRtp: 1.2, soloRtp: 1.04, inactiveRtp: 0.99 },
    },
};

const ZONE = "Europe/Helsinki";
const clock = new Intl.DateTimeFormat("en-GB", { timeZone: ZONE, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const dayFormat = new Intl.DateTimeFormat("en-CA", { timeZone: ZONE, year: "numeric", month: "2-digit", day: "2-digit" });

const minutesOf = (time) => {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
};
// 637 -> "10:37".
const clockText = (minutes) => `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

// Minutes past midnight in Helsinki, 0 to 1439.
function helsinkiMinutes(date = new Date()) {
    const parts = clock.formatToParts(date);
    const part = (type) => Number(parts.find((entry) => entry.type === type).value);
    return part("hour") * 60 + part("minute");
}

// The Helsinki date `date` falls on, as "2026-11-24".
const helsinkiDay = (date = new Date()) => dayFormat.format(date);

// The moment it's `minutes` past midnight in Helsinki on `day`, as a Date.
// Helsinki is 2 or 3 hours ahead of UTC, so it's one of those two.
function helsinkiTime(day, minutes) {
    const asUtc = Date.parse(`${day}T${clockText(minutes)}:00Z`);
    for (const hours of [2, 3]) {
        const at = new Date(asUtc - hours * 60 * 60 * 1000);
        if (helsinkiDay(at) === day && helsinkiMinutes(at) === minutes) return at;
    }
    return new Date(asUtc - 2 * 60 * 60 * 1000);
}

// Where the windows fall comes from this, so nobody can work them out:
// HAPPY_HOURS_SECRET if it's set, otherwise the server's own SECRET.
const secretOf = () => process.env.HAPPY_HOURS_SECRET || process.env.SECRET || "kino-happy-hours";

// Numbers from 0 (included) to 1 (not) for `key`'s windows on `day`: the
// same every time they're asked for, and different every day.
function numbersFor(key, day, secret) {
    let index = 0;
    return () => {
        const digest = crypto.createHmac("sha256", secret).update(`${key}|${day}|${index++}`).digest();
        return digest.readUInt32BE(0) / 2 ** 32;
    };
}

// `key`'s windows on `day` (a Helsinki date), in order: [{ from, to }] in
// minutes past midnight, `to` not included. In each span, its windows are
// spread at random and never overlap: the room left over once they're laid
// end to end is shared out at random between the gaps.
function windowsFor(key, day, secret = secretOf()) {
    const { minutes, spans } = HAPPY_HOURS[key];
    const random = numbersFor(key, day, secret);
    const windows = [];
    for (const span of spans) {
        const start = minutesOf(span.from);
        const room = minutesOf(span.to) - start - span.count * minutes;
        const gaps = Array.from({ length: span.count }, () => Math.floor(random() * (room + 1))).sort((a, b) => a - b);
        gaps.forEach((gap, i) => {
            const from = start + gap + i * minutes;
            windows.push({ from, to: from + minutes });
        });
    }
    return windows;
}

// The window of `key`'s that `now` is in, with when it starts and ends as
// Dates and Helsinki clock times ({ from, to, fromText, toText }), or null.
function windowAt(key, now = new Date(), secret = secretOf()) {
    const day = helsinkiDay(now);
    const at = helsinkiMinutes(now);
    const window = windowsFor(key, day, secret).find((entry) => at >= entry.from && at < entry.to);
    if (!window) return null;
    return {
        from: helsinkiTime(day, window.from),
        to: helsinkiTime(day, window.to),
        fromText: clockText(window.from),
        toText: clockText(window.to),
    };
}

// Is `key`'s happy hour on at `now`?
const happyHour = (key, now = new Date(), secret = secretOf()) => windowAt(key, now, secret) !== null;

// One card in how many hides a Golden Ticket, for a card bought at `now`.
function goldenTicketOneIn(normal, now = new Date(), secret = secretOf()) {
    return happyHour("goldenRush", now, secret) ? Math.min(normal, HAPPY_HOURS.goldenRush.oneIn) : normal;
}

// The slot machine's luck numbers at `now`: `normal` (games/slots/luck.js
// LUCK), or kinder ones in its happy hour.
function slotLuck(normal, now = new Date(), secret = secretOf()) {
    return happyHour("slots", now, secret) ? { ...normal, ...HAPPY_HOURS.slots.luck } : normal;
}

// How often Clanker's rolls should bust at `now`: null outside its happy
// hours, else ({ turn, roll }) => 0 to 1, for roll number `roll` of its
// `turn`th turn of the match (games/farkle/engine.js playBot).
function clankerBustChance(now = new Date(), secret = secretOf()) {
    if (!happyHour("clanker", now, secret)) return null;
    const { onRoll, bust, worseTurns, worseBust } = HAPPY_HOURS.clanker;
    return ({ turn, roll }) => (roll !== onRoll ? 0 : worseTurns.includes(turn) ? worseBust : bust);
}

module.exports = {
    HAPPY_HOURS,
    helsinkiMinutes,
    helsinkiDay,
    helsinkiTime,
    windowsFor,
    windowAt,
    happyHour,
    goldenTicketOneIn,
    slotLuck,
    clankerBustChance,
};
