const { STEAL } = require("../../../shared/steal/config.js");
const COUNTRIES = require("../../data/countries.json");
const { defaultRandom } = require("./rules");
const { normaliseText, isTypedMatch, isNumberMatch } = require("./answers");

// The quiz (spec §7) as plain functions: making an attack's questions from
// what the server knows about the victim and the site, and checking an
// answer to one. No database: utils/steal/attacks.js loads the data
// (`victimData`) and stores the questions on the attack, so refreshing the
// page never makes new ones.
//
// A question as stored:
//   type      which kind (the keys of GENERATORS)
//   kind      "victim", "math" or "trivia"
//   subject   with `type`, what makes it "the same question": never twice
//             in one attack
//   prompt    the question
//   input     "choice" (4 options), "number" or "text"
//   options   [{ id, label, avatarUrl? }] for "choice", already shuffled
//   answer    { choice } | { number, decimals? } | { accepted: [titles] }
//             (`decimals`: compared rounded to that many; no question
//             uses it now that division is gone)
//   hint      a line under the question
//   foggy     the Mind Stone hides `prompt` behind STEAL.quiz.foggyText
//   shuffles  the Funhouse Mirror: the option order for each 2 seconds

// TMDB's film genres, for wrong options when a member has watched too few.
const TMDB_GENRES = [
    "Action", "Adventure", "Animation", "Comedy", "Crime", "Documentary", "Drama", "Family", "Fantasy", "History",
    "Horror", "Music", "Mystery", "Romance", "Science Fiction", "TV Movie", "Thriller", "War", "Western",
];

const OPTION_IDS = ["a", "b", "c", "d"];

// --- small random helpers, all through `random(max)` ---

function shuffle(list, random) {
    const copy = [...list];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = random(i + 1);
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}

const pick = (list, random) => list[random(list.length)];
const sample = (list, count, random) => shuffle(list, random).slice(0, count);

function ordinal(n) {
    const tens = n % 100;
    if (tens >= 11 && tens <= 13) return `${n}th`;
    return `${n}${{ 1: "st", 2: "nd", 3: "rd" }[n % 10] ?? "th"}`;
}

const formatRating = (rating) => `${rating % 1 === 0 ? rating.toFixed(0) : rating.toFixed(1)} / 5`;

// A multiple-choice question from the right option and three wrong ones
// (each { label, avatarUrl? }), shuffled, ids a to d.
function choice(base, right, wrong, random) {
    const options = shuffle([{ ...right, right: true }, ...wrong], random).map((option, i) => ({ id: OPTION_IDS[i], ...option }));
    const answer = options.find((option) => option.right).id;
    return {
        ...base,
        input: "choice",
        options: options.map(({ right: _right, ...option }) => option),
        answer: { choice: answer },
    };
}

const unused = (used, type, subject) => !used.has(`${type}:${subject}`);

// Each film once, by TMDB id.
function distinctFilms(films) {
    return [...new Map(films.map((film) => [film.tmdbId, film])).values()];
}

// How many of `films` are in each genre, most first, ties A to Z. A film
// in two genres counts once in each.
function genreCounts(films) {
    const counts = new Map();
    for (const film of films) {
        for (const genre of new Set(film.genres ?? [])) counts.set(genre, (counts.get(genre) ?? 0) + 1);
    }
    return [...counts].map(([genre, count]) => ({ genre, count })).sort((a, b) => b.count - a.count || a.genre.localeCompare(b.genre));
}

// --- the questions about the victim (spec §7, 1 to 12) ---
// `data` is victimData's shape (utils/steal/attacks.js):
//   watched     their watched films: { tmdbId, title, year, genres, rating }
//   rated       the ones with a rating
//   reviews     their reviews, newest first: { tmdbId, title }
//   reviewCount how many reviews they've posted
//   favourites  their favourite films: { tmdbId, title }
//   logged      Set of every tmdbId on their film list, watched or not
//   lastFollow  who they followed most recently: { _id, username, avatarUrl }
//   others      other members for wrong options: [{ _id, username, avatarUrl }]
//   altTitles   Map of tmdbId to TMDB's original title
// and `site` the club's films: { films: [{ tmdbId, title, year }] }.

