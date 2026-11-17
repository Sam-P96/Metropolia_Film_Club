const mongoose = require("mongoose");

const Schema = mongoose.Schema;

// How many Crash rounds a member has played on a play day (12:00 to 12:00
// Helsinki, like the daily PP): all of them (`total`, up to 6) and the
// "solo" ones (`solo`, up to 3: rounds that started with fewer than 4
// players). utils/crash.js claims a play here, atomically, as a round
// starts, so two rounds at once can't both take the last one.
const crashDaySchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    day: { type: String, required: true },
    solo: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
});

crashDaySchema.index({ user: 1, day: 1 }, { unique: true });

module.exports = mongoose.model("CrashDay", crashDaySchema);
