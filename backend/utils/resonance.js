// Resonance: a 0 to 100% match between two members' taste in films, from
// the films they've rated (completed film log entries with a rating). Five
// factors, each 0 to 1, weighted into one score. Nothing here touches the
// database: utils/resonanceStore.js works out every pair each night
// (jobs/resonanceSweep.js) and decides who may see what. What a score is
// called (Soul Resonance, Dissonance) is in shared/resonance.js.

// ---------- the settings ----------

// How much each factor counts. They add up to 1.
const WEIGHTS = {
    // The films both have rated, and how alike their ratings are.
    movies: 0.5,
    // How alike they rate each genre.
    genreRating: 0.25,
    // How much of what they've rated is in the same genres...
    genreOverlap: 0.2,
    // ...from the same decades...
    year: 0.025,
    // ...and with the same US age ratings.
    ageRating: 0.025,
};

// The furthest apart two ratings can be (5 - 0.5). Ratings this far apart,
// or further once adjusted, are 0% alike.
const RATING_SPREAD = 4.5;

// Shared films for the movies factor to count in full. Fewer scale it
// down: 8 shared films count for 80%.
const FULL_CONFIDENCE_AT = 10;

// Rated films each member needs in a genre before it's compared.
const MIN_GENRE_FILMS = 2;

// The age ratings that count. NR, and anything else, is left out.
const AGE_RATINGS = new Set(["G", "PG", "PG-13", "R", "NC-17"]);

// Rated films a member needs before they have any Resonance.
const MIN_RATED = 20;

// The home page's suggestions: matches at least this strong, and only the
// best few of them, 5% of eligible members (rounded up) but at least 3.
const SUGGEST_FROM = 75;
const SUGGESTION_PERCENT = 5;
const MIN_SUGGESTIONS = 3;

// Shared films shown on a Resonance card.
const TOP_SHARED = 3;

// ---------- the factors ----------

const clamp01 = (value) => Math.min(1, Math.max(0, value));

// How alike two ratings are: 1 for the same, 0 for as far apart as
// ratings go.
function similarity(a, b) {
    return clamp01(1 - Math.abs(a - b) / RATING_SPREAD);
}

// What share of `films` each key from `keysOf(film)` has, adding up to 1.
// A film with several keys counts 1/n towards each (Sci-Fi, Action and
// Thriller: a third each). Films with none are left out.
function shares(films, keysOf) {
    const totals = new Map();
    let counted = 0;

    for (const film of films) {
        const keys = [...new Set(keysOf(film))];
        if (keys.length === 0) continue;

        counted += 1;
        for (const key of keys) totals.set(key, (totals.get(key) ?? 0) + 1 / keys.length);
    }

    for (const [key, total] of totals) totals.set(key, total / counted);
    return totals;
}

// How much two sets of shares have in common: the smaller of the two
// shares, added up over every key. 0 to 1.
function overlap(a, b) {
    let total = 0;
    for (const [key, share] of a) total += Math.min(share, b.get(key) ?? 0);
    return clamp01(total);
}

const genresOf = (film) => film.genres ?? [];
const decadeOf = (film) => (Number.isFinite(film.year) && film.year > 0 ? [Math.floor(film.year / 10) * 10] : []);
const ageRatingOf = (film) => (AGE_RATINGS.has(film.certification) ? [film.certification] : []);

// One member's rated films, worked out once for all their pairs: their
// average rating, each film's rating against it ("adjusted": +1 is a star
// above what they usually give, so a harsh and a generous rater with the
// same taste come out the same), the adjusted ratings by genre, and their
// genre, decade and age rating shares. `films` is [{ tmdbId, title,
// posterPath, rating, genres, year, certification }].
function tasteOf(films) {
    const rated = films.filter((film) => typeof film.rating === "number");
    const average = rated.length ? rated.reduce((sum, film) => sum + film.rating, 0) / rated.length : 0;

    const byFilm = new Map();
    // genre -> { total: of the adjusted ratings, count }
    const byGenre = new Map();

    for (const film of rated) {
        const adjusted = film.rating - average;
        byFilm.set(film.tmdbId, { ...film, adjusted });

        for (const genre of new Set(genresOf(film))) {
            const entry = byGenre.get(genre) ?? { total: 0, count: 0 };
            entry.total += adjusted;
            entry.count += 1;
            byGenre.set(genre, entry);
        }
    }

    return {
        count: rated.length,
        byFilm,
        byGenre,
        genreShares: shares(rated, genresOf),
        decadeShares: shares(rated, decadeOf),
        ageRatingShares: shares(rated, ageRatingOf),
    };
}

