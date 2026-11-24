const crypto = require("crypto");
const mongoose = require("mongoose");
const User = require("../../models/userModel");
const CatflixPet = require("../../models/catflixPetModel");
const CatflixPlayer = require("../../models/catflixPlayerModel");
const CatflixRun = require("../../models/catflixRunModel");
const CatflixRunDay = require("../../models/catflixRunDayModel");
const { WalletError, changeWallet, playDay, spend } = require("../wallet");
const { splitPayout } = require("../forrest");
const { feedFromRuinRun } = require("../jackpotFeed");
const { CatflixError, changePet, petView } = require("./pets");
const { CATFLIX, ruinPayout } = require("../../../shared/catflix/rules.js");
const engine = require("../../public/pet-forge/ruin-engine.js");

// Ruin Run in the database: runs from start (the bet taken, the seed picked
// here) to finish (what the page says the player did, played again here:
// ruin-engine.js replay, so the speed is the server's), the day's cash-outs,
// and each member's best. Every balance change goes through utils/wallet.js.
// Everything a run loses goes to the Box Office Scratch jackpots
// (config/jackpotFeed.js): see letGo. Run like Forrest Bounce's
// (utils/forrest.js): the same day, cash-outs and free play.

const RULES = CATFLIX.ruinRun;
// A run can't have played more ticks than the clock allows since it started,
// give or take this much (the page starts a moment after).
const SLACK_MS = 3000;
// What the page sends has to come back within this long of the start (a
// run lasts 30 minutes at most).
const RUN_LIFETIME_MS = (engine.MAX_TICKS / engine.TICK_HZ) * 1000 + 5 * 60 * 1000;
// A run still playing this long after it started is let go by the sweep.
const ABANDONED_MS = RUN_LIFETIME_MS + 5 * 60 * 1000;

const isId = (id) => mongoose.isValidObjectId(id);

function runView(run) {
    return {
        id: String(run._id),
        bet: run.bet,
        free: run.free,
        status: run.status,
        speed: run.speed,
        metres: run.metres,
        endedBy: run.endedBy,
        worth: run.worth,
        startedAt: run.startedAt,
    };
}

// What the page shows: { cashOutsLeft, best (metres), waiting (a run still
// to be cashed out or thrown away, after a refresh), rules }.
async function statusOf(userId, day = playDay()) {
    const [today, player, waiting] = await Promise.all([
        CatflixRunDay.findOne({ user: userId, day }).select("cashOuts").lean(),
        CatflixPlayer.findOne({ user: userId }).select("runBest").lean(),
        CatflixRun.findOne({ user: userId, status: "finished" }).sort({ finishedAt: -1 }).lean(),
    ]);
    return {
        cashOutsLeft: Math.max(0, RULES.cashOutsPerDay - (today?.cashOuts ?? 0)),
        best: player?.runBest ?? 0,
        waiting: waiting ? runView(waiting) : null,
        rules: RULES,
    };
}

// What a run lost: what its bet took, less what came back (`back`: a
// cash-out's payout). Free play loses nothing.
const lostBy = (run, back = 0) => Math.max(0, (run.paid?.pp ?? 0) + (run.paid?.ppp ?? 0) - back);

// Lets a run go (discarded, with `set`) if it's still as `filter` says, and
// its whole bet goes to the scratch jackpots. Only the call that lets it go
// feeds them, so a bet is only ever fed once. Resolves to the run, or null.
async function letGo(filter, set = {}) {
    const run = await CatflixRun.findOneAndUpdate(filter, { $set: { ...set, status: "discarded" } }, { new: true }).lean();
    if (run) await feedFromRuinRun(lostBy(run));
    return run;
}

