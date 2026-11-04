const mongoose = require("mongoose");

const Schema = mongoose.Schema;

// A member sitting at the Kino Poker table (utils/pokerWallet.js): what
// their buy-in took from their wallet (`funds`, PP and P-PP), and their
// chips as of the end of the last hand. The table itself lives in the
// server's memory; this is only so a restart can give the chips back.
const pokerSeatSchema = new Schema({
    _id: {type: Schema.Types.ObjectId, ref: "User"},
    funds: {pp: {type: Number, default: 0}, ppp: {type: Number, default: 0}},
    stack: {type: Number, default: 0},
    at: {type: Date, default: Date.now},
});

module.exports = mongoose.model("PokerSeat", pokerSeatSchema);
