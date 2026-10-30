const mongoose = require("mongoose");
const { WINNING_SCORES } = require("../../shared/farkle/rules.js");

const Schema = mongoose.Schema;

// One seat at the table. Seat 0 rolls first; against the bot, the bot sits
// there, because the bot always rolls first.
const playerSchema = new Schema(
    {
        // null for the bot.
        user: {type: Schema.Types.ObjectId, ref: "User", default: null},
        // What their stake took from their wallet, so it can be handed back
        // exactly if the game never gets going (jobs/farkleSweep.js).
        paid: {
            pp: {type: Number, default: 0},
            ppp: {type: Number, default: 0},
        },
    },
    {_id: false}
);

// One roll and what was done with it. `keep` are indexes into `dice`, and
// `then` is "roll" (rolled the rest), "bank" or "farkle".
const stepSchema = new Schema(
    {
        dice: [Number],
        keep: [Number],
        points: {type: Number, default: 0},
        then: {type: String, default: null},
    },
    {_id: false}
);

// A finished turn, kept so the game page can replay one it didn't watch,
// like the bot's. `result` is "bank", "farkle" or "win", and `points` what
// it banked.
const turnSchema = new Schema(
    {
        number: Number,
        seat: Number,
        steps: [stepSchema],
        result: String,
        points: Number,
    },
    {_id: false}
);

// A line in the match log: who (a seat) and what, like "Banked 350".
const logSchema = new Schema({number: Number, seat: Number, text: String}, {_id: false});

// One game of Farkle. games/farkle/engine.js plays it and utils/farkle.js
// saves it and pays the winner.
//   starting  just made, the stake not taken yet: nobody can move
//   active    being played
//   over      `winner` (a seat) won: by banking, or because the other
//             player gave up or ran out of time (`endedBy`)
// `version` goes up by one on every change. A move has to say which
// version it was made on and is refused if the game has moved on since,
// so a double tap can't roll twice.
const farkleMatchSchema = new Schema(
    {
        mode: {type: String, enum: ["bot", "pvp"], required: true},
        status: {type: String, enum: ["starting", "active", "over"], default: "starting"},
        players: {type: [playerSchema], required: true},
        target: {type: Number, enum: WINNING_SCORES, required: true},
        stake: {type: Number, required: true, min: 1},
        // What the winner is paid, in P-PP.
        prize: {type: Number, required: true},

        // The game itself, exactly as engine.js leaves it.
        scores: {type: [Number], default: [0, 0]},
        current: {type: Number, default: 0}, // the seat whose turn it is
        turn: {type: Number, default: 1}, // counts up from 1
        phase: {type: String, enum: ["ready", "choosing"], default: "ready"},
        dice: {type: [Number], default: []},
        kept: {type: [Number], default: []},
        turnPoints: {type: Number, default: 0},
        hotDice: {type: Boolean, default: false},
        steps: {type: [stepSchema], default: []}, // this turn's rolls so far
        lastTurns: {type: [turnSchema], default: []},
        log: {type: [logSchema], default: []},
        logCount: {type: Number, default: 0},
        winner: {type: Number, default: null},
        endedBy: {type: String, enum: ["bank", "resign", "forfeit", null], default: null},

        version: {type: Number, default: 0},
        // Three days after this without a move, the player whose turn it is
        // loses (utils/farkle.js).
        lastMoveAt: {type: Date, default: Date.now},
        endedAt: {type: Date, default: null},
        // Whether the winner has been paid.
        settled: {type: Boolean, default: false},

        // The member's id while their game against the bot is open, missing
        // otherwise. It's unique, so the database itself stops anyone having
        // two going at once, even if they tap Start twice.
        openBotFor: {type: Schema.Types.ObjectId, ref: "User"},
    },
    {timestamps: true}
);

farkleMatchSchema.index({openBotFor: 1}, {unique: true, sparse: true});
farkleMatchSchema.index({"players.user": 1, status: 1});
// For the sweep: games gone quiet, and games stuck starting or unpaid.
farkleMatchSchema.index({status: 1, lastMoveAt: 1});

module.exports = mongoose.model("FarkleMatch", farkleMatchSchema);
