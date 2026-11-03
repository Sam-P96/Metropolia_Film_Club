const mongoose = require("mongoose");
const FilmLog = require("../models/filmLogModel");
const Follow = require("../models/followModel");
const Resonance = require("../models/resonanceModel");
const User = require("../models/userModel");
const { MIN_RATED, SUGGEST_FROM, SCORING_VERSION, tasteOf, resonanceBetween, suggestionCount } = require("./resonance");
const { RESONANCE_TIERS } = require("../../shared/resonance.js");
const { MEMBER_FIELDS, userSummary } = require("./serialize");

// Resonance's database side: working out and storing every pair each night
// (jobs/resonanceSweep.js), and reading one member's back with everyone's
// settings and privacy applied, so turning Resonance off, making a profile
// private or becoming friends shows straight away. The scoring itself is
// in utils/resonance.js.

// A rated film: watched, with a rating.
const RATED = { status: "completed", rating: { $ne: null } };

// The ranking page's "load more".
const PAGE_SIZE = 20;

// /SECRETresonance's "load more".
const ALL_PAGE_SIZE = 50;

// Pairs written to the database at a time.
const WRITE_BATCH = 500;

const toObjectId = (id) => new mongoose.Types.ObjectId(String(id));

// ---------- working it out ----------

// Works out every pair of members with MIN_RATED or more rated films, and
// stores them, whatever their settings: Resonance off and privacy only hide
// a member when it's asked for (below), so changing them shows straight
// away. Pairs this didn't reach (a member who's rated fewer films since, or
// gone) are removed. Resolves to { members, pairs }.
async function recalculateResonance() {
    const startedAt = new Date();

    const logs = await FilmLog.find(RATED)
        .select("user tmdbId title posterPath rating genres year certification")
        .lean();

    const byMember = new Map();
    for (const log of logs) {
        const id = String(log.user);
        if (!byMember.has(id)) byMember.set(id, []);
        byMember.get(id).push(log);
    }

    const enough = [...byMember].filter(([, films]) => films.length >= MIN_RATED).map(([id]) => id);
    const existing = new Set((await User.find({ _id: { $in: enough } }).distinct("_id")).map(String));
    // Sorted, so each pair's userA is the id that sorts first.
    const members = enough.filter((id) => existing.has(id)).sort();
    const tastes = members.map((id) => tasteOf(byMember.get(id)));

    let writes = [];
    let pairs = 0;
    const flush = async () => {
        if (writes.length) await Resonance.bulkWrite(writes, { ordered: false });
        writes = [];
    };

    for (let a = 0; a < members.length; a++) {
        for (let b = a + 1; b < members.length; b++) {
            const { percent, movies, genre, sharedCount, sharedFilms } = resonanceBetween(tastes[a], tastes[b]);

            writes.push({
                updateOne: {
                    filter: { userA: members[a], userB: members[b] },
                    update: { $set: { percent, movies, genre, sharedCount, sharedFilms, computedAt: startedAt, version: SCORING_VERSION } },
                    upsert: true,
                },
            });
            pairs += 1;

            if (writes.length >= WRITE_BATCH) await flush();
        }
    }

    await flush();
    await Resonance.deleteMany({ computedAt: { $lt: startedAt } });

    return { members: members.length, pairs };
}

// The last sweep: { at, version } (when it ran, and the scoring settings
// it used), or null if nothing's stored (nobody has enough rated films yet,
// or it's never run).
async function lastSweep() {
    const latest = await Resonance.findOne().sort({ computedAt: -1 }).select("computedAt version").lean();
    return latest ? { at: latest.computedAt, version: latest.version ?? null } : null;
}

// ---------- reading it back ----------

// How many films each of `userIds` has rated, by id.
async function ratedCounts(userIds) {
    const rows = await FilmLog.aggregate([
        { $match: { user: { $in: userIds.map(toObjectId) }, ...RATED } },
        { $group: { _id: "$user", count: { $sum: 1 } } },
    ]);

    return new Map(rows.map((row) => [String(row._id), row.count]));
}

// Where a member stands: Resonance on (`on`) and the icon on (`icon`), how
// many films they've rated and need, whether they can use it (`eligible`),
// and `waiting`: eligible, but with nothing worked out yet because they
// only got there since the last sweep.
async function standingOf(userId) {
    const me = toObjectId(userId);
    const [user, counts] = await Promise.all([
        User.findById(me).select("resonance resonanceIcon").lean(),
        ratedCounts([me]),
    ]);

    const on = user?.resonance !== false;
    const rated = counts.get(String(me)) ?? 0;
    const eligible = on && rated >= MIN_RATED;

    let waiting = false;
    if (eligible && !(await Resonance.exists({ $or: [{ userA: me }, { userB: me }] }))) {
        const [someoneElse] = await FilmLog.aggregate([
            { $match: { user: { $ne: me }, ...RATED } },
            { $group: { _id: "$user", count: { $sum: 1 } } },
            { $match: { count: { $gte: MIN_RATED } } },
            { $limit: 1 },
        ]);
        waiting = Boolean(someoneElse);
    }

    return { on, icon: user?.resonanceIcon !== false, rated, needed: MIN_RATED, eligible, waiting };
}

