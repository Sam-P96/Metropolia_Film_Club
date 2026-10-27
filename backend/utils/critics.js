const Review = require("../models/reviewModel");
const User = require("../models/userModel");

// Members ranked by the likes (Top) or dislikes (Controversial) their
// reviews have collected, at most `limit`, each with those totals, their
// review count and their user document as `user[0]`. Members with none yet
// aren't ranked, and members with PVP off never rank on Controversial. The
// Critics Leaderboard and the rank rings on review cards both come from here.
async function rankCritics({ controversial = false, limit }) {
    const total = controversial ? "dislikes" : "likes";

    return Review.aggregate([
        {
            $group: {
                _id: "$user",
                likes: { $sum: "$likeCount" },
                dislikes: { $sum: "$dislikeCount" },
                reviews: { $sum: 1 },
            },
        },
        { $match: { [total]: { $gt: 0 } } },
        {
            $lookup: {
                from: User.collection.name,
                localField: "_id",
                foreignField: "_id",
                as: "user",
                pipeline: [{ $project: { username: 1, role: 1, memberTitle: 1, avatarUrl: 1, reviewCardBanner: 1, value: 1, pvp: 1 } }],
            },
        },
        // A deleted member's reviews go with them, but don't trip over one.
        { $match: { "user.0": { $exists: true }, ...(controversial ? { "user.pvp": true } : {}) } },
        { $sort: { [total]: -1, _id: 1 } },
        { $limit: limit },
    ]);
}

// Places 1 to 3 on the Top Critics Leaderboard, keyed by member id string.
async function topCriticRanks() {
    const rows = await rankCritics({ limit: 3 });
    return new Map(rows.map((row, index) => [String(row._id), index + 1]));
}

module.exports = { rankCritics, topCriticRanks };