const VICTIM = {
    // 1. Their nth most watched genre. Only ranks that don't tie with the
    // genre above or below, so there's one right answer.
    nthGenre({ data, used, random }) {
        const ranks = genreCounts(data.watched);
        if (ranks.length < 2) return null;
        const top = Math.min(STEAL.quiz.topGenres, ranks.length);
        const choices = [];
        for (let n = 1; n <= top; n++) {
            const { count } = ranks[n - 1];
            const tiesAbove = n > 1 && ranks[n - 2].count === count;
            const tiesBelow = n < ranks.length && ranks[n].count === count;
            if (!tiesAbove && !tiesBelow && unused(used, "nthGenre", n)) choices.push(n);
        }
        if (choices.length === 0) return null;

        const n = pick(choices, random);
        const right = ranks[n - 1];
        // Wrong options can't be a genre with the same count, or it'd be right too.
        const theirs = ranks.filter((rank) => rank.genre !== right.genre && rank.count !== right.count).map((rank) => rank.genre);
        const neverWatched = TMDB_GENRES.filter((genre) => !ranks.some((rank) => rank.genre === genre));
        const wrong = [...sample(theirs, 3, random), ...sample(neverWatched, 3, random)].slice(0, 3);
        if (wrong.length < 3) return null;

        return choice(
            { type: "nthGenre", kind: "victim", subject: n, prompt: n === 1 ? "What's their most watched genre?" : `What's their ${ordinal(n)} most watched genre?` },
            { label: right.genre },
            wrong.map((label) => ({ label })),
            random
        );
    },

    // 2. How did they rate [film]?
    rateFilm({ data, used, random }) {
        const films = data.rated.filter((film) => unused(used, "rateFilm", film.tmdbId));
        if (films.length === 0) return null;
        const film = pick(films, random);
        const others = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5].filter((rating) => rating !== film.rating);
        return choice(
            { type: "rateFilm", kind: "victim", subject: film.tmdbId, prompt: `How did they rate ${film.title}?` },
            { label: formatRating(film.rating) },
            sample(others, 3, random).map((rating) => ({ label: formatRating(rating) })),
            random
        );
    },

    // 3. Which of these have they NOT watched? Three of their rated films
    // and one from the club's films that isn't on their list at all.
    notWatched({ data, site, used, random }) {
        if (data.rated.length < 3) return null;
        const strangers = site.films.filter((film) => !data.logged.has(film.tmdbId) && unused(used, "notWatched", film.tmdbId));
        if (strangers.length === 0) return null;
        const right = pick(strangers, random);
        const seen = sample(distinctFilms(data.rated), 3, random);
        if (seen.length < 3) return null;
        return choice(
            { type: "notWatched", kind: "victim", subject: right.tmdbId, prompt: "Which of these have they NOT watched?" },
            { label: right.title },
            seen.map((film) => ({ label: film.title })),
            random
        );
    },

    // 4. Their average rating, to one decimal. The options are at least
    // 0.3 apart.
    averageRating({ data, used, random }) {
        if (data.rated.length < 3 || !unused(used, "averageRating", "all")) return null;
        const average = data.rated.reduce((sum, film) => sum + film.rating, 0) / data.rated.length;
        const right = Math.round(average * 10) / 10;
        const spacing = STEAL.quiz.averageSpacing - 1e-9;
        const chosen = [right];
        for (const value of shuffle(Array.from({ length: 46 }, (_, i) => (i + 5) / 10), random)) {
            if (chosen.length === 4) break;
            if (chosen.every((other) => Math.abs(other - value) >= spacing)) chosen.push(value);
        }
        if (chosen.length < 4) return null;
        return choice(
            { type: "averageRating", kind: "victim", subject: "all", prompt: "What's their average rating?" },
            { label: right.toFixed(1) },
            chosen.slice(1).map((value) => ({ label: value.toFixed(1) })),
            random
        );
    },

    // 5. Which year have they watched the most films from? Only when one
    // year is ahead of the rest.
    topYear({ data, used, random }) {
        const dated = data.watched.filter((film) => Number.isInteger(film.year));
        if (dated.length < 3 || !unused(used, "topYear", "all")) return null;
        const counts = new Map();
        for (const film of dated) counts.set(film.year, (counts.get(film.year) ?? 0) + 1);
        const ranked = [...counts].sort((a, b) => b[1] - a[1]);
        if (ranked.length > 1 && ranked[0][1] === ranked[1][1]) return null;
        const year = ranked[0][0];

        const wrong = new Set(sample(ranked.slice(1).map(([other]) => other), 3, random));
        for (let step = 1; wrong.size < 3 && step < 40; step++) {
            const near = year + (random(2) ? step : -step);
            if (near !== year && near <= new Date().getFullYear()) wrong.add(near);
        }
        return choice(
            { type: "topYear", kind: "victim", subject: "all", prompt: "Which year have they watched the most films from?" },
            { label: String(year) },
            [...wrong].slice(0, 3).map((other) => ({ label: String(other) })),
            random
        );
    },

    // 6. Who did they follow most recently? With avatars.
    lastFollow({ data, used, random }) {
        if (!data.lastFollow || data.others.length < 3 || !unused(used, "lastFollow", "all")) return null;
        const member = (user) => ({ label: user.username, avatarUrl: user.avatarUrl ?? null });
        return choice(
            { type: "lastFollow", kind: "victim", subject: "all", prompt: "Who did they follow most recently?" },
            member(data.lastFollow),
            sample(data.others, 3, random).map(member),
            random
        );
    },

    // 7. How many [genre] films have they watched?
    genreCount({ data, used, random }) {
        const genres = genreCounts(data.watched).filter((rank) => unused(used, "genreCount", rank.genre));
        if (genres.length === 0) return null;
        const { genre, count } = pick(genres, random);
        return {
            type: "genreCount",
            kind: "victim",
            subject: genre,
            prompt: `How many ${genre} films have they watched?`,
            input: "number",
            answer: { number: count },
        };
    },

    // 8. Name a film they rated [x]/5. Any film with that rating counts,
    // by its English title or TMDB's original one.
    nameRated({ data, used, random }) {
        const ratings = [...new Set(data.rated.map((film) => film.rating))].filter((rating) => unused(used, "nameRated", rating));
        if (ratings.length === 0) return null;
        const rating = pick(ratings, random);
        const accepted = new Set();
        for (const film of data.rated.filter((entry) => entry.rating === rating)) {
            accepted.add(film.title);
            const original = data.altTitles?.get(film.tmdbId);
            if (original) accepted.add(original);
        }
        return {
            type: "nameRated",
            kind: "victim",
            subject: rating,
            prompt: `Name a film they rated ${formatRating(rating).replace(" / ", "/")}`,
            input: "text",
            answer: { accepted: [...accepted] },
        };
    },

    // 9. Which of these is their highest rated? Only with one film at the top.
    highestRated({ data, used, random }) {
        const rated = distinctFilms(data.rated);
        if (rated.length < 4 || !unused(used, "highestRated", "all")) return null;
        const best = Math.max(...rated.map((film) => film.rating));
        const top = rated.filter((film) => film.rating === best);
        if (top.length !== 1) return null;
        return choice(
            { type: "highestRated", kind: "victim", subject: "all", prompt: "Which of these is their highest rated?" },
            { label: top[0].title },
            sample(rated.filter((film) => film.rating < best), 3, random).map((film) => ({ label: film.title })),
            random
        );
    },

    // 10. Which of these is one of their favourite films?
    favourite({ data, site, used, random }) {
        const favourites = data.favourites.filter((film) => unused(used, "favourite", film.tmdbId));
        if (favourites.length === 0) return null;
        const right = pick(favourites, random);
        const isFavourite = new Set(data.favourites.map((film) => film.tmdbId));
        const others = distinctFilms([...data.watched, ...site.films]).filter((film) => !isFavourite.has(film.tmdbId));
        const wrong = sample(others, 3, random);
        if (wrong.length < 3) return null;
        return choice(
            { type: "favourite", kind: "victim", subject: right.tmdbId, prompt: "Which of these is one of their favourite films?" },
            { label: right.title },
            wrong.map((film) => ({ label: film.title })),
            random
        );
    },

    // 11. Which film did they review most recently?
    lastReview({ data, used, random }) {
        if (data.reviews.length < 4 || !unused(used, "lastReview", "all")) return null;
        const [latest, ...older] = data.reviews;
        const wrong = sample(distinctFilms(older).filter((film) => film.tmdbId !== latest.tmdbId), 3, random);
        if (wrong.length < 3) return null;
        return choice(
            { type: "lastReview", kind: "victim", subject: "all", prompt: "Which film did they review most recently?" },
            { label: latest.title },
            wrong.map((film) => ({ label: film.title })),
            random
        );
    },

    // 12. How many reviews have they posted?
    reviewCount({ data, used }) {
        if (data.reviewCount < 1 || !unused(used, "reviewCount", "all")) return null;
        return {
            type: "reviewCount",
            kind: "victim",
            subject: "all",
            prompt: "How many reviews have they posted?",
            input: "number",
            answer: { number: data.reviewCount },
        };
    },
};

