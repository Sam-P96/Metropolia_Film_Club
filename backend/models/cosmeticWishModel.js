const mongoose = require("mongoose");

const Schema = mongoose.Schema;

// A heart on a Black Market item (utils/blackMarket.js): the member's
// wishlist, and how the shop's "Popular" sort counts popularity (hearts per
// item). `item` is its id in shared/cosmetics/catalogue.js. Owned or not,
// a heart stays until they take it off. One each, hence the unique index.
const cosmeticWishSchema = new Schema({
    user: {type: Schema.Types.ObjectId, ref: "User", required: true},
    item: {type: String, required: true},
    at: {type: Date, default: Date.now},
});

cosmeticWishSchema.index({user: 1, item: 1}, {unique: true});
cosmeticWishSchema.index({item: 1});

module.exports = mongoose.model("CosmeticWish", cosmeticWishSchema);
