const crypto = require("crypto");
const mongoose = require("mongoose");
const SlotMachine = require("../models/slotMachineModel");
const SlotSpin = require("../models/slotSpinModel");
const SlotSnapshot = require("../models/slotSnapshotModel");
const User = require("../models/userModel");
const Review = require("../models/reviewModel");
const WalletTx = require("../models/walletTxModel");
const { changeWallet, spend, leaderboardStages, helsinkiDay, helsinkiHour } = require("./wallet");
const { noteSlotTriple, noteSlotJackpot } = require("./notify");
const { CENTS, toPp, SlotError, drawGrid, evaluate, splitBet, checkBet } = require("../games/slots/engine");
const { LUCK, targetRtp, tableFor } = require("../games/slots/luck");
const { SLOTS } = require("../../shared/slots/config.js");

// The Slot Machine in the database: the machine's credits, spins, cashing
// out, and the daily leaderboard snapshot. The game itself is in
// games/slots/engine.js, the luck system in games/slots/luck.js, and the
// paytable in shared/slots/config.js.
//
// Moving points between the wallet and the machine, and each spin, run as
// one MongoDB transaction, so a crash halfway can't take points from one
// without putting them in the other, or take a bet without logging the
// spin. Transactions need MongoDB running as a replica set (see the README).

// ---- Days ----

// The Slot Machine's day runs from 12:00 to 12:00 Helsinki time, starting
// right after the daily payout. Its key is the date it starts on: 11:59 on
// 3 November is still "2026-11-02". Summer and winter time make no
// difference: it goes by the clock in Helsinki.
function slotDay(date = new Date()) {
    const day = helsinkiDay(date);
    if (helsinkiHour(date) >= 12) return day;

    const before = new Date(`${day}T00:00:00Z`);
    before.setUTCDate(before.getUTCDate() - 1);
    return before.toISOString().slice(0, 10);
}

// ---- The leaderboard snapshot ----

// Saves the leaderboard's order now as `day`'s snapshot, unless that day
// has one already. Run at 12:00 right after the payout (jobs/dailyPayout.js),
// and by snapshotFor if the server wasn't up then.
async function takeSnapshot(day = slotDay()) {
    const rows = await User.aggregate(leaderboardStages({ username: 1 }));
    try {
        await SlotSnapshot.create({
            _id: day,
            takenAt: new Date(),
            order: rows.map((row) => ({ user: row._id, username: row.username, total: row.pp })),
            richest: rows[0]?.pp ?? 0,
        });
    } catch (error) {
        if (error.code !== 11000) throw error;
    }
    return SlotSnapshot.findById(day).lean();
}

// `day`'s snapshot, taken now if it's missing.
async function snapshotFor(day) {
    return (await SlotSnapshot.findById(day).lean()) ?? takeSnapshot(day);
}

// Leaderboard order: most points first, ties A to Z by username.
const byLeaderboard = (a, b) => b.total - a.total || (a.username < b.username ? -1 : a.username > b.username ? 1 : 0);

// The RTP `userId` gets right now (games/slots/luck.js). Active: a review
// in the last LUCK.activeDays days, checked live, so posting one counts
// straight away. Ranked by today's snapshot among the players active right
// now; anyone active who isn't in it (a new account) is placed by what
// they hold now. Never leaves the server.
async function targetRtpFor(userId, now = new Date()) {
    const since = new Date(now.getTime() - LUCK.activeDays * 24 * 60 * 60 * 1000);
    const [writers, snapshot] = await Promise.all([
        Review.distinct("user", { createdAt: { $gte: since } }),
        snapshotFor(slotDay(now)),
    ]);

    const active = new Set(writers.map(String));
    if (!active.has(String(userId))) return targetRtp({ active: false });

    const ranked = snapshot.order.filter((entry) => active.has(String(entry.user)));
    const inSnapshot = new Set(snapshot.order.map((entry) => String(entry.user)));
    const newcomers = [...active].filter((id) => !inSnapshot.has(id));

    if (newcomers.length > 0) {
        const users = await User.find({ _id: { $in: newcomers } }).select("username wallet").lean();
        for (const user of users) {
            ranked.push({ user: user._id, username: user.username, total: (user.wallet?.pp ?? 0) + (user.wallet?.ppp ?? 0) });
        }
        ranked.sort(byLeaderboard);
    }

    const rank = ranked.findIndex((entry) => String(entry.user) === String(userId)) + 1;
    return targetRtp({ active: true, rank, count: ranked.length });
}

