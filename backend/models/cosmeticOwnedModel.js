const mongoose = require("mongoose");

const Schema = mongoose.Schema;

// A cosmetic a member bought at the Black Market (utils/blackMarket.js),
// theirs for good: no refunds, no selling back, no trading, no gifting.
// `item` is its id in shared/cosmetics/catalogue.js, `price` what they paid
// in P-PP (burned). One each: the unique index stops a double click buying
// it twice.
const cosmeticOwnedSchema = new Schema({
    user: {type: Schema.Types.ObjectId, ref: "User", required: true},
    item: {type: String, required: true},
    price: {type: Number, required: true},
    boughtAt: {type: Date, default: Date.now},
});

cosmeticOwnedSchema.index({user: 1, item: 1}, {unique: true});

module.exports = mongoose.model("CosmeticOwned", cosmeticOwnedSchema);
