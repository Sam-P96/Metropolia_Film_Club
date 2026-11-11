const crypto = require("crypto");
const mongoose = require("mongoose");
const { DateTime } = require("luxon");
const User = require("../models/userModel");
const QuizQuestion = require("../models/quizQuestionModel");
const QuizDay = require("../models/quizDayModel");
const QuizAttempt = require("../models/quizAttemptModel");
const QuizDraw = require("../models/quizDrawModel");
const { QUIZ, quizPrize } = require("../../shared/quiz/config.js");
const { buildDay, publicQuestion, isCorrect } = require("../games/quiz/daily");
const { siteFilms } = require("./steal/attacks");
const { WalletError, credit, leaderboardStages } = require("./wallet");
const { MEMBER_FIELDS, userSummary } = require("./serialize");
const { noteQuizStreak, noteQuizWinner } = require("./notify");

// The Daily Quiz in the database: one quiz a day (12:00 to 12:00,
// Helsinki), the same for everyone
// (models/quizDayModel.js), played once each (models/quizAttemptModel.js),
// points towards a weekly draw (models/quizDrawModel.js), and the queue
// of questions moderators and admins write (models/quizQuestionModel.js).
// The numbers are in shared/quiz/config.js; the questions themselves come
// from games/quiz/daily.js.

class QuizError extends Error {
    constructor(message, status = 400, extra = {}) {
        super(message);
        this.status = status;
        this.extra = extra;
    }
}

const LIMIT_MS = QUIZ.timerSeconds * 1000;

// ---- Weeks ----

// The start of the week `date` is in: the latest Monday 12:00 (Helsinki)
// at or before it. Points count towards the draw at the end of that week.
function weekStartOf(date = new Date()) {
    const here = DateTime.fromJSDate(date, { zone: QUIZ.zone });
    let start = here.set({ weekday: QUIZ.draw.weekday, hour: QUIZ.draw.hour, minute: 0, second: 0, millisecond: 0 });
    if (start > here) start = start.minus({ weeks: 1 });
    return start.toJSDate();
}

const shiftWeeks = (date, weeks) => DateTime.fromJSDate(date, { zone: QUIZ.zone }).plus({ weeks }).toJSDate();

// When this week's draw is.
const nextDrawAt = (date = new Date()) => shiftWeeks(weekStartOf(date), 1);

// Which day's quiz is on at `date`: a new one starts every day at 12:00
// (Helsinki), so before 12:00 it's still yesterday's. "2026-11-11".
function quizDayOf(date = new Date()) {
    let here = DateTime.fromJSDate(date, { zone: QUIZ.zone });
    if (here.hour < QUIZ.dayStartHour) here = here.minus({ days: 1 });
    return here.toISODate();
}

// The quiz days in the week starting `week` (Monday 12:00): Monday's to
// Sunday's, 7 of them.
function weekDays(week) {
    const monday = DateTime.fromJSDate(week, { zone: QUIZ.zone });
    return Array.from({ length: QUIZ.streak.days }, (_, i) => monday.plus({ days: i }).toISODate());
}

// ---- The day's quiz ----

// Today's quiz (the one on since the latest 12:00), made the first time
// anyone asks for it:
// film questions, some swapped for the next of the moderators' questions,
// which then leave the queue. Two people asking at once get the same one.
async function quizForDay(day = quizDayOf()) {
    const found = await QuizDay.findOne({ day }).lean();
    if (found) return found;

    const queue = await QuizQuestion.find({ status: "queued" }).sort({ position: 1, createdAt: 1 }).lean();
    const { slots, used } = buildDay({ site: { films: await siteFilms() }, queue });
    try {
        const made = await QuizDay.create({ day, slots });
        if (used.length > 0) {
            await QuizQuestion.updateMany({ _id: { $in: used }, status: "queued" }, { $set: { status: "released", releasedOn: day } });
            await renumberQueue();
        }
        return made.toObject();
    } catch (error) {
        // Someone else made it a moment ago: that's today's.
        if (error.code === 11000) return QuizDay.findOne({ day }).lean();
        throw error;
    }
}