// ---- Transactions ----

// Makes sure the collections exist before any transaction uses them (they
// can't be created inside one on every MongoDB version).
let collectionsReady = null;
function ensureCollections() {
    collectionsReady ??= Promise.all([SlotMachine, SlotSpin, SlotSnapshot, WalletTx].map((model) => model.init()));
    return collectionsReady;
}

// Runs `work(session)` as one transaction, trying again if it clashed with
// another at the same moment. What has to wait until it's all gone through
// (telling everyone about a jackpot) goes on `session.afterCommit`; the
// list starts empty on every try, so nothing is sent twice, or for a
// transaction that was undone.
async function inTransaction(work) {
    await ensureCollections();
    const session = await mongoose.startSession();
    try {
        let result;
        await session.withTransaction(async () => {
            session.afterCommit = [];
            result = await work(session);
        });
        for (const job of session.afterCommit) {
            await job().catch((error) => console.error("Slot Machine, after a spin:", error.message));
        }
        return result;
    } finally {
        await session.endSession();
    }
}

// Their machine, made empty the first time they open it.
async function machineOf(userId, session = null) {
    await ensureCollections();
    const machine = await SlotMachine.findOne({ user: userId }).session(session).lean();
    if (machine) return machine;
    if (session) throw new SlotError(`Open ${SLOTS.name} first.`, 409);

    try {
        await SlotMachine.create({ user: userId });
    } catch (error) {
        if (error.code !== 11000) throw error;
    }
    return SlotMachine.findOne({ user: userId }).lean();
}

// Saves `update` to `machine` as it was read, adding 1 to its version.
// Inside a transaction someone else changing it first is a clash that tries
// again, so not finding it means something's badly wrong: undo it all.
async function saveMachine(session, machine, update) {
    const saved = await SlotMachine.findOneAndUpdate(
        { _id: machine._id, version: machine.version },
        { ...update, $inc: { ...update.$inc, version: 1 } },
        { session, returnDocument: "after", lean: true }
    );
    if (!saved) throw new SlotError("The machine is busy. Try again.", 409);
    return saved;
}

// The daily cap counts for `day`: last saved ones if they're for it, else 0.
function capCounts(machine, day) {
    const same = machine.capDay === day;
    return {
        capDay: day,
        pppAddedToday: same ? machine.pppAddedToday : 0,
        pppOutToday: same ? machine.pppOutToday : 0,
    };
}

// ---- What the page sees ----

// The machine as the page shows it: only the total, labelled PP.
function machineView(machine) {
    return {
        balance: toPp(machine.pp + machine.ppp),
        lastWin: toPp(machine.lastWin ?? 0),
    };
}

// A spin as the page gets it: the grid to land on, the winning lines and
// cells, the win and the machine after. Never the luck it was played with.
function spinView(spin) {
    return {
        spinId: spin.spinId,
        grid: spin.grid,
        lines: spin.lines.map(({ line, symbol, count, multiplier, cells }) => ({ line, symbol, count, multiplier, cells })),
        bet: toPp(spin.bet),
        win: toPp(spin.win),
        bigWin: spin.win >= SLOTS.bigWinMultiple * spin.bet,
        jackpot: spin.jackpot,
        balance: toPp(spin.balance.pp + spin.balance.ppp),
    };
}

async function machineFor(userId) {
    return machineView(await machineOf(userId));
}

// ---- Add credits ----

