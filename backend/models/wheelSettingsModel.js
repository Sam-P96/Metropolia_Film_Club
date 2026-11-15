const mongoose = require("mongoose");

// The Club Wheel's settings: one document, with the _id "club". Until an
// admin first changes something it doesn't exist, and the defaults apply.
const wheelSettingsSchema = new mongoose.Schema(
    {
        _id: { type: String },
        // Open: every logged-in member can add films, not only moderators
        // and admins.
        open: { type: Boolean, default: false },
        // How much weight each member can put on the wheel in all, spread
        // over one film or several. null: no limit.
        memberWeight: { type: Number, default: 1, min: 1 },
    },
    { timestamps: true }
);

module.exports = mongoose.model("WheelSettings", wheelSettingsSchema);