// How many members can use Resonance: on, with enough rated films.
async function eligibleCount() {
    const rows = await FilmLog.aggregate([
        { $match: RATED },
        { $group: { _id: "$user", count: { $sum: 1 } } },
        { $match: { count: { $gte: MIN_RATED } } },
    ]);

    return User.countDocuments({ _id: { $in: rows.map((row) => row._id) }, resonance: { $ne: false } });
}

// Best match first; then whoever shares the most films, then A to Z.
// `lowestFirst` turns the matches round, for the strongest Dissonance first.
function byPercent(lowestFirst = false) {
    return (x, y) =>
        (lowestFirst ? x.pair.percent - y.pair.percent : y.pair.percent - x.pair.percent) ||
        y.pair.sharedCount - x.pair.sharedCount ||
        x.other.username.localeCompare(y.other.username);
}

// Everyone `userId` has a Resonance with and may see: with Resonance on and
// MIN_RATED rated films right now, and a public profile, or a friends only
// one and the two of them friends. Private profiles never show. Nothing at
// all unless `standing` (standingOf) is eligible. Each is { other (the
// member), pair (the stored Resonance), relation: "friends", "following",
// "followsYou" or null }, best match first.
async function visibleMatches(userId, standing) {
    if (!standing.eligible) return [];

    const me = toObjectId(userId);
    const pairs = await Resonance.find({ $or: [{ userA: me }, { userB: me }] }).lean();
    if (pairs.length === 0) return [];

    const otherOf = (pair) => (String(pair.userA) === String(me) ? pair.userB : pair.userA);
    const otherIds = pairs.map(otherOf);

    const [others, counts, following, followers] = await Promise.all([
        User.find({ _id: { $in: otherIds }, resonance: { $ne: false }, privacy: { $ne: "private" } })
            .select(`${MEMBER_FIELDS} resonanceIcon`)
            .lean(),
        ratedCounts(otherIds),
        Follow.find({ follower: me, following: { $in: otherIds } }).distinct("following"),
        Follow.find({ following: me, follower: { $in: otherIds } }).distinct("follower"),
    ]);

    const byId = new Map(others.map((other) => [String(other._id), other]));
    const iFollow = new Set(following.map(String));
    const followsMe = new Set(followers.map(String));

    const matches = [];
    for (const pair of pairs) {
        const id = String(otherOf(pair));
        const other = byId.get(id);
        if (!other || (counts.get(id) ?? 0) < MIN_RATED) continue;

        const friends = iFollow.has(id) && followsMe.has(id);
        if (other.privacy === "friends" && !friends) continue;

        const relation = friends ? "friends" : iFollow.has(id) ? "following" : followsMe.has(id) ? "followsYou" : null;
        matches.push({ other, pair, relation });
    }

    return matches.sort(byPercent());
}

// One match as the pages get it: the member (enough for an avatar, name and
// banner), the score and the card's two factors, the shared films, and how
// the two of them follow each other.
function matchView({ other, pair, relation }) {
    const { _id, username, avatarUrl, reviewCardBanner } = userSummary(other);

    return {
        user: { _id, username, avatarUrl, reviewCardBanner },
        percent: pair.percent,
        movies: pair.movies,
        genre: pair.genre,
        sharedCount: pair.sharedCount,
        sharedFilms: pair.sharedFilms ?? [],
        relation,
    };
}

// The home page's suggestions for `userId`: their best matches at
// SUGGEST_FROM% or more, the top suggestionCount() of them. The page picks
// one at random. Friends and members they already follow are in it on
// purpose.
async function suggestionsFor(userId) {
    const matches = await visibleMatches(userId, await standingOf(userId));
    const strong = matches.filter((match) => match.pair.percent >= SUGGEST_FROM);
    if (strong.length === 0) return [];

    return strong.slice(0, suggestionCount(await eligibleCount())).map(matchView);
}

// The Resonance page, a page at a time from `offset`: "resonance" is
// everyone at 50% or more, best first; "dissonance" everyone below, the
// strongest Dissonance (the lowest match) first. `search` keeps only the
// names with it in (any case), each keeping its `rank` in the whole list.
// With the member's standing, so the page knows what to say when there's
// nothing.
async function rankingFor(userId, side, offset, search = "") {
    const standing = await standingOf(userId);
    const matches = await visibleMatches(userId, standing);

    const list =
        side === "dissonance"
            ? matches.filter((match) => match.pair.percent < RESONANCE_TIERS.resonance).sort(byPercent(true))
            : matches.filter((match) => match.pair.percent >= RESONANCE_TIERS.resonance);

    const needle = search.trim().toLowerCase();
    const found = list
        .map((match, index) => ({ match, rank: index + 1 }))
        .filter(({ match }) => !needle || match.other.username.toLowerCase().includes(needle));

    return {
        standing,
        matches: found.slice(offset, offset + PAGE_SIZE).map(({ match, rank }) => ({ ...matchView(match), rank })),
        total: found.length,
        hasMore: offset + PAGE_SIZE < found.length,
        next: offset + PAGE_SIZE,
    };
}

