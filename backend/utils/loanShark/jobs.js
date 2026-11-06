const User = require("../../models/userModel");
const Review = require("../../models/reviewModel");
const Comment = require("../../models/commentModel");
const Notification = require("../../models/notificationModel");
const LoanJob = require("../../models/loanJobModel");
const { LOAN_SHARK } = require("../../config/loanShark");
const { inSession } = require("../steal/tx");
const { noteLoanJob, forgetDislike } = require("../notify");
const { changeAccount, emptyShark, logTx } = require("./account");
const { ceilShare, sharkOwed } = require("./math");

// The jobs that come with a shark loan (spec §4): "Want your debt reduced?
// Do this:". A new loan gets 4, picked at random from three kinds:
//   review   convince X to post a movie review
//   dislike  convince X to dislike Y's review of a film (the dislike comes
//            off again 48 hours later)
//   steal    convince X to steal from Y in Steal and Defend
// X is a quiet member: fewer than 20 reviews, or no review, comment or like
// in 14 days. Y has PvP on, and so does X wherever the job needs it (only
// members with PvP on can dislike, and Steal and Defend is PvP). Never the
// borrower, and never a member on the excluded list. The site has no bot
// accounts (the Farkle and poker bots aren't members), so there are none to
// leave out.
//
// Done is noticed on the server, as it happens: hooks in saving a review
// (controllers/filmController.js), disliking one (the same), and a steal
// succeeding (utils/steal/attacks.js). Each job done takes 20% of the total
// borrowed, as it is then, off the debt, stored as that fixed amount.

const RULES = LOAN_SHARK.jobs;
const DAY_MS = 24 * 60 * 60 * 1000;
const TYPES = ["review", "dislike", "steal"];

const pickFrom = (items, random) => items[Math.floor(random() * items.length)];

function shuffled(items, random) {
    const out = [...items];
    for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
}

// Who can be picked for a borrower's jobs: { quiet, pvp, quietPvp }, each
// a list of { _id, pvp }.
async function candidates(borrowerId, now = new Date()) {
    const excluded = new Set(RULES.excludedEmails.map((email) => email.toLowerCase()));
    const since = new Date(now.getTime() - RULES.quietDays * DAY_MS);

    const [members, counts, reviewed, commented, liked] = await Promise.all([
        User.find({ _id: { $ne: borrowerId } }).select("email pvp").lean(),
        Review.aggregate([{ $group: { _id: "$user", reviews: { $sum: 1 } } }]),
        Review.distinct("user", { createdAt: { $gte: since } }),
        Comment.distinct("user", { createdAt: { $gte: since } }),
        // Likes keep no date of their own. A like notification the member is
        // in that was touched lately is the nearest thing (it may be someone
        // else's newer like on the same review, which only makes them look
        // busier than they are).
        Notification.distinct("actors", { type: "like", at: { $gte: since } }),
    ]);

    const reviewsOf = new Map(counts.map((row) => [String(row._id), row.reviews]));
    const active = new Set([...reviewed, ...commented, ...liked].map(String));
    const eligible = members.filter((member) => !excluded.has(String(member.email ?? "").toLowerCase()));

    const quiet = eligible.filter((member) => (reviewsOf.get(String(member._id)) ?? 0) < RULES.fewReviews || !active.has(String(member._id)));
    return {
        quiet,
        pvp: eligible.filter((member) => member.pvp),
        quietPvp: quiet.filter((member) => member.pvp),
    };
}

// One job of `type`, or null if nobody fits.
async function pickJob(type, pools, random) {
    if (type === "review") {
        return pools.quiet.length > 0 ? { type, x: pickFrom(pools.quiet, random)._id } : null;
    }

    if (type === "steal") {
        if (pools.quietPvp.length === 0) return null;
        const x = pickFrom(pools.quietPvp, random)._id;
        const ys = pools.pvp.filter((member) => String(member._id) !== String(x));
        return ys.length > 0 ? { type, x, y: pickFrom(ys, random)._id } : null;
    }

    // A dislike: X (with PvP on) and a review by Y (with PvP on) that X
    // hasn't already disliked. Tries a few pairs before giving up.
    for (let attempt = 0; attempt < 6 && pools.quietPvp.length > 0; attempt++) {
        const x = pickFrom(pools.quietPvp, random)._id;
        const ys = pools.pvp.filter((member) => String(member._id) !== String(x));
        if (ys.length === 0) return null;
        const y = pickFrom(ys, random)._id;
        const [review] = await Review.aggregate([
            { $match: { user: y, dislikedBy: { $ne: x } } },
            { $sample: { size: 1 } },
            { $project: { filmTitle: 1 } },
        ]);
        if (review) return { type, x, y, review: review._id, filmTitle: review.filmTitle };
    }
    return null;
}

