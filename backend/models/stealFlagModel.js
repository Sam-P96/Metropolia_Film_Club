const mongoose = require("mongoose");

const Schema = mongoose.Schema;

// Something suspicious Steal and Defend spotted, for admins
// (utils/steal/moderation.js). One open flag per kind and set of members:
// it counts up instead of piling up.
//   alt        two accounts sharing an IP or device traded or stole from each other
//   collusion  the same two stealing from each other 3+ times in 30 days
//   debt       an account going into debt from failed attacks 3+ times in 30 days
//   refund     2+ PvP opt-out takebacks in 30 days
//   trade      a trade at an extreme price
const stealFlagSchema = new Schema({
    kind: {type: String, enum: ["alt", "collusion", "debt", "refund", "trade"], required: true},
    users: {type: [{type: Schema.Types.ObjectId, ref: "User"}], required: true},
    // kind + users, to find the open flag to add to.
    key: {type: String, required: true},
    details: {type: String, default: ""},
    count: {type: Number, default: 1},
    status: {type: String, enum: ["open", "dismissed"], default: "open"},
    firstAt: {type: Date, default: Date.now},
    lastAt: {type: Date, default: Date.now},
    dismissedBy: {type: Schema.Types.ObjectId, ref: "User", default: null},
});

stealFlagSchema.index({key: 1, status: 1});
stealFlagSchema.index({status: 1, lastAt: -1});

module.exports = mongoose.model("StealFlag", stealFlagSchema);
