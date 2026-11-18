const mongoose = require("mongoose");

const Schema = mongoose.Schema;

// A member's dealings with Lord Gang Orca (utils/orca/): their begs today,
// the secret favour threshold and how close they are, favour mode, a
// question waiting on an answer, and the lines to show next time they
// visit. Made the first time they visit.
const orcaPlayerSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },

    // Begs on `day` (a Helsinki date, "2026-11-17"; the count resets at
    // 00:00), and the last one, for the hour's cooldown.
    day: { type: String, default: null },
    begs: { type: Number, default: 0 },
    lastBegAt: { type: Date, default: null },

    // The secret threshold (750 to 1050, % of daily PP) and what's built up
    // towards it (+50 a beg: each beg's share of daily PP, as a %). Never
    // sent to the page.
    threshold: { type: Number, required: true },
    built: { type: Number, default: 0 },

    // Favour mode: on until `done` reaches 3 (done jobs count across days).
    // `jobsDay`: the day the current jobs were dealt for.
    favour: {
        on: { type: Boolean, default: false },
        startedAt: { type: Date, default: null },
        done: { type: Number, default: 0 },
        jobsDay: { type: String, default: null },
    },

    // A question asked and not yet answered: which one, its options in the
    // order shown, and the PP the beg is worth. Asked again until answered.
    question: {
        type: new Schema({ index: Number, options: [String], amount: Number, askedAt: Date }, { _id: false }),
        default: null,
    },
    // The last question asked, so the next is a different one.
    lastQuestion: { type: Number, default: null },

    // The last thing he said to them, so he doesn't say it twice in a row.
    lastLine: { type: String, default: null },

    // Lines waiting for their next visit: "jobDone", "allDone".
    news: { type: [String], default: [] },

    // Admins' testing tools (utils/orca/player.js debug): the next beg is a
    // question; a pretend Helsinki weekday (0 to 6) and hour for the
    // opening hours, and when it was set (it lasts two hours:
    // config/lordGangOrca.js testClockMs).
    forceQuestion: { type: Boolean, default: false },
    fakeClock: {
        type: new Schema({ weekday: Number, hour: Number, setAt: Date }, { _id: false }),
        default: null,
    },
});

module.exports = mongoose.model("OrcaPlayer", orcaPlayerSchema);