// Starts a run: `bet` a whole number of points from 1 to the most (taken
// now, PP first, then P-PP), or 0 for free play, which only opens once the
// day's cash-outs are used. Their pet runs it, so they need one. Any run
// they had waiting is let go. Resolves to the run, with its seed for the
// page to play.
async function startRun(userId, bet) {
    const free = bet === 0;
    if (!free && (!Number.isInteger(bet) || bet < 1 || bet > RULES.maxBet)) throw new CatflixError(`Bet a whole number of points from 1 to ${RULES.maxBet.toLocaleString("en-US")}.`);
    if (!(await CatflixPet.exists({ owner: userId }))) throw new CatflixError("Hatch your egg first: your pet does the running.", 409);
    const day = playDay();
    const today = await CatflixRunDay.findOne({ user: userId, day }).select("cashOuts").lean();
    const used = today?.cashOuts ?? 0;
    if (free && used < RULES.cashOutsPerDay) throw new CatflixError(`Free play opens once your ${RULES.cashOutsPerDay} cash-outs today are used.`, 409);
    if (!free && used >= RULES.cashOutsPerDay) throw new CatflixError(`Your ${RULES.cashOutsPerDay} cash-outs today are used: free play until 12:00.`, 409);

    const waiting = await CatflixRun.find({ user: userId, status: { $in: ["playing", "finished"] } }).select("_id").lean();
    for (const { _id } of waiting) await letGo({ _id, status: { $in: ["playing", "finished"] } });

    const id = new mongoose.Types.ObjectId();
    let paid = { pp: 0, ppp: 0 };
    if (!free) {
        const taken = await spend(userId, bet, { reason: "ruinRunEntry", catflix: id });
        paid = { pp: 0 - taken.pp, ppp: 0 - taken.ppp };
    }
    const run = await CatflixRun.create({ _id: id, user: userId, day, seed: crypto.randomInt(0, 0x7fffffff), bet, free, paid });
    return { ...runView(run), seed: run.seed };
}

// What the page sends: the ticks it played, and what the player did (tick ×
// 8 + what: 0 to 4), in order, never past the end, and no more than a few a
// tick.
function checkInputs(inputs, endTick) {
    const bad = () => new CatflixError("That run doesn't add up.");
    if (!Number.isInteger(endTick) || endTick < 1 || endTick > engine.MAX_TICKS) throw bad();
    if (!Array.isArray(inputs) || inputs.length > endTick * 2 + 10) throw bad();
    for (let i = 0; i < inputs.length; i++) {
        const value = inputs[i];
        if (!Number.isInteger(value) || value < 0 || value % 8 > engine.RELEASE || Math.floor(value / 8) >= endTick || (i > 0 && Math.floor(value / 8) < Math.floor(inputs[i - 1] / 8))) throw bad();
    }
}

// A run is over on the page: `inputs` (what the player did) and `endTick`
// (the ticks it played). Played again here: that's the speed. Their pet
// gains confidence for the run, and a new best is kept. Resolves to
// { run, pet }.
async function finishRun(userId, runId, { inputs, endTick } = {}, now = new Date()) {
    if (!isId(runId)) throw new CatflixError("That run is over.", 404);
    checkInputs(inputs, endTick);
    const run = await CatflixRun.findOne({ _id: runId, user: userId, status: "playing" }).lean();
    if (!run) throw new CatflixError("That run is over.", 404);

    const elapsed = now.getTime() - run.startedAt.getTime();
    const tooFast = (endTick / engine.TICK_HZ) * 1000 > elapsed + SLACK_MS;
    if (tooFast || elapsed > RUN_LIFETIME_MS) {
        await letGo({ _id: run._id, status: "playing" }, { finishedAt: now });
        throw new CatflixError(tooFast ? "That run went faster than the clock, so it doesn't count." : "That run took too long to come back, so it doesn't count.", 409);
    }

    const result = engine.replay({ seed: run.seed, inputs, endTick });
    const worth = run.free ? 0 : ruinPayout(run.bet, result.speed);
    const finished = await CatflixRun.findOneAndUpdate(
        { _id: run._id, status: "playing" },
        {
            $set: {
                // Free play is never cashed out: nothing to wait for.
                status: run.free ? "discarded" : "finished",
                finishedAt: now,
                ticks: result.ticks,
                speed: result.speed,
                metres: result.metres,
                endedBy: result.endedBy,
                worth,
            },
        },
        { new: true }
    ).lean();
    if (!finished) throw new CatflixError("That run is over.", 404);

    await CatflixPlayer.updateOne({ user: userId }, { $max: { runBest: result.metres } }, { upsert: true });
    let pet = null;
    try {
        pet = await changePet({ owner: userId }, (current) => ({ meters: { ...current.meters, confidence: Math.min(CATFLIX.meterMax, current.meters.confidence + RULES.confidence) } }), now);
    } catch (error) {
        // No pet any more (or it's busy): the run still counts.
        if (!(error instanceof CatflixError)) throw error;
    }
    return { run: runView(finished), pet: pet ? petView(pet, userId) : null };
}

