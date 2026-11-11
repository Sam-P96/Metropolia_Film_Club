const quiz = require("../utils/quiz");
const { hasRole } = require("../middleware/auth");

// The Daily Quiz (routes/quizRouter.js). The rules are all in
// utils/quiz.js; these read the request and answer.

async function handle(res, work) {
    try {
        await work();
    } catch (error) {
        if (!(error instanceof quiz.QuizError)) throw error;
        res.status(error.status).json({ error: error.message, ...error.extra });
    }
}

// Today's quiz, this week and the last draw, for the page and the home
// page's slide.
const getState = (req, res) =>
    handle(res, async () => res.json(await quiz.quizState(req.user, new Date(), { canManage: hasRole(req.user, "moderator") })));

// Play (or carry on): the question they're on, or their score.
const start = (req, res) => handle(res, async () => res.json(await quiz.startQuiz(req.user._id)));

// { index, choice }: an answer, then the next question or their score.
const answer = (req, res) => handle(res, async () => res.json(await quiz.answerQuiz(req.user._id, req.body?.index, req.body?.choice)));

// This week's Quiz Leaderboard, and the prize.
const getLeaderboard = (req, res) =>
    handle(res, async () => res.json({ ...(await quiz.leaderboard()), prize: await quiz.currentPrize(), drawAt: quiz.nextDrawAt() }));

// ---- Moderators and admins ----

const getQueue = (req, res) => handle(res, async () => res.json({ questions: await quiz.queueView() }));

// One question: { text, answers, correct (0 to 3) }.
const addOne = (req, res) =>
    handle(res, async () => {
        const added = await quiz.addQuestions(req.user._id, [req.body ?? {}]);
        res.status(201).json({ added, questions: await quiz.queueView() });
    });

// Many: the bulk JSON, a list of { question, answers, correct (1 to 4) },
// as the body itself or as { questions }.
const addBulk = (req, res) =>
    handle(res, async () => {
        const list = Array.isArray(req.body) ? req.body : req.body?.questions;
        const added = await quiz.addQuestions(req.user._id, quiz.fromBulk(list));
        res.status(201).json({ added, questions: await quiz.queueView() });
    });

const edit = (req, res) =>
    handle(res, async () => {
        await quiz.editQuestion(req.params.id, req.body ?? {});
        res.json({ questions: await quiz.queueView() });
    });

// { position }: 1 is next; past the end is the end.
const move = (req, res) =>
    handle(res, async () => {
        const position = await quiz.moveQuestion(req.params.id, req.body?.position);
        res.json({ position, questions: await quiz.queueView() });
    });

const remove = (req, res) =>
    handle(res, async () => {
        await quiz.deleteQuestion(req.params.id);
        res.json({ questions: await quiz.queueView() });
    });

module.exports = { getState, start, answer, getLeaderboard, getQueue, addOne, addBulk, edit, move, remove };