// Movies + Ratings: how alike their adjusted ratings are on the films both
// have rated, scaled down while there are only a few of those. Returns
// { factor, shared: [{ a, b }] }, a and b being each one's entry for the film.
function moviesFactor(a, b) {
    const shared = [];
    for (const [tmdbId, film] of a.byFilm) {
        const theirs = b.byFilm.get(tmdbId);
        if (theirs) shared.push({ a: film, b: theirs });
    }

    if (shared.length === 0) return { factor: 0, shared };

    const match = shared.reduce((sum, film) => sum + similarity(film.a.adjusted, film.b.adjusted), 0) / shared.length;
    const confidence = Math.min(shared.length / FULL_CONFIDENCE_AT, 1);
    return { factor: match * confidence, shared };
}

// Genre + Ratings: how alike their average adjusted rating is in each genre
// both have rated enough films in, counting a genre more the more films
// they've rated in it between them. 0 with no genre to compare.
function genreRatingFactor(a, b) {
    let weighted = 0;
    let weights = 0;

    for (const [genre, mine] of a.byGenre) {
        const theirs = b.byGenre.get(genre);
        if (!theirs || mine.count < MIN_GENRE_FILMS || theirs.count < MIN_GENRE_FILMS) continue;

        const weight = mine.count + theirs.count;
        weighted += similarity(mine.total / mine.count, theirs.total / theirs.count) * weight;
        weights += weight;
    }

    return weights ? weighted / weights : 0;
}

// Same genres, decades and age ratings: how much of what they rate falls in
// the same ones. Age ratings are 0 if either has none that count.
function genreOverlapFactor(a, b) {
    return overlap(a.genreShares, b.genreShares);
}

function yearFactor(a, b) {
    return overlap(a.decadeShares, b.decadeShares);
}

function ageRatingFactor(a, b) {
    if (a.ageRatingShares.size === 0 || b.ageRatingShares.size === 0) return 0;
    return overlap(a.ageRatingShares, b.ageRatingShares);
}

// The shared films for the card: the ones they rated highest between them,
// the closest ratings first on a tie, then by title.
function topShared(shared) {
    const combined = (film) => film.a.rating + film.b.rating;
    const apart = (film) => Math.abs(film.a.rating - film.b.rating);

    return [...shared]
        .sort((x, y) => combined(y) - combined(x) || apart(x) - apart(y) || String(x.a.title).localeCompare(String(y.a.title)))
        .slice(0, TOP_SHARED)
        .map(({ a: film }) => ({ tmdbId: film.tmdbId, title: film.title, posterPath: film.posterPath ?? null }));
}

const toPercent = (value) => Math.round(clamp01(value) * 100);

// ---------- the whole score ----------

// The Resonance between two members, from tasteOf() for each: `percent`,
// the movies and genre factors as percentages (the two the card shows),
// how many films both have rated, and the top shared films. `factors` has
// all five, 0 to 1, for the tests; they're never stored or sent.
function resonanceBetween(a, b) {
    const movies = moviesFactor(a, b);
    const factors = {
        movies: movies.factor,
        genreRating: genreRatingFactor(a, b),
        genreOverlap: genreOverlapFactor(a, b),
        year: yearFactor(a, b),
        ageRating: ageRatingFactor(a, b),
    };
    const total = Object.entries(WEIGHTS).reduce((sum, [factor, weight]) => sum + weight * factors[factor], 0);

    return {
        percent: toPercent(total),
        movies: toPercent(factors.movies),
        genre: toPercent(factors.genreRating),
        sharedCount: movies.shared.length,
        sharedFilms: topShared(movies.shared),
        factors,
    };
}

// How many of the best matches the home page picks from, out of
// `eligibleCount` eligible members.
function suggestionCount(eligibleCount) {
    return Math.max(MIN_SUGGESTIONS, Math.ceil((eligibleCount * SUGGESTION_PERCENT) / 100));
}

module.exports = {
    WEIGHTS,
    MIN_RATED,
    SUGGEST_FROM,
    similarity,
    shares,
    overlap,
    tasteOf,
    moviesFactor,
    genreRatingFactor,
    genreOverlapFactor,
    yearFactor,
    ageRatingFactor,
    resonanceBetween,
    suggestionCount,
};