// Cashes a finished run out: one of today's cash-outs, and what its speed
// is worth. Less back than the bet: the difference goes to the scratch
// jackpots.
async function cashOut(userId, runId) {
    if (!isId(runId)) throw new CatflixError("That run can't be cashed out.", 404);
    const run = await CatflixRun.findOne({ _id: runId, user: userId, status: "finished", free: false }).lean();
    if (!run) throw new CatflixError("That run can't be cashed out.", 404);

    const day = playDay();
    try {
        await CatflixRunDay.updateOne({ user: userId, day, cashOuts: { $lt: RULES.cashOutsPerDay } }, { $inc: { cashOuts: 1 } }, { upsert: true });
    } catch (error) {
        // The day's there, but full: the upsert tried to make another.
        if (error.code === 11000) throw new CatflixError(`Your ${RULES.cashOutsPerDay} cash-outs today are used. More at 12:00.`, 409);
        throw error;
    }

    const total = run.worth;
    const payout = splitPayout(run.paid, total);
    const cashed = await CatflixRun.findOneAndUpdate({ _id: run._id, status: "finished" }, { $set: { status: "cashed", payout } }, { new: true }).lean();
    if (!cashed) {
        await CatflixRunDay.updateOne({ user: userId, day, cashOuts: { $gt: 0 } }, { $inc: { cashOuts: -1 } });
        throw new CatflixError("That run can't be cashed out.", 404);
    }
    if (total > 0) await changeWallet(userId, () => payout, { reason: "ruinRunCashOut", catflix: run._id });
    await feedFromRuinRun(lostBy(cashed, total));
    return { run: runView(cashed), payout: total };
}

// Throws a finished run away: no points, and the cash-out kept. Its bet
// goes to the scratch jackpots.
async function discard(userId, runId) {
    if (!isId(runId)) throw new CatflixError("That run is over.", 404);
    const run = await letGo({ _id: runId, user: userId, status: "finished" });
    if (!run) throw new CatflixError("That run is over.", 404);
    return runView(run);
}

// Every 10 minutes (jobs/catflixSweep.js): runs nobody came back to finish
// are let go, their bets to the scratch jackpots. Resolves to how many.
async function sweepRuns(now = Date.now()) {
    const stale = await CatflixRun.find({ status: "playing", startedAt: { $lt: new Date(now - ABANDONED_MS) } }).select("_id").lean();
    let count = 0;
    for (const { _id } of stale) {
        if (await letGo({ _id, status: "playing" }, { finishedAt: new Date(now) })) count += 1;
    }
    return count;
}

// Their points too, for the page's bet buttons.
async function pointsOf(userId) {
    const user = await User.findById(userId).select("wallet").lean();
    return (user?.wallet?.pp ?? 0) + (user?.wallet?.ppp ?? 0);
}

module.exports = { WalletError, statusOf, startRun, finishRun, cashOut, discard, sweepRuns, pointsOf, RUN_LIFETIME_MS };
