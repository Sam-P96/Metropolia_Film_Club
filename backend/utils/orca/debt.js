const User = require("../../models/userModel");
const OrcaJob = require("../../models/orcaJobModel");
const OrcaPlayer = require("../../models/orcaPlayerModel");
const { LORD_GANG_ORCA } = require("../../config/lordGangOrca");
const { changeWallet } = require("../wallet");
const { today } = require("./clock");
const jobs = require("./jobs");

// Lord Gang Orca and members in the red (config/lordGangOrca.js debt): while
// their P-PP is below 0 (a Steal and Defend fine they couldn't pay), he's
// open around the clock for begging (player.js), and has ten jobs for them,
// the same kinds as his favours (jobs.js), each in a slot of its own. A
// slot's job is replaced two days after it was dealt, done or not. Each one
// done forgives a tenth of the lowest they've been since going into the red
// (utils/wallet.js keeps it as wallet.debtLow), never past 0: someone who
// went down to -1,000 and is back up to -500 still gets 100 a job. Out of
// the red, the jobs left are cancelled and everything's as usual again.
// PP never goes below 0 (utils/wallet.js), but if it did, it'd count too.

const DEBT = LORD_GANG_ORCA.debt;
const DAY_MS = 24 * 60 * 60 * 1000;

// Where `wallet` stands: null out of the red, else { owed, low, perJob }:
// `owed`, what it'd take to get back to 0; `low`, the lowest it's been since
// going into the red (a debt from before that was kept counts from where it
// is now); `perJob`, what a job forgives.
function debtOf(wallet) {
    const pp = wallet?.pp ?? 0;
    const ppp = wallet?.ppp ?? 0;
    if (pp >= 0 && ppp >= 0) return null;
    const low = Math.min(wallet?.debtLow ?? 0, pp, ppp);
    return {
        owed: Math.max(0, -pp) + Math.max(0, -ppp),
        low,
        perJob: Math.max(1, Math.ceil(-low * DEBT.forgiveShare)),
    };
}

async function debtOfMember(userId) {
    const user = await User.findById(userId).select("wallet").lean();
    return debtOf(user?.wallet);
}

// A member's debt jobs still in their slots: open or done, dealt less than
// two days ago.
const inSlots = (playerId, now) => ({ player: playerId, mode: "debt", status: { $in: ["open", "done"] }, expiresAt: { $gt: now } });

// Fills a member's empty slots, if they're in the red: each new job is good
// for DEBT.refreshDays. Claimed on the member first (debtDealtAt), so two at
// once can't both deal. Resolves to the jobs dealt.
async function dealDebtJobs(playerId, { now = new Date(), random = Math.random } = {}) {
    if (!(await debtOfMember(playerId))) return [];
    const { playerOf } = require("./player");
    const player = await playerOf(playerId);
    const claimed = await OrcaPlayer.findOneAndUpdate({ user: playerId, debtDealtAt: player.debtDealtAt ?? null }, { $set: { debtDealtAt: now } }).lean();
    if (!claimed) return [];

    const needed = DEBT.jobs - (await OrcaJob.countDocuments(inSlots(playerId, now)));
    if (needed <= 0) return [];
    const picked = await jobs.pickJobs(playerId, { count: needed, now, random });
    if (picked.length === 0) return [];
    const expiresAt = new Date(now.getTime() + DEBT.refreshDays * DAY_MS);
    return OrcaJob.insertMany(picked.map((job) => ({ ...job, mode: "debt", player: playerId, day: today(now), createdAt: now, expiresAt })));
}

// Out of the red: the debt jobs still open are cancelled. Resolves to how
// many.
async function endDebt(playerId) {
    const { modifiedCount } = await OrcaJob.updateMany({ player: playerId, mode: "debt", status: "open" }, { $set: { status: "cancelled" } });
    return modifiedCount;
}

// A debt job was done (jobs.js completeJob has marked it): its share of the
// debt is forgiven, in P-PP, never past 0, and saved on the job. Out of the
// red after it, the rest are cancelled. Resolves to what was forgiven.
async function forgive(job) {
    const debt = await debtOfMember(job.player);
    if (!debt) {
        await endDebt(job.player);
        return 0;
    }
    const change = await changeWallet(
        job.player,
        (wallet) => {
            const amount = Math.min(debt.perJob, Math.max(0, -wallet.ppp));
            return amount > 0 ? { ppp: amount } : null;
        },
        { reason: "orcaForgive" }
    );
    const forgiven = change?.ppp ?? 0;
    await OrcaJob.updateOne({ _id: job._id }, { $set: { forgiven } });

    const cleared = !(await debtOfMember(job.player));
    await OrcaPlayer.updateOne({ user: job.player }, { $push: { news: cleared ? "allDone" : "jobDone" } });
    if (cleared) await endDebt(job.player);
    return forgiven;
}

// Every minute (jobs.js sweep): members in the red get their empty slots
// filled, and members out of it lose the debt jobs they had open. Resolves
// to how many are in the red.
async function sweepDebts(now = new Date()) {
    const inRed = await User.find({ $or: [{ "wallet.ppp": { $lt: 0 } }, { "wallet.pp": { $lt: 0 } }] }).distinct("_id");
    for (const id of inRed) {
        await dealDebtJobs(id, { now }).catch((error) => console.error("Lord Gang Orca couldn't deal debt jobs:", error.message));
    }
    const red = new Set(inRed.map(String));
    const open = await OrcaJob.distinct("player", { mode: "debt", status: "open" });
    for (const id of open.filter((player) => !red.has(String(player)))) await endDebt(id);
    return inRed.length;
}

// A member's debt jobs for the page: the ones in their slots, oldest first,
// each with when its slot gets a new one (`expiresAt`).
async function debtJobsFor(playerId, now = new Date()) {
    const list = await OrcaJob.find(inSlots(playerId, now)).sort({ createdAt: 1, _id: 1 }).lean();
    return jobs.jobViews(list);
}

module.exports = { debtOf, debtOfMember, dealDebtJobs, endDebt, forgive, sweepDebts, debtJobsFor };
