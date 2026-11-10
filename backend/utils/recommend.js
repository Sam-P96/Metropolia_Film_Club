const Review = require("../models/reviewModel");
const FilmLog = require("../models/filmLogModel");
const { tasteOf } = require("./resonance");
const { resonancePercents } = require("./resonanceStore");

// "Recommend" in the reviews toggle (the homepage and the reviews page): a
// random handful of other members' reviews, leaning towards the ones the
// member is likely to enjoy. Each candidate gets a score from 0 to 1
// (scoreReview), then they're drawn at random, a higher score making a
// review that much likelier to come up (pickWeighted), so it's different
// every time but never just anything. A fifth are about films the member has
// seen and the rest about films they haven't, as far as there are enough of
// each. The same film can come up more than once; their own reviews never do.

// ---------- the settings ----------

// The share of the picks about films they've seen (watched, in their film
// log). The rest are about films they haven't. Short of either, the other
// makes up the rest.
const SEEN_SHARE = 0.2;

// The newest reviews it picks from.
const POOL_SIZE = 1000;

// How much each part counts towards a review's score. Each part is 0 to 1,
// and each set adds up to 1.
//   resonance  their Resonance with its author (0.5 when there's none they
//              may see: Resonance off, too few ratings, a private profile)
//   genre      how they rate the film's genres, against their usual
//   liked      how liked the review is
//   agreement  (films they've seen) how close its rating is to theirs
const WEIGHTS = {
    unseen: { resonance: 0.45, genre: 0.35, liked: 0.2 },
    seen: { resonance: 0.3, genre: 0.15, agreement: 0.35, liked: 0.2 },
};

// How strongly the draw leans to the best scores: a review scoring 1 is
// e^SHARPNESS times as likely to come up as one scoring 0 (4: about 55
// times). 0 would be a plain shuffle.
const SHARPNESS = 4;

// Rated films a member needs in a genre before their taste in it counts. A
// genre they haven't rated enough of scores UNKNOWN_GENRE: a little below
// neutral, as they don't seem to go looking for it.
const MIN_GENRE_FILMS = 2;
const UNKNOWN_GENRE = 0.4;

// Stars above or below their usual that count as loving or hating a genre:
// rated this much above it on average scores 1, this much below 0.
const GENRE_RANGE = 1.5;

// Likes that make a review count as half liked: likes / (likes + LIKES_HALF).
const LIKES_HALF = 3;

// The furthest apart two ratings can be (5 - 0.5).
const RATING_SCALE = 4.5;

// ---------- the score ----------

const clamp01 = (value) => Math.min(1, Math.max(0, value));

// How they'd take a film in `genres`, 0 to 1, from their taste (tasteOf of
// their rated films): the average over its genres, 0.5 for a film with none.
function genreFit(genres, taste) {
    const unique = [...new Set(genres ?? [])];
    if (unique.length === 0) return 0.5;

    const fits = unique.map((genre) => {
        const entry = taste.byGenre.get(genre);
        if (!entry || entry.count < MIN_GENRE_FILMS) return UNKNOWN_GENRE;
        return clamp01(0.5 + entry.total / entry.count / (2 * GENRE_RANGE));
    });

    return fits.reduce((sum, fit) => sum + fit, 0) / fits.length;
}

const weigh = (parts, weights) => Object.entries(weights).reduce((sum, [part, weight]) => sum + weight * parts[part], 0);

// How much a member would like `review` (a lean review: user, tmdbId,
// rating, genres, likeCount), 0 to 1. `context` is what's known about them:
//   taste      tasteOf() of their rated films
//   seen       Map of each film they've seen (tmdbId) to their rating, or null
//   resonance  Map of member id to their Resonance percent (resonancePercents)
function scoreReview(review, { taste, seen, resonance }) {
    const percent = resonance.get(String(review.user));
    const likes = review.likeCount ?? 0;
    const parts = {
        resonance: percent === undefined ? 0.5 : percent / 100,
        genre: genreFit(review.genres, taste),
        liked: likes / (likes + LIKES_HALF),
    };

    if (!seen.has(review.tmdbId)) return weigh(parts, WEIGHTS.unseen);

    const mine = seen.get(review.tmdbId);
    parts.agreement =
        typeof mine === "number" && typeof review.rating === "number"
            ? clamp01(1 - Math.abs(mine - review.rating) / RATING_SCALE)
            : 0.5;
    return weigh(parts, WEIGHTS.seen);
}

// ---------- the draw ----------

