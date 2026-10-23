const mongoose = require("mongoose");
const FilmLog = require("../models/filmLogModel");
const Review = require("../models/reviewModel");
const { getMovie, getMovies } = require("../services/tmdbService");
const { userSummary, reviewWithUser } = require("../utils/serialize");

// "Top rated by the club" shows every rated film, but ranks them as if each
// also had this many extra ratings at the club's overall average. A film only
// one member has rated is pulled towards that average, so a film several
// members rated highly usually ranks above one lone 5-star rating; the more
// members rate a film, the less the pull matters. (A hard minimum of two
// ratings hid every film while the club was small.)
const RANKING_PRIOR_WEIGHT = 3;

const MAX_REVIEW_LENGTH = 4000;

// The fields a review card needs from its author.
const AUTHOR_FIELDS = "username role memberTitle avatarUrl reviewCardBanner value privacy";

// "This member wants to see this film": never seen it, or seen it and
// flagged a rewatch. The same rule as frontend/src/utils/watchlist.js.
const WANTED = { $or: [{ status: "plan_to_watch" }, { wantsRewatch: true }] };
const wantedExpr = {
    $or: [{ $eq: ["$status", "plan_to_watch"] }, { $eq: ["$wantsRewatch", true] }],
};

function parseTmdbId(value) {
    const id = Number(value);
    return Number.isInteger(id) && id > 0 ? id : null;
}

function parseLimit(value, fallback, max) {
    const limit = Number(value);
    return Number.isInteger(limit) && limit > 0 ? Math.min(limit, max) : fallback;
}

// How many to skip, for "load more". Anything odd counts as 0.
function parseOffset(value) {
    const offset = Number(value);
    return Number.isInteger(offset) && offset > 0 ? offset : 0;
}

// The title, year, poster and genres copied onto log entries and reviews.
// Sends the error response itself and returns null if TMDB can't help.
async function filmDetailsOr404(tmdbId, res) {
    let film;

    try {
        film = await getMovie(tmdbId);
    } catch (error) {
        console.error("TMDB lookup failed:", error);
        res.status(502).json({ error: "Couldn't reach TMDB to look the film up. Try again." });
        return null;
    }

    if (!film) {
        res.status(404).json({ error: "Film not found." });
        return null;
    }

    return {
        title: film.title,
        year: film.year ? Number(film.year) : null,
        posterPath: film.posterPath ?? null,
        genres: film.genres ?? [],
    };
}

// ---------- the club as a whole ----------

// Club rating and "how many want it" for every film anyone has logged,
// keyed by tmdbId. One request covers every film card on a page.
async function getFilmStats(req, res) {
    const rows = await FilmLog.aggregate([
        {
            $group: {
                _id: "$tmdbId",
                average: { $avg: "$rating" },
                count: { $sum: { $cond: [{ $ne: ["$rating", null] }, 1, 0] } },
                wanting: { $sum: { $cond: [wantedExpr, 1, 0] } },
            },
        },
    ]);

    const stats = {};
    rows.forEach((row) => {
        stats[row._id] = {
            average: row.count > 0 ? row.average : null,
            count: row.count,
            wanting: row.wanting,
        };
    });

    res.json(stats);
}

async function getTopRated(req, res) {
    const limit = parseLimit(req.query.limit, 6, 50);

    const films = await FilmLog.aggregate([
        { $match: { rating: { $ne: null } } },
        { $sort: { updatedAt: -1 } },
        {
            $group: {
                _id: "$tmdbId",
                title: { $first: "$title" },
                year: { $first: "$year" },
                posterPath: { $first: "$posterPath" },
                total: { $sum: "$rating" },
                count: { $sum: 1 },
            },
        },
    ]);

    if (films.length === 0) {
        return res.json([]);
    }

    // The club's average across every rating of every film.
    const ratingCount = films.reduce((sum, film) => sum + film.count, 0);
    const clubAverage = films.reduce((sum, film) => sum + film.total, 0) / ratingCount;

    const ranked = films
        .map((film) => ({
            film,
            score: (film.total + RANKING_PRIOR_WEIGHT * clubAverage) / (film.count + RANKING_PRIOR_WEIGHT),
        }))
        .sort((a, b) =>
            b.score - a.score ||
            b.film.count - a.film.count ||
            a.film.title.localeCompare(b.film.title)
        )
        .slice(0, limit)
        // The score only decides the order. The stars show the real average.
        .map(({ film }) => ({
            tmdbId: film._id,
            title: film.title,
            year: film.year,
            posterPath: film.posterPath,
            average: film.total / film.count,
            count: film.count,
        }));

    res.json(ranked);
}

