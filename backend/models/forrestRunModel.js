const mongoose = require("mongoose");

const Schema = mongoose.Schema;

// One run of Forrest Bounce (utils/forrest.js). The server picks its seed as
// it starts (and takes the entry); the page plays it and sends back the
// steps it tapped on; the server plays it again from those
// (shared/forrest/engine.js replay) and keeps what it got: the score is the
// server's, never the page's.
//   playing    started, not back yet (a page closed mid-run stays here:
//              its entry is gone)
//   finished   scored: waiting to be cashed out or thrown away
//   cashed     paid out (one of the day's cash-outs)
//   discarded  thrown away (the cash-out kept), or left when a new run
//              started, or free play (never cashed out)
const forrestRunSchema = new Schema(
    {
        user: { type: Schema.Types.ObjectId, ref: "User", default: null },
        // The play day it started on (12:00 to 12:00 Helsinki).
        day: { type: String, required: true },
        seed: { type: Number, required: true },
        // What it cost (0: free play) and how many times fruit counts.
        cost: { type: Number, required: true },
        mult: { type: Number, required: true },
        free: { type: Boolean, default: false },
        // How the entry was paid: PP first, then P-PP.
        paid: {
            pp: { type: Number, default: 0 },
            ppp: { type: Number, default: 0 },
        },
        status: { type: String, enum: ["playing", "finished", "cashed", "discarded"], default: "playing" },
        startedAt: { type: Date, default: Date.now },
        finishedAt: { type: Date, default: null },
        // From the server's replay: steps played, taps, the score, the fruit
        // points (before the multiplier) and the level reached.
        ticks: { type: Number, default: 0 },
        taps: { type: Number, default: 0 },
        score: { type: Number, default: 0 },
        fruit: { type: Number, default: 0 },
        level: { type: Number, default: 1 },
        endedBy: { type: String, enum: ["hit", "time", "stopped", null], default: null },
        // What a cash-out paid: the entry back in its own coins, the rest in
        // P-PP (less than the entry: split like it).
        payout: {
            pp: { type: Number, default: 0 },
            ppp: { type: Number, default: 0 },
        },
    },
    { timestamps: true }
);

forrestRunSchema.index({ user: 1, status: 1 });
forrestRunSchema.index({ user: 1, startedAt: -1 });

module.exports = mongoose.model("ForrestRun", forrestRunSchema);