// Whether a member gets a slot's question or its backup: the author of a
// moderator's question gets the backup, if there is one.
const useFor = (slot, userId) => (slot.backup && slot.author && String(slot.author) === String(userId) ? "backup" : "main");

const questionAt = (quiz, attempt, index) => {
    const slot = quiz.slots[index];
    return attempt.uses[index] === "backup" ? slot.backup : slot.question;
};

// What the page is shown of an attempt: the question it's on (never the
// answer) and how long is left for it, or, once it's done, the score.
function attemptView(attempt, quiz, now = new Date()) {
    const total = quiz.slots.length;
    if (attempt.status === "done") {
        return { done: true, total, result: { correct: attempt.correct, total, points: attempt.points } };
    }
    const left = new Date(attempt.askedAt).getTime() + LIMIT_MS - now.getTime();
    return {
        done: false,
        index: attempt.current,
        total,
        question: publicQuestion(questionAt(quiz, attempt, attempt.current)),
        secondsLeft: Math.max(0, Math.ceil(left / 1000)),
    };
}

// Records `answer` ({ choice, correct }) for the question the attempt is
// on, and moves to the next, its clock starting `now`; after the last, the
// attempt is done and scored. Only if nothing else has moved it on since
// it was read (a double tap). Returns the attempt after, or null.
async function record(attempt, quiz, answer, now) {
    const answers = [...attempt.answers, answer];
    const next = attempt.current + 1;
    const set = { answers, current: next, askedAt: now };
    if (next >= quiz.slots.length) {
        const correct = answers.filter((entry) => entry.correct).length;
        Object.assign(set, {
            status: "done",
            correct,
            points: QUIZ.points.played + QUIZ.points.perCorrect * correct,
            week: weekStartOf(now),
            finishedAt: now,
        });
    }
    return QuizAttempt.findOneAndUpdate({ _id: attempt._id, status: "playing", current: attempt.current }, { $set: set }, { returnDocument: "after" }).lean();
}

const timedOut = (attempt, now) => now.getTime() - new Date(attempt.askedAt).getTime() > LIMIT_MS + QUIZ.graceMs;

// Play: starts today's quiz for `userId`, or carries on where they were.
// A question whose time ran out while they were away counts as wrong, and
// the next one starts now. Resolves to attemptView's answer.
async function startQuiz(userId, now = new Date()) {
    const day = quizDayOf(now);
    const quiz = await quizForDay(day);
    if (quiz.slots.length === 0) throw new QuizError("There's no quiz today: the club hasn't logged enough films yet.", 409);

    let attempt = await QuizAttempt.findOne({ user: userId, day }).lean();
    if (!attempt) {
        try {
            attempt = (await QuizAttempt.create({ user: userId, day, uses: quiz.slots.map((slot) => useFor(slot, userId)), askedAt: now })).toObject();
        } catch (error) {
            if (error.code !== 11000) throw error;
            attempt = await QuizAttempt.findOne({ user: userId, day }).lean();
        }
    } else if (attempt.status === "playing" && timedOut(attempt, now)) {
        attempt = (await record(attempt, quiz, { choice: null, correct: false }, now)) ?? (await QuizAttempt.findById(attempt._id).lean());
    }
    return attemptView(attempt, quiz, now);
}