// --- math (13): multiplication, numbers from 1 to 20, or 30 with the
// Spinning Top. The spec's division (14) was taken out: quiz questions are
// multiplication only. ---

const MATH = {
    multiply({ effects, used, random }) {
        const max = Math.max(STEAL.quiz.mathMax, effects.mathMax ?? 0);
        for (let attempt = 0; attempt < 20; attempt++) {
            const a = random(max) + 1;
            const b = random(max) + 1;
            const subject = `${Math.min(a, b)}x${Math.max(a, b)}`;
            if (!unused(used, "multiply", subject)) continue;
            return { type: "multiply", kind: "math", subject, prompt: `${a} × ${b} = ?`, input: "number", answer: { number: a * b } };
        }
        return null;
    },
};

// --- trivia (15 to 20) ---

const CONTINENTS = [...new Set(COUNTRIES.map((country) => country.continent))];
const namesOf = (country) => [country.name, ...(country.aliases ?? [])];
const inContinent = (country, continent) => country.continent === continent || (country.also ?? []).includes(continent);

// Each letter with at least 3 countries starting (or ending) with it, and
// the countries for it. Only a country's own name and aliases with the same
// letter count, so "Holland" doesn't answer "starting with H".
function byLetter(edge) {
    const letters = new Map();
    for (const country of COUNTRIES) {
        const name = normaliseText(country.name).replace(/ /g, "");
        const letter = edge === "start" ? name[0] : name[name.length - 1];
        if (!letter) continue;
        const names = namesOf(country).filter((alias) => {
            const plain = normaliseText(alias).replace(/ /g, "");
            return (edge === "start" ? plain[0] : plain[plain.length - 1]) === letter;
        });
        letters.set(letter, [...(letters.get(letter) ?? []), ...names]);
    }
    return new Map([...letters].filter(([, names]) => {
        const countries = new Set(COUNTRIES.filter((country) => names.includes(country.name)).map((country) => country.name));
        return countries.size >= 3;
    }));
}
const STARTS = byLetter("start");
const ENDS = byLetter("end");