// The films the most members want to see. First watches and rewatches count
// the same. A page at a time: ?limit=20&offset=20 is the second page of 20.
// Resolves to { films, total }, where total is how many films are wanted at all.
async function getMostWanted(req, res) {
    const limit = parseLimit(req.query.limit, 10, 50);
    const offset = parseOffset(req.query.offset);

    const [result] = await FilmLog.aggregate([
        { $match: WANTED },
        {
            $group: {
                _id: "$tmdbId",
                title: { $first: "$title" },
                year: { $first: "$year" },
                posterPath: { $first: "$posterPath" },
                count: { $sum: 1 },
            },
        },
        // _id last so films with the same count and title still come back in
        // the same order every time, and no film is skipped or repeated
        // between pages.
        { $sort: { count: -1, title: 1, _id: 1 } },
        {
            $facet: {
                films: [
                    { $skip: offset },
                    { $limit: limit },
                    { $project: { _id: 0, tmdbId: "$_id", title: 1, year: 1, posterPath: 1, count: 1 } },
                ],
                total: [{ $count: "n" }],
            },
        },
    ]);

    res.json({ films: result.films, total: result.total[0]?.n ?? 0 });
}

// The browse page's "Movies with club reviews only". TMDB can't be asked for
// "only these films", so this looks up every reviewed film (cached for a day)
// and applies the same filters and sorts as TMDB's Discover (routes/tmdb.js)
// itself. A filter added there needs adding here too.
const BROWSE_PAGE_SIZE = 20;

// "28,12" -> [28, 12]
function idList(value) {
    return value ? String(value).split(",").map(Number).filter(Boolean) : [];
}

function matchesBrowseFilters(query) {
    const studios = idList(query.studio);
    const genres = idList(query.genres);
    const excludeGenres = idList(query.excludeGenres);
    const yearFrom = Number(query.yearFrom) || null;
    const yearTo = Number(query.yearTo) || null;
    const minRating = Number(query.minRating) || null;
    const minVotes = Number(query.minVotes) || null;
    const runtimeMin = Number(query.runtimeMin) || null;
    const runtimeMax = Number(query.runtimeMax) || null;

    return (film) => {
        const year = film.releaseDate ? Number(film.releaseDate.slice(0, 4)) : null;

        return (
            studios.every((id) => film.studioIds.includes(id)) &&
            genres.every((id) => film.genreIds.includes(id)) &&
            !excludeGenres.some((id) => film.genreIds.includes(id)) &&
            (!yearFrom || (year !== null && year >= yearFrom)) &&
            (!yearTo || (year !== null && year <= yearTo)) &&
            (!query.certification || film.usCertifications.includes(query.certification)) &&
            (!minRating || film.tmdbRating >= minRating) &&
            (!minVotes || film.tmdbVotes >= minVotes) &&
            (!runtimeMin || film.runtime >= runtimeMin) &&
            (!runtimeMax || (film.runtime > 0 && film.runtime <= runtimeMax)) &&
            (!query.language || film.originalLanguage === query.language)
        );
    };
}

