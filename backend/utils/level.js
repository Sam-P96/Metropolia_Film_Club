const Review = require("../models/reviewModel");
const { topCriticRanks } = require("./critics");

// A member's level: reviews / 20 + likes / 5 - dislikes / 3, counting the
// likes and dislikes on their reviews. Reviews can make up at most 75% of
// the total, so they only count up to three times what the votes add: a
// member nobody has liked yet stays at 0 however much they write. Whole
// levels only, never below 0. Worked in sixtieths so the sums are exact.
function levelFrom({ reviews = 0, likes = 0, dislikes = 0 }) {
    const fromVotes = 12 * likes - 20 * dislikes;
    const fromReviews = Math.min(3 * reviews, Math.max(0, 3 * fromVotes));

    return Math.max(0, Math.floor((fromReviews + fromVotes) / 60));
}

// The level of `user` (anything with `pvp`) from their stats. With PVP off
// they can't be disliked, so earlier dislikes don't count against them.
function levelOf(user, stats = {}) {
    return levelFrom(user.pvp ? stats : { ...stats, dislikes: 0 });
}

// How many reviews each of `userIds` has written and the likes and dislikes
// those have collected, keyed by id string. Members with no reviews are left
// out.
async function authorStats(userIds) {
    const rows = await Review.aggregate([
        { $match: { user: { $in: userIds } } },
        {
            $group: {
                _id: "$user",
                reviews: { $sum: 1 },
                likes: { $sum: "$likeCount" },
                dislikes: { $sum: "$dislikeCount" },
            },
        },
    ]);

    return new Map(rows.map((row) => [String(row._id), row]));
}

// A member's level, and their place on the Top Critics Leaderboard if it's
// 1, 2 or 3 (else null), for the rank ring on their review card. The ring
// shows only if they leave showRank on, but `rank` is sent either way: the
// leaderboard is public, and Edit review card previews it.
function standing(user, stats, ranks) {
    const id = String(user._id);
    return { level: levelOf(user, stats.get(id)), rank: ranks.get(id) ?? null };
}

// Adds `level` and `rank` to the author of each review (the shape
// reviewWithUser makes).
async function withAuthorStanding(reviews) {
    const [stats, ranks] = await Promise.all([
        authorStats(reviews.map((review) => review.user._id)),
        topCriticRanks(),
    ]);

    return reviews.map((review) => ({
        ...review,
        user: { ...review.user, ...standing(review.user, stats, ranks) },
    }));
}

// Adds `level` and `rank` to a profile.
async function withStanding(profile) {
    const [stats, ranks] = await Promise.all([authorStats([profile._id]), topCriticRanks()]);
    return { ...profile, ...standing(profile, stats, ranks) };
}

module.exports = { levelOf, withAuthorStanding, withStanding };