const TRIVIA = {
    countryIn({ used, random }) {
        const continents = CONTINENTS.filter((continent) => unused(used, "countryIn", continent));
        if (continents.length === 0) return null;
        const continent = pick(continents, random);
        return {
            type: "countryIn",
            kind: "trivia",
            subject: continent,
            prompt: `Name a country in ${continent}`,
            input: "text",
            answer: { accepted: COUNTRIES.filter((country) => inContinent(country, continent)).flatMap(namesOf) },
        };
    },

    countryStarts({ used, random }) {
        const letters = [...STARTS.keys()].filter((letter) => unused(used, "countryStarts", letter));
        if (letters.length === 0) return null;
        const letter = pick(letters, random);
        return {
            type: "countryStarts",
            kind: "trivia",
            subject: letter,
            prompt: `Name a country starting with ${letter.toUpperCase()}`,
            input: "text",
            answer: { accepted: STARTS.get(letter), letter, edge: "start" },
        };
    },

    countryEnds({ used, random }) {
        const letters = [...ENDS.keys()].filter((letter) => unused(used, "countryEnds", letter));
        if (letters.length === 0) return null;
        const letter = pick(letters, random);
        return {
            type: "countryEnds",
            kind: "trivia",
            subject: letter,
            prompt: `Name a country ending with ${letter.toUpperCase()}`,
            input: "text",
            answer: { accepted: ENDS.get(letter), letter, edge: "end" },
        };
    },

    capital({ used, random }) {
        const countries = COUNTRIES.filter((country) => country.capital && unused(used, "capital", country.name));
        if (countries.length === 0) return null;
        const country = pick(countries, random);
        const near = COUNTRIES.filter((other) => other.capital && other.name !== country.name && other.capital !== country.capital);
        const sameContinent = near.filter((other) => other.continent === country.continent);
        const wrong = [...new Set([...sample(sameContinent, 3, random), ...sample(near, 3, random)].map((other) => other.capital))].slice(0, 3);
        return choice(
            { type: "capital", kind: "trivia", subject: country.name, prompt: `What's the capital of ${country.name}?` },
            { label: country.capital },
            wrong.map((label) => ({ label })),
            random
        );
    },

    releaseYear({ site, used, random }) {
        const films = site.films.filter((film) => Number.isInteger(film.year) && unused(used, "releaseYear", film.tmdbId));
        if (films.length === 0) return null;
        const film = pick(films, random);
        const thisYear = new Date().getFullYear();
        const wrong = new Set();
        for (let attempt = 0; wrong.size < 3 && attempt < 60; attempt++) {
            const year = film.year + (random(21) - 10);
            if (year !== film.year && year <= thisYear && year > 1880) wrong.add(year);
        }
        if (wrong.size < 3) return null;
        return choice(
            { type: "releaseYear", kind: "trivia", subject: film.tmdbId, prompt: `What year was ${film.title} released?` },
            { label: String(film.year) },
            [...wrong].map((year) => ({ label: String(year) })),
            random
        );
    },

    // Four films from different years; the oldest is right.
    cameFirst({ site, used, random }) {
        const byYear = new Map();
        for (const film of shuffle(site.films.filter((entry) => Number.isInteger(entry.year)), random)) {
            if (!byYear.has(film.year)) byYear.set(film.year, film);
        }
        if (byYear.size < 4) return null;
        for (let attempt = 0; attempt < 10; attempt++) {
            const films = sample([...byYear.values()], 4, random);
            const first = films.reduce((oldest, film) => (film.year < oldest.year ? film : oldest));
            if (!unused(used, "cameFirst", first.tmdbId)) continue;
            return choice(
                { type: "cameFirst", kind: "trivia", subject: first.tmdbId, prompt: "Which of these came out first?" },
                { label: first.title },
                films.filter((film) => film !== first).map((film) => ({ label: film.title })),
                random
            );
        }
        return null;
    },
};

