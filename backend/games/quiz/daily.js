const { GENERATORS, shuffle } = require("../steal/quiz");
const { defaultRandom } = require("../steal/rules");
const { QUIZ } = require("../../../shared/quiz/config.js");

// The Daily Quiz's questions as plain functions: no database. The day's
// quiz is made once and kept (utils/quiz.js), so everyone gets the same.
//
// Its film questions are Steal and Defend's own (games/steal/quiz.js),
// only the ones about films, never about members, maths or countries:
//   releaseYear  What year was [film] released?
//   cameFirst    Which of these came out first?
// from the films the club has logged. A question written by a moderator
// or admin can take a film question's place.

const FILM_TYPES = ["releaseYear", "cameFirst"];
const OPTION_IDS = ["a", "b", "c", "d"];

// A film question that hasn't come up yet today (`used`), or null if the
// club's films can't make one.
function filmQuestion(site, used, random) {
    const live = [...FILM_TYPES];
    while (live.length > 0) {
        const type = live[random(live.length)];
        const question = GENERATORS[type]({ site, used, random });
        if (question) {
            used.add(`${question.type}:${question.subject}`);
            return { ...question, kind: "film" };
        }
        live.splice(live.indexOf(type), 1);
    }
    return null;
}

// A moderator's question (models/quizQuestionModel.js) as a quiz
// question: its four answers shuffled into a to d.
function customQuestion(custom, random) {
    const order = shuffle([0, 1, 2, 3], random);
    return {
        type: "custom",
        kind: "custom",
        subject: String(custom._id),
        prompt: custom.text,
        input: "choice",
        options: order.map((answer, i) => ({ id: OPTION_IDS[i], label: custom.answers[answer] })),
        answer: { choice: OPTION_IDS[order.indexOf(custom.correct)] },
    };
}

// The day's questions: QUIZ.questions slots, each a film question, or (a
// QUIZ.customChance chance each, while the queue lasts) the next of the
// moderators' questions in `queue`, in its order. A slot with a
// moderator's question keeps a film question as `backup`, for its author.
// `chance()` (0 to 1) decides; `random(max)` picks. Returns { slots, used }
// (`used`: the ids of the moderators' questions it took).
function buildDay({ site, queue = [], random = defaultRandom, chance = () => random(1_000_000) / 1_000_000 }) {
    const used = new Set();
    const slots = [];
    const taken = [];
    let next = 0;

    for (let i = 0; i < QUIZ.questions; i++) {
        const film = filmQuestion(site, used, random);
        const custom = next < queue.length && (!film || chance() < QUIZ.customChance) ? queue[next] : null;
        if (custom) {
            next += 1;
            taken.push(custom._id);
            slots.push({ question: customQuestion(custom, random), custom: custom._id, author: custom.author ?? null, backup: film });
        } else if (film) {
            slots.push({ question: film, custom: null, author: null, backup: null });
        }
    }
    return { slots, used: taken };
}

// What the page is shown of a question: never the answer.
function publicQuestion(question) {
    return { prompt: question.prompt, options: question.options.map(({ id, label }) => ({ id, label })) };
}

const isCorrect = (question, choice) => typeof choice === "string" && choice === question.answer.choice;

module.exports = { FILM_TYPES, buildDay, customQuestion, publicQuestion, isCorrect };
