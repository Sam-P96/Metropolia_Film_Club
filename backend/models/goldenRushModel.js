const mongoose = require("mongoose");

const Schema = mongoose.Schema;

// A Golden Rush window that has started (games/happyHours.js), saved the
// first time the server sees it, so whether anyone's told about it is
// decided once (utils/scratch.js goldenRushNotice). Its id is when it
// starts, as an ISO date. `pools`: the jackpots of the tickets on sale as
// it started; `notified`: the member told, or null if no jackpot was past
// its line (or there was nobody to tell).
//
// The one document from before the windows moved about ("scratch", with
// `wonAt`) is left as it was and never read.
const goldenRushSchema = new Schema({
    _id: { type: String },
    from: { type: Date },
    to: { type: Date },
    pools: { type: Schema.Types.Mixed, default: null },
    notified: { type: Schema.Types.ObjectId, ref: "User", default: null },
    at: { type: Date, default: Date.now },
});

module.exports = mongoose.model("GoldenRush", goldenRushSchema);