// An answer, { index, choice }, to the question they're on. Too late (its
// time ran out) counts as wrong. Whether it was right isn't said: the quiz
// is the same for everyone today. Resolves to attemptView's answer, the
// next question or the score.
async function answerQuiz(userId, index, choice, now = new Date()) {
    const attempt = await QuizAttempt.findOne({ user: userId, day: quizDayOf(now) }).lean()
        // Started just before 12:00: still that quiz.
        ?? (await QuizAttempt.findOne({ user: userId, status: "playing" }).sort({ createdAt: -1 }).lean());
    if (!attempt) throw new QuizError("Press Play first.", 409);
    const quiz = await QuizDay.findOne({ day: attempt.day }).lean();
    if (attempt.status === "done") throw new QuizError("You've played today's quiz already.", 409, { state: attemptView(attempt, quiz, now) });
    if (index !== attempt.current) throw new QuizError("That question's been answered already.", 409, { state: attemptView(attempt, quiz, now) });

    const late = timedOut(attempt, now);
    const question = questionAt(quiz, attempt, index);
    const answer = { choice: typeof choice === "string" ? choice : null, correct: !late && isCorrect(question, choice) };
    const after = await record(attempt, quiz, answer, now);
    if (!after) {
        const now2 = await QuizAttempt.findById(attempt._id).lean();
        throw new QuizError("That question's been answered already.", 409, { state: attemptView(now2, quiz, now) });
    }
    return attemptView(after, quiz, now);
}

// ---- Points, the leaderboard and the draw ----

// Everyone's points in the week starting `week`, from their finished
// quizzes: [{ user, points }], members who've left the club left out,
// ordered by id (so a draw over them is the same whichever way it's read).
async function weekPoints(week) {
    const rows = await QuizAttempt.aggregate([
        { $match: { week, status: "done" } },
        { $group: { _id: "$user", points: { $sum: "$points" } } },
        { $sort: { _id: 1 } },
    ]);
    const present = new Set((await User.find({ _id: { $in: rows.map((row) => row._id) } }).distinct("_id")).map(String));
    return rows.filter((row) => present.has(String(row._id))).map((row) => ({ user: row._id, points: row.points }));
}

// How many of the quiz days in the week starting `week` each member
// finished: Map of user id to days.
async function daysPlayed(week, userIds = null) {
    const rows = await QuizAttempt.aggregate([
        { $match: { status: "done", day: { $in: weekDays(week) }, ...(userIds && { user: { $in: userIds } }) } },
        { $group: { _id: "$user", days: { $addToSet: "$day" } } },
    ]);
    return new Map(rows.map((row) => [String(row._id), row.days.length]));
}

// Everyone who played every quiz of the week starting `week` (a 7 day
// streak at the draw), members who've left the club left out.
async function streakersOf(week) {
    const played = await daysPlayed(week);
    const full = [...played].filter(([, days]) => days >= QUIZ.streak.days).map(([id]) => id);
    return User.find({ _id: { $in: full } }).distinct("_id");
}

// This week's prize: the bigger of the minimum and a share of the richest
// member's points.
async function currentPrize() {
    const [richest] = await User.aggregate([...leaderboardStages({ _id: 1 }), { $limit: 1 }]);
    return quizPrize(richest?.pp ?? 0);
}

// The Quiz Leaderboard: this week's points, most first (ties A to Z),
// each member as the leaderboards show them (banner, picture, border,
// name style), with their share of the tickets. { entries, total }.
async function leaderboard(now = new Date()) {
    const points = await weekPoints(weekStartOf(now));
    const users = await User.find({ _id: { $in: points.map((row) => row.user) } }).select(MEMBER_FIELDS).lean();
    const byId = new Map(users.map((user) => [String(user._id), user]));
    const total = points.reduce((sum, row) => sum + row.points, 0);
    const entries = points
        .map((row) => ({ user: userSummary(byId.get(String(row.user))), points: row.points, share: total ? row.points / total : 0 }))
        .sort((a, b) => b.points - a.points || a.user.username.localeCompare(b.user.username));
    return { entries, total };
}

// Pays a drawn week's winner, once: claimed first (paid false -> true), let
// go again if paying fails, so it's tried again later.
async function payDraw(drawId) {
    const draw = await QuizDraw.findOneAndUpdate({ _id: drawId, paid: false }, { $set: { paid: true } }, { returnDocument: "after" }).lean();
    if (!draw?.winner) return;
    try {
        await credit(draw.winner, draw.prize, { reason: "quizPrize" });
        await noteQuizWinner(draw.winner, draw.prize);
    } catch (error) {
        // A winner who's left the club can't be paid; anything else, later.
        if (error instanceof WalletError && error.status === 404) return;
        await QuizDraw.updateOne({ _id: drawId }, { $set: { paid: false } });
        throw error;
    }
}

