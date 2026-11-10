const mongoose = require("mongoose");

const Schema = mongoose.Schema;

// An item a member bought in the Infinite Gomoku shop (utils/gomokuShop.js):
// a piece, a shockwave, a board or a grid, by its id in
// shared/gomoku/catalogue.js, and what they paid. One of each: the unique
// index is what stops two clicks buying it twice. What they have on is on
// the member (models/userModel.js `gomoku`).
const gomokuOwnedSchema = new Schema({
    user: {type: Schema.Types.ObjectId, ref: "User", required: true},
    item: {type: String, required: true},
    price: {type: Number, required: true},
    boughtAt: {type: Date, default: Date.now},
});

gomokuOwnedSchema.index({user: 1, item: 1}, {unique: true});

module.exports = mongoose.model("GomokuOwned", gomokuOwnedSchema);
