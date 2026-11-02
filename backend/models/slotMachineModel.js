const mongoose = require("mongoose");

const Schema = mongoose.Schema;

// A member's Slot Machine (utils/slots.js): the credits in it, kept on the
// server so they survive a refresh, a closed tab or another device. Every
// amount is in hundredths of a point (cents), as whole numbers.
//   pp, ppp       the two sub-balances. Bets take PP first, then P-PP; wins
//                 are always P-PP. The page only ever sees their sum.
//   sessionInput  credits added since the machine last went from empty to
//                 holding something (0: no session). Once the machine holds
//                 3 times this, everyone hears about it, once (`tripled`).
//   capDay        the 12:00-to-12:00 Helsinki day the two counts below are
//                 for: P-PP added from the wallet, and P-PP cashed out.
//                 They make the daily cash-out cap.
//   lastWin       the last spin's win, for the "Win" readout.
//   version       goes up with every change, so a change only lands on the
//                 machine as it was read.
const slotMachineSchema = new Schema(
    {
        user: {type: Schema.Types.ObjectId, ref: "User", required: true, unique: true},
        pp: {type: Number, default: 0, min: 0},
        ppp: {type: Number, default: 0, min: 0},
        sessionInput: {type: Number, default: 0, min: 0},
        tripled: {type: Boolean, default: false},
        capDay: {type: String, default: null},
        pppAddedToday: {type: Number, default: 0, min: 0},
        pppOutToday: {type: Number, default: 0, min: 0},
        lastWin: {type: Number, default: 0, min: 0},
        version: {type: Number, default: 0},
    },
    {timestamps: true}
);

module.exports = mongoose.model("SlotMachine", slotMachineSchema);