// The draw for the week that ended at the latest Monday 12:00 (Helsinki):
// one member, a ticket for each of their points that week, wins the prize,
// and everyone who played all 7 of its quizzes gets the streak bonus.
// Each week is drawn once (the draw's unique week), and the new week's
// points start from 0 by themselves. `random(max)` picks the ticket.
// Resolves to the draw, or null if it was drawn already.
async function runDraw(now = new Date(), { random = crypto.randomInt } = {}) {
    const week = shiftWeeks(weekStartOf(now), -1);
    if (await QuizDraw.exists({ week })) return null;

    const points = await weekPoints(week);
    const tickets = points.reduce((sum, row) => sum + row.points, 0);
    const prize = await currentPrize();
    const streakers = await streakersOf(week);
    let winner = null;
    if (tickets > 0) {
        let ticket = random(tickets);
        for (const row of points) {
            if (ticket < row.points) {
                winner = row.user;
                break;
            }
            ticket -= row.points;
        }
    }

    let draw;
    try {
        draw = await QuizDraw.create({
            week,
            winner,
            prize: winner ? prize : 0,
            tickets,
            players: points.length,
            paid: !winner,
            streakers,
            streakBonus: streakers.length > 0 ? QUIZ.streak.bonus : 0,
            drawnAt: now,
        });
    } catch (error) {
        if (error.code === 11000) return null;
        throw error;
    }
    if (winner) await payDraw(draw._id);
    await payStreaks(draw._id);
    return QuizDraw.findById(draw._id).lean();
}

// Pays a drawn week's 7 day streak bonus, to each streaker once: each
// one claimed (added to streakPaid) before they're paid, and let go if
// paying fails. Everyone paid this time hears about it.
async function payStreaks(drawId) {
    const draw = await QuizDraw.findById(drawId).lean();
    if (!draw || !(draw.streakBonus > 0)) return;
    const paid = new Set(draw.streakPaid.map(String));
    const now = [];
    for (const user of draw.streakers) {
        if (paid.has(String(user))) continue;
        const claimed = await QuizDraw.updateOne({ _id: drawId, streakPaid: { $ne: user } }, { $push: { streakPaid: user } });
        if (claimed.modifiedCount !== 1) continue;
        try {
            await credit(user, draw.streakBonus, { reason: "quizStreak" });
            now.push(user);
        } catch (error) {
            if (error instanceof WalletError && error.status === 404) continue;
            await QuizDraw.updateOne({ _id: drawId }, { $pull: { streakPaid: user } });
            throw error;
        }
    }
    if (now.length > 0) await noteQuizStreak(now, draw.streakBonus);
}

// Draws whose payouts failed, paid now (jobs/quizDraw.js, on starting).
async function payUnpaidDraws() {
    for (const draw of await QuizDraw.find({ paid: false }).select("_id").lean()) await payDraw(draw._id);
    const streaks = await QuizDraw.find({ $expr: { $gt: [{ $size: "$streakers" }, { $size: "$streakPaid" }] } }).select("_id").lean();
    for (const draw of streaks) await payStreaks(draw._id);
}

// ---- What the page shows ----

