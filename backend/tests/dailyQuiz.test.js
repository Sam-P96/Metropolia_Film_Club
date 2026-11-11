// The Daily Quiz: its questions on their own, then the routes against a
// real MongoDB (playing, the clock, points, the leaderboard, moderators'
// questions and the weekly draw).
//
// From backend/, with a MongoDB running:
//   PowerShell:  $env:MONGO_TEST_URI="mongodb://127.0.0.1:27017/kino_test"; npm test
//   bash:        MONGO_TEST_URI=mongodb://127.0.0.1:27017/kino_test npm test
// The database is wiped first, so its name has to end in "_test".
const { test, describe, before, after } = require("node:test");
const assert = require("node:assert/strict");

process.env.SECRET ??= "quiz-test-secret";

const { QUIZ, quizPrize } = require("../../shared/quiz/config.js");
const { buildDay, FILM_TYPES } = require("../games/quiz/daily");

const FILMS = Array.from({ length: 40 }, (_, i) => ({ tmdbId: 1000 + i, title: `Film ${i}`, year: 1950 + i }));
let seed = 1;
const random = (max) => {
    seed = (seed * 16807) % 2147483647;
    return seed % max;
};

describe("the questions", () => {
    test("film questions only: when a film came out, and which came first; never about members, maths or countries", () => {
        const { slots } = buildDay({ site: { films: FILMS }, random });
        assert.equal(slots.length, QUIZ.questions);
        for (const slot of slots) {
            assert.ok(FILM_TYPES.includes(slot.question.type), slot.question.type);
            assert.equal(slot.question.options.length, 4);
            assert.ok(slot.question.options.some((option) => option.id === slot.question.answer.choice));
        }
        // Never the same film question twice in a day.
        assert.equal(new Set(slots.map((slot) => `${slot.question.type}:${slot.question.subject}`)).size, slots.length);
    });

    test("a moderator's question takes a slot when the coin says so, in queue order, with a film question kept for its author", () => {
        const queue = [
            { _id: "q1", text: "First?", answers: ["A", "B", "C", "D"], correct: 2, author: "olga" },
            { _id: "q2", text: "Second?", answers: ["E", "F", "G", "H"], correct: 0, author: "olga" },
        ];
        const always = buildDay({ site: { films: FILMS }, queue, random, chance: () => 0 });
        assert.deepEqual(always.used, ["q1", "q2"]);
        const custom = always.slots.filter((slot) => slot.custom);
        assert.deepEqual(custom.map((slot) => slot.question.prompt), ["First?", "Second?"]);
        assert.ok(custom.every((slot) => slot.backup && FILM_TYPES.includes(slot.backup.type) && slot.author === "olga"));
        // The right answer follows its text through the shuffle.
        const first = custom[0].question;
        assert.equal(first.options.find((option) => option.id === first.answer.choice).label, "C");

        const never = buildDay({ site: { films: FILMS }, queue, random, chance: () => 0.99 });
        assert.deepEqual(never.used, []);
        // With no films at all, the queue fills in.
        assert.equal(buildDay({ site: { films: [] }, queue, random, chance: () => 0.99 }).slots.length, 2);
    });

    test("a new quiz every day at 12:00 (Helsinki): before then it's still yesterday's", () => {
        const { quizDayOf, weekStartOf, weekDays } = require("../utils/quiz");
        assert.equal(quizDayOf(new Date("2026-11-10T11:59:00+02:00")), "2026-11-09");
        assert.equal(quizDayOf(new Date("2026-11-10T12:00:00+02:00")), "2026-11-10");
        assert.equal(quizDayOf(new Date("2026-07-01T12:30:00+03:00")), "2026-07-01");
        // A week (Monday 12:00 to Monday 12:00) is exactly 7 quiz days, Monday's to Sunday's.
        const week = weekStartOf(new Date("2026-11-11T09:00:00+02:00"));
        assert.equal(week.toISOString(), "2026-11-09T10:00:00.000Z");
        assert.deepEqual(weekDays(week), ["2026-11-09", "2026-11-10", "2026-11-11", "2026-11-12", "2026-11-13", "2026-11-14", "2026-11-15"]);
    });

    test("the prize: 1,000 at least, or 20% of the richest member's points", () => {
        assert.equal(quizPrize(0), 1000);
        assert.equal(quizPrize(4999), 1000);
        assert.equal(quizPrize(12345), 2469);
    });
});

