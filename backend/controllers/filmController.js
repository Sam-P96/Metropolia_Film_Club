const mongoose = require("mongoose");
const FilmLog = require("../models/filmLogModel");
const Review = require("../models/reviewModel");
const { getMovie } = require("../services/tmdbService");
const { userSummary, reviewWithUser } = require("../utils/serialize");

// How many members must have rated a film before it can appear in
// "top rated by the club". One 5-star rating is not a ranking.
const MIN_RATINGS_FOR_RANKING = 2;

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
                average: { $avg: "$rating" },
                count: { $sum: 1 },
            },
        },
        { $match: { count: { $gte: MIN_RATINGS_FOR_RANKING } } },
        { $sort: { average: -1, count: -1, title: 1 } },
        { $limit: limit },
        { $project: { _id: 0, tmdbId: "$_id", title: 1, year: 1, posterPath: 1, average: 1, count: 1 } },
    ]);

    res.json(films);
}

// The films the most members want to see. First watches and rewatches count
// the same.
async function getMostWanted(req, res) {
    const limit = parseLimit(req.query.limit, 10, 50);

    const films = await FilmLog.aggregate([
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
        { $sort: { count: -1, title: 1 } },
        { $limit: limit },
        { $project: { _id: 0, tmdbId: "$_id", title: 1, year: 1, posterPath: 1, count: 1 } },
    ]);

    res.json(films);
}

// The newest reviews from anyone, for the homepage and reviews page.
async function getRecentReviews(req, res) {
    const limit = parseLimit(req.query.limit, 15, 50);

    const reviews = await Review.find()
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate("user", AUTHOR_FIELDS)
        .lean();

    res.json(reviews.filter((review) => review.user).map(reviewWithUser));
}

async function getReview(req, res) {
    const review = mongoose.isValidObjectId(req.params.id)
        ? await Review.findById(req.params.id).populate("user", AUTHOR_FIELDS).lean()
        : null;

    if (!review) {
        return res.status(404).json({ error: "Review not found." });
    }

    res.json(reviewWithUser(review));
}

// ---------- one film ----------

async function getFilmReviews(req, res) {
    const tmdbId = parseTmdbId(req.params.tmdbId);
    if (!tmdbId) return res.status(404).json({ error: "Film not found." });

    const reviews = await Review.find({ tmdbId })
        .sort({ createdAt: -1 })
        .populate("user", AUTHOR_FIELDS)
        .lean();

    res.json(reviews.filter((review) => review.user).map(reviewWithUser));
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
    getRecentReviews,
    getReview,
    getFilmReviews,
    getFilmClub,
    getMyFilm,
    setPlanned,
    saveReview,
};
