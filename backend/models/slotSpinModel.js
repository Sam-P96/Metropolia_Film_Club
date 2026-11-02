const mongoose = require("mongoose");

const Schema = mongoose.Schema;

// One Slot Machine spin, kept so the real RTP can be checked later, and so
// a spin sent twice (the same `spinId`, made by the page) is only played
// once: the second gets the first's result. Amounts in cents.
//
// `rtpBucket` is the player's luck (the weight table used, as a whole
// percentage: games/slots/luck.js). It's for checking the RTP only and is
// never sent to the page.
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
                    symbol: String,
                    count: Number,
                    multiplier: Number,
                    cells: [[Number]],
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
    at: {type: Date, default: Date.now},
});

slotSpinSchema.index({user: 1, spinId: 1}, {unique: true});
slotSpinSchema.index({at: -1});

module.exports = mongoose.model("SlotSpin", slotSpinSchema);
