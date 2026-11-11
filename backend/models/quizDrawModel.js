const mongoose = require("mongoose");

const Schema = mongoose.Schema;

// One week's Daily Quiz draw (utils/quiz.js runDraw), on the Monday at
// 12:00 that ends it: who won (a ticket for each of their quiz points that
// week), and the prize. Unique by week, so a week is only ever drawn once.
// `paid` is set once the winner has the prize, so a payout that fails is
// tried again.
const quizDrawSchema = new Schema(
    {
        week: {type: Date, required: true, unique: true},
        winner: {type: Schema.Types.ObjectId, ref: "User", default: null},
        prize: {type: Number, default: 0},
        tickets: {type: Number, default: 0},
        players: {type: Number, default: 0},
        paid: {type: Boolean, default: false},
        // Everyone who played all 7 of the week's quizzes, the bonus they
        // each get, and who has been paid it so far (one at a time, so a
        // payout that fails can be tried again without paying anyone twice).
        streakers: {type: [{type: Schema.Types.ObjectId, ref: "User"}], default: []},
        streakBonus: {type: Number, default: 0},
        streakPaid: {type: [{type: Schema.Types.ObjectId, ref: "User"}], default: []},
        drawnAt: {type: Date, default: Date.now},
    },
    {timestamps: true}
);

module.exports = mongoose.model("QuizDraw", quizDrawSchema);
