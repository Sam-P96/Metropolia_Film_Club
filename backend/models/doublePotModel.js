const mongoose = require("mongoose");

const Schema = mongoose.Schema;

// Double or Nothing's pot: one for the whole site, always the document with
// _id "current" (utils/double.js). Every change adds 1 to `version`, and a
// game can only start on the version it read with nobody playing, so two
// members pressing Start at once can't both get the pot.
const doublePotSchema = new Schema({
    _id: {type: String},
    // The bet to play right now: the week's seed, doubling after every game
    // that isn't won.
    currentBet: {type: Number, required: true},
    // This week's starting bet, fixed at the Monday reset.
    seed: {type: Number, required: true},
    // Every bet sitting in the pot (games that weren't won since the last
    // win or reset): what the Monday reset splits.
    totalLost: {type: Number, default: 0},
    // Grows from Monday resets (up to the cap in shared/double/config.js),
    // and only empties when someone wins it.
    bonusPot: {type: Number, default: 0},
    // Members who lost a round this pot: out until someone wins or Monday.
    banList: {type: [{type: Schema.Types.ObjectId, ref: "User"}], default: []},
    // At most one member, sitting out one turn after two draws.
    waitingUserId: {type: Schema.Types.ObjectId, ref: "User", default: null},
    // The game being played right now, which locks the pot to its player.
    activeGameId: {type: Schema.Types.ObjectId, ref: "DoubleGame", default: null},
    // The Monday 12:00 this week started at.
    weekStart: {type: Date, required: true},
    version: {type: Number, default: 0},
});

module.exports = mongoose.model("DoublePot", doublePotSchema);
