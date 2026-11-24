const mongoose = require("mongoose");

const Schema = mongoose.Schema;

// Catflix No Chill's once-an-hour limits (utils/catflix/pets.js claimAction):
// each player can do each action (Play, Pet, Bully, and each kind of care on
// a Play Date) to each pet once until `until`. One row per player, pet and
// action, reused; rows long past are swept away by MongoDB.
const catflixActionSchema = new Schema({
    actor: { type: Schema.Types.ObjectId, ref: "User", required: true },
    pet: { type: Schema.Types.ObjectId, ref: "CatflixPet", required: true },
    action: { type: String, required: true },
    until: { type: Date, required: true },
});

catflixActionSchema.index({ actor: 1, pet: 1, action: 1 }, { unique: true });
// A day after it ran out, nobody needs it.
catflixActionSchema.index({ until: 1 }, { expireAfterSeconds: 24 * 60 * 60 });

module.exports = mongoose.model("CatflixAction", catflixActionSchema);
