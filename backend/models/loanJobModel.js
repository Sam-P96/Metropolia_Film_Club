const mongoose = require("mongoose");

const Schema = mongoose.Schema;

// A job that comes with a shark loan (utils/loanShark/jobs.js): "Want your
// debt reduced? Do this:". Each one done takes 20% of the total borrowed
// (as it is then) off the debt, saved here as `reduction`.
//   review   convince `x` to post a movie review
//   dislike  convince `x` to dislike `y`'s `review` (of `filmTitle`). The
//            dislike comes off again at `undoDislikeAt`.
//   steal    convince `x` to steal from `y` in Steal and Defend
// Only counts if it happens after the job was made (createdAt).
//   status  open; done; closed (the loan was paid off first)
const loanJobSchema = new Schema({
    borrower: {type: Schema.Types.ObjectId, ref: "User", required: true},
    loan: {type: Schema.Types.ObjectId, required: true},
    type: {type: String, enum: ["review", "dislike", "steal"], required: true},
    x: {type: Schema.Types.ObjectId, ref: "User", required: true},
    y: {type: Schema.Types.ObjectId, ref: "User", default: null},
    review: {type: Schema.Types.ObjectId, ref: "Review", default: null},
    filmTitle: {type: String, default: null},
    status: {type: String, enum: ["open", "done", "closed"], default: "open"},
    createdAt: {type: Date, default: Date.now},
    doneAt: {type: Date, default: null},
    reduction: {type: Number, default: 0},
    undoDislikeAt: {type: Date, default: null},
    dislikeUndone: {type: Boolean, default: false},
});

loanJobSchema.index({borrower: 1, loan: 1});
// Finding the open jobs an action could finish.
loanJobSchema.index({status: 1, type: 1, x: 1});
loanJobSchema.index({undoDislikeAt: 1}, {partialFilterExpression: {dislikeUndone: false}});

module.exports = mongoose.model("LoanJob", loanJobSchema);
