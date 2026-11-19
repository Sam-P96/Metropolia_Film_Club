const crypto = require("crypto");
const mongoose = require("mongoose");
const User = require("../models/userModel");
const ForrestRun = require("../models/forrestRunModel");
const ForrestDay = require("../models/forrestDayModel");
const ForrestPlayer = require("../models/forrestPlayerModel");
const GomokuOwned = require("../models/gomokuOwnedModel");
const { WalletError, changeWallet, playDay, spend } = require("./wallet");
const { noteForrestCashOut, noteForrestBest } = require("./notify");
const { feedFromForrest } = require("./jackpotFeed");
const { FORREST, DEFAULT_BUDDIES, multFor, payoutFor } = require("../../shared/forrest/rules.js");
const { MAX_TICKS, TICK_HZ, replay } = require("../../shared/forrest/engine.js");
const { buddyChoices } = require("../../shared/forrest/buddies.js");

// Forrest Bounce in the database: who's playing with which buddies, runs
// from start (the entry taken, the seed picked here) to finish (the page's
// taps played again here: shared/forrest/engine.js replay, so the score is
// the server's), the day's cash-outs, and the best runs. Every balance
// change goes through utils/wallet.js. Everything a run loses goes to the
// Box Office Scratch jackpots (config/jackpotFeed.js): see letGo.

class ForrestError extends Error {
    constructor(message, status = 400) {
        super(message);
        this.status = status;
    }
}

// A run can't have played more steps than the clock allows since it
// started, give or take this much (the page starts a moment after).
const SLACK_MS = 3000;
// Taps have to come back within this long of the start (a run lasts 20
// minutes at most).
const RUN_LIFETIME_MS = 25 * 60 * 1000;
// A run still playing this long after it started is let go by the sweep:
// past RUN_LIFETIME_MS it can't count, and a little more so a run coming
// back right at the end isn't caught halfway.
const ABANDONED_MS = RUN_LIFETIME_MS + 5 * 60 * 1000;

const isId = (id) => mongoose.isValidObjectId(id);

// ---- Buddies ----

const ownedPieces = (userId) => GomokuOwned.find({ user: userId }).distinct("item");

// Their two buddies, if they still have both (a refunded shop piece goes),
// or the frog and the rabbit.
function buddiesFrom(saved, choices) {
    const ok = Array.isArray(saved) && saved.length === 2 && saved[0] !== saved[1] && saved.every((emoji) => choices.some((choice) => choice.emoji === emoji));
    return ok ? saved : [...DEFAULT_BUDDIES];
}

// Picks the two buddies: [the one who starts on the branch, the one on the
// seesaw], two different ones they can use.
async function setBuddies(userId, buddies) {
    const choices = buddyChoices(await ownedPieces(userId));
    if (!Array.isArray(buddies) || buddies.length !== 2 || buddies[0] === buddies[1]) throw new ForrestError("Pick two different buddies.");
    if (!buddies.every((emoji) => choices.some((choice) => choice.emoji === emoji))) {
        throw new ForrestError("You can bounce the frog, the rabbit, or an animal you've bought in the Infinite Gomoku shop.");
    }
    await ForrestPlayer.updateOne({ _id: userId }, { $set: { buddies } }, { upsert: true });
    return buddies;
}

// ---- Where they stand ----

// The best runs on the site, best first: [{ user, fruit, score, level, at }].
async function leaderboard(limit = 5) {
    const players = await ForrestPlayer.find({ best: { $gt: 0 } }).sort({ best: -1, bestAt: 1 }).limit(limit).lean();
    const users = await User.find({ _id: { $in: players.map((player) => player._id) } }).select("username avatarUrl").lean();
    const byId = new Map(users.map((user) => [String(user._id), user]));
    return players
        .filter((player) => byId.has(String(player._id)))
        .map((player) => ({ user: byId.get(String(player._id)), fruit: player.best, score: player.bestScore, level: player.bestLevel, at: player.bestAt }));
}

