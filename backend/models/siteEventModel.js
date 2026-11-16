const mongoose = require("mongoose");

// A calendar event that has been announced (utils/siteEvents.js): its key
// ("blackFriday-2026-11-27", "doublePrizes-2026-11-21") as the _id, so
// everyone's notification for it is only ever sent once, however often the
// check runs or the server restarts.
const siteEventSchema = new mongoose.Schema({
    _id: { type: String },
    type: { type: String, required: true },
    at: { type: Date, default: Date.now },
});

module.exports = mongoose.model("SiteEvent", siteEventSchema);
