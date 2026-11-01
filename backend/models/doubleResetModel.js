const mongoose = require("mongoose");

const Schema = mongoose.Schema;

// One Monday reset of Double or Nothing, for the recent plays feed: what
// was left in the pot (`lost`), how much went to the bonus pot and how much
// was burned, and the new week's seed.
const doubleResetSchema = new Schema({
    at: {type: Date, default: Date.now},
    lost: {type: Number, required: true},
    toBonus: {type: Number, required: true},
    burned: {type: Number, required: true},
    seed: {type: Number, required: true},
});

doubleResetSchema.index({at: -1});

module.exports = mongoose.model("DoubleReset", doubleResetSchema);
