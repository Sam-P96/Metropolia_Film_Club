const mongoose = require("mongoose");

const Schema = mongoose.Schema;

// One round: both throws ("rock", "paper" or "scissors"), how it went for
// the player ("win", "draw" or "loss"), and whether the server threw for
// them because their time ran out (`auto`).
const roundSchema = new Schema(
    {
        playerThrow: {type: String, required: true},
        houseThrow: {type: String, required: true},
        result: {type: String, enum: ["win", "draw", "loss"], required: true},
        auto: {type: Boolean, default: false},
    },
    {_id: false}
);

// One game of Double or Nothing (utils/double.js plays it). The bet is
// taken when it starts. `outcome` once it's finished: "win" (paid `payout`,
// plus `bonusWon` if the bonus pot came with it), "ban" (the Ban List) or
// "wait" (the Waiting List). `newBet` is the pot's bet straight after.
const doubleGameSchema = new Schema(
    {
        userId: {type: Schema.Types.ObjectId, ref: "User", required: true},
        bet: {type: Number, required: true},
        // The week's seed when it was played, which decides the bonus pot.
        seed: {type: Number, required: true},
        rounds: {type: [roundSchema], default: []},
        status: {type: String, enum: ["in_progress", "finished"], default: "in_progress"},
        outcome: {type: String, enum: ["win", "ban", "wait", null], default: null},
        payout: {type: Number, default: 0},
        bonusWon: {type: Number, default: 0},
        newBet: {type: Number, default: null},
        // When the throw for the round being played is due.
        roundDeadline: {type: Date, required: true},
        finishedAt: {type: Date, default: null},
    },
    {timestamps: {createdAt: true, updatedAt: false}}
);

// The recent plays feed, and a member's own game.
doubleGameSchema.index({status: 1, finishedAt: -1});
doubleGameSchema.index({userId: 1, status: 1});

module.exports = mongoose.model("DoubleGame", doubleGameSchema);
