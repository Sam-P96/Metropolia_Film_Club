// One place that knows how to ask TMDB about a single film. The /api/tmdb
// route uses it, and so does saving a review or a watchlist entry, which
// copy the title and poster onto the record so lists don't need TMDB.

const TMDB_BASE = "https://api.themoviedb.org/3";

// Film details barely change, and the same few films get looked up again
// and again while members rate them.
const CACHE_MS = 24 * 60 * 60 * 1000;
const cache = new Map();

function tmdbHeaders() {
    return {
        Authorization: `Bearer ${process.env.TMDB_TOKEN}`,
        accept: "application/json",
    };
}

// Resolves to the film, or null when TMDB has no film with that id.
// Throws for anything else (TMDB down, bad token).
async function getMovie(tmdbId) {
    const hit = cache.get(tmdbId);
    if (hit && Date.now() - hit.at < CACHE_MS) return hit.film;

    // release_dates carries the age ratings, which browsing by "Age rating" needs.
    const response = await fetch(`${TMDB_BASE}/movie/${tmdbId}?language=en-US&append_to_response=release_dates`, {
        headers: tmdbHeaders(),
    });

    if (response.status === 404) return null;

    if (!response.ok) {
        throw new Error(`TMDB request failed with ${response.status}`);
    }

    const film = await response.json();

    const usReleases = (film.release_dates?.results || []).find((entry) => entry.iso_3166_1 === "US");

    const result = {
        tmdbId: film.id,
        title: film.title,
        tagline: film.tagline || null,
        year: film.release_date ? film.release_date.slice(0, 4) : null,
        posterPath: film.poster_path,
        backdropPath: film.backdrop_path,
        overview: film.overview,
        runtime: film.runtime,
        genres: (film.genres || []).map((genre) => genre.name),
        studios: (film.production_companies || []).map((company) => company.name),
        tmdbRating: film.vote_average,
        tmdbVotes: film.vote_count,

        // What the browse page's filters and sorts ask about, so a list of
        // films can be filtered here the way TMDB's Discover would.
        releaseDate: film.release_date || null,
        genreIds: (film.genres || []).map((genre) => genre.id),
        studioIds: (film.production_companies || []).map((company) => company.id),
        originalLanguage: film.original_language || null,
        usCertifications: (usReleases?.release_dates || [])
            .map((release) => release.certification)
            .filter(Boolean),
        popularity: film.popularity ?? 0,
        revenue: film.revenue ?? 0,
    };

    cache.set(tmdbId, { at: Date.now(), film: result });
    return result;
}

// Several films, a few requests at a time so a long list doesn't trip TMDB's
// rate limit. Films TMDB doesn't know come back as null.
async function getMovies(tmdbIds, concurrency = 8) {
    const films = new Array(tmdbIds.length);
    let next = 0;

    async function worker() {
        while (next < tmdbIds.length) {
            const index = next++;
            films[index] = await getMovie(tmdbIds[index]);
        }
    }

    const workers = Array.from({ length: Math.min(concurrency, tmdbIds.length) }, worker);
    await Promise.all(workers);
    return films;
}

module.exports = { TMDB_BASE, tmdbHeaders, getMovie, getMovies };
