// Happy hours (games/happyHours.js): each day's windows, at random times in
// their stretches of the day, and what each one changes. No database
// needed.
//   From backend/:  npm test
const { test, describe } = require("node:test");
const assert = require("node:assert/strict");

const { HAPPY_HOURS, happyHour, helsinkiMinutes, helsinkiTime, windowsFor, windowAt, goldenTicketOneIn, slotLuck, clankerBustChance } = require("../games/happyHours");
const { newLayout, GOLDEN } = require("../games/scratch/engine");
const { LUCK, targetRtp, tableFor } = require("../games/slots/luck");
const { FARKLE_CHANCE, rollWithBust, cryptoDice, newGame, playBot } = require("../games/farkle/engine");
const { SCRATCH } = require("../../shared/scratch/config.js");
const { hasScoringDice } = require("../../shared/farkle/rules.js");

const SECRET = "happy-hours-test-secret";
const minutes = (time) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
const clock = (m) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
// A moment on `day` at Helsinki time `m` (minutes past midnight).
const on = (day, m) => helsinkiTime(day, m);

// A run of days, winter and summer time, and both clock changes.
const DAYS = [];
for (let date = new Date("2026-01-01T12:00:00Z"); DAYS.length < 400; date.setUTCDate(date.getUTCDate() + 1)) DAYS.push(date.toISOString().slice(0, 10));

describe("the windows", () => {
    test("helsinkiTime and helsinkiMinutes agree, summer and winter", () => {
        for (const day of ["2026-01-15", "2026-03-29", "2026-07-01", "2026-10-25"]) {
            for (const m of [0, 600, 637, 960, 1379]) assert.equal(helsinkiMinutes(on(day, m)), m, `${day} ${clock(m)}`);
        }
    });

    test("every day: the right number of hour-long windows, each wholly inside its stretch of the day, never overlapping", () => {
        for (const key of ["goldenRush", "clanker", "slots"]) {
            const { minutes: length, spans } = HAPPY_HOURS[key];
            for (const day of DAYS) {
                const windows = windowsFor(key, day, SECRET);
                assert.equal(windows.length, spans.reduce((sum, span) => sum + span.count, 0), `${key} ${day}`);
                let index = 0;
                for (const span of spans) {
                    for (let i = 0; i < span.count; i++, index++) {
                        const window = windows[index];
                        assert.equal(window.to - window.from, length);
                        assert.ok(window.from >= minutes(span.from) && window.to <= minutes(span.to), `${key} ${day}: ${clock(window.from)} in ${span.from} to ${span.to}`);
                        if (index > 0) assert.ok(window.from >= windows[index - 1].to, `${key} ${day}: no overlap`);
                    }
                }
            }
        }
    });

    test("Golden Rush: one between 10:00 and 16:00, the second from 16:00 to 23:00; Clanker: four between 11:00 and 23:00; slots: one between 12:00 and 20:00", () => {
        assert.deepEqual(HAPPY_HOURS.goldenRush.spans, [
            { from: "10:00", to: "16:00", count: 1 },
            { from: "16:00", to: "23:00", count: 1 },
        ]);
        assert.deepEqual(HAPPY_HOURS.clanker.spans, [{ from: "11:00", to: "23:00", count: 4 }]);
        assert.deepEqual(HAPPY_HOURS.slots.spans, [{ from: "12:00", to: "20:00", count: 1 }]);
        for (const key of ["goldenRush", "clanker", "slots"]) assert.equal(HAPPY_HOURS[key].minutes, 60);
    });

    test("the same all day and every time they're asked for; different from day to day, and with another secret", () => {
        assert.deepEqual(windowsFor("clanker", "2026-11-24", SECRET), windowsFor("clanker", "2026-11-24", SECRET));
        const starts = new Set(DAYS.map((day) => windowsFor("slots", day, SECRET)[0].from));
        assert.ok(starts.size > 150, `${starts.size} different start times over ${DAYS.length} days`);
        const differs = DAYS.slice(0, 30).some((day) => windowsFor("goldenRush", day, SECRET)[0].from !== windowsFor("goldenRush", day, "another secret")[0].from);
        assert.ok(differs);
    });

    test("spread over their whole stretch: early and late windows both turn up", () => {
        const firsts = DAYS.map((day) => windowsFor("goldenRush", day, SECRET)[0].from);
        assert.ok(Math.min(...firsts) < minutes("11:00") && Math.max(...firsts) > minutes("14:00"));
        const seconds = DAYS.map((day) => windowsFor("goldenRush", day, SECRET)[1].from);
        assert.ok(Math.min(...seconds) < minutes("17:00") && Math.max(...seconds) > minutes("21:00"));
    });

    test("take in their first minute but not their last, by Helsinki's clock in summer and winter", () => {
        for (const day of ["2026-01-15", "2026-07-01"]) {
            for (const key of ["goldenRush", "clanker", "slots"]) {
                for (const window of windowsFor(key, day, SECRET)) {
                    assert.equal(happyHour(key, on(day, window.from - 1), SECRET), windowsFor(key, day, SECRET).some((other) => other.to === window.from), `${key} just before`);
                    assert.equal(happyHour(key, on(day, window.from), SECRET), true, `${key} ${day} ${clock(window.from)}`);
                    assert.equal(happyHour(key, on(day, window.to - 1), SECRET), true);
                    const next = windowsFor(key, day, SECRET).some((other) => other.from === window.to);
                    assert.equal(happyHour(key, on(day, window.to), SECRET), next, `${key} ${day} ${clock(window.to)}`);
                }
            }
        }
    });

    test("windowAt gives the window's start and end as moments and as Helsinki clock times", () => {
        const day = "2026-07-01";
        const [first] = windowsFor("goldenRush", day, SECRET);
        const window = windowAt("goldenRush", on(day, first.from + 10), SECRET);
        assert.deepEqual([window.fromText, window.toText], [clock(first.from), clock(first.to)]);
        assert.deepEqual([window.from.getTime(), window.to.getTime()], [on(day, first.from).getTime(), on(day, first.to).getTime()]);
        assert.equal(window.to - window.from, 60 * 60 * 1000);
        assert.equal(windowAt("goldenRush", on(day, minutes("05:00")), SECRET), null);
    });
});