const uri = process.env.MONGO_TEST_URI;
const dbName = uri ? new URL(uri).pathname.slice(1) : "";

describe("the Daily Quiz against a database", { skip: !uri ? "set MONGO_TEST_URI to run these" : !dbName.endsWith("_test") ? "MONGO_TEST_URI's database must end in _test" : false }, () => {
    const mongoose = require("mongoose");
    const express = require("express");
    const jwt = require("jsonwebtoken");

    let base;
    let server;
    let User;
    let QuizDay;
    let QuizAttempt;
    let QuizQuestion;
    let QuizDraw;
    let Notification;
    let quiz;
    const tokens = new Map();

    before(async () => {
        await mongoose.connect(uri);
        await mongoose.connection.dropDatabase();
        User = require("../models/userModel");
        QuizDay = require("../models/quizDayModel");
        QuizAttempt = require("../models/quizAttemptModel");
        QuizQuestion = require("../models/quizQuestionModel");
        QuizDraw = require("../models/quizDrawModel");
        Notification = require("../models/notificationModel");
        const FilmLog = require("../models/filmLogModel");
        await Promise.all([User, QuizDay, QuizAttempt, QuizQuestion, QuizDraw, Notification, FilmLog].map((model) => model.syncIndexes()));
        quiz = require("../utils/quiz");

        const logger = await User.create({ username: "logger", email: "logger@test.invalid", password: "x" });
        await FilmLog.insertMany(FILMS.map((film) => ({ ...film, user: logger._id, status: "completed" })));

        const app = express();
        app.use("/api/quiz/questions/bulk", express.json({ limit: "5mb" }));
        app.use(express.json());
        app.use("/api/quiz", require("../routes/quizRouter"));
        app.use((error, req, res, next) => {
            console.error(error);
            res.status(500).json({ error: "Something went wrong" });
        });
        await new Promise((resolve) => {
            server = app.listen(0, "127.0.0.1", resolve);
        });
        base = `http://127.0.0.1:${server.address().port}/api/quiz`;
    });

    after(async () => {
        server?.close();
        await mongoose.disconnect();
    });

    let count = 0;
    async function member(role = "user", wallet = { pp: 0, ppp: 0 }) {
        count += 1;
        const user = await User.create({ username: `quizzer${count}`, email: `q${count}@test.invalid`, password: "x", role, wallet });
        tokens.set(String(user._id), jwt.sign({ _id: user._id }, process.env.SECRET));
        return user;
    }
    async function call(user, method, path = "", body) {
        const response = await fetch(base + path, {
            method,
            headers: { Authorization: `Bearer ${tokens.get(String(user._id))}`, ...(body !== undefined && { "Content-Type": "application/json" }) },
            body: body === undefined ? undefined : JSON.stringify(body),
        });
        return { status: response.status, body: await response.json().catch(() => null) };
    }
    const today = () => quiz.quizDayOf();
    // The right option for the question an attempt is on.
    async function rightAnswer(user, index) {
        const day = await QuizDay.findOne({ day: today() }).lean();
        const attempt = await QuizAttempt.findOne({ user: user._id, day: today() }).lean();
        const slot = day.slots[index];
        return (attempt.uses[index] === "backup" ? slot.backup : slot.question).answer.choice;
    }
    const wrongAnswer = (right) => ["a", "b", "c", "d"].find((id) => id !== right);

    test("played once a day, the same questions for everyone; the answers never leave the server; points for playing and for each right answer", async () => {
        const sam = await member();
        const kim = await member();

        const state = (await call(sam, "GET")).body;
        assert.deepEqual([state.total, state.played, state.attempt, state.timerSeconds], [QUIZ.questions, false, null, QUIZ.timerSeconds]);

        let view = (await call(sam, "POST", "/start")).body;
        const kimFirst = (await call(kim, "POST", "/start")).body;
        assert.deepEqual(kimFirst.question, view.question);
        assert.equal(JSON.stringify(view).includes("answer"), false);
        assert.ok(view.secondsLeft > 0 && view.secondsLeft <= QUIZ.timerSeconds);

        // Three right, two wrong.
        for (let i = 0; i < QUIZ.questions; i++) {
            const right = await rightAnswer(sam, i);
            view = (await call(sam, "POST", "/answer", { index: i, choice: i < 3 ? right : wrongAnswer(right) })).body;
        }
        assert.deepEqual(view, { done: true, total: QUIZ.questions, result: { correct: 3, total: QUIZ.questions, points: 4 } });

        // Once only: Play again shows the score; answering again is refused.
        assert.deepEqual((await call(sam, "POST", "/start")).body.result, { correct: 3, total: QUIZ.questions, points: 4 });
        assert.equal((await call(sam, "POST", "/answer", { index: 0, choice: "a" })).status, 409);

        const after = (await call(sam, "GET")).body;
        assert.deepEqual([after.played, after.week.myPoints], [true, 4]);
        assert.ok(after.week.prize >= 1000);
        assert.ok(new Date(after.week.drawAt) > new Date());
    });

    test("an answer that comes after the time is up is wrong; a question left to run out counts wrong and the next one starts on Play", async () => {
        const slow = await member();
        await call(slow, "POST", "/start");
        await QuizAttempt.updateOne({ user: slow._id }, { $set: { askedAt: new Date(Date.now() - (QUIZ.timerSeconds + 5) * 1000) } });
        const late = (await call(slow, "POST", "/answer", { index: 0, choice: await rightAnswer(slow, 0) })).body;
        assert.equal(late.index, 1);
        assert.equal((await QuizAttempt.findOne({ user: slow._id }).lean()).answers[0].correct, false);

        // Walked away from question 2: on coming back, it's wrong and it's question 3.
        await QuizAttempt.updateOne({ user: slow._id }, { $set: { askedAt: new Date(Date.now() - (QUIZ.timerSeconds + 5) * 1000) } });
        const back = (await call(slow, "POST", "/start")).body;
        assert.equal(back.index, 2);
        assert.ok(back.secondsLeft >= QUIZ.timerSeconds - 1);
        // Out of turn: refused.
        assert.equal((await call(slow, "POST", "/answer", { index: 0, choice: "a" })).status, 409);
    });

    test("the Quiz Leaderboard: this week's points, most first, with members as leaderboards show them and their share", async () => {
        const board = (await call(await member(), "GET", "/leaderboard")).body;
        assert.ok(board.entries.length >= 1);
        assert.equal(board.entries[0].points, 4);
        assert.ok("reviewCardBanner" in board.entries[0].user && "cosmetics" in board.entries[0].user);
        assert.equal(board.total, board.entries.reduce((sum, entry) => sum + entry.points, 0));
        assert.ok(Math.abs(board.entries.reduce((sum, entry) => sum + entry.share, 0) - 1) < 1e-9);
        assert.ok(board.prize >= 1000);
    });

    test("moderators and admins write questions: one, or many from JSON (correct 1 to 4); edit, move (past the end is the end), delete", async () => {
        const member1 = await member();
        const mod = await member("moderator");
        assert.equal((await call(member1, "GET", "/questions")).status, 403);
        assert.equal((await call(member1, "POST", "/questions", { text: "X?", answers: ["a", "b", "c", "d"], correct: 0 })).status, 403);

        const one = await call(mod, "POST", "/questions", { text: "Who directed Alien?", answers: ["Ridley Scott", "James Cameron", "David Fincher", "Jean-Pierre Jeunet"], correct: 0 });
        assert.equal(one.status, 201, JSON.stringify(one.body));
        assert.equal((await call(mod, "POST", "/questions", { text: "Bad?", answers: ["a", "a", "b", "c"], correct: 0 })).status, 400);
        assert.equal((await call(mod, "POST", "/questions", { text: "Bad?", answers: ["a", "b", "c"], correct: 0 })).status, 400);

        const bulk = await call(mod, "POST", "/questions/bulk", [
            { question: "Two?", answers: ["w", "x", "y", "z"], correct: 2 },
            { question: "Three?", answers: ["w", "x", "y", "z"], correct: 4 },
            { question: "Four?", answers: ["w", "x", "y", "z"], correct: 1 },
        ]);
        assert.equal(bulk.status, 201, JSON.stringify(bulk.body));
        assert.deepEqual(bulk.body.questions.map((entry) => [entry.position, entry.text, entry.correct]), [
            [1, "Who directed Alien?", 0],
            [2, "Two?", 1],
            [3, "Three?", 3],
            [4, "Four?", 0],
        ]);
        // One wrong in a bulk upload: none added, and it says which.
        const broken = await call(mod, "POST", "/questions/bulk", { questions: [{ question: "Fine?", answers: ["a", "b", "c", "d"], correct: 1 }, { question: "", answers: ["a"], correct: 9 }] });
        assert.equal(broken.status, 400);
        assert.match(broken.body.error, /Question 2:/);
        assert.equal(await QuizQuestion.countDocuments({ status: "queued" }), 4);

        const [first, second] = bulk.body.questions;
        const edited = await call(mod, "PUT", `/questions/${second._id}`, { text: "Two, edited?", answers: ["w", "x", "y", "z"], correct: 3 });
        assert.deepEqual([edited.body.questions[1].text, edited.body.questions[1].correct], ["Two, edited?", 3]);

        const moved = await call(mod, "POST", `/questions/${first._id}/move`, { position: 99 });
        assert.equal(moved.body.position, 4);
        assert.deepEqual(moved.body.questions.map((entry) => entry.text), ["Two, edited?", "Three?", "Four?", "Who directed Alien?"]);
        const toFront = await call(mod, "POST", `/questions/${first._id}/move`, { position: 1 });
        assert.deepEqual(toFront.body.questions.map((entry) => entry.position), [1, 2, 3, 4]);
        assert.equal(toFront.body.questions[0].text, "Who directed Alien?");

        const removed = await call(mod, "DELETE", `/questions/${bulk.body.questions[3]._id}`);
        assert.deepEqual(removed.body.questions.map((entry) => entry.position), [1, 2, 3]);

        // Shuffled: the same questions, in some order, numbered from 1. Moderators only.
        assert.equal((await call(member1, "POST", "/questions/shuffle")).status, 403);
        const before = removed.body.questions.map((entry) => entry.text).sort();
        const shuffled = await call(mod, "POST", "/questions/shuffle");
        assert.equal(shuffled.status, 200);
        assert.deepEqual(shuffled.body.questions.map((entry) => entry.text).sort(), before);
        assert.deepEqual(shuffled.body.questions.map((entry) => entry.position), [1, 2, 3]);
    });

    test("a day's quiz takes questions from the queue, which leave it; their author gets a film question instead", async () => {
        const olga = await member("moderator");
        await QuizQuestion.deleteMany({});
        await call(olga, "POST", "/questions/bulk", Array.from({ length: 6 }, (_, i) => ({ question: `Olga's ${i}?`, answers: ["a", "b", "c", "d"], correct: 1 })));

        // Each day's slots have an even chance each: within ten days some will have come up.
        let day = null;
        for (let i = 1; i <= 10 && !day; i++) {
            const made = await quiz.quizForDay(`2099-01-${String(i).padStart(2, "0")}`);
            if (made.slots.some((slot) => slot.custom)) day = made;
        }
        assert.ok(day, "no moderator's question in ten days");
        const used = day.slots.filter((slot) => slot.custom).map((slot) => String(slot.custom));
        const released = await QuizQuestion.find({ _id: { $in: used } }).lean();
        assert.ok(released.every((entry) => entry.status === "released" && entry.releasedOn === day.day));
        const queue = (await call(olga, "GET", "/questions")).body.questions;
        assert.equal(queue.some((entry) => used.includes(String(entry._id))), false);
        assert.deepEqual(queue.map((entry) => entry.position), queue.map((_, i) => i + 1));

        // Today's quiz with Olga's question first: Olga gets the backup, Sam gets hers.
        const custom = day.slots.find((slot) => slot.custom);
        await QuizDay.deleteOne({ day: today() });
        await QuizDay.create({ day: today(), slots: [custom, ...day.slots.filter((slot) => slot !== custom)].slice(0, QUIZ.questions) });
        const sam = await member();
        const olgaSees = (await call(olga, "POST", "/start")).body.question.prompt;
        const samSees = (await call(sam, "POST", "/start")).body.question.prompt;
        assert.equal(samSees, custom.question.prompt);
        assert.equal(olgaSees, custom.backup.prompt);
    });

    test("Monday's draw: one winner, a ticket per point, paid the prize; everyone hears; 7 day streaks get the bonus; each week drawn once", async () => {
        const rich = await member("user", { pp: 0, ppp: 50000 });
        const one = await member();
        const nine = await member();
        const streaker = await member();
        const sixDays = await member();
        const lastWeek = new Date(quiz.weekStartOf().getTime() - 7 * 24 * 60 * 60 * 1000);
        const days = quiz.weekDays(lastWeek);
        await QuizAttempt.insertMany([
            { user: one._id, day: "2000-01-01", status: "done", points: 1, week: lastWeek },
            { user: nine._id, day: "2000-01-01", status: "done", points: 6, week: lastWeek },
            { user: nine._id, day: "2000-01-02", status: "done", points: 3, week: lastWeek },
            // Every quiz of the week (no points, so the tickets stay simple), and one short.
            ...days.map((day) => ({ user: streaker._id, day, status: "done", points: 0, week: lastWeek })),
            ...days.slice(1).map((day) => ({ user: sixDays._id, day, status: "done", points: 0, week: lastWeek })),
        ]);
        // Tickets in id order: `one` holds ticket 0, `nine` tickets 1 to 9.
        const draw = await quiz.runDraw(new Date(), { random: (max) => { assert.equal(max, 10); return 5; } });
        assert.equal(String(draw.winner), String(nine._id));
        assert.deepEqual([draw.tickets, draw.players, draw.paid], [10, 4, true]);
        assert.deepEqual(draw.streakers.map(String), [String(streaker._id)]);
        assert.deepEqual([draw.streakBonus, draw.streakPaid.map(String)], [QUIZ.streak.bonus, [String(streaker._id)]]);
        assert.equal((await User.findById(streaker._id).lean()).wallet.ppp, QUIZ.streak.bonus);
        assert.equal((await User.findById(sixDays._id).lean()).wallet.ppp, 0);
        assert.equal(await Notification.countDocuments({ type: "quizStreak", recipient: streaker._id, amount: QUIZ.streak.bonus }), 1);
        assert.equal(draw.prize, quizPrize(50000));
        const paid = await User.findById(nine._id).lean();
        assert.equal(paid.wallet.ppp, quizPrize(50000));

        const members = await User.countDocuments();
        assert.equal(await Notification.countDocuments({ type: "quizWinner", actors: nine._id, amount: quizPrize(50000) }), members);

        assert.equal(await quiz.runDraw(new Date()), null);
        assert.equal(await QuizDraw.countDocuments({ week: lastWeek }), 1);

        // The new week starts from nothing for them, and the page shows the winner.
        const state = (await call(nine, "GET")).body;
        assert.equal(state.week.myPoints, 0);
        assert.equal(state.lastDraw.winner.username, nine.username);
        void rich;
    });
});
