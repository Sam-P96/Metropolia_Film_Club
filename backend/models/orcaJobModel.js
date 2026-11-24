const mongoose = require("mongoose");

const Schema = mongoose.Schema;

// A job Lord Gang Orca asks of `player`:
//   mode  favour: one of the four a day while their favour mode is on
//         (utils/orca/jobs.js); debt: one of the ten while they're in the
//         red (utils/orca/debt.js). Jobs from before there were debt jobs
//         have no mode, and are favours.
// The kinds, the same in either mode:
//   challenge  get `x` to challenge `y` to Farkle or Gomoku and finish it
//   review     get `x` to post a review
//   dislike    get `x` to dislike `y`'s `review` (it comes off again at
//              `undoDislikeAt`, 48 hours later)
//   like       get `x` to like `y`'s `review` (it stays)
// It only counts if it happens after the job was made and before
// `expiresAt`: the next 00:00 (Helsinki) for a favour, two days after it
// was dealt for a debt job (when its slot gets a new one).
//   status  open; done; expired (expiresAt came first); cancelled (favour
//           mode ended, or they got out of the red, with it still open)
// `forgiven`: what a debt job took off their debt once done.
const orcaJobSchema = new Schema({
    player: { type: Schema.Types.ObjectId, ref: "User", required: true },
    mode: { type: String, enum: ["favour", "debt"], default: "favour" },
    day: { type: String, required: true },
    type: { type: String, enum: ["challenge", "review", "dislike", "like"], required: true },
    x: { type: Schema.Types.ObjectId, ref: "User", required: true },
    y: { type: Schema.Types.ObjectId, ref: "User", default: null },
    review: { type: Schema.Types.ObjectId, ref: "Review", default: null },
    filmTitle: { type: String, default: null },
    status: { type: String, enum: ["open", "done", "expired", "cancelled"], default: "open" },
    createdAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
    doneAt: { type: Date, default: null },
    forgiven: { type: Number, default: null },
    undoDislikeAt: { type: Date, default: null },
    dislikeUndone: { type: Boolean, default: false },
});

orcaJobSchema.index({ player: 1, day: 1 });
// Finding the open jobs an action could finish.
orcaJobSchema.index({ status: 1, type: 1, x: 1 });
orcaJobSchema.index({ undoDislikeAt: 1 }, { partialFilterExpression: { dislikeUndone: false } });

module.exports = mongoose.model("OrcaJob", orcaJobSchema);
