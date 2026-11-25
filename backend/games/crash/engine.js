const crypto = require("crypto");

// Crash: one round's multiplier, worked out live on the server, one tick at
// a time. It starts at 0.99x and wanders up and down like a stock chart
// until it crashes to 0, reaches the 25x cap, or runs out of time (60 s).
// No database and no timers here: games/crash/rooms.js (stage 2) runs the
// clock and the players, and keeps the path when the round is over.
//
// Every tick: with chance CRASH.crashChance (h) the round crashes. If it
// doesn't, the multiplier is pushed up a little (the drift, d) and then
// swings up or down by CRASH.swing (s), 50/50:
//     m = m * (1 + d) * (1 + s)    or    m = m * (1 + d) * (1 - s)
// d = h / (1 - h) exactly cancels the chance of crashing, so the
// multiplier is a fair random walk: on average it stays where it is. So
// whatever a player does (cash out early, late, at a target, or ride it
// out), they get back on average what the round started at: 0.99 of their
// bet, a 99% RTP (a little under where the 25x cap clips a round, and
// less for small bets, since payouts are whole points rounded down).
//
// Nothing that could tell what's coming leaves the server: the random
// numbers are drawn as each tick is made, from crypto (secureRandom).
// npm run sim:crash checks the numbers (scripts/simulate-crash.js).

const CRASH = {
    // How often the multiplier moves: 10 ticks a second.
    tickMs: 100,
    // h: the chance, every tick, that the round crashes to 0.
    crashChance: 0.005,
    // s: how far it swings up or down each tick, as a share of itself.
    swing: 0.03,
    // d: the push up each tick that makes up for the chance of crashing.
    drift: 0.005 / (1 - 0.005),
    // Where every round starts.
    start: 0.99,
    // The longest a round lasts: 600 ticks, 60 seconds. Everyone still in
    // is cashed out at the multiplier then.
    maxTicks: 600,
    // The highest it goes: everyone still in is cashed out at 25x.
    cap: 25,
};

// How a round ended.
const ENDINGS = { crash: "crash", cap: "cap", time: "time" };

// Multipliers are kept to 6 decimals, so the path saved for replays is the
// very one the payouts were worked out from.
const tidy = (m) => Math.round(m * 1e6) / 1e6;

// Random numbers from 0 (included) to 1 (not), from crypto: nothing can
// predict them. Bytes are fetched in batches, 6 to a number (48 bits), so
// a tick doesn't wait on the system for each one. They never leave the
// server.
function secureRandom(batch = 6 * 1024) {
    let bytes = crypto.randomBytes(batch);
    let at = 0;
    return () => {
        if (at + 6 > bytes.length) {
            bytes = crypto.randomBytes(batch);
            at = 0;
        }
        const value = bytes.readUIntBE(at, 6);
        at += 6;
        return value / 2 ** 48;
    };
}

// One round's multiplier. `random` gives numbers from 0 to 1 (secure by
// default; tests and the simulation can pass their own). Each step() makes
// the next tick: { tick, multiplier, ended }, `ended` being null while the
// round goes on, or "crash", "cap" or "time" on its last tick.
class CrashRound {
    constructor(random = secureRandom(), config = CRASH) {
        this.random = random;
        this.config = config;
        this.tick = 0;
        this.multiplier = config.start;
        this.ended = null;
        // Every tick's multiplier, the start first: saved after the round.
        this.path = [config.start];
    }

    step() {
        if (this.ended) return null;
        const { crashChance: h, swing: s, drift: d, cap, maxTicks } = this.config;
        this.tick += 1;

        // One number decides the tick: below h it crashes; otherwise the
        // rest of the range is split evenly between up and down.
        const u = this.random();
        let m;
        if (u < h) {
            m = 0;
            this.ended = ENDINGS.crash;
        } else {
            const up = u < h + (1 - h) / 2;
            m = tidy(this.multiplier * (1 + d) * (up ? 1 + s : 1 - s));
            if (m >= cap) {
                m = cap;
                this.ended = ENDINGS.cap;
            } else if (this.tick >= maxTicks) {
                this.ended = ENDINGS.time;
            }
        }

        this.multiplier = m;
        this.path.push(m);
        return { tick: this.tick, multiplier: m, ended: this.ended };
    }

    // Plays the whole round at once (the simulation and tests).
    playOut() {
        while (!this.ended) this.step();
        return this;
    }
}

// Who is cashed out on a tick, and at what. `players`: those still in,
// each with `autoAt` (their auto-cash-out target, or null). A target is met
// on the first tick the multiplier is at or above it, and paid at that
// tick's multiplier. At the cap or the time limit, everyone still in is
// cashed out at the multiplier; on a crash, nobody is. Returns
// [{ player, multiplier }].
function cashOutsAt(players, { multiplier, ended }) {
    if (ended === ENDINGS.crash) return [];
    if (ended === ENDINGS.cap || ended === ENDINGS.time) return players.map((player) => ({ player, multiplier }));
    return players.filter((player) => player.autoAt !== null && player.autoAt !== undefined && multiplier >= player.autoAt).map((player) => ({ player, multiplier }));
}

// What a cash-out at `multiplier` pays for a bet that was paid as `paid`
// ({ pp, ppp }, whole points). The wallet only holds whole points, so the
// payout is the bet times the multiplier, rounded down. Up to the stake,
// it comes back in the coins the bet was paid in; anything above the stake
// is profit, in P-PP. Below the stake (a cash-out under 1x), what's left is
// split between PP and P-PP in the same shares as the bet, any odd point
// going to P-PP. Returns { pp, ppp, total }.
// `pays`: the share of the multiplier a cash-out pays (1; a player who's
// taken their betting cap off, shared/crash/rules.js uncappedPays).
function payoutFor(paid, multiplier, protectShare = 0, pays = 1) {
    const bet = paid.pp + paid.ppp;
    // A hair added so 10 x 1.1 (11.000000000000002 or 10.999999999999998)
    // doesn't round down a whole point.
    let total = Math.max(0, Math.floor(bet * multiplier * pays + 1e-9));
    // A protected round (5 or more players): `protectShare` of what was lost
    // comes back too, rounded down.
    if (total < bet && protectShare > 0) total += Math.floor((bet - total) * protectShare + 1e-9);
    if (total >= bet) return { pp: paid.pp, ppp: paid.ppp + (total - bet), total };
    const pp = bet > 0 ? Math.floor((total * paid.pp) / bet) : 0;
    return { pp, ppp: total - pp, total };
}

module.exports = { CRASH, ENDINGS, secureRandom, CrashRound, cashOutsAt, payoutFor };
