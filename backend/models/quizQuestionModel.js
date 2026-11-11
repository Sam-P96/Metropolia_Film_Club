const mongoose = require("mongoose");

const Schema = mongoose.Schema;

// A Daily Quiz question written by a moderator or admin (utils/quiz.js).
// While it's "queued" it waits its turn, in `position` order (1 is next);
// each day's quiz gives each of its questions a chance of being the next
// one (shared/quiz/config.js customChance). Once it's been asked it's
// "released", with the day, and leaves the queue.
const quizQuestionSchema = new Schema(
    {
        text: {type: String, required: true},
        // Four answers, and which of them is right (0 to 3).
        answers: {type: [String], required: true},
        correct: {type: Number, required: true, min: 0, max: 3},
        // Who wrote it: they're asked another question instead on the day
        // it's in the quiz. null once they've left the club.
        author: {type: Schema.Types.ObjectId, ref: "User", default: null},
        status: {type: String, enum: ["queued", "released"], default: "queued"},
        position: {type: Number, default: 0},
        releasedOn: {type: String, default: null},
    },
    {timestamps: true}
);

quizQuestionSchema.index({status: 1, position: 1});

module.exports = mongoose.model("QuizQuestion", quizQuestionSchema);
