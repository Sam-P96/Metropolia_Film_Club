const User = require("../../models/userModel");
const Review = require("../../models/reviewModel");
const OrcaJob = require("../../models/orcaJobModel");
const OrcaPlayer = require("../../models/orcaPlayerModel");
const { LORD_GANG_ORCA } = require("../../config/lordGangOrca");
const { jobLists } = require("../loanShark/jobLists");
const { forgetDislike } = require("../notify");
const { nextMidnight, today } = require("./clock");

// Lord Gang Orca's favours (section 6 of his spec): while a member's favour
// mode is on, four jobs a day, dealt at 00:00 (and the moment it starts).
// Jobs not done by the next 00:00 expire; done ones count across days, on
// the member. Three done and favour mode ends.
//
// Who can be picked comes from King Loan Shark's own lists
// (loanShark/jobLists.js, the ones /SECRETloanshark shows), so the two
// never disagree:
//   X  the Persuasion List (never the Protected List, never the player).
//      For a dislike, X needs PvP on too: only members with PvP on can
//      dislike.
//   Y  any other member; for a dislike, the Target List (PvP on).
//
// Done is noticed on the server as it happens, by hooks next to King Loan
// Shark's: a review posted and a like or dislike (controllers/
// filmController.js), and a Farkle or Gomoku game finishing (utils/farkle.js,
// utils/gomoku.js), only if it happened after the job was made and before
// it expired.

const RULES = LORD_GANG_ORCA.jobs;
const FAVOUR = LORD_GANG_ORCA.favour;
const DAY_MS = 24 * 60 * 60 * 1000;

const pickFrom = (items, random) => items[Math.floor(random() * items.length)];
const idOf = (member) => String(member._id);

// A kind of job, by the odds: challenge 40%, review 30%, dislike 20%, like 10%.
function rollType(random, odds = RULES.odds) {
    let roll = random();
    for (const [type, chance] of Object.entries(odds)) {
        if (roll < chance) return type;
        roll -= chance;
    }
    return "challenge";
}

// Who each job can pick, for `playerId` (never them).
async function poolsFor(playerId, now) {
    const lists = await jobLists({ borrowerId: playerId, now });
    return {
        persuasion: lists.persuasion,
        everyone: [...lists.reviewPersuasion, ...lists.protected],
        targets: lists.targets,
    };
}

// An X from `pool`, preferring members picked fewer than RULES.maxPerX
// times today (`used`), or null.
function pickX(pool, used, random) {
    if (pool.length === 0) return null;
    const fresh = pool.filter((member) => (used.get(idOf(member)) ?? 0) < RULES.maxPerX);
    return pickFrom(fresh.length > 0 ? fresh : pool, random);
}

// A review by `y` that `x` hasn't liked or disliked (and isn't theirs).
async function reviewFor(x, y) {
    const [review] = await Review.aggregate([
        { $match: { user: y._id, likedBy: { $ne: x._id }, dislikedBy: { $ne: x._id } } },
        { $sample: { size: 1 } },
        { $project: { filmTitle: 1 } },
    ]);
    return review ?? null;
}

// One job of `type`, or null if nobody fits.
async function pickJob(type, pools, used, random) {
    for (let attempt = 0; attempt < 6; attempt++) {
        const xPool = type === "dislike" ? pools.persuasion.filter((member) => member.pvp) : pools.persuasion;
        const x = pickX(xPool, used, random);
        if (!x) return null;
        if (type === "review") return { type, x: x._id };

        const yPool = (type === "dislike" ? pools.targets : pools.everyone).filter((member) => idOf(member) !== idOf(x));
        if (yPool.length === 0) return null;
        const y = pickFrom(yPool, random);
        if (type === "challenge") return { type, x: x._id, y: y._id };

        const review = await reviewFor(x, y);
        if (review) return { type, x: x._id, y: y._id, review: review._id, filmTitle: review.filmTitle };
    }
    return null;
}

