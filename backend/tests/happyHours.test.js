// Happy hours (games/happyHours.js): the Helsinki-time windows, and what
// each one changes. No database needed.
//   From backend/:  npm test
const { test, describe } = require("node:test");
const assert = require("node:assert/strict");

const { happyHour, helsinkiMinutes, goldenTicketOneIn, slotLuck, clankerBustChance } = require("../games/happyHours");
const { newLayout, GOLDEN } = require("../games/scratch/engine");
const { LUCK, targetRtp, tableFor } = require("../games/slots/luck");
const { FARKLE_CHANCE, rollWithBust, cryptoDice, newGame, playBot } = require("../games/farkle/engine");
const { SCRATCH } = require("../../shared/scratch/config.js");
const { hasScoringDice } = require("../../shared/farkle/rules.js");

// Helsinki is UTC+2 in winter and UTC+3 in summer.
const winter = (time) => new Date(`2026-11-10T${time}:00+02:00`);
const summer = (time) => new Date(`2026-07-01T${time}:00+03:00`);

describe("the windows", () => {
    test("go by the clock in Helsinki, summer and winter", () => {
        assert.equal(helsinkiMinutes(winter("12:30")), 12 * 60 + 30);
        assert.equal(helsinkiMinutes(summer("12:30")), 12 * 60 + 30);
        assert.equal(helsinkiMinutes(winter("00:05")), 5);
    });

    test("take in their first minute but not their last", () => {
        const at = (key, time) => [happyHour(key, winter(time)), happyHour(key, summer(time))];
        for (const [key, before, first, last, after] of [
            ["scratch", "12:29", "12:30", "14:29", "14:30"],
            ["slots", "12:29", "12:30", "12:59", "13:00"],
            ["clanker", "11:59", "12:00", "16:44", "16:45"],
        ]) {
            assert.deepEqual(at(key, before), [false, false], `${key} ${before}`);
            assert.deepEqual(at(key, first), [true, true], `${key} ${first}`);
            assert.deepEqual(at(key, last), [true, true], `${key} ${last}`);
            assert.deepEqual(at(key, after), [false, false], `${key} ${after}`);
        }
    });
});

describe("scratch cards: the Golden Ticket 4 times as often, 12:30 to 14:30", () => {
    test("one card in 50 instead of 200, on every ticket type", () => {
        assert.equal(goldenTicketOneIn(SCRATCH.goldenTicketOneIn, winter("13:00")), SCRATCH.goldenTicketOneIn / 4);
        assert.equal(goldenTicketOneIn(SCRATCH.goldenTicketOneIn, winter("15:00")), SCRATCH.goldenTicketOneIn);
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

describe("the slot machine: RTP 99% to 106%, 12:30 to 13:00", () => {
    test("richest active 99%, poorest 106%, everyone else in between or at 99%", () => {
        const luck = slotLuck(LUCK, winter("12:45"));
        assert.equal(targetRtp({ active: true, rank: 1, count: 10 }, luck), 0.99);
        assert.ok(Math.abs(targetRtp({ active: true, rank: 10, count: 10 }, luck) - 1.06) < 1e-9);
        assert.equal(targetRtp({ active: false }, luck), 0.99);
        const solo = targetRtp({ active: true, rank: 1, count: 1 }, luck);
        assert.ok(solo >= 0.99 && solo <= 1.06);
        for (const rtp of [0.99, 1.06, solo]) assert.equal(tableFor(rtp).bucket, Math.round(rtp * 100));
    });

    test("outside it, the usual numbers", () => {
        assert.equal(slotLuck(LUCK, winter("13:00")), LUCK);
        assert.equal(targetRtp({ active: true, rank: 1, count: 10 }, slotLuck(LUCK, winter("12:29"))), LUCK.richestRtp);
    });
});

describe("Clanker: busts on its third roll, 12:00 to 16:45", () => {
    test("50% on a turn's third roll, 70% on its 3rd and 5th turns, nothing else", () => {
        assert.equal(clankerBustChance(winter("11:59")), null);
        assert.equal(clankerBustChance(winter("16:45")), null);
        const chance = clankerBustChance(winter("14:00"));
        assert.deepEqual([1, 2, 3, 4, 5, 6].map((turn) => chance({ turn, roll: 3 })), [0.5, 0.5, 0.7, 0.5, 0.7, 0.5]);
        assert.deepEqual([1, 2, 4, 5].map((roll) => chance({ turn: 3, roll })), [0, 0, 0, 0]);
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

    test("in the window, its third roll can be swapped for a Farkle; its turns are counted as its own", () => {
        const asked = [];
        const bustChance = (at) => {
            asked.push(at);
            return clankerBustChance(winter("14:00"))(at);
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

    test("when the dice say no, or outside the window, it plays its dice as rolled", () => {
        const lucky = playBot(thirdTurn(), 0, scripted(), { bustChance: clankerBustChance(winter("14:00")), random: () => 999999 });
        assert.deepEqual([lucky.lastTurns.at(-1).result, lucky.scores[0]], ["bank", 1150]);
        const normal = playBot(thirdTurn(), 0, scripted(), { bustChance: clankerBustChance(winter("17:00")), random: () => 0 });
        assert.deepEqual([normal.lastTurns.at(-1).result, normal.scores[0]], ["bank", 1150]);
    });
});