describe("scratch cards: the Golden Rush, 1 in 50 instead of 1 in 200", () => {
    const day = "2026-01-15";
    const [first, second] = windowsFor("goldenRush", day, SECRET);

    test("in either window 1 in 50, on every ticket; outside them 1 in 200", () => {
        for (const window of [first, second]) {
            assert.equal(goldenTicketOneIn(SCRATCH.goldenTicketOneIn, on(day, window.from + 30), SECRET), 50);
        }
        assert.equal(goldenTicketOneIn(SCRATCH.goldenTicketOneIn, on(day, minutes("09:59")), SECRET), SCRATCH.goldenTicketOneIn);
        assert.equal(goldenTicketOneIn(SCRATCH.goldenTicketOneIn, on(day, minutes("23:30")), SECRET), SCRATCH.goldenTicketOneIn);
    });

    test("the lines for telling one member: 10,000 Standard, 30,000 Premium, 50,000 VIP", () => {
        assert.deepEqual(HAPPY_HOURS.goldenRush.notifyAt, { standard: 10000, premium: 30000, vip: 50000 });
    });

    test("a card is dealt with the odds it's given", () => {
        const asked = [];
        const layout = newLayout((max) => {
            asked.push(max);
            return 0;
        }, { goldenOneIn: 50 });
        assert.ok(asked.includes(50));
        assert.ok(!asked.includes(SCRATCH.goldenTicketOneIn));
        assert.equal(layout.filter((tile) => tile === GOLDEN).length, 1);

        const normal = [];
        newLayout((max) => {
            normal.push(max);
            return 0;
        });
        assert.ok(normal.includes(SCRATCH.goldenTicketOneIn));
    });
});

describe("the slot machine: the top place 95%, everyone else 110% to 120%, for an hour between 12:00 and 20:00", () => {
    const day = "2026-01-15";
    const [window] = windowsFor("slots", day, SECRET);

    test("richest active 95%, second richest 110%, poorest 120%, a straight line between; inactive 99%", () => {
        const luck = slotLuck(LUCK, on(day, window.from + 15), SECRET);
        const rtp = (rank, count = 10) => targetRtp({ active: true, rank, count }, luck);
        assert.equal(rtp(1), 0.95);
        assert.ok(Math.abs(rtp(2) - 1.1) < 1e-9);
        assert.ok(Math.abs(rtp(6) - 1.15) < 1e-9, "halfway from the second richest to the poorest");
        assert.ok(Math.abs(rtp(10) - 1.2) < 1e-9);
        // Two active players: the top place, and the poorest.
        assert.deepEqual([rtp(1, 2), rtp(2, 2)], [0.95, 1.2]);
        assert.equal(targetRtp({ active: false }, luck), 0.99);
        const solo = targetRtp({ active: true, rank: 1, count: 1 }, luck);
        assert.equal(solo, 1.04);
        for (const value of [0.95, 1.1, 1.15, 1.2, 0.99, solo]) assert.equal(tableFor(value).bucket, Math.round(value * 100));
    });

    test("outside it, the usual numbers", () => {
        assert.equal(slotLuck(LUCK, on(day, window.to), SECRET), LUCK);
        assert.equal(targetRtp({ active: true, rank: 1, count: 10 }, slotLuck(LUCK, on(day, window.from - 1), SECRET)), LUCK.richestRtp);
    });
});