// `amount` whole points from their wallet into the machine: PP first, then
// P-PP, each landing in its own sub-balance. Moving credits into an empty
// machine starts a session; more credits add to it. P-PP moved in today
// raises today's cash-out cap by as much, so it can always go back out.
async function addCredits(userId, amount, now = new Date()) {
    if (!Number.isInteger(amount) || amount < 1) {
        throw new SlotError("Add a whole number of points, at least 1.");
    }
    await machineOf(userId);

    return inTransaction(async (session) => {
        const taken = await spend(userId, amount, { reason: "slotCredits", session });
        const fromPp = (0 - taken.pp) * CENTS;
        const fromPpp = (0 - taken.ppp) * CENTS;

        const machine = await machineOf(userId, session);
        const counts = capCounts(machine, slotDay(now));
        const held = machine.pp + machine.ppp;
        // A session starts with whatever was already in it (fractions, or
        // P-PP over yesterday's cap), so that alone can't look like tripling.
        const playSession = machine.sessionInput > 0
            ? { sessionInput: machine.sessionInput + amount * CENTS, tripled: machine.tripled }
            : { sessionInput: held + amount * CENTS, tripled: false };

        const saved = await saveMachine(session, machine, {
            $inc: { pp: fromPp, ppp: fromPpp },
            $set: { ...counts, pppAddedToday: counts.pppAddedToday + fromPpp, ...playSession },
        });
        return machineView(saved);
    });
}

// ---- Spinning ----

// Where the random numbers come from: crypto.randomInt, which can't be
// predicted. Only the tests swap it, to land the grid they need.
let randomInt = crypto.randomInt;
function useRandomSource(source) {
    randomInt = source ?? crypto.randomInt;
}

const SPIN_ID = /^[A-Za-z0-9-]{8,64}$/;

async function findSpin(userId, spinId) {
    return SlotSpin.findOne({ user: userId, spinId }).select("-rtpBucket").lean();
}

// One spin of `bet` (whole PP, or everything in the machine), sent with the
// page's own `spinId`. Sending the same spinId again (a retry after a lost
// answer, a double tap) gets the first result back instead of a second
// spin. The bet is taken PP first, then P-PP, and the win added as P-PP, in
// one update that only lands on the machine as it was read: two spins at
// once can't both spend the same credits. The grid is drawn here, with the
// player's luck, and logged with the spin.
async function spin(userId, { spinId, bet } = {}, now = new Date()) {
    if (typeof spinId !== "string" || !SPIN_ID.test(spinId)) {
        throw new SlotError("Each spin needs an id of its own.");
    }
    await machineOf(userId);

    const done = await findSpin(userId, spinId);
    if (done) return spinView(done);

    const { bucket, weights } = tableFor(await targetRtpFor(userId, now));

    try {
        return await inTransaction(async (session) => {
            const machine = await machineOf(userId, session);
            const held = machine.pp + machine.ppp;
            const betCents = checkBet(bet, held);

            const grid = drawGrid(weights, randomInt);
            const result = evaluate(grid, betCents);
            const fromBet = splitBet(machine, betCents);
            const after = { pp: machine.pp - fromBet.pp, ppp: machine.ppp - fromBet.ppp + result.win };
            const total = after.pp + after.ppp;

            // Empty ends the session. The first time it holds 3 times what
            // the session put in, everyone hears about it.
            const set = { lastWin: result.win };
            let tripled = false;
            if (total === 0) {
                Object.assign(set, { sessionInput: 0, tripled: false });
            } else if (machine.sessionInput > 0 && !machine.tripled && total >= 3 * machine.sessionInput) {
                set.tripled = true;
                tripled = true;
            }

            await saveMachine(session, machine, {
                $inc: { pp: 0 - fromBet.pp, ppp: result.win - fromBet.ppp },
                $set: set,
            });

            const [logged] = await SlotSpin.create(
                [{
                    user: userId,
                    spinId,
                    bet: betCents,
                    grid,
                    lines: result.lines,
                    win: result.win,
                    jackpot: result.jackpot,
                    balance: after,
                    rtpBucket: bucket,
                    at: now,
                }],
                { session }
            );

            if (tripled) session.afterCommit.push(() => noteSlotTriple(userId));
            if (result.jackpot) session.afterCommit.push(() => noteSlotJackpot(userId, toPp(result.win)));
            return spinView(logged.toObject());
        });
    } catch (error) {
        // The same spinId twice at the same moment: the other one played it.
        if (error.code === 11000) {
            const played = await findSpin(userId, spinId);
            if (played) return spinView(played);
        }
        throw error;
    }
}

// ---- Cash out ----

