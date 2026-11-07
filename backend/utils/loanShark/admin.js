const mongoose = require("mongoose");
const User = require("../../models/userModel");
const Review = require("../../models/reviewModel");
const LoanJobList = require("../../models/loanJobListModel");
const { LOAN_SHARK } = require("../../config/loanShark");
const { MEMBER_FIELDS, userSummary } = require("../serialize");
const { LoanError } = require("./account");
const { jobLists } = require("./jobLists");

// The admin page /SECRETloanshark: who King Loan Shark's jobs can pick, and
// the two lists admins keep by hand (models/loanJobListModel.js). Every
// column comes from jobLists(), the same function the jobs pick from.

const MANUAL_LISTS = ["persuasion", "protected"];
const SEARCH_LIMIT = 25;
const excludedEmails = () => new Set(LOAN_SHARK.jobs.excludedEmails.map((email) => email.toLowerCase()));
const byName = (a, b) => a.user.username.localeCompare(b.user.username, "en", { sensitivity: "base" });

// The page's columns. Each member: { user, reviews, lastActive, pvp }, plus
//   persuasion        tag: "auto" (quiet) or "hand" (added by an admin)
//   reviewPersuasion  inactive: picked first
//   protected         addedBy (a member summary, or null), addedAt
//   targets           protected: also on the Protected List
async function adminLists() {
    const lists = await jobLists();
    const base = (member) => ({ user: member.user, reviews: member.reviews, lastActive: member.lastActive, pvp: member.pvp });

    const adders = await User.find({ _id: { $in: lists.protected.map((member) => member.addedBy).filter(Boolean) } })
        .select(MEMBER_FIELDS)
        .lean();
    const adderById = new Map(adders.map((user) => [String(user._id), userSummary(user)]));

    return {
        persuasion: lists.persuasion.map((member) => ({ ...base(member), tag: member.manual === "persuasion" ? "hand" : "auto" })).sort(byName),
        reviewPersuasion: lists.reviewPersuasion
            .map((member) => ({ ...base(member), inactive: member.quiet }))
            .sort((a, b) => Number(b.inactive) - Number(a.inactive) || byName(a, b)),
        protected: lists.protected
            .map((member) => ({ ...base(member), addedBy: adderById.get(String(member.addedBy)) ?? null, addedAt: member.addedAt }))
            .sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt)),
        targets: lists.targets.map((member) => ({ ...base(member), protected: member.manual === "protected" })).sort(byName),
        hidden: lists.hidden,
        rules: { fewReviews: LOAN_SHARK.jobs.fewReviews, quietDays: LOAN_SHARK.jobs.quietDays },
    };
}

// Members whose username has `q` in it (any case), at most 25, with their
// review count, PvP and which hand-kept list they're on. Never the excluded
// accounts.
async function searchMembers(q) {
    const text = typeof q === "string" ? q.trim().slice(0, 40) : "";
    if (!text) return [];
    const pattern = new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    const excluded = excludedEmails();

    const found = (await User.find({ username: pattern }).select(`${MEMBER_FIELDS} email`).sort({ username: 1 }).limit(SEARCH_LIMIT * 2).lean())
        .filter((user) => !excluded.has(String(user.email ?? "").toLowerCase()))
        .slice(0, SEARCH_LIMIT);
    const ids = found.map((user) => user._id);
    const [counts, onLists] = await Promise.all([
        Review.aggregate([{ $match: { user: { $in: ids } } }, { $group: { _id: "$user", reviews: { $sum: 1 } } }]),
        LoanJobList.find({ user: { $in: ids } }).lean(),
    ]);
    const reviews = new Map(counts.map((row) => [String(row._id), row.reviews]));
    const lists = new Map(onLists.map((entry) => [String(entry.user), entry.list]));

    return found.map((user) => ({
        user: userSummary(user),
        reviews: reviews.get(String(user._id)) ?? 0,
        pvp: Boolean(user.pvp),
        list: lists.get(String(user._id)) ?? null,
    }));
}

function checkList(list) {
    if (!MANUAL_LISTS.includes(list)) throw new LoanError("There's no list like that. Only the Persuasion and Protected Lists are kept by hand.", 404);
}

async function checkMember(userId) {
    if (!mongoose.isValidObjectId(userId)) throw new LoanError("Pick a member.");
    const user = await User.findById(userId).select("email").lean();
    if (!user) throw new LoanError("That member doesn't exist any more.", 404);
    return user;
}

// Puts a member on "persuasion" or "protected", taking them off the other
// (one hand-kept list each).
async function addToList(list, userId, adminId) {
    checkList(list);
    const user = await checkMember(userId);
    if (excludedEmails().has(String(user.email ?? "").toLowerCase())) {
        throw new LoanError("That account is excluded in config, so it's never in a job.");
    }
    const update = { $set: { list, addedBy: adminId, addedAt: new Date() } };
    try {
        await LoanJobList.updateOne({ user: userId }, update, { upsert: true });
    } catch (error) {
        // Two admins at once: the other one made it first. Change that one.
        if (error.code !== 11000) throw error;
        await LoanJobList.updateOne({ user: userId }, update);
    }
}

// Takes a member off a hand-kept list. 404 if they weren't on it.
async function removeFromList(list, userId) {
    checkList(list);
    if (!mongoose.isValidObjectId(userId)) throw new LoanError("Pick a member.");
    const removed = await LoanJobList.deleteOne({ user: userId, list });
    if (removed.deletedCount === 0) throw new LoanError("They aren't on that list.", 404);
}

module.exports = { MANUAL_LISTS, adminLists, searchMembers, addToList, removeFromList };