// The members `userId` has a Soul Resonance with, for the glow on their
// review cards and the icon after their names around the site:
// { [their id]: { percent, icon } }. `icon` is false when either of them
// has the icon turned off: their cards still glow, but no icon shows.
// Empty when `userId` can't use Resonance.
async function soulMapFor(userId) {
    const standing = await standingOf(userId);
    const matches = await visibleMatches(userId, standing);

    return Object.fromEntries(
        matches
            .filter((match) => match.pair.percent >= RESONANCE_TIERS.soul)
            .map((match) => [
                String(match.other._id),
                { percent: match.pair.percent, icon: standing.icon && match.other.resonanceIcon !== false },
            ])
    );
}

// For the GDPR download: their stored matches with the members they may
// see, whatever their own settings and number of ratings.
async function resonanceOf(userId) {
    const matches = await visibleMatches(userId, { eligible: true });

    return matches.map(({ other, pair }) => ({
        member: other.username,
        percent: pair.percent,
        sharedCount: pair.sharedCount,
        computedAt: pair.computedAt,
    }));
}

// /SECRETresonance, for admins: every pair of members, worked out now with
// the current weights (not the stored ones), whatever their settings and
// privacy. `minRated` is how many rated films each needs (MIN_RATED, or 1
// for anyone who has rated anything), `memberId` narrows it to one
// member's pairs. All five factors, as percentages. A page at a time from
// `offset`, best match first, with everyone it counted for the filter.
async function everyonesResonance({ minRated, memberId = null, offset = 0 }) {
    const logs = await FilmLog.find(RATED)
        .select("user tmdbId title posterPath rating genres year certification")
        .lean();

    const byMember = new Map();
    for (const log of logs) {
        const id = String(log.user);
        if (!byMember.has(id)) byMember.set(id, []);
        byMember.get(id).push(log);
    }

    const enough = [...byMember].filter(([, films]) => films.length >= minRated).map(([id]) => id);
    const users = await User.find({ _id: { $in: enough } })
        .select(`${MEMBER_FIELDS} resonance`)
        .lean();
    users.sort((a, b) => a.username.localeCompare(b.username));

    const members = users.map((user) => ({
        _id: String(user._id),
        username: user.username,
        rated: byMember.get(String(user._id)).length,
        privacy: user.privacy ?? "public",
        resonance: user.resonance !== false,
    }));
    const tastes = new Map(users.map((user) => [String(user._id), tasteOf(byMember.get(String(user._id)))]));
    const summaries = new Map(users.map((user) => {
        const { _id, username, avatarUrl, reviewCardBanner } = userSummary(user);
        return [String(user._id), { _id, username, avatarUrl, reviewCardBanner }];
    }));

    const toPercent = (value) => Math.round(value * 100);
    const pairs = [];
    for (let a = 0; a < users.length; a++) {
        for (let b = a + 1; b < users.length; b++) {
            const [idA, idB] = [String(users[a]._id), String(users[b]._id)];
            if (memberId && idA !== memberId && idB !== memberId) continue;

            // The member asked about first.
            const [first, second] = idB === memberId ? [idB, idA] : [idA, idB];
            const { percent, sharedCount, factors } = resonanceBetween(tastes.get(first), tastes.get(second));
            pairs.push({
                a: summaries.get(first),
                b: summaries.get(second),
                percent,
                sharedCount,
                factors: {
                    movies: toPercent(factors.movies),
                    genre: toPercent(factors.genreRating),
                    genreOverlap: toPercent(factors.genreOverlap),
                    decades: toPercent(factors.year),
                    ageRatings: toPercent(factors.ageRating),
                },
            });
        }
    }

    pairs.sort((x, y) => y.percent - x.percent || y.sharedCount - x.sharedCount);

    return {
        members,
        pairs: pairs.slice(offset, offset + ALL_PAGE_SIZE),
        total: pairs.length,
        hasMore: offset + ALL_PAGE_SIZE < pairs.length,
        next: offset + ALL_PAGE_SIZE,
    };
}

// When a member's account is deleted.
async function forgetResonance(userId) {
    const id = toObjectId(userId);
    await Resonance.deleteMany({ $or: [{ userA: id }, { userB: id }] });
}

module.exports = {
    recalculateResonance,
    lastSweep,
    standingOf,
    suggestionsFor,
    rankingFor,
    soulMapFor,
    resonanceOf,
    everyonesResonance,
    forgetResonance,
};