const GENERATORS = { ...VICTIM, ...MATH, ...TRIVIA };
const KINDS = { victim: Object.keys(VICTIM), math: Object.keys(MATH), trivia: Object.keys(TRIVIA) };

// How the quiz is set up for these items (the defender's quiz items and
// the attacker's), from STEAL.quiz:
//   questions  10, minus the Motion Sensor's
//   mix        how many of each kind
//   seconds    per question: 10, +3 Heist Blueprint, or the Time Stone's 5
//              whatever else
//   retries    the DeLorean's
function quizSetup({ attacker = {}, defender = {} } = {}) {
    const { mix } = STEAL.quiz;
    const victim = Math.max(0, mix.victim - (defender.fewerQuestions ?? 0));
    const seconds = defender.timerOverride ?? STEAL.quiz.timerSeconds + (attacker.timerBonus ?? 0);
    return {
        questions: victim + mix.math + mix.trivia,
        mix: { victim, math: mix.math, trivia: mix.trivia },
        seconds,
        retries: attacker.retries ?? 0,
        typedMatch: Math.max(STEAL.quiz.typedMatch, defender.typedMatch ?? 0),
        reshuffleSeconds: defender.reshuffleSeconds ?? null,
        foggy: defender.foggyQuestions ?? 0,
        mathMax: Math.max(STEAL.quiz.mathMax, defender.mathMax ?? 0),
    };
}

