// Crash: the engine on its own (games/crash/engine.js): the ticks, how a
// round ends, auto-cash-outs and payouts. No database.
//
// From backend/: npm test (or node --test tests/crash.test.js)
const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const { CRASH, ENDINGS, CrashRound, cashOutsAt, payoutFor, secureRandom } = require("../games/crash/engine");

// Random numbers in a set order, then the last one for ever.
const scripted = (...values) => {
    let i = 0;
    return () => values[Math.min(i++, values.length - 1)];
};
// A seeded generator (mulberry32), so the long-run check is the same every run.
function seeded(seed) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const UP = 0.1; // between h and h + (1 - h) / 2
const DOWN = 0.9;
const BOOM = 0.001; // below h

describe("the engine", () => {
    test("the config: d cancels the crash chance, and a round starts at 0.99x", () => {
        assert.equal(CRASH.drift, CRASH.crashChance / (1 - CRASH.crashChance));
        assert.equal(CRASH.start, 0.99);
        assert.equal(CRASH.tickMs, 100);
        assert.equal(CRASH.maxTicks, 600);
        assert.equal(CRASH.cap, 25);
        // One step up and one down, with no crash, on average stays put
        // once the crash chance is counted.
        const { crashChance: h, swing: s, drift: d } = CRASH;
        const expected = (1 - h) * (1 + d) * (0.5 * (1 + s) + 0.5 * (1 - s));
        assert.ok(Math.abs(expected - 1) < 1e-12);
    });

    test("a tick goes up, down, or crashes to 0", () => {
        const round = new CrashRound(scripted(UP, DOWN, BOOM));
        const { drift: d, swing: s } = CRASH;
        const first = round.step();
        assert.equal(first.tick, 1);
        assert.ok(Math.abs(first.multiplier - 0.99 * (1 + d) * (1 + s)) < 1e-6);
        assert.equal(first.ended, null);
        const second = round.step();
        assert.ok(Math.abs(second.multiplier - first.multiplier * (1 + d) * (1 - s)) < 1e-6);
        const third = round.step();
        assert.deepEqual([third.multiplier, third.ended], [0, ENDINGS.crash]);
        assert.equal(round.step(), null, "nothing after the end");
        assert.equal(round.path.length, 4, "the start and every tick");
        assert.equal(round.path[0], 0.99);
    });

    test("the 25x cap and the 60 second limit end a round", () => {
        const capped = new CrashRound(scripted(UP)).playOut();
        assert.equal(capped.ended, ENDINGS.cap);
        assert.equal(capped.multiplier, 25);
        assert.ok(capped.tick < CRASH.maxTicks);

        // Up, down, up, down, never crashing: only the drift moves it
        // (about 15x by the end), and time runs out before the cap.
        let flip = false;
        const timed = new CrashRound(() => ((flip = !flip) ? UP : DOWN)).playOut();
        assert.equal(timed.ended, ENDINGS.time);
        assert.equal(timed.tick, CRASH.maxTicks);
        assert.ok(timed.multiplier > 1 && timed.multiplier < CRASH.cap);
    });

    test("auto-cash-out: the first tick at or above the target, at that tick's multiplier; everyone at the cap or time limit; nobody on a crash", () => {
        const players = [{ id: "a", autoAt: 1.5 }, { id: "b", autoAt: null }, { id: "c", autoAt: 2 }];
        assert.deepEqual(cashOutsAt(players, { multiplier: 1.49, ended: null }), []);
        assert.deepEqual(cashOutsAt(players, { multiplier: 1.52, ended: null }).map(({ player, multiplier }) => [player.id, multiplier]), [["a", 1.52]]);
        assert.equal(cashOutsAt(players, { multiplier: 25, ended: ENDINGS.cap }).length, 3);
        assert.deepEqual(cashOutsAt(players, { multiplier: 1.3, ended: ENDINGS.time }).map(({ multiplier }) => multiplier), [1.3, 1.3, 1.3]);
        assert.deepEqual(cashOutsAt(players, { multiplier: 0, ended: ENDINGS.crash }), []);
    });

    test("payouts: whole points, rounded down; the stake back in its own coins, profit in P-PP; under 1x split like the bet", () => {
        assert.deepEqual(payoutFor({ pp: 10, ppp: 0 }, 2.5), { pp: 10, ppp: 15, total: 25 });
        assert.deepEqual(payoutFor({ pp: 6, ppp: 4 }, 1.87), { pp: 6, ppp: 12, total: 18 });
        assert.deepEqual(payoutFor({ pp: 10, ppp: 0 }, 1.1), { pp: 10, ppp: 1, total: 11 }, "no point lost to 10 x 1.1");
        assert.deepEqual(payoutFor({ pp: 10, ppp: 0 }, 0.7), { pp: 7, ppp: 0, total: 7 });
        assert.deepEqual(payoutFor({ pp: 6, ppp: 4 }, 0.55), { pp: 3, ppp: 2, total: 5 });
        assert.deepEqual(payoutFor({ pp: 1, ppp: 0 }, 1.99), { pp: 1, ppp: 0, total: 1 }, "a 1 point bet can't win below 2x");
        assert.deepEqual(payoutFor({ pp: 3, ppp: 0 }, 0.2), { pp: 0, ppp: 0, total: 0 });
        assert.deepEqual(payoutFor({ pp: 0, ppp: 8 }, 0), { pp: 0, ppp: 0, total: 0 });
    });

    test("a fair walk: cashing out at 2x returns about 0.99 over many rounds", () => {
        const random = seeded(20261117);
        const rounds = 40000;
        let total = 0;
        for (let i = 0; i < rounds; i++) {
            const round = new CrashRound(random);
            let paid = null;
            while (!round.ended && paid === null) {
                const tick = round.step();
                if (tick.ended !== ENDINGS.crash && tick.multiplier >= 2) paid = tick.multiplier;
                else if (tick.ended === ENDINGS.time) paid = tick.multiplier;
            }
            total += paid ?? 0;
        }
        const average = total / rounds;
        assert.ok(average > 0.97 && average < 1.01, `got ${average}`);
    });

    test("the secure source gives numbers from 0 up to 1", () => {
        const random = secureRandom(60);
        for (let i = 0; i < 1000; i++) {
            const value = random();
            assert.ok(value >= 0 && value < 1);
        }
    });
});
