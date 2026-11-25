const mongoose = require("mongoose");

const Schema = mongoose.Schema;

// A Catflix No Chill booster pack an admin (`by`) awarded a member (`user`)
// (utils/catflix/awards.js): from an event page's Reward Mode (`event`, with
// its title as it was then) or from the admin panel (no event). Kept so the
// event page knows who has been awarded for it, and how many times.
const packAwardSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    by: { type: Schema.Types.ObjectId, ref: "User", required: true },
    // A key of shared/catflix/rules.js packs.
    kind: { type: String, required: true },
    event: { type: Schema.Types.ObjectId, ref: "Event", default: null },
    eventTitle: { type: String, default: null },
    at: { type: Date, default: Date.now },
});

// Who's been awarded for an event.
packAwardSchema.index({ event: 1, user: 1 });

module.exports = mongoose.model("PackAward", packAwardSchema);