// Films with no release date go last either way.
const BROWSE_SORTS = {
    "popularity.desc": (a, b) => b.popularity - a.popularity,
    "release_date.desc": (a, b) => (b.releaseDate || "").localeCompare(a.releaseDate || ""),
    "release_date.asc": (a, b) => (a.releaseDate || "9999").localeCompare(b.releaseDate || "9999"),
    "vote_average.desc": (a, b) => b.tmdbRating - a.tmdbRating,
    "vote_count.desc": (a, b) => b.tmdbVotes - a.tmdbVotes,
    "revenue.desc": (a, b) => b.revenue - a.revenue,
    "title.asc": () => 0,
};

// "Sort by club ratings": the average on each film's card (getFilmStats),
// highest first, then the film more members rated. Reviewed films nobody
// has rated go last.
async function byClubRating(tmdbIds) {
    const rows = await FilmLog.aggregate([
        { $match: { tmdbId: { $in: tmdbIds }, rating: { $ne: null } } },
        { $group: { _id: "$tmdbId", average: { $avg: "$rating" }, count: { $sum: 1 } } },
    ]);

    const club = new Map(rows.map((row) => [row._id, row]));
    const average = (film) => club.get(film.tmdbId)?.average ?? 0;
    const count = (film) => club.get(film.tmdbId)?.count ?? 0;

    return (a, b) => average(b) - average(a) || count(b) - count(a);
}

// Same shape as a film from /api/tmdb/discover. A page at a time, like TMDB:
// resolves to { films, page, totalPages, totalResults }.
async function getReviewedFilms(req, res) {
    const page = parseLimit(req.query.page, 1, 500);

    const tmdbIds = await Review.distinct("tmdbId");

    // ?byClubRating=1 takes over from ?sort.
    const compare = req.query.byClubRating
        ? await byClubRating(tmdbIds)
        : BROWSE_SORTS[req.query.sort] ?? BROWSE_SORTS["popularity.desc"];

    let films;
    try {
        films = (await getMovies(tmdbIds)).filter(Boolean);
    } catch (error) {
        console.error("TMDB lookup failed:", error);
        return res.status(502).json({ error: "Couldn't reach TMDB to look the films up. Try again." });
    }

    const matching = films
        .filter(matchesBrowseFilters(req.query))
        .sort((a, b) => compare(a, b) || a.title.localeCompare(b.title));

    const start = (page - 1) * BROWSE_PAGE_SIZE;

    res.json({
        films: matching.slice(start, start + BROWSE_PAGE_SIZE).map((film) => ({
            tmdbId: film.tmdbId,
            title: film.title,
            posterPath: film.posterPath,
            year: film.year,
            overview: film.overview,
            tmdbRating: film.tmdbRating,
            tmdbVotes: film.tmdbVotes,
            genreIds: film.genreIds,
        })),
        page,
        totalPages: Math.ceil(matching.length / BROWSE_PAGE_SIZE),
        totalResults: matching.length,
    });
}

// Reviews from anyone, for the homepage and reviews page: the newest, or with
// ?sort=top the most liked (newest first among equals).
async function getReviews(req, res) {
    const limit = parseLimit(req.query.limit, 15, 50);
    const order = req.query.sort === "top" ? { likeCount: -1, createdAt: -1 } : { createdAt: -1 };

    const reviews = await Review.find()
        .sort(order)
        .limit(limit)
        .populate("user", AUTHOR_FIELDS)
        .lean();

    const shown = reviews.filter((review) => review.user).map(reviewWithUser);
    res.json(await Review.withLikedByMe(shown, req.user));
}

async function getReview(req, res) {
    const review = mongoose.isValidObjectId(req.params.id)
        ? await Review.findById(req.params.id).populate("user", AUTHOR_FIELDS).lean()
        : null;

    if (!review) {
        return res.status(404).json({ error: "Review not found." });
    }

    const likedByMe = req.user
        ? Boolean(await Review.exists({ _id: review._id, likedBy: req.user._id }))
        : false;

    res.json({ ...reviewWithUser(review), likedByMe });
}

