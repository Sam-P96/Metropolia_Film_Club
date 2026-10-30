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

// One game of Farkle, against the bot or another member. games/farkle/
// engine.js plays it, utils/farkle.js saves it and pays the winner.
//   challenge  between members: terms offered (`offer`), waiting on an
//              answer. Nothing is taken from anyone yet.
//   declined   ...turned down
//   expired    ...not answered within three days
//   withdrawn  ...taken back by whoever sent it (or they left the club)
//   starting   accepted, the stakes being taken: nobody can move
//   active     being played
//   over       `winner` (a seat) won: by banking, or because the other
//              player gave up, ran out of time or left (`endedBy`)
// `version` goes up by one on every change. A move or an answer has to say
// which version it was made on and is refused if the game has moved on
// since, so a double tap can't roll twice or accept twice.
const farkleMatchSchema = new Schema(
    {
        mode: {type: String, enum: ["bot", "pvp"], required: true},
        status: {
            type: String,
            enum: ["challenge", "declined", "expired", "withdrawn", "starting", "active", "over"],
            default: "starting",
        },
        players: {type: [playerSchema], required: true},
        // While it's a challenge, the terms on the table; once accepted,
        // the terms played for.
        target: {type: Number, enum: WINNING_SCORES, required: true},
        stake: {type: Number, required: true, min: 1},
        // What the winner is paid, in P-PP.
        prize: {type: Number, required: true},

        // A challenge: who offered the current terms, to whom, and when.
        // A counter swaps `by` and `to`. Whoever accepts rolls first.
        offer: {
            by: {type: Schema.Types.ObjectId, ref: "User", default: null},
            to: {type: Schema.Types.ObjectId, ref: "User", default: null},
            at: {type: Date, default: null},
        },
        counters: {type: Number, default: 0},
        // When the terms on the table run out if nobody answers.
        expiresAt: {type: Date, default: null},

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
        endedBy: {type: String, enum: ["bank", "resign", "forfeit", "left", null], default: null},

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

        // The two members' ids, sorted and joined ("a:b"), while their
        // challenge or game is open, missing otherwise. Unique for the same
        // reason as openBotFor: two members can only have one challenge or
        // game going with each other at a time (but any number with others).
        pairKey: {type: String},
    },
    {timestamps: true}
);

farkleMatchSchema.index({openBotFor: 1}, {unique: true, sparse: true});
farkleMatchSchema.index({pairKey: 1}, {unique: true, sparse: true});
farkleMatchSchema.index({"players.user": 1, status: 1});
// For the sweep: games gone quiet, challenges gone unanswered, and games
// stuck starting or unpaid.
farkleMatchSchema.index({status: 1, lastMoveAt: 1});
farkleMatchSchema.index({status: 1, expiresAt: 1});

module.exports = mongoose.model("FarkleMatch", farkleMatchSchema);