// A new loan's jobs: up to 4, each of a random kind (another kind if
// nobody fits that one). Only ever once per loan. `random` is for tests.
async function generateJobs(borrowerId, loanId, { random = Math.random, now = new Date() } = {}) {
    if (await LoanJob.exists({ borrower: borrowerId, loan: loanId })) return [];

    const pools = await candidates(borrowerId, now);
    const jobs = [];
    for (let i = 0; i < RULES.perLoan; i++) {
        for (const type of shuffled(TYPES, random)) {
            const job = await pickJob(type, pools, random);
            if (job) {
                jobs.push({ ...job, borrower: borrowerId, loan: loanId, createdAt: now });
                break;
            }
        }
    }
    return jobs.length > 0 ? LoanJob.insertMany(jobs) : [];
}

// A job's action happened: it's done, and its 20% comes off the debt. If
// the loan it belonged to is already over, it just closes. Returns what it
// took off, or null.
async function completeJob(job, now = new Date()) {
    const result = await inSession(async (session, after) => {
        const claimed = await LoanJob.findOneAndUpdate(
            { _id: job._id, status: "open" },
            {
                $set: {
                    status: "done",
                    doneAt: now,
                    ...(job.type === "dislike" ? { undoDislikeAt: new Date(now.getTime() + RULES.dislikeHours * 60 * 60 * 1000) } : {}),
                },
            },
            { returnDocument: "after", session },
        ).lean();
        if (!claimed) return null;

        const { result: change } = await changeAccount(
            job.borrower,
            (account) => {
                const shark = account.shark;
                if (shark.borrowed === 0 || String(shark.loan) !== String(job.loan)) return null;
                const owed = sharkOwed(shark);
                const reduction = ceilShare(shark.borrowed, RULES.reduction);
                const applied = Math.min(reduction, owed);
                if (applied === owed) {
                    return { set: { shark: emptyShark() }, result: { reduction, applied, left: 0, cleared: true } };
                }
                return { inc: { "shark.jobReduction": reduction }, result: { reduction, applied, left: owed - reduction, cleared: false } };
            },
            { session },
        );

        if (!change) {
            await LoanJob.updateOne({ _id: job._id }, { $set: { status: "closed", doneAt: null, undoDislikeAt: null } }, { session });
            return null;
        }

        await LoanJob.updateOne({ _id: job._id }, { $set: { reduction: change.reduction } }, { session });
        await logTx({ user: job.borrower, other: job.x, kind: "sharkJob", amount: change.applied, job: job._id, loan: job.loan }, session);
        if (change.cleared) {
            const { closeLoan } = require("./shark");
            await closeLoan(job.borrower, job.loan, session);
        }
        after(() => noteLoanJob(job.borrower, job.x, job.type, change.applied, change.left));
        return change;
    });
    return result;
}

async function completeAll(jobs, now) {
    for (const job of jobs) {
        await completeJob(job, now).catch((error) => console.error("Loan Shark couldn't finish a job:", error.message));
    }
}

// --- the hooks ---

// `userId` posted a new review: "convince X to post a review" jobs with
// them as X are done. Any open one was made before this moment.
async function onReviewPosted(userId) {
    const jobs = await LoanJob.find({ status: "open", type: "review", x: userId }).lean();
    await completeAll(jobs, new Date());
}

// Before a dislike is saved: whether it would finish a job (`voterId`
// disliking `reviewId`, and not already disliking it). Returns a function
// to call once the dislike is saved, or null.
async function beforeDislike(reviewId, voterId) {
    const jobs = await LoanJob.find({ status: "open", type: "dislike", x: voterId, review: reviewId }).lean();
    if (jobs.length === 0) return null;
    if (await Review.exists({ _id: reviewId, dislikedBy: voterId })) return null;
    return () => completeAll(jobs, new Date());
}

// A steal succeeded: "convince X to steal from Y" jobs for that pair are done.
async function onStealSuccess(attackerId, victimId) {
    const jobs = await LoanJob.find({ status: "open", type: "steal", x: attackerId, y: victimId }).lean();
    await completeAll(jobs, new Date());
}

// Job dislikes 48 hours old come off again (jobs/loanSweep.js). Only the
// dislike: if X has since changed it to a like, that stays.
async function undoJobDislikes(now = new Date()) {
    const due = await LoanJob.find({ type: "dislike", status: "done", dislikeUndone: false, undoDislikeAt: { $lte: now } }).lean();

    for (const job of due) {
        try {
            const voter = await User.findById(job.x).select("pvp").lean();
            if (voter && job.review) {
                const removed = await Review.updateOne(
                    { _id: job.review, dislikedBy: job.x },
                    { $pull: { dislikedBy: job.x }, ...(voter.pvp ? { $inc: { dislikeCount: -1 } } : {}) },
                    { timestamps: false },
                );
                if (removed.modifiedCount > 0) await forgetDislike(job.review, job.x);
            }
            await LoanJob.updateOne({ _id: job._id }, { $set: { dislikeUndone: true } });
        } catch (error) {
            console.error("Loan Shark couldn't take a job's dislike back:", error.message);
        }
    }
    return due.length;
}

module.exports = { candidates, pickJob, generateJobs, completeJob, onReviewPosted, beforeDislike, onStealSuccess, undoJobDislikes };
