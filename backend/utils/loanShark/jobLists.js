const User = require("../../models/userModel");
const Review = require("../../models/reviewModel");
const Comment = require("../../models/commentModel");
const Notification = require("../../models/notificationModel");
const LoanJobList = require("../../models/loanJobListModel");
const { LOAN_SHARK } = require("../../config/loanShark");
const { MEMBER_FIELDS, userSummary } = require("../serialize");

// Who King Loan Shark's jobs can pick, worked out live: the one place the
// rules are, so the jobs (jobs.js) and the admin page (/SECRETloanshark)
// can never disagree.
//
//   persuasion        X for "dislike" and "steal" jobs: every quiet member,
//                     plus anyone an admin added by hand, minus the Protected
//                     List. Those jobs also need X to have PvP on.
//   reviewPersuasion  X for "post a review" jobs: everyone but the Protected
//                     List, PvP or not. The quiet ones (`quiet`) are picked
//                     first; only when nobody's quiet any more, anyone else.
//   protected         never X for any job, by an admin's hand
//   targets           Y, the member a job is aimed at: everyone with PvP on,
//                     the Protected List included
//
// "Quiet" is fewer than jobs.fewReviews reviews, or no review, comment or
// like in jobs.quietDays days. Never the borrower, and never an account in
// jobs.excludedEmails (counted in `hidden` instead).

const RULES = LOAN_SHARK.jobs;
const DAY_MS = 24 * 60 * 60 * 1000;

const latest = (...dates) => dates.filter(Boolean).reduce((max, date) => (!max || date > max ? date : max), null);

// Every member as the lists need them: { _id, user (summary), pvp, reviews,
// lastActive, quiet, manual ("persuasion" | "protected" | null), addedBy,
// addedAt }, plus how many accounts were left out for their email.
async function members({ borrowerId = null, now = new Date() } = {}) {
    const excluded = new Set(RULES.excludedEmails.map((email) => email.toLowerCase()));
    const since = new Date(now.getTime() - RULES.quietDays * DAY_MS);

    const [users, reviewRows, commentRows, likeRows, manual] = await Promise.all([
        User.find().select(`${MEMBER_FIELDS} email`).lean(),
        Review.aggregate([{ $group: { _id: "$user", reviews: { $sum: 1 }, last: { $max: "$createdAt" } } }]),
        Comment.aggregate([{ $group: { _id: "$user", last: { $max: "$createdAt" } } }]),
        // Likes keep no date of their own. The latest like notification a
        // member is in is the nearest thing (it may be someone else's newer
        // like on the same review, which only makes them look busier).
        Notification.aggregate([{ $match: { type: "like" } }, { $unwind: "$actors" }, { $group: { _id: "$actors", last: { $max: "$at" } } }]),
        LoanJobList.find().lean(),
    ]);

    const byUser = (rows) => new Map(rows.map((row) => [String(row._id), row]));
    const reviews = byUser(reviewRows);
    const comments = byUser(commentRows);
    const likes = byUser(likeRows);
    const lists = new Map(manual.map((entry) => [String(entry.user), entry]));

    let hidden = 0;
    const out = [];
    for (const user of users) {
        if (excluded.has(String(user.email ?? "").toLowerCase())) {
            hidden += 1;
            continue;
        }
        const id = String(user._id);
        if (borrowerId && id === String(borrowerId)) continue;

        const count = reviews.get(id)?.reviews ?? 0;
        const lastActive = latest(reviews.get(id)?.last, comments.get(id)?.last, likes.get(id)?.last);
        const entry = lists.get(id);
        out.push({
            _id: user._id,
            user: userSummary(user),
            pvp: Boolean(user.pvp),
            reviews: count,
            lastActive,
            quiet: count < RULES.fewReviews || !lastActive || lastActive < since,
            manual: entry?.list ?? null,
            addedBy: entry?.addedBy ?? null,
            addedAt: entry?.addedAt ?? null,
        });
    }
    return { members: out, hidden };
}

// The four lists (see the top), for a borrower's jobs or, with no
// borrower, for the admin page. Each is a list of members() entries.
async function jobLists(options = {}) {
    const { members: everyone, hidden } = await members(options);
    const isProtected = (member) => member.manual === "protected";

    return {
        persuasion: everyone.filter((member) => !isProtected(member) && (member.quiet || member.manual === "persuasion")),
        reviewPersuasion: everyone.filter((member) => !isProtected(member)),
        protected: everyone.filter(isProtected),
        targets: everyone.filter((member) => member.pvp),
        hidden,
    };
}

module.exports = { jobLists };
