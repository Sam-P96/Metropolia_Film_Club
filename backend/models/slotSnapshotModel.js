const mongoose = require("mongoose");

const Schema = mongoose.Schema;

// The PP Leaderboard's order as it stood at 12:00 Helsinki time, right after
// the daily payout, kept for that 12:00-to-12:00 day (`_id`, the date it
// starts on, like "2026-11-02"). The Slot Machine ranks players by it all
// day (utils/slots.js), and its daily cash-out cap comes from the richest
// total in it. Everyone is in it, members with no points too, in the
// leaderboard's order: PP and P-PP together, most first, ties A to Z.
const slotSnapshotSchema = new Schema({
    _id: {type: String},
    takenAt: {type: Date, required: true},
    order: {
        type: [
            new Schema(
                {
                    user: {type: Schema.Types.ObjectId, ref: "User", required: true},
                    username: {type: String, required: true},
                    total: {type: Number, required: true},
                },
                {_id: false}
            ),
        ],
        default: [],
    },
    // The richest member's total (0 if nobody has any points).
    richest: {type: Number, required: true},
});

module.exports = mongoose.model("SlotSnapshot", slotSnapshotSchema);