// The attack's questions, in the order they're asked. Victim slots that
// can't be filled (too little data) become math or trivia at random. Each
// type that runs out of new questions is dropped for this quiz.
function buildQuiz({ data, site, setup, random = defaultRandom }) {
    const used = new Set();
    const live = { victim: [...KINDS.victim], math: [...KINDS.math], trivia: [...KINDS.trivia] };
    const context = { data, site, used, random, effects: { mathMax: setup.mathMax } };

    function draw(kind) {
        while (live[kind].length > 0) {
            const type = pick(live[kind], random);
            const question = GENERATORS[type](context);
            if (question) {
                used.add(`${question.type}:${question.subject}`);
                return question;
            }
            live[kind] = live[kind].filter((other) => other !== type);
        }
        return null;
    }

    const fallback = () => {
        const order = random(2) ? ["math", "trivia"] : ["trivia", "math"];
        return draw(order[0]) ?? draw(order[1]);
    };

    const questions = [];
    for (let i = 0; i < setup.mix.victim; i++) questions.push(draw("victim") ?? fallback());
    for (let i = 0; i < setup.mix.math; i++) questions.push(draw("math") ?? fallback());
    for (let i = 0; i < setup.mix.trivia; i++) questions.push(draw("trivia") ?? fallback());

    const asked = shuffle(questions.filter(Boolean), random);

    // The Mind Stone: some multiple-choice questions lose their text.
    const choices = asked.filter((question) => question.input === "choice");
    for (const question of sample(choices, setup.foggy, random)) question.foggy = true;

    // The Funhouse Mirror: an order of the options for every few seconds
    // the question is open, worked out now so the page only shows them.
    if (setup.reshuffleSeconds) {
        const turns = Math.ceil(setup.seconds / setup.reshuffleSeconds) + 1;
        for (const question of choices) {
            question.shuffles = Array.from({ length: turns }, () => shuffle(question.options.map((option) => option.id), random));
        }
    }

    return asked;
}

// Whether `input` answers `question` (spec §7, Answer checking).
// `typedMatch` is how similar a typed answer must be.
function isCorrect(question, input, typedMatch = STEAL.quiz.typedMatch) {
    if (input === null || input === undefined) return false;
    const { answer } = question;
    if (question.input === "choice") return String(input) === answer.choice;
    if (question.input === "number") return isNumberMatch(input, answer.number, answer.decimals ?? null);
    if (question.input === "text") {
        // A country starting or ending with a letter has to, whatever else
        // it's close to.
        if (answer.letter) {
            const plain = normaliseText(input).replace(/ /g, "");
            const letter = answer.edge === "start" ? plain[0] : plain[plain.length - 1];
            if (letter !== answer.letter) return false;
        }
        return isTypedMatch(String(input), answer.accepted, typedMatch);
    }
    return false;
}

// What the attacker's page is shown of a question: never the answer, and
// for a Mind Stone question, not the real text either.
function publicQuestion(question) {
    return {
        type: question.type,
        kind: question.kind,
        prompt: question.foggy ? STEAL.quiz.foggyText : question.prompt,
        input: question.input,
        hint: question.foggy ? null : (question.hint ?? null),
        options: question.options ?? null,
        shuffles: question.shuffles ?? null,
        foggy: Boolean(question.foggy),
    };
}

// The right answer, for the result screen, as words.
function answerText(question) {
    if (question.input === "choice") return question.options.find((option) => option.id === question.answer.choice)?.label ?? "";
    if (question.input === "number") return String(question.answer.number);
    return question.answer.accepted.slice(0, 3).join(", ") + (question.answer.accepted.length > 3 ? ", …" : "");
}

module.exports = {
    TMDB_GENRES,
    COUNTRIES,
    GENERATORS,
    KINDS,
    genreCounts,
    shuffle,
    quizSetup,
    buildQuiz,
    isCorrect,
    publicQuestion,
    answerText,
};