// The like button. The filter only matches when the like really changes
// something, so a double click can't count someone twice or push the count
// below zero. Likes don't touch updatedAt, which means "last edited".
async function setReviewLiked(req, res) {
    if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(404).json({ error: "Review not found." });
    }

    const liked = Boolean(req.body?.liked);
    const me = req.user._id;

    await Review.updateOne(
        liked
            ? { _id: req.params.id, likedBy: { $ne: me } }
            : { _id: req.params.id, likedBy: me },
        liked
            ? { $push: { likedBy: me }, $inc: { likeCount: 1 } }
            : { $pull: { likedBy: me }, $inc: { likeCount: -1 } },
        { timestamps: false }
    );

    const review = await Review.findById(req.params.id).select("likeCount").lean();

    if (!review) {
        return res.status(404).json({ error: "Review not found." });
    }

    res.json({ likeCount: review.likeCount, likedByMe: liked });
}

// Moderators marking someone else's review as containing spoilers, or
// taking the mark off. The author can still change it by editing the review.
async function setReviewSpoilers(req, res) {
    const review = mongoose.isValidObjectId(req.params.id)
        ? await Review.findByIdAndUpdate(
            req.params.id,
            { $set: { containsSpoilers: Boolean(req.body?.containsSpoilers) } },
            { returnDocument: "after", timestamps: false }
        ).select("containsSpoilers").lean()
        : null;

    if (!review) {
        return res.status(404).json({ error: "Review not found." });
    }

    res.json({ containsSpoilers: review.containsSpoilers });
}

// ---------- one film ----------

async function getFilmReviews(req, res) {
    const tmdbId = parseTmdbId(req.params.tmdbId);
    if (!tmdbId) return res.status(404).json({ error: "Film not found." });

    const reviews = await Review.find({ tmdbId })
        .sort({ createdAt: -1 })
        .populate("user", AUTHOR_FIELDS)
        .lean();

    const shown = reviews.filter((review) => review.user).map(reviewWithUser);
    res.json(await Review.withLikedByMe(shown, req.user));
}

// The club rating for one film, and who wants to see it. Members with a
// private profile count towards the numbers but aren't named, unless it's
// the person asking.
async function getFilmClub(req, res) {
    const tmdbId = parseTmdbId(req.params.tmdbId);
    if (!tmdbId) return res.status(404).json({ error: "Film not found." });

    const entries = await FilmLog.find({ tmdbId })
        .populate("user", AUTHOR_FIELDS)
        .lean();

    const rated = entries.filter((entry) => entry.rating != null);
    const average = rated.length
        ? rated.reduce((sum, entry) => sum + entry.rating, 0) / rated.length
        : null;

    const viewerId = req.user ? String(req.user._id) : null;

    const wantingEntries = entries.filter(
        (entry) => entry.user && (entry.status === "plan_to_watch" || entry.wantsRewatch)
    );

    const wanting = wantingEntries
        .filter((entry) => {
            const isViewer = String(entry.user._id) === viewerId;
            return isViewer || (entry.user.privacy ?? "public") === "public";
        })
        // The viewer first, then whoever added it most recently.
        .sort((a, b) => {
            if (String(a.user._id) === viewerId) return -1;
            if (String(b.user._id) === viewerId) return 1;
            return new Date(b.updatedAt) - new Date(a.updatedAt);
        })
        .map((entry) => ({
            _id: entry._id,
            userId: entry.user._id,
            status: entry.status,
            wantsRewatch: entry.wantsRewatch,
            user: userSummary(entry.user),
        }));

    res.json({
        rating: { average, count: rated.length },
        wantingCount: wantingEntries.length,
        wanting,
    });
}

// ---------- the logged-in member and one film ----------

// Their log entry and review for this film, either of which may be null.
async function getMyFilm(req, res) {
    const tmdbId = parseTmdbId(req.params.tmdbId);
    if (!tmdbId) return res.status(404).json({ error: "Film not found." });

    const [entry, review] = await Promise.all([
        FilmLog.findOne({ user: req.user._id, tmdbId }).lean(),
        Review.findOne({ user: req.user._id, tmdbId }).lean(),
    ]);

    res.json({ entry, review });
}