// `count` of `items`, drawn at random without repeats, each `weightOf(item)`
// (above 0) times as likely to come up as one weighing 1. Each gets a random
// key, ln(u) / weight, and the biggest keys win (Efraimidis and Spirakis).
// `random` is for the tests.
function pickWeighted(items, count, weightOf, random = Math.random) {
    return items
        // 1 - random() is never 0, so its log is never -Infinity.
        .map((item) => ({ item, key: Math.log(1 - random()) / weightOf(item) }))
        .sort((a, b) => b.key - a.key)
        .slice(0, Math.max(0, count))
        .map(({ item }) => item);
}

// A copy of `items` in a random order (Fisher and Yates).
function shuffle(items, random = Math.random) {
    const out = [...items];
    for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
}

// How many to draw from the seen and the unseen: SEEN_SHARE of `limit` from
// the seen, the rest from the unseen, each making up for the other running
// short. { seen, unseen }.
function split(limit, seenAvailable, unseenAvailable) {
    const seen = Math.min(seenAvailable, Math.max(Math.round(limit * SEEN_SHARE), limit - unseenAvailable));
    return { seen, unseen: Math.min(unseenAvailable, limit - seen) };
}

// Up to `limit` review ids for `userId`, mixed up: the Recommend list. None
// of the reviews in `exclude` (ids) come up.
async function recommendedReviewIds(userId, limit, exclude = []) {
    const [logs, resonance, pool] = await Promise.all([
        FilmLog.find({ user: userId, status: "completed" }).select("tmdbId rating genres").lean(),
        resonancePercents(userId),
        Review.find({ user: { $ne: userId }, _id: { $nin: exclude } })
            .sort({ createdAt: -1 })
            .limit(POOL_SIZE)
            .select("user tmdbId rating genres likeCount")
            .lean(),
    ]);

    const context = {
        taste: tasteOf(logs),
        seen: new Map(logs.map((log) => [log.tmdbId, log.rating ?? null])),
        resonance,
    };
    const weightOf = (review) => Math.exp(SHARPNESS * scoreReview(review, context));

    const seen = pool.filter((review) => context.seen.has(review.tmdbId));
    const unseen = pool.filter((review) => !context.seen.has(review.tmdbId));
    const counts = split(limit, seen.length, unseen.length);

    const picks = [...pickWeighted(seen, counts.seen, weightOf), ...pickWeighted(unseen, counts.unseen, weightOf)];
    return shuffle(picks).map((review) => review._id);
}

// ---------- Featured ----------

// "Featured", the toggle's default: FEATURED_NEW_SHARE of the reviews are
// the newest, and the rest are picked for the member (as Recommend picks
// them), leaving out the newest ones already in. Logged out, the rest are
// the most liked instead. Short of picks (too few reviews by anyone else),
// more of the newest make up the rest. The first FEATURED_NEWEST_FIRST are
// always the very newest, newest first; the rest are mixed up together.
const FEATURED_NEW_SHARE = 0.6;
const FEATURED_NEWEST_FIRST = 2;

const idsOf = async (query) => (await query.select("_id").lean()).map((review) => review._id);
const newestFirst = { createdAt: -1 };
const mostLikedFirst = { likeCount: -1, createdAt: -1 };

// Up to `limit` review ids, for `userId` (null when logged out).
async function featuredReviewIds(userId, limit) {
    const ids = await idsOf(Review.find().sort(newestFirst).limit(Math.round(limit * FEATURED_NEW_SHARE)));
    const rest = limit - ids.length;

    // limit(0) would be no limit at all, hence the checks.
    if (rest > 0) {
        ids.push(
            ...(userId
                ? await recommendedReviewIds(userId, rest, ids)
                : await idsOf(Review.find({ _id: { $nin: ids } }).sort(mostLikedFirst).limit(rest)))
        );
    }

    if (ids.length < limit) {
        ids.push(...(await idsOf(Review.find({ _id: { $nin: ids } }).sort(newestFirst).limit(limit - ids.length))));
    }

    // The newest came first, newest first, so the lead is already in order.
    return [...ids.slice(0, FEATURED_NEWEST_FIRST), ...shuffle(ids.slice(FEATURED_NEWEST_FIRST))];
}

module.exports = {
    SEEN_SHARE,
    FEATURED_NEW_SHARE,
    FEATURED_NEWEST_FIRST,
    WEIGHTS,
    genreFit,
    scoreReview,
    pickWeighted,
    shuffle,
    split,
    recommendedReviewIds,
    featuredReviewIds,
};
