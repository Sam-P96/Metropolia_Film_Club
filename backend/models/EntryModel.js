const mongoose = require("mongoose");

const wheelEntrySchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 100 },
    // lowercased title, used to block the same movie being added twice
    titleKey: { type: String, required: true, unique: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("WheelEntry", wheelEntrySchema);