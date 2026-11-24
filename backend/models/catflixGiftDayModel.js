const mongoose = require("mongoose");

const Schema = mongoose.Schema;

// The play days (12:00 to 12:00 Helsinki) whose round of friends' cats
// stealing for the friends they love has been done (utils/catflix/gifts.js):
// the first server to make the day's row does the round, once.
const catflixGiftDaySchema = new Schema({
    _id: { type: String },
    at: { type: Date, default: Date.now },
});

module.exports = mongoose.model("CatflixGiftDay", catflixGiftDaySchema);
