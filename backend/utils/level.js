const { criticTotals, everyCritic, topCriticRanks } = require("./critics");

// How far along a member is, in sixtieths of a level: reviews / 20 +
// likes / 5 - dislikes / 3, counting the likes and dislikes on their
// reviews. Reviews can make up at most 75% of the total, so they only
// count up to three times what the votes add: a member nobody has liked
// yet stays at 0 however much they write. Sixtieths so the sums are exact.
function xpFrom({ reviews = 0, likes = 0, dislikes = 0 }) {
    const fromVotes = 12 * likes - 20 * dislikes;
    const fromReviews = Math.min(3 * reviews, Math.max(0, 3 * fromVotes));

    return fromReviews + fromVotes;
}

// A member's level: whole levels only, never below 0.
function levelFrom(stats) {
    return Math.max(0, Math.floor(xpFrom(stats) / 60));
}

// The level of `user` (anything with `pvp`) from their stats. With PVP off
// they can't be disliked, so earlier dislikes don't count against them.
function levelOf(user, stats = {}) {
    return levelFrom(user.pvp ? stats : { ...stats, dislikes: 0 });
}

// The same, before rounding down to a whole level: who's furthest along
// between members on the same level (First Place, utils/firstPlace.js).
function xpOf(user, stats = {}) {
    return xpFrom(user.pvp ? stats : { ...stats, dislikes: 0 });
}

// How many reviews each of `userIds` has written and the likes and dislikes
// those have collected from others (their own don't count: utils/critics.js),
// keyed by id string. Members with no reviews are left out.
async function authorStats(userIds) {
    const rows = await criticTotals(userIds);
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

// The Critics Leaderboard's Level view: members by level, highest first,
// at most `limit`, ties going to whoever has more likes, then more reviews.
// Nobody at level 0 is on it. rankCritics's shape (utils/critics.js) with
// `level` added. Levels are worked out here rather than in the database,
// so this goes through every reviewer.
async function rankByLevel({ limit }) {
    const rows = await everyCritic();

    return rows
        .map((row) => ({ ...row, level: levelOf(row.user[0], row) }))
        .filter((row) => row.level > 0)
        .sort((a, b) => b.level - a.level || b.likes - a.likes || b.reviews - a.reviews || String(a._id).localeCompare(String(b._id)))
        .slice(0, limit);
}

module.exports = { levelOf, xpOf, rankByLevel, withAuthorStanding, withStanding };