// Everything the quiz's page and the home page's slide need for `user`:
// today's quiz (how many questions, whether they've played, their score),
// this week (when the draw is, the prize, their points), the last draw's
// winner, how many of this week's quizzes they've played (all 7 is the
// streak bonus), and whether they can write questions.
async function quizState(user, now = new Date(), { canManage = false } = {}) {
    const day = quizDayOf(now);
    const week = weekStartOf(now);
    const [quiz, attempt, points, prize, lastDraw, played] = await Promise.all([
        quizForDay(day),
        QuizAttempt.findOne({ user: user._id, day }).lean(),
        weekPoints(week),
        currentPrize(),
        QuizDraw.findOne({ winner: { $ne: null } }).sort({ week: -1 }).lean(),
        daysPlayed(week, [user._id]),
    ]);
    const winner = lastDraw ? await User.findById(lastDraw.winner).select(MEMBER_FIELDS).lean() : null;
    const mine = points.find((row) => String(row.user) === String(user._id));

    return {
        day,
        total: quiz.slots.length,
        timerSeconds: QUIZ.timerSeconds,
        countdownSeconds: QUIZ.countdownSeconds,
        attempt: attempt ? { status: attempt.status, current: attempt.current, correct: attempt.correct, points: attempt.points } : null,
        played: attempt?.status === "done",
        week: {
            start: week,
            drawAt: nextDrawAt(now),
            prize,
            myPoints: mine?.points ?? 0,
            totalPoints: points.reduce((sum, row) => sum + row.points, 0),
            players: points.length,
            daysPlayed: played.get(String(user._id)) ?? 0,
            streakDays: QUIZ.streak.days,
            streakBonus: QUIZ.streak.bonus,
        },
        // When the next quiz comes.
        nextQuizAt: DateTime.fromISO(day, { zone: QUIZ.zone }).plus({ days: 1 }).set({ hour: QUIZ.dayStartHour }).toJSDate(),
        lastDraw: lastDraw && winner ? { week: lastDraw.week, prize: lastDraw.prize, winner: userSummary(winner) } : null,
        canManage,
    };
}

// ---- The moderators' questions ----

// A question as written: { text, answers (4), correct (0 to 3) }, tidied,
// or what's wrong with it.
function checkQuestion(input) {
    const text = typeof input?.text === "string" ? input.text.trim() : "";
    if (!text) return { error: "Write the question." };
    if (text.length > QUIZ.custom.maxQuestion) return { error: `A question can be ${QUIZ.custom.maxQuestion} characters at most.` };
    if (!Array.isArray(input.answers) || input.answers.length !== 4) return { error: "A question needs exactly 4 answers." };
    const answers = input.answers.map((answer) => (typeof answer === "string" ? answer.trim() : ""));
    if (answers.some((answer) => !answer)) return { error: "Every answer needs some text." };
    if (answers.some((answer) => answer.length > QUIZ.custom.maxAnswer)) return { error: `An answer can be ${QUIZ.custom.maxAnswer} characters at most.` };
    if (new Set(answers.map((answer) => answer.toLowerCase())).size !== 4) return { error: "The 4 answers must all be different." };
    if (!Number.isInteger(input.correct) || input.correct < 0 || input.correct > 3) return { error: "Tick the right answer." };
    return { question: { text, answers, correct: input.correct } };
}

// Puts the queue's positions back to 1, 2, 3... in its order.
async function renumberQueue() {
    const queue = await QuizQuestion.find({ status: "queued" }).sort({ position: 1, createdAt: 1 }).select("_id").lean();
    if (queue.length === 0) return;
    await QuizQuestion.bulkWrite(queue.map((entry, i) => ({ updateOne: { filter: { _id: entry._id }, update: { $set: { position: i + 1 } } } })));
}

// Adds `list` (questions as checkQuestion takes them) to the end of the
// queue, by `authorId`. All or nothing: if any is wrong, none are added,
// and the error says which (1 is the first).
async function addQuestions(authorId, list) {
    if (!Array.isArray(list) || list.length === 0) throw new QuizError("There are no questions in that.");
    const checked = list.map(checkQuestion);
    const problems = checked.map((entry, i) => (entry.error ? `Question ${i + 1}: ${entry.error}` : null)).filter(Boolean);
    if (problems.length > 0) throw new QuizError(problems.slice(0, 10).join(" ") + (problems.length > 10 ? ` (and ${problems.length - 10} more)` : ""), 400, { problems });

    const last = await QuizQuestion.findOne({ status: "queued" }).sort({ position: -1 }).select("position").lean();
    const start = last?.position ?? 0;
    const made = await QuizQuestion.insertMany(checked.map((entry, i) => ({ ...entry.question, author: authorId, position: start + i + 1 })));
    return made.length;
}

