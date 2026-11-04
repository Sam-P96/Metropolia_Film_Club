const mongoose = require("mongoose");

const Schema = mongoose.Schema;

// An item a player has put up for sale at a fixed price, on the player
// market (utils/steal/market.js). While it's open, the item is "listed".
const stealMarketSchema = new Schema({
    seller: {type: Schema.Types.ObjectId, ref: "User", required: true},
    item: {type: Schema.Types.ObjectId, ref: "StealItem", required: true},
    key: {type: String, required: true},
    price: {type: Number, required: true, min: 1},
    status: {type: String, enum: ["open", "sold", "cancelled"], default: "open"},
    buyer: {type: Schema.Types.ObjectId, ref: "User", default: null},
    createdAt: {type: Date, default: Date.now},
    closedAt: {type: Date, default: null},
});

stealMarketSchema.index({status: 1, createdAt: -1});
stealMarketSchema.index({item: 1, status: 1});

module.exports = mongoose.model("StealMarket", stealMarketSchema);
