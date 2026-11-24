const mongoose = require("mongoose");

const Schema = mongoose.Schema;

// One Ruin Run in Catflix No Chill (utils/catflix/ruinRun.js). The server
// picks its seed as it starts (and takes the bet); the page plays it and
// sends back what the player did; the server plays it again from that
// (public/pet-forge/ruin-engine.js replay) and keeps what it got: the speed
// is the server's, never the page's.
//   playing    started, not back yet (a page closed mid-run stays here
//              until the sweep lets it go: its bet is gone)
//   finished   played: waiting to be cashed out or thrown away
//   cashed     paid out (one of the day's cash-outs)
//   discarded  thrown away (the cash-out kept), or left when a new run
//              started, or free play (never cashed out)
const catflixRunSchema = new Schema(
    {
        user: { type: Schema.Types.ObjectId, ref: "User", default: null },
        // The play day it started on (12:00 to 12:00 Helsinki).
        day: { type: String, required: true },
        seed: { type: Number, required: true },
        // The bet (0: free play), and how it was paid: PP first, then P-PP.
        bet: { type: Number, required: true },
        free: { type: Boolean, default: false },
        paid: {
            pp: { type: Number, default: 0 },
            ppp: { type: Number, default: 0 },
        },
        status: { type: String, enum: ["playing", "finished", "cashed", "discarded"], default: "playing" },
        startedAt: { type: Date, default: Date.now },
        finishedAt: { type: Date, default: null },
        // From the server's replay: ticks played (60 a second), the speed at
        // the end (a percent: 154 is ×1.54), how far it got, and how it ended
        // (crash, trip, fell, brawl, or stopped).
        ticks: { type: Number, default: 0 },
        speed: { type: Number, default: 100 },
        metres: { type: Number, default: 0 },
        endedBy: { type: String, default: null },
        // What it's worth (shared/catflix/rules.js ruinPayout), and what a
        // cash-out paid: the bet back in its own coins, the rest in P-PP
        // (less than the bet: split like it).
        worth: { type: Number, default: 0 },
        payout: {
            pp: { type: Number, default: 0 },
            ppp: { type: Number, default: 0 },
        },
    },
    { timestamps: true }
);

catflixRunSchema.index({ user: 1, status: 1 });
catflixRunSchema.index({ user: 1, startedAt: -1 });
// For the sweep: runs still playing long after they started.
catflixRunSchema.index({ status: 1, startedAt: 1 });

module.exports = mongoose.model("CatflixRun", catflixRunSchema);
