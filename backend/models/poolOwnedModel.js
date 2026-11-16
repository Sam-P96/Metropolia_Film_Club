const mongoose = require("mongoose");

const Schema = mongoose.Schema;

// A cue or an Ignition a member bought in 8 Ball Pool's shop
// (utils/poolShop.js), by its id in shared/pool/cues.js or ignitions.js,
// and what they paid. One of each: the unique
// index is what stops two clicks buying it twice. What they use is on the
// member (models/userModel.js `pool`).
const poolOwnedSchema = new Schema({
    user: {type: Schema.Types.ObjectId, ref: "User", required: true},
    item: {type: String, required: true},
    price: {type: Number, required: true},
    boughtAt: {type: Date, default: Date.now},
});

poolOwnedSchema.index({user: 1, item: 1}, {unique: true});

module.exports = mongoose.model("PoolOwned", poolOwnedSchema);