// What cashing out now would do, in cents. PP goes back as PP and P-PP as
// P-PP, each rounded down to whole points, the fractions staying in the
// machine. P-PP is also capped each day at SLOTS.cashOutCapMultiple times
// the richest member's total in today's snapshot: P-PP cashed out today,
// less P-PP added from the wallet today, can't go past it (so what they put
// in can always come back out). What's over the cap stays in the machine
// for another day. `richest` is that total, in whole points.
function cashOutQuote(machine, richest, day) {
    const counts = capCounts(machine, day);
    const cap = SLOTS.cashOutCapMultiple * richest * CENTS;
    const room = Math.max(0, cap + counts.pppAddedToday - counts.pppOutToday);
    const whole = (cents) => Math.floor(cents / CENTS) * CENTS;

    const pp = whole(machine.pp);
    const ppp = Math.min(whole(machine.ppp), whole(room));
    return {
        counts,
        pp,
        ppp,
        // What stays in the machine: fractions, and P-PP over the cap.
        stays: machine.pp + machine.ppp - pp - ppp,
        overCap: whole(machine.ppp) - ppp,
        // How much more P-PP can come out today, before and after this.
        capLeft: whole(room),
        capLeftAfter: whole(room) - ppp,
    };
}

const quoteView = (quote) => ({
    pp: toPp(quote.pp),
    ppp: toPp(quote.ppp),
    stays: toPp(quote.stays),
    overCap: toPp(quote.overCap),
    capLeft: toPp(quote.capLeft),
});

// What Cash out would do now, for its confirmation.
async function cashOutPreview(userId, now = new Date()) {
    const day = slotDay(now);
    const [machine, snapshot] = await Promise.all([machineOf(userId), snapshotFor(day)]);
    return quoteView(cashOutQuote(machine, snapshot.richest, day));
}

// Cash out: what the quote allows goes back to the wallet, and the rest
// stays in the machine. Taking out everything that can come out (only
// fractions left, nothing held back by the cap) ends the session. Returns
// the machine after and what went back.
async function cashOut(userId, now = new Date()) {
    const day = slotDay(now);
    const snapshot = await snapshotFor(day);
    await machineOf(userId);

    return inTransaction(async (session) => {
        const machine = await machineOf(userId, session);
        const quote = cashOutQuote(machine, snapshot.richest, day);

        if (quote.pp + quote.ppp === 0) {
            if (quote.overCap > 0) throw new SlotError("You've cashed out all the P-PP today's cap allows. The rest waits in the machine.", 409);
            throw new SlotError(machine.pp + machine.ppp > 0 ? "Less than 1 PP left: nothing to cash out." : "Nothing to cash out.", 409);
        }

        const set = { ...quote.counts, pppOutToday: quote.counts.pppOutToday + quote.ppp };
        if (quote.overCap === 0) Object.assign(set, { sessionInput: 0, tripled: false });

        const saved = await saveMachine(session, machine, {
            $inc: { pp: 0 - quote.pp, ppp: 0 - quote.ppp },
            $set: set,
        });
        await changeWallet(userId, () => ({ pp: quote.pp / CENTS, ppp: quote.ppp / CENTS }), { reason: "slotCashOut", session });

        return { machine: machineView(saved), paid: { pp: quote.pp / CENTS, ppp: quote.ppp / CENTS }, quote: quoteView(quote) };
    });
}

// ---- Leaving the club ----

// Their machine and every spin, for "Download my data", as the page would
// show them: the luck each spin was played with stays out.
async function slotMachineOf(userId) {
    const [machine, spins] = await Promise.all([
        SlotMachine.findOne({ user: userId }).lean(),
        SlotSpin.find({ user: userId }).select("-rtpBucket").sort({ at: -1 }).lean(),
    ]);
    return {
        machine: machine && machineView(machine),
        spins: spins.map((spin) => ({ ...spinView(spin), at: spin.at })),
    };
}

// An account was deleted: its machine and spins go. Whatever was in the
// machine goes with the account, like the wallet.
async function forgetSlotPlayer(userId) {
    await SlotMachine.deleteOne({ user: userId });
    await SlotSpin.deleteMany({ user: userId });
}

module.exports = {
    slotDay,
    takeSnapshot,
    snapshotFor,
    targetRtpFor,
    machineView,
    spinView,
    machineFor,
    addCredits,
    useRandomSource,
    spin,
    cashOutQuote,
    cashOutPreview,
    cashOut,
    slotMachineOf,
    forgetSlotPlayer,
};