// Up to `count` jobs for `playerId`: each a kind by the odds, or another
// kind if nobody fits that one.
async function pickJobs(playerId, { count = FAVOUR.perDay, now = new Date(), random = Math.random } = {}) {
    const pools = await poolsFor(playerId, now);
    const used = new Map();
    const jobs = [];
    for (let i = 0; i < count; i++) {
        const first = rollType(random);
        const order = [first, ...Object.keys(RULES.odds).filter((type) => type !== first)];
        for (const type of order) {
            const job = await pickJob(type, pools, used, random);
            if (job) {
                used.set(String(job.x), (used.get(String(job.x)) ?? 0) + 1);
                jobs.push(job);
                break;
            }
        }
    }
    return jobs;
}

// Today's jobs for a member in favour mode: what's left of earlier ones
// expires, and four new ones, good until the next 00:00. Claimed on the
// member first (favour.jobsDay), so it's only ever dealt once a day.
// `force`: deal again even if today's are out (an admin testing).
async function dealJobs(playerId, { now = new Date(), random = Math.random, force = false } = {}) {
    const day = today(now);
    const claim = { user: playerId, "favour.on": true, ...(force ? {} : { "favour.jobsDay": { $ne: day } }) };
    const claimed = await OrcaPlayer.findOneAndUpdate(claim, { $set: { "favour.jobsDay": day } }, { returnDocument: "after" }).lean();
    if (!claimed) return [];

    await OrcaJob.updateMany({ player: playerId, status: "open" }, { $set: { status: "expired" } });
    const picked = await pickJobs(playerId, { now, random });
    if (picked.length === 0) return [];
    const expiresAt = nextMidnight(now);
    return OrcaJob.insertMany(picked.map((job) => ({ ...job, player: playerId, day, createdAt: now, expiresAt })));
}

// Favour mode over: three jobs done. Begging opens again, from nothing
// built up, with a new secret threshold; any jobs left are cancelled.
async function endFavour(playerId, random = Math.random) {
    const { rollThreshold } = require("./player");
    const ended = await OrcaPlayer.findOneAndUpdate(
        { user: playerId, "favour.on": true, "favour.done": { $gte: FAVOUR.needed } },
        {
            $set: { "favour.on": false, "favour.done": 0, "favour.startedAt": null, "favour.jobsDay": null, built: 0, threshold: rollThreshold(random) },
            $push: { news: "allDone" },
        },
        { returnDocument: "after" }
    ).lean();
    if (ended) await OrcaJob.updateMany({ player: playerId, status: "open" }, { $set: { status: "cancelled" } });
    return Boolean(ended);
}

// A job's action happened: it's done, and it counts towards the player's
// three (if their favour mode is still on). Returns whether it counted.
async function completeJob(job, now = new Date()) {
    const claimed = await OrcaJob.findOneAndUpdate(
        { _id: job._id, status: "open", expiresAt: { $gt: now } },
        {
            $set: {
                status: "done",
                doneAt: now,
                ...(job.type === "dislike" ? { undoDislikeAt: new Date(now.getTime() + RULES.dislikeHours * 60 * 60 * 1000) } : {}),
            },
        },
        { returnDocument: "after" }
    ).lean();
    if (!claimed) return false;

    const player = await OrcaPlayer.findOneAndUpdate(
        { user: job.player, "favour.on": true },
        { $inc: { "favour.done": 1 }, $push: { news: "jobDone" } },
        { returnDocument: "after" }
    ).lean();
    if (!player) return false;
    if (player.favour.done >= FAVOUR.needed) await endFavour(job.player);
    return true;
}

async function completeAll(jobs, now) {
    for (const job of jobs) {
        await completeJob(job, now).catch((error) => console.error("Lord Gang Orca couldn't finish a job:", error.message));
    }
}

// Open jobs `filter` finds that were made before `before` and haven't expired.
const openJobs = (filter, before = new Date(), now = new Date()) =>
    OrcaJob.find({ ...filter, status: "open", createdAt: { $lte: before }, expiresAt: { $gt: now } }).lean();

// --- the hooks ---

// `userId` posted a new review.
async function onReviewPosted(userId) {
    const now = new Date();
    await completeAll(await openJobs({ type: "review", x: userId }, now, now), now);
}

