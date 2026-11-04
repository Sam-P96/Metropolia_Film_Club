const mongoose = require("mongoose");

const Schema = mongoose.Schema;

// An admin's ban from Steal and Defend's moderation (utils/steal/moderation.js):
// what from (`scopes`, keys of STEAL.banScopes in shared/steal/config.js),
// until when (null: for good), and why. It's lifted by an admin's Unban,
// or ends by itself at `until`. The Ban Hammer's on/off bans
// (utils/bans.js) are separate.
//   steal  attacking in Steal and Defend
//   buy    buying items (the shop and the player market)
//   trade  the player market, trade offers and gifts
//   games  every game on the site
//   site   the whole site: they can't use their login
const gameBanSchema = new Schema({
    user: {type: Schema.Types.ObjectId, ref: "User", required: true},
    scopes: {type: [{type: String, enum: ["steal", "buy", "trade", "games", "site"]}], required: true},
    until: {type: Date, default: null},
    reason: {type: String, required: true, trim: true, maxlength: 1000},
    by: {type: Schema.Types.ObjectId, ref: "User", required: true},
    createdAt: {type: Date, default: Date.now},
    liftedAt: {type: Date, default: null},
    liftedBy: {type: Schema.Types.ObjectId, ref: "User", default: null},
});

gameBanSchema.index({user: 1, liftedAt: 1});
gameBanSchema.index({liftedAt: 1, createdAt: -1});

module.exports = mongoose.model("GameBan", gameBanSchema);
