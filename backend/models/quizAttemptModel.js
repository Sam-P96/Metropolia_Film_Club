const mongoose = require("mongoose");

const Schema = mongoose.Schema;

// One member playing one day's Daily Quiz (utils/quiz.js): once each, so
// (user, day) is unique. The questions are asked one at a time, each with
// its own clock (`askedAt`), on the server, so an answer that comes too
// late counts as wrong.
//   uses     for each slot, "main" or "backup" (its author gets the backup)
//   answers  what they picked for each question so far, and whether it
//            was right (null: no answer in time)
//   points   once done: one for playing, one for each right answer
//   week     once done: the start of the week (Monday 12:00) the points
//            count towards, in the weekly draw
const answerSchema = new Schema(
    {
        choice: {type: String, default: null},
        correct: {type: Boolean, default: false},
    },
    {_id: false}
);

const quizAttemptSchema = new Schema(
    {
        user: {type: Schema.Types.ObjectId, ref: "User", required: true},
        // The quiz's day: the date its 12:00 (Helsinki) start fell on.
        day: {type: String, required: true},
        uses: {type: [String], default: []},
        answers: {type: [answerSchema], default: []},
        current: {type: Number, default: 0},
        askedAt: {type: Date, default: Date.now},
        status: {type: String, enum: ["playing", "done"], default: "playing"},
        correct: {type: Number, default: 0},
        points: {type: Number, default: 0},
        week: {type: Date, default: null},
        finishedAt: {type: Date, default: null},
    },
    {timestamps: true}
);

quizAttemptSchema.index({user: 1, day: 1}, {unique: true});
// The weekly points: everyone's finished attempts in a week.
quizAttemptSchema.index({week: 1, status: 1});

module.exports = mongoose.model("QuizAttempt", quizAttemptSchema);