// Before a like or dislike is saved: whether it would finish a job (`voterId`
// liking or disliking `reviewId`, and not already). Returns a function to
// call once the vote is saved, or null.
async function beforeVote(reviewId, voterId, vote) {
    if (vote !== "like" && vote !== "dislike") return null;
    const now = new Date();
    const jobs = await openJobs({ type: vote, x: voterId, review: reviewId }, now, now);
    if (jobs.length === 0) return null;
    if (await Review.exists({ _id: reviewId, [vote === "like" ? "likedBy" : "dislikedBy"]: voterId })) return null;
    return () => completeAll(jobs, new Date());
}

// A Farkle or Gomoku game between members finished: "get X to challenge Y"
// jobs for its challenger (X) and the other player (Y) are done, if the
// challenge was sent after the job was made. Games from before
// challengers were saved have none, and don't count.
async function onGameFinished(match) {
    if (!match?.challenger || match.status !== "over") return;
    const challenger = String(match.challenger);
    const other = (match.players ?? []).map((player) => player.user).find((user) => user && String(user) !== challenger);
    if (!other) return;
    const now = new Date();
    const sent = match.createdAt ? new Date(match.createdAt) : now;
    const jobs = await OrcaJob.find({ type: "challenge", x: match.challenger, y: other, status: "open", createdAt: { $lte: sent }, expiresAt: { $gt: now } }).lean();
    await completeAll(jobs, now);
}

// --- the clock ---

// Job dislikes 48 hours old come off again. Only the dislike: if X has
// since changed it to a like, that stays.
async function undoJobDislikes(now = new Date()) {
    const due = await OrcaJob.find({ type: "dislike", status: "done", dislikeUndone: false, undoDislikeAt: { $lte: now } }).lean();
    for (const job of due) {
        try {
            const voter = await User.findById(job.x).select("pvp").lean();
            if (voter && job.review) {
                const removed = await Review.updateOne(
                    { _id: job.review, dislikedBy: job.x },
                    { $pull: { dislikedBy: job.x }, ...(voter.pvp ? { $inc: { dislikeCount: -1 } } : {}) },
                    { timestamps: false }
                );
                if (removed.modifiedCount > 0) await forgetDislike(job.review, job.x);
            }
            await OrcaJob.updateOne({ _id: job._id }, { $set: { dislikeUndone: true } });
        } catch (error) {
            console.error("Lord Gang Orca couldn't take a job's dislike back:", error.message);
        }
    }
    return due.length;
}

// Every minute (jobs/orcaSweep.js): jobs past 00:00 expire, members in
// favour mode get today's four, and job dislikes 48 hours old come off.
async function sweep(now = new Date()) {
    await OrcaJob.updateMany({ status: "open", expiresAt: { $lte: now } }, { $set: { status: "expired" } });
    const due = await OrcaPlayer.find({ "favour.on": true, "favour.jobsDay": { $ne: today(now) } }).select("user").lean();
    for (const player of due) {
        await dealJobs(player.user, { now }).catch((error) => console.error("Lord Gang Orca couldn't deal jobs:", error.message));
    }
    await undoJobDislikes(now);
    return due.length;
}

// A member's jobs for the page: today's, with names and the review.
async function jobsFor(playerId, now = new Date()) {
    const { MEMBER_FIELDS, userSummary } = require("../serialize");
    const jobs = await OrcaJob.find({ player: playerId, day: today(now), status: { $in: ["open", "done", "expired"] } })
        .sort({ createdAt: 1 })
        .lean();
    const ids = [...new Set(jobs.flatMap((job) => [job.x, job.y]).filter(Boolean).map(String))];
    const users = await User.find({ _id: { $in: ids } }).select(MEMBER_FIELDS).lean();
    const byId = new Map(users.map((user) => [String(user._id), userSummary(user)]));
    const member = (id) => (id ? (byId.get(String(id)) ?? { _id: null, username: "A former member", avatarUrl: null }) : null);
    return jobs.map((job) => ({
        _id: job._id,
        type: job.type,
        status: job.status,
        x: member(job.x),
        y: member(job.y),
        review: job.review ? { _id: job.review, filmTitle: job.filmTitle } : null,
        expiresAt: job.expiresAt,
    }));
}

module.exports = { DAY_MS, rollType, pickJobs, dealJobs, endFavour, completeJob, onReviewPosted, beforeVote, onGameFinished, undoJobDislikes, sweep, jobsFor };