// The bulk upload's JSON (shared/quiz/config.js BULK_TEMPLATE): a list of
// { question, answers, correct }, `correct` being 1 to 4.
function fromBulk(list) {
    if (!Array.isArray(list)) throw new QuizError("The file should be a list of questions, like the template: [ { ... }, { ... } ].");
    return list.map((entry) => ({
        text: entry?.question,
        answers: entry?.answers,
        correct: Number.isInteger(entry?.correct) ? entry.correct - 1 : null,
    }));
}

// The queue, next first, with the answers and the right one, and who
// wrote each.
async function queueView() {
    const queue = await QuizQuestion.find({ status: "queued" }).sort({ position: 1, createdAt: 1 }).lean();
    const authors = await User.find({ _id: { $in: queue.map((entry) => entry.author).filter(Boolean) } }).select(MEMBER_FIELDS).lean();
    const byId = new Map(authors.map((author) => [String(author._id), userSummary(author)]));
    return queue.map((entry, i) => ({
        _id: entry._id,
        position: i + 1,
        text: entry.text,
        answers: entry.answers,
        correct: entry.correct,
        author: byId.get(String(entry.author)) ?? null,
        createdAt: entry.createdAt,
    }));
}

async function queuedQuestion(id) {
    const found = mongoose.isValidObjectId(id) ? await QuizQuestion.findOne({ _id: id, status: "queued" }) : null;
    if (!found) throw new QuizError("That question isn't in the queue any more.", 404);
    return found;
}

// Edits a queued question: its text, answers and right answer.
async function editQuestion(id, input) {
    const { question, error } = checkQuestion(input);
    if (error) throw new QuizError(error);
    const found = await queuedQuestion(id);
    Object.assign(found, question);
    await found.save();
}

// Moves a queued question to `position` (1 is next). Past the end of the
// queue is the end of the queue.
async function moveQuestion(id, position) {
    if (!Number.isInteger(position) || position < 1) throw new QuizError("A place in the queue is a whole number from 1.");
    const found = await queuedQuestion(id);
    const queue = (await QuizQuestion.find({ status: "queued" }).sort({ position: 1, createdAt: 1 }).select("_id").lean()).map((entry) => String(entry._id));
    const others = queue.filter((entry) => entry !== String(found._id));
    others.splice(Math.min(position, others.length + 1) - 1, 0, String(found._id));
    await QuizQuestion.bulkWrite(others.map((entry, i) => ({ updateOne: { filter: { _id: entry }, update: { $set: { position: i + 1 } } } })));
    return others.indexOf(String(found._id)) + 1;
}

async function deleteQuestion(id) {
    const found = await queuedQuestion(id);
    await found.deleteOne();
    await renumberQueue();
}

// ---- Accounts ----

// An account is being deleted: their quizzes go, and the questions they
// wrote stay, with no author.
async function forgetQuizMember(userId) {
    await QuizAttempt.deleteMany({ user: userId });
    await QuizQuestion.updateMany({ author: userId }, { $set: { author: null } });
}

// Their quizzes and the questions they wrote, for their data export.
async function quizDataOf(userId) {
    const [attempts, questions] = await Promise.all([
        QuizAttempt.find({ user: userId }).sort({ day: -1 }).select("day status correct points answers finishedAt -_id").lean(),
        QuizQuestion.find({ author: userId }).select("text answers correct status releasedOn createdAt -_id").lean(),
    ]);
    return { attempts, questions };
}

module.exports = {
    QuizError,
    weekStartOf,
    nextDrawAt,
    quizDayOf,
    weekDays,
    streakersOf,
    quizForDay,
    startQuiz,
    answerQuiz,
    weekPoints,
    currentPrize,
    leaderboard,
    runDraw,
    payUnpaidDraws,
    quizState,
    checkQuestion,
    addQuestions,
    fromBulk,
    queueView,
    editQuestion,
    moveQuestion,
    deleteQuestion,
    renumberQueue,
    forgetQuizMember,
    quizDataOf,
};
