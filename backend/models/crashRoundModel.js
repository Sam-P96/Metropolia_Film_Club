const mongoose = require("mongoose");

const Schema = mongoose.Schema;

// One round of Crash (games/crash/rooms.js), kept for replays and auditing.
// Saved when it starts (bets taken, status "playing") and again when it
// ends, with the whole path. A round the server stopped in the middle of
// (a restart) is put right when it starts up again (utils/crash.js
// recoverRounds): bets still riding are handed back, and it's "void".
const crashPlayerSchema = new Schema(
    {
        user: { type: Schema.Types.ObjectId, ref: "User", default: null },
        bet: { type: Number, required: true },
        // How the bet was paid: PP first, then P-PP.
        paid: {
            pp: { type: Number, default: 0 },
            ppp: { type: Number, default: 0 },
        },
        // Their auto-cash-out target, or null.
        autoAt: { type: Number, default: null },
        // Where they cashed out (null: they rode it to a crash), on which
        // tick, and whether the server did it for them (a target, the cap or
        // the time limit).
        cashedAt: { type: Number, default: null },
        cashedTick: { type: Number, default: null },
        auto: { type: Boolean, default: false },
        // What came back: the stake in its own coins, profit in P-PP.
        payout: {
            pp: { type: Number, default: 0 },
            ppp: { type: Number, default: 0 },
        },
    },
    { _id: false }
);

const crashRoundSchema = new Schema(
    {
        // The room it was played in ("solo" rounds played alone have a room
        // of their own, `private`).
        room: { type: String, required: true },
        private: { type: Boolean, default: false },
        // "solo" (played alone), "group" (2 to 4 players) or "protected" (a
        // full room of 5: half of every loss back). "bonus" was a room of 4
        // under the old daily plays.
        kind: { type: String, enum: ["solo", "group", "protected", "bonus"], required: true },
        // The play day it counts towards (12:00 to 12:00 Helsinki).
        day: { type: String, required: true },
        status: { type: String, enum: ["playing", "over", "void"], default: "playing" },
        players: { type: [crashPlayerSchema], default: [] },
        // Every tick's multiplier, from the start (0.99): the round itself.
        path: { type: [Number], default: [] },
        ticks: { type: Number, default: 0 },
        endedBy: { type: String, enum: ["crash", "cap", "time", "void", null], default: null },
        startedAt: { type: Date, default: Date.now },
        endedAt: { type: Date, default: null },
    },
    { timestamps: true }
);

crashRoundSchema.index({ status: 1 });
crashRoundSchema.index({ "players.user": 1, startedAt: -1 });

module.exports = mongoose.model("CrashRound", crashRoundSchema);
