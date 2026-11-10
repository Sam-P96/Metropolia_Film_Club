// Happy hours: Helsinki-time windows when some games quietly run kinder.
// Server only, and never told to players: nothing here is sent to the page,
// shown, or put in shared/ (which the page reads). The odds the pages show
// stay as they are.
//
//   scratch   12:30 to 14:30   the Golden Ticket turns up 4 times as often,
//                              on every ticket type (utils/scratch.js)
//   slots     12:30 to 13:00   RTP from 99% (the richest active player) to
//                              106% (the poorest), inactive players 99%
//                              (utils/slots.js, games/slots/luck.js)
//   clanker   12:00 to 16:45   Kino Farkle's bot busts on the third roll of
//                              a turn 50% of the time, and 70% on its 3rd
//                              and 5th turns (controllers/farkleController.js,
//                              games/farkle/engine.js)
//
// Each window takes in its first minute but not its last: 12:30 to 14:30 is
// 12:30:00 up to 14:29:59. Summer and winter time make no difference: it
// goes by the clock in Helsinki.
const HAPPY_HOURS = {
    scratch: { from: "12:30", to: "14:30", goldenTimes: 4 },
    slots: { from: "12:30", to: "13:00", luck: { richestRtp: 0.99, poorestRtp: 1.06, soloRtp: 1.04, inactiveRtp: 0.99 } },
    clanker: { from: "12:00", to: "16:45", onRoll: 3, bust: 0.5, worseTurns: [3, 5], worseBust: 0.7 },
};

const clock = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Helsinki", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

// Minutes past midnight in Helsinki, 0 to 1439.
function helsinkiMinutes(date = new Date()) {
    const parts = clock.formatToParts(date);
    const part = (type) => Number(parts.find((entry) => entry.type === type).value);
    return part("hour") * 60 + part("minute");
}

const minutesOf = (time) => {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
};

// Is `key`'s happy hour on at `now`?
function happyHour(key, now = new Date()) {
    const { from, to } = HAPPY_HOURS[key];
    const at = helsinkiMinutes(now);
    return at >= minutesOf(from) && at < minutesOf(to);
}

// One card in how many hides a Golden Ticket, for a card bought at `now`.
function goldenTicketOneIn(normal, now = new Date()) {
    return happyHour("scratch", now) ? Math.max(1, Math.round(normal / HAPPY_HOURS.scratch.goldenTimes)) : normal;
}

// The slot machine's luck numbers at `now`: `normal` (games/slots/luck.js
// LUCK), or kinder ones in its happy hour.
function slotLuck(normal, now = new Date()) {
    return happyHour("slots", now) ? { ...normal, ...HAPPY_HOURS.slots.luck } : normal;
}

// How often Clanker's rolls should bust at `now`: null outside its happy
// hour, else ({ turn, roll }) => 0 to 1, for roll number `roll` of its
// `turn`th turn of the match (games/farkle/engine.js playBot).
function clankerBustChance(now = new Date()) {
    if (!happyHour("clanker", now)) return null;
    const { onRoll, bust, worseTurns, worseBust } = HAPPY_HOURS.clanker;
    return ({ turn, roll }) => (roll !== onRoll ? 0 : worseTurns.includes(turn) ? worseBust : bust);
}

module.exports = { HAPPY_HOURS, helsinkiMinutes, happyHour, goldenTicketOneIn, slotLuck, clankerBustChance };