function runView(run) {
    return {
        id: String(run._id),
        cost: run.cost,
        mult: run.mult,
        free: run.free,
        status: run.status,
        score: run.score,
        fruit: run.fruit,
        level: run.level,
        ticks: run.ticks,
        endedBy: run.endedBy,
        payout: payoutFor(run.score),
        startedAt: run.startedAt,
    };
}

// Everything the page shows: { pp, ppp, points (the two together),
// cashOutsLeft, buddies, choices, best, leaderboard, waiting } (`waiting`:
// a scored run still to be cashed out or thrown away, after a refresh).
async function statusOf(userId, day = playDay()) {
    const [user, today, player, owned, top, waiting] = await Promise.all([
        User.findById(userId).select("wallet").lean(),
        ForrestDay.findOne({ user: userId, day }).select("cashOuts").lean(),
        ForrestPlayer.findById(userId).lean(),
        ownedPieces(userId),
        leaderboard(),
        ForrestRun.findOne({ user: userId, status: "finished" }).sort({ finishedAt: -1 }).lean(),
    ]);
    const choices = buddyChoices(owned);
    return {
        pp: user?.wallet?.pp ?? 0,
        ppp: user?.wallet?.ppp ?? 0,
        points: (user?.wallet?.pp ?? 0) + (user?.wallet?.ppp ?? 0),
        cashOutsLeft: Math.max(0, FORREST.cashOutsPerDay - (today?.cashOuts ?? 0)),
        buddies: buddiesFrom(player?.buddies, choices),
        choices,
        best: player?.best ?? 0,
        leaderboard: top,
        waiting: waiting ? runView(waiting) : null,
    };
}

// ---- A run ----

// What a run lost: what its entry took, less what came back (`back`: a
// cash-out's payout). Free play loses nothing.
const lostBy = (run, back = 0) => Math.max(0, (run.paid?.pp ?? 0) + (run.paid?.ppp ?? 0) - back);

// Lets a run go (discarded, with `set`) if it's still as `filter` says,
// and its whole entry goes to the scratch jackpots. Only the call that
// lets it go feeds them, so an entry is only ever fed once. Resolves to
// the run, or null if it wasn't there to let go.
async function letGo(filter, set = {}) {
    const run = await ForrestRun.findOneAndUpdate(filter, { $set: { ...set, status: "discarded" } }, { new: true }).lean();
    if (run) await feedFromForrest(lostBy(run));
    return run;
}

// Starts a run: `cost` one of the entries (taken now, PP first, then
// P-PP), or 0 for free play, which only opens once the day's cash-outs are
// used. Any run they had waiting is let go. Resolves to the run, with its
// seed for the page to play.
async function startRun(userId, cost) {
    const free = cost === 0;
    if (!free && !FORREST.entries.includes(cost)) throw new ForrestError("Pick one of the entries.");
    const day = playDay();
    const today = await ForrestDay.findOne({ user: userId, day }).select("cashOuts").lean();
    const used = today?.cashOuts ?? 0;
    if (free && used < FORREST.cashOutsPerDay) throw new ForrestError(`Free play opens once your ${FORREST.cashOutsPerDay} cash-outs today are used.`, 409);
    if (!free && used >= FORREST.cashOutsPerDay) throw new ForrestError(`Your ${FORREST.cashOutsPerDay} cash-outs today are used: free play until 12:00.`, 409);

    const waiting = await ForrestRun.find({ user: userId, status: { $in: ["playing", "finished"] } }).select("_id").lean();
    for (const { _id } of waiting) await letGo({ _id, status: { $in: ["playing", "finished"] } });

    const id = new mongoose.Types.ObjectId();
    let paid = { pp: 0, ppp: 0 };
    if (!free) {
        const taken = await spend(userId, cost, { reason: "forrestEntry", forrest: id });
        paid = { pp: 0 - taken.pp, ppp: 0 - taken.ppp };
    }
    const run = await ForrestRun.create({ _id: id, user: userId, day, seed: crypto.randomInt(0, 0x7fffffff), cost, mult: multFor(cost), free, paid });
    return { ...runView(run), seed: run.seed };
}