// The "Plan to watch" button. What the click means depends on whether
// they've already seen the film, so the server works it out:
//   seen it        -> only the rewatch flag changes
//   not seen, on   -> add it as plan to watch
//   not seen, off  -> nothing left worth keeping, delete the entry
async function setPlanned(req, res) {
    const tmdbId = parseTmdbId(req.params.tmdbId);
    if (!tmdbId) return res.status(404).json({ error: "Film not found." });

    if (typeof req.body?.planned !== "boolean") {
        return res.status(400).json({ error: "planned must be true or false." });
    }

    const { planned } = req.body;
    const entry = await FilmLog.findOne({ user: req.user._id, tmdbId });

    if (entry?.status === "completed") {
        entry.wantsRewatch = planned;
        await entry.save();
        return res.json({ entry: entry.toObject() });
    }

    if (!planned) {
        if (entry) await entry.deleteOne();
        return res.json({ entry: null });
    }

    if (entry) {
        return res.json({ entry: entry.toObject() });
    }

    const details = await filmDetailsOr404(tmdbId, res);
    if (!details) return;

    const created = await FilmLog.create({
        user: req.user._id,
        tmdbId,
        ...details,
        status: "plan_to_watch",
    });

    res.status(201).json({ entry: created.toObject() });
}

function isValidRating(value) {
    return value === null || (typeof value === "number" && value >= 0.5 && value <= 5 && value * 2 === Math.round(value * 2));
}

// The write-a-review form: a rating, some text, or both. Saving marks the
// film as watched. Sending no text removes any written review but keeps the
// rating on their film list.
async function saveReview(req, res) {
    const tmdbId = parseTmdbId(req.params.tmdbId);
    if (!tmdbId) return res.status(404).json({ error: "Film not found." });

    const rating = req.body?.rating ?? null;
    const text = typeof req.body?.text === "string" ? req.body.text.trim() : "";
    const containsSpoilers = text ? Boolean(req.body?.containsSpoilers) : false;

    if (!isValidRating(rating)) {
        return res.status(400).json({ error: "Ratings go from 0.5 to 5 in half stars." });
    }

    if (rating === null && !text) {
        return res.status(400).json({ error: "Give it a rating, write something, or both." });
    }

    if (text.length > MAX_REVIEW_LENGTH) {
        return res.status(400).json({ error: `Reviews can be at most ${MAX_REVIEW_LENGTH} characters.` });
    }

    const details = await filmDetailsOr404(tmdbId, res);
    if (!details) return;

    let entry = await FilmLog.findOne({ user: req.user._id, tmdbId });

    if (entry) {
        // They planned to watch it and now have. A rewatch flag only makes
        // sense once a film is completed, so it starts off.
        if (entry.status === "plan_to_watch") entry.wantsRewatch = false;

        Object.assign(entry, details, { status: "completed", rating });
        await entry.save();
    } else {
        entry = await FilmLog.create({
            user: req.user._id,
            tmdbId,
            ...details,
            status: "completed",
            rating,
        });
    }

    let review = null;

    if (text) {
        review = await Review.findOneAndUpdate(
            { user: req.user._id, tmdbId },
            {
                $set: {
                    filmTitle: details.title,
                    filmYear: details.year,
                    posterPath: details.posterPath,
                    genres: details.genres,
                    rating,
                    text,
                    containsSpoilers,
                },
            },
            { upsert: true, returnDocument: "after", runValidators: true, setDefaultsOnInsert: true }
        ).lean();
    } else {
        await Review.deleteOne({ user: req.user._id, tmdbId });
    }

    res.json({ entry: entry.toObject(), review });
}

module.exports = {
    getFilmStats,
    getTopRated,
    getMostWanted,
    getReviewedFilms,
    getReviews,
    getReview,
    setReviewLiked,
    setReviewSpoilers,
    getFilmReviews,
    getFilmClub,
    getMyFilm,
    setPlanned,
    saveReview,
};
