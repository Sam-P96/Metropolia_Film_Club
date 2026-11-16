const mongoose = require("mongoose");

const Schema = mongoose.Schema;

// A cue a member bought in 8 Ball Pool's shop (utils/poolShop.js), by its
// id in shared/pool/cues.js, and what they paid. One of each: the unique
// index is what stops two clicks buying it twice. The cue they use is on
// the member (models/userModel.js `pool.cue`).
const poolCueOwnedSchema = new Schema({
    user: {type: Schema.Types.ObjectId, ref: "User", required: true},
    item: {type: String, required: true},
    price: {type: Number, required: true},
    boughtAt: {type: Date, default: Date.now},
});

poolCueOwnedSchema.index({user: 1, item: 1}, {unique: true});

module.exports = mongoose.model("PoolCueOwned", poolCueOwnedSchema);
