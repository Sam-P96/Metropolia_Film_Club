const mongoose = require("mongoose");

const Schema = mongoose.Schema;

// One of the shop's daily listings (utils/steal/shop.js). Nine go up at
// 12:00 each day (`day`, the Helsinki date) and each can be bought once:
// whoever's first gets it.
const stealListingSchema = new Schema({
    day: {type: String, required: true},
    slot: {type: Number, required: true},
    key: {type: String, required: true},
    soldTo: {type: Schema.Types.ObjectId, ref: "User", default: null},
    soldAt: {type: Date, default: null},
    // What the buyer paid: prices depend on who's buying.
    price: {type: Number, default: null},
    createdAt: {type: Date, default: Date.now},
});

// One listing per slot per day, so two servers making the day's shop at
// once can't make it twice.
stealListingSchema.index({day: 1, slot: 1}, {unique: true});

module.exports = mongoose.model("StealListing", stealListingSchema);
