const mongoose = require("mongoose");

const Schema = mongoose.Schema;

// How many Crash rounds a member has played on a play day (12:00 to 12:00
// Helsinki, like the daily PP): `total`, up to the cap for the size of the
// round (shared/crash/rules.js roundsPerDay: 3 alone ... 25 in a full
// room). utils/crash.js claims a play here, atomically, as a round starts,
// so two rounds at once can't both take the last one. (Days from before
// the caps went by size also have a `solo` count, no longer used.)
const crashDaySchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    day: { type: String, required: true },
    total: { type: Number, default: 0 },
});

crashDaySchema.index({ user: 1, day: 1 }, { unique: true });

module.exports = mongoose.model("CrashDay", crashDaySchema);
