const mongoose = require("mongoose");

const Schema = mongoose.Schema;

// A member's Ruin Run cash-outs on a play day (12:00 to 12:00 Helsinki), up
// to shared/catflix/rules.js ruinRun.cashOutsPerDay. utils/catflix/ruinRun.js
// claims one here atomically as a run is cashed out, so two at once can't
// both take the last one.
const catflixRunDaySchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    day: { type: String, required: true },
    cashOuts: { type: Number, default: 0 },
});

catflixRunDaySchema.index({ user: 1, day: 1 }, { unique: true });

module.exports = mongoose.model("CatflixRunDay", catflixRunDaySchema);