describe("Clanker: busts on its third roll, four hours a day between 11:00 and 23:00", () => {
    const day = "2026-01-15";
    const windows = windowsFor("clanker", day, SECRET);
    const inside = () => clankerBustChance(on(day, windows[1].from + 20), SECRET);
    const outside = on(day, minutes("10:30"));

    test("50% on a turn's third roll, 70% on its 3rd and 5th turns, nothing else; nothing outside its windows", () => {
        assert.equal(clankerBustChance(outside, SECRET), null);
        const chance = inside();
        assert.deepEqual([1, 2, 3, 4, 5, 6].map((turn) => chance({ turn, roll: 3 })), [0.5, 0.5, 0.7, 0.5, 0.7, 0.5]);
        assert.deepEqual([1, 2, 4, 5].map((roll) => chance({ turn: 3, roll })), [0, 0, 0, 0]);
        for (const window of windows) assert.ok(clankerBustChance(on(day, window.from), SECRET));
    });

    test("a roll busts as often as asked, or as often as it would anyway if that's more", () => {
        const trials = 20000;
        const rate = (count, chance) => {
            let busts = 0;
            for (let i = 0; i < trials; i++) if (!hasScoringDice(rollWithBust(count, chance, cryptoDice, require("crypto").randomInt))) busts += 1;
            return busts / trials;
        };
        // 4 dice Farkle 15.7% of the time on their own.
        assert.ok(Math.abs(rate(4, 0.5) - 0.5) < 0.025);
        assert.ok(Math.abs(rate(4, 0.7) - 0.7) < 0.025);
        // 1 die Farkles 66.7% on its own: 50% doesn't make it luckier.
        assert.ok(Math.abs(rate(1, 0.5) - FARKLE_CHANCE[1]) < 0.025);
        assert.ok(Math.abs(rate(4, 0) - FARKLE_CHANCE[4]) < 0.025);
    });

    // Bot's first roll keeps a 1, its second a 5 (150, 4 dice left: it rolls
    // on), and its third would be three 1s (1,150: it would bank).
    const scripted = () => {
        const rolls = [[1, 2, 3, 4, 6, 6], [5, 2, 2, 3, 6], [1, 1, 1, 2]];
        let next = 0;
        return (count) => {
            const dice = rolls[next++];
            assert.equal(dice.length, count);
            return dice;
        };
    };
    // Clanker's 3rd turn: it went first, so the match's 5th.
    const thirdTurn = () => ({ ...newGame({ target: 10000, first: 0 }), turn: 5 });

    test("in a window, its third roll can be swapped for a Farkle; its turns are counted as its own", () => {
        const asked = [];
        const bustChance = (at) => {
            asked.push(at);
            return inside()(at);
        };
        const busted = playBot(thirdTurn(), 0, scripted(), { bustChance, random: () => 0 });
        assert.deepEqual(asked, [{ turn: 3, roll: 1 }, { turn: 3, roll: 2 }, { turn: 3, roll: 3 }]);
        const turn = busted.lastTurns.at(-1);
        assert.equal(turn.result, "farkle");
        assert.equal(turn.steps.length, 3);
        assert.equal(hasScoringDice(turn.steps[2].dice), false);
        assert.equal(busted.scores[0], 0);
        assert.equal(busted.current, 1);
    });

    test("when the dice say no, or outside its windows, it plays its dice as rolled", () => {
        const lucky = playBot(thirdTurn(), 0, scripted(), { bustChance: inside(), random: () => 999999 });
        assert.deepEqual([lucky.lastTurns.at(-1).result, lucky.scores[0]], ["bank", 1150]);
        const normal = playBot(thirdTurn(), 0, scripted(), { bustChance: clankerBustChance(outside, SECRET), random: () => 0 });
        assert.deepEqual([normal.lastTurns.at(-1).result, normal.scores[0]], ["bank", 1150]);
    });
});
