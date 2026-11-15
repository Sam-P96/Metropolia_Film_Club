const mongoose = require("mongoose");

// The Club Wheel's public activity box: "Sam added Dune", "Sam cleared the
// wheel". Kept for 90 days.
const ACTIONS = ["add", "back", "weight", "remove", "clear", "open", "close", "memberWeight"];

const wheelActivitySchema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        action: { type: String, enum: ACTIONS, required: true },
        // The film, for add, back, weight and remove.
        title: { type: String },
        // add and back: the weight added. weight: the film's new weight.
        // memberWeight: the new allowance (null: no limit).
        weight: { type: Number },
    },
    { timestamps: true }
);

wheelActivitySchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

module.exports = mongoose.model("WheelActivity", wheelActivitySchema);
module.exports.ACTIONS = ACTIONS;
