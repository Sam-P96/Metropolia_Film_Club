const mongoose = require("mongoose");

// A film on the Club Wheel (the Club Events page). Its slice is as big as
// its weight; films added before weights existed have none, and count as 1.
const wheelEntrySchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 100 },
    // lowercased title, used to block the same movie being added twice
    titleKey: { type: String, required: true, unique: true },
    weight: { type: Number, default: 1, min: 1 },
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    // Who put weight on it, and how much: a member's weight on the wheel
    // (what their allowance counts) is the sum of theirs here. Moderators
    // setting a film's weight don't change these.
    backers: [
      {
        _id: false,
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        weight: { type: Number },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("WheelEntry", wheelEntrySchema);
