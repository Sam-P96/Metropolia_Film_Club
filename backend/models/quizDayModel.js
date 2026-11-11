const mongoose = require("mongoose");

const Schema = mongoose.Schema;

// One day's Daily Quiz (utils/quiz.js), the same for everyone, from 12:00
// to 12:00 (Helsinki): made the first time anyone asks for it, then kept.
// Each slot is a question as games/steal/quiz.js shapes them (prompt,
// options a to d, answer). A slot holding a moderator's question also has
// `backup`, a film question for its author to answer instead.
const slotSchema = new Schema(
    {
        question: {type: Schema.Types.Mixed, required: true},
        custom: {type: Schema.Types.ObjectId, ref: "QuizQuestion", default: null},
        author: {type: Schema.Types.ObjectId, ref: "User", default: null},
        backup: {type: Schema.Types.Mixed, default: null},
    },
    {_id: false}
);

const quizDaySchema = new Schema(
    {
        // "2026-11-11": the date of the 12:00 it started. Unique: two people
        // asking at once can't make two quizzes.
        day: {type: String, required: true, unique: true},
        slots: {type: [slotSchema], default: []},
    },
    {timestamps: true}
);

module.exports = mongoose.model("QuizDay", quizDaySchema);
