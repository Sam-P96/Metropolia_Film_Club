const Review = require("../models/reviewModel");
const User = require("../models/userModel");

// 1 if the review's author is among its `list` voters ("likedBy" or
// "dislikedBy"), else 0.
const ownVote = (list) => ({ $cond: [{ $in: ["$user", { $ifNull: [`$${list}`, []] }] }, 1, 0] });

// Each reviewer's totals: the likes and dislikes their reviews have
// collected, and how many they've written. A member's own like or dislike
// on their own review doesn't count: every review starts with its author's
// like, and voting on your own was never meant to move you up. Own dislikes
// are only counted while the author has PVP on (dislikeCount only holds
// dislikes from members with it on), so they come off after WITH_USER.
const TOTALS = {
    $group: {
        _id: "$user",
        likes: { $sum: { $subtract: ["$likeCount", ownVote("likedBy")] } },
        dislikes: { $sum: "$dislikeCount" },
        ownDislikes: { $sum: ownVote("dislikedBy") },
        reviews: { $sum: 1 },
    },
};

// Their user document as `user[0]`. A deleted member's reviews go with
// them, but this doesn't trip over one.
const WITH_USER = [
    {
        $lookup: {
            from: User.collection.name,
            localField: "_id",
            foreignField: "_id",
            as: "user",
            pipeline: [{ $project: { username: 1, role: 1, memberTitle: 1, avatarUrl: 1, reviewCardBanner: 1, value: 1, pvp: 1, cosmetics: 1 } }],
        },
    },
    { $match: { "user.0": { $exists: true } } },
];

// Takes their own dislikes back off, where they counted (PVP on).
const WITHOUT_OWN_DISLIKES = [
    {
        $set: {
            dislikes: {
                $subtract: ["$dislikes", { $cond: [{ $eq: [{ $arrayElemAt: ["$user.pvp", 0] }, true] }, "$ownDislikes", 0] }],
            },
        },
    },
    { $unset: "ownDislikes" },
];

// TOTALS for every reviewer (or those `match` picks), with their user
// document and their own votes left out.
const totals = (match = null) => [...(match ? [{ $match: match }] : []), TOTALS, ...WITH_USER, ...WITHOUT_OWN_DISLIKES];

// Members ranked by the likes (Top) or dislikes (Controversial) their
// reviews have collected from others, at most `limit`, each with those
// totals, their review count and their user document as `user[0]`. Members
// with none yet aren't ranked, and members with PVP off never rank on
// Controversial. The Critics Leaderboard, the rank rings on review cards
// and First Place (utils/firstPlace.js) all come from here.
async function rankCritics({ controversial = false, limit }) {
    const total = controversial ? "dislikes" : "likes";

    return Review.aggregate([
        ...totals(),
        { $match: { [total]: { $gt: 0 } } },
        ...(controversial ? [{ $match: { "user.pvp": true } }] : []),
        { $sort: { [total]: -1, _id: 1 } },
        { $limit: limit },
    ]);
}

// Everyone who has written a review, in rankCritics's shape, in no order:
// for ranking them some other way (by level, utils/level.js).
function everyCritic() {
    return Review.aggregate(totals());
}

// The same for the members in `userIds` (those with reviews): their levels
// on review cards and profiles (utils/level.js).
function criticTotals(userIds) {
    return Review.aggregate(totals({ user: { $in: userIds } }));
}

// Places 1 to 3 on the Top Critics Leaderboard, keyed by member id string.
async function topCriticRanks() {
    const rows = await rankCritics({ limit: 3 });
    return new Map(rows.map((row, index) => [String(row._id), index + 1]));
}

module.exports = { rankCritics, everyCritic, criticTotals, topCriticRanks };