// The taps the page sends: whole steps from 0 up to the end, in order, no
// faster than 20 a second.
function checkTaps(taps, endTick) {
    if (!Number.isInteger(endTick) || endTick < 1 || endTick > MAX_TICKS) throw new ForrestError("That run doesn't add up.");
    if (!Array.isArray(taps) || taps.length > Math.ceil(endTick / 6) + 1) throw new ForrestError("That run doesn't add up.");
    for (let i = 0; i < taps.length; i++) {
        if (!Number.isInteger(taps[i]) || taps[i] < 0 || taps[i] > endTick || (i > 0 && taps[i] <= taps[i - 1])) throw new ForrestError("That run doesn't add up.");
    }
}

// A run is over on the page: `taps` (the steps it tapped on) and `endTick`
// (the steps it played). Played again here; that's the score. A new best
// goes out to everyone. Resolves to { run, best: { personal, site,
// previous } }.
async function finishRun(userId, runId, { taps, endTick } = {}) {
    if (!isId(runId)) throw new ForrestError("That run is over.", 404);
    checkTaps(taps, endTick);
    const run = await ForrestRun.findOne({ _id: runId, user: userId, status: "playing" }).lean();
    if (!run) throw new ForrestError("That run is over.", 404);

    const elapsed = Date.now() - run.startedAt.getTime();
    const tooFast = (endTick / TICK_HZ) * 1000 > elapsed + SLACK_MS;
    if (tooFast || elapsed > RUN_LIFETIME_MS) {
        await letGo({ _id: run._id, status: "playing" }, { finishedAt: new Date() });
        throw new ForrestError(tooFast ? "That run went faster than the clock, so it doesn't count." : "That run took too long to come back, so it doesn't count.", 409);
    }

    const result = replay({ seed: run.seed, mult: run.mult, taps, endTick });
    const finished = await ForrestRun.findOneAndUpdate(
        { _id: run._id, status: "playing" },
        {
            $set: {
                // Free play is never cashed out: nothing to wait for.
                status: run.free ? "discarded" : "finished",
                finishedAt: new Date(),
                ticks: result.ticks,
                taps: taps.length,
                score: result.score,
                fruit: result.fruit,
                level: result.level,
                endedBy: result.over ? result.endedBy : "stopped",
            },
        },
        { new: true }
    ).lean();
    if (!finished) throw new ForrestError("That run is over.", 404);

    const best = await recordBest(userId, finished);
    if (best.site || best.personal) {
        noteForrestBest(userId, { fruit: finished.fruit, score: finished.score, level: finished.level, previous: best.previous, site: best.site }).catch((error) =>
            console.error("Forrest Bounce couldn't send a best:", error)
        );
    }
    return { run: runView(finished), best };
}

// Their best, if this run beat it: `site` if it beat everyone's (the site
// record), `personal` if it beat a best they had before (a first run sets
// one quietly).
async function recordBest(userId, run) {
    const [player, top] = await Promise.all([ForrestPlayer.findById(userId).lean(), ForrestPlayer.findOne({ best: { $gt: 0 } }).sort({ best: -1, bestAt: 1 }).lean()]);
    const previous = player?.best ?? 0;
    if (run.fruit <= previous) return { personal: false, site: false, previous };
    const set = { best: run.fruit, bestScore: run.score, bestLevel: run.level, bestAt: new Date() };
    if (player) {
        const { matchedCount } = await ForrestPlayer.updateOne({ _id: userId, best: { $lt: run.fruit } }, { $set: set });
        if (matchedCount === 0) return { personal: false, site: false, previous };
    } else {
        try {
            await ForrestPlayer.create({ _id: userId, ...set });
        } catch (error) {
            if (error.code !== 11000) throw error;
            return { personal: false, site: false, previous };
        }
    }
    return { personal: previous > 0, site: run.fruit > (top?.best ?? 0), previous };
}

// What a cash-out pays, as coins: the entry back as it was paid and the
// rest in P-PP, or, for less than the entry, split like it was paid.
function splitPayout(paid, total) {
    const cost = paid.pp + paid.ppp;
    if (total >= cost) return { pp: paid.pp, ppp: paid.ppp + (total - cost) };
    const pp = cost > 0 ? Math.floor((total * paid.pp) / cost) : 0;
    return { pp, ppp: total - pp };
}

