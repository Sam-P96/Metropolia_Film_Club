const mongoose = require("mongoose");

const Schema = mongoose.Schema;

// A favour Lord Gang Orca asks of `player` (utils/orca/jobs.js), four a day
// while their favour mode is on:
//   challenge  get `x` to challenge `y` to Farkle or Gomoku and finish it
//   review     get `x` to post a review
//   dislike    get `x` to dislike `y`'s `review` (it comes off again at
//              `undoDislikeAt`, 48 hours later)
//   like       get `x` to like `y`'s `review` (it stays)
// It only counts if it happens after the job was made and before
// `expiresAt` (the next 00:00, Helsinki).
//   status  open; done; expired (00:00 came first); cancelled (favour mode
//           ended with it still open)
const orcaJobSchema = new Schema({
    player: { type: Schema.Types.ObjectId, ref: "User", required: true },
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
    undoDislikeAt: { type: Date, default: null },
    dislikeUndone: { type: Boolean, default: false },
});

orcaJobSchema.index({ player: 1, day: 1 });
// Finding the open jobs an action could finish.
orcaJobSchema.index({ status: 1, type: 1, x: 1 });
orcaJobSchema.index({ undoDislikeAt: 1 }, { partialFilterExpression: { dislikeUndone: false } });

module.exports = mongoose.model("OrcaJob", orcaJobSchema);
