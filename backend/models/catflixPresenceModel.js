const mongoose = require("mongoose");

const Schema = mongoose.Schema;

// A member on a Play Date in another member's pet room, right now
// (utils/catflix/visits.js): `visitor` is in `host`'s room (a pet), last
// heard from at `seenAt`. Their page says so every few seconds while
// they're in the room; the owner's pet room shows the visitor's cat while
// it's fresh. Gone by itself a few minutes after the last word.
const catflixPresenceSchema = new Schema({
    host: { type: Schema.Types.ObjectId, ref: "CatflixPet", required: true },
    visitor: { type: Schema.Types.ObjectId, ref: "User", required: true },
    seenAt: { type: Date, required: true },
});

catflixPresenceSchema.index({ host: 1, visitor: 1 }, { unique: true });
catflixPresenceSchema.index({ visitor: 1 });
catflixPresenceSchema.index({ seenAt: 1 }, { expireAfterSeconds: 300 });

module.exports = mongoose.model("CatflixPresence", catflixPresenceSchema);
