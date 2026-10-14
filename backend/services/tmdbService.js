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

    const response = await fetch(`${TMDB_BASE}/movie/${tmdbId}?language=en-US`, {
        headers: tmdbHeaders(),
    });

    if (response.status === 404) return null;

    if (!response.ok) {
        throw new Error(`TMDB request failed with ${response.status}`);
    }

    const film = await response.json();

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
    };

    cache.set(tmdbId, { at: Date.now(), film: result });
    return result;
}

module.exports = { TMDB_BASE, tmdbHeaders, getMovie };
