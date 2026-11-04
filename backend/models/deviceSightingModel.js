const mongoose = require("mongoose");

const Schema = mongoose.Schema;

// Where a Steal and Defend player was seen: a hash of their IP address and
// of their browser's device id (utils/steal/moderation.js), so two
// accounts on one connection or device can be spotted trading or stealing
// from each other. Only hashes are kept, never the IP itself, and only for
// members with Steal and Defend PvP on. MongoDB deletes each after 90 days.
const KEEP_FOR_DAYS = 90;

const deviceSightingSchema = new Schema({
    user: {type: Schema.Types.ObjectId, ref: "User", required: true},
    ip: {type: String, default: null},
    device: {type: String, default: null},
    at: {type: Date, default: Date.now},
});

deviceSightingSchema.index({user: 1, ip: 1, device: 1}, {unique: true});
deviceSightingSchema.index({ip: 1});
deviceSightingSchema.index({device: 1});
deviceSightingSchema.index({at: 1}, {expireAfterSeconds: KEEP_FOR_DAYS * 24 * 60 * 60});

module.exports = mongoose.model("DeviceSighting", deviceSightingSchema);
