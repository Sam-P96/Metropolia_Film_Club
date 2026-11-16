const mongoose = require("mongoose");

const Schema = mongoose.Schema;

// One Slot Machine spin, kept so the real RTP can be checked later, and so
// a spin sent twice (the same `spinId`, made by the page) is only played
// once: the second gets the first's result. Amounts in cents.
//
// `rtpBucket` is the player's luck (the weight table used, as a whole
// percentage: games/slots/luck.js). It's for checking the RTP only and is
// never sent to the page. Neither are `lastChanceDay` (the Slot Machine
// day of a spin that got the last chance: an empty wallet and a MAX bet,
// luck.js LAST_CHANCE) and `lastChanceWon` (whether it was made to win).
const slotSpinSchema = new Schema({
    user: {type: Schema.Types.ObjectId, ref: "User", required: true},
    spinId: {type: String, required: true},
    bet: {type: Number, required: true},
    // grid[reel][row], each a symbol key from shared/slots/config.js.
    grid: {type: [[String]], required: true},
    lines: {
        type: [
            new Schema(
                {
                    line: Number,
                    // What it paid as (a Gauntlet link pays as Maps or Rings).
                    symbol: String,
                    count: Number,
                    multiplier: Number,
                    cells: [[Number]],
                    // "fireworks", "lightning" or null; "CRITICAL HIT!",
                    // "INFINITY" or null; and the Gauntlet cells among `cells`.
                    effect: {type: String, default: null},
                    text: {type: String, default: null},
                    gauntlets: {type: [[Number]], default: []},
                },
                {_id: false}
            ),
        ],
        default: [],
    },
    win: {type: Number, required: true},
    jackpot: {type: Boolean, default: false},
    // The machine right after: its two sub-balances.
    balance: {
        pp: {type: Number, required: true},
        ppp: {type: Number, required: true},
    },
    rtpBucket: {type: Number, required: true},
    lastChanceDay: {type: String, default: undefined},
    lastChanceWon: {type: Boolean, default: undefined},
    at: {type: Date, default: Date.now},
});

slotSpinSchema.index({user: 1, spinId: 1}, {unique: true});
slotSpinSchema.index({at: -1});

// Counting a player's last chances today.
slotSpinSchema.index({user: 1, lastChanceDay: 1}, {partialFilterExpression: {lastChanceDay: {$type: "string"}}});

module.exports = mongoose.model("SlotSpin", slotSpinSchema);