// Cashes a scored run out: one of today's cash-outs, and its score in
// points (5 to 1). Everyone hears what they won or lost. Less back than
// the entry: the difference goes to the scratch jackpots.
async function cashOut(userId, runId) {
    if (!isId(runId)) throw new ForrestError("That run can't be cashed out.", 404);
    const run = await ForrestRun.findOne({ _id: runId, user: userId, status: "finished", free: false }).lean();
    if (!run) throw new ForrestError("That run can't be cashed out.", 404);

    const day = playDay();
    try {
        await ForrestDay.updateOne({ user: userId, day, cashOuts: { $lt: FORREST.cashOutsPerDay } }, { $inc: { cashOuts: 1 } }, { upsert: true });
    } catch (error) {
        // The day's there, but full: the upsert tried to make another.
        if (error.code === 11000) throw new ForrestError(`Your ${FORREST.cashOutsPerDay} cash-outs today are used. More at 12:00.`, 409);
        throw error;
    }

    const total = payoutFor(run.score);
    const payout = splitPayout(run.paid, total);
    const cashed = await ForrestRun.findOneAndUpdate({ _id: run._id, status: "finished" }, { $set: { status: "cashed", payout } }, { new: true }).lean();
    if (!cashed) {
        await ForrestDay.updateOne({ user: userId, day, cashOuts: { $gt: 0 } }, { $inc: { cashOuts: -1 } });
        throw new ForrestError("That run can't be cashed out.", 404);
    }
    if (total > 0) await changeWallet(userId, () => payout, { reason: "forrestCashOut", forrest: run._id });
    await feedFromForrest(lostBy(cashed, total));

    noteForrestCashOut(cashed, total).catch((error) => console.error("Forrest Bounce couldn't send a cash-out:", error));
    return { run: runView(cashed), payout: total };
}

// Throws a scored run away: no points, and the cash-out kept. Its entry
// goes to the scratch jackpots.
async function discard(userId, runId) {
    if (!isId(runId)) throw new ForrestError("That run is over.", 404);
    const run = await letGo({ _id: runId, user: userId, status: "finished" });
    if (!run) throw new ForrestError("That run is over.", 404);
    return runView(run);
}

// Every 10 minutes (jobs/forrestSweep.js): runs nobody came back to finish
// are let go, their entries to the scratch jackpots. Resolves to how many.
async function sweepForrestRuns(now = Date.now()) {
    const stale = await ForrestRun.find({ status: "playing", startedAt: { $lt: new Date(now - ABANDONED_MS) } }).select("_id").lean();
    let count = 0;
    for (const { _id } of stale) {
        if (await letGo({ _id, status: "playing" }, { finishedAt: new Date(now) })) count += 1;
    }
    return count;
}

// ---- Their data, and leaving ----

async function forrestDataOf(userId) {
    const [runs, days, player] = await Promise.all([
        ForrestRun.find({ user: userId }).sort({ startedAt: -1 }).select("-seed -user -__v").lean(),
        ForrestDay.find({ user: userId }).sort({ day: -1 }).select("day cashOuts -_id").lean(),
        ForrestPlayer.findById(userId).select("-_id -__v").lean(),
    ]);
    return { runs, days, player };
}

async function forgetForrestPlayer(userId) {
    await Promise.all([ForrestRun.deleteMany({ user: userId }), ForrestDay.deleteMany({ user: userId }), ForrestPlayer.deleteOne({ _id: userId })]);
}

// Developer tool only (routes/forrestRouter.js): today's cash-outs back.
function resetDay(userId, day = playDay()) {
    return ForrestDay.deleteOne({ user: userId, day });
}

module.exports = {
    ForrestError,
    WalletError,
    statusOf,
    setBuddies,
    leaderboard,
    startRun,
    finishRun,
    cashOut,
    discard,
    sweepForrestRuns,
    splitPayout,
    forrestDataOf,
    forgetForrestPlayer,
    resetDay,
};
