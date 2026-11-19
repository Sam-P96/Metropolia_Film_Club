const mongoose = require("mongoose");

const Schema = mongoose.Schema;

// Box Office Scratch's Golden Rush (games/happyHours.js): one document,
// "scratch", made the first time a card bought in it wins its jackpot.
// `wonAt` is when the last one did: the rush is off for 14 days from then
// (utils/scratch.js goldenOdds). `card` and `ticketType` are the card that
// won it and its type. Never shown on any page.
const goldenRushSchema = new Schema({
    _id: {type: String},
    wonAt: {type: Date, default: null},
    card: {type: Schema.Types.ObjectId, ref: "ScratchCard", default: null},
    ticketType: {type: String, default: null},
});

module.exports = mongoose.model("GoldenRush", goldenRushSchema);
