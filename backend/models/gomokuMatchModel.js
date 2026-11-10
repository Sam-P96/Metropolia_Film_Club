const mongoose = require("mongoose");
const { BOARD_SIZES } = require("../../shared/gomoku/rules.js");

const Schema = mongoose.Schema;

// One seat at the board. Seat 0 moves first: whoever accepted the
// challenge (so the challenger moves second, as in Farkle).
const playerSchema = new Schema(
    {
        user: {type: Schema.Types.ObjectId, ref: "User", default: null},
        // What their stake took from their wallet, so it can be handed back
        // exactly if the game never gets going or ends in a draw.
        paid: {
            pp: {type: Number, default: 0},
            ppp: {type: Number, default: 0},
        },
        // How many moves of the game they've seen. When they open the game
        // and the other player has moved since, that move lands again in
        // front of them, shockwave and all.
        seen: {type: Number, default: 0},
    },
    {_id: false}
);

// One stone put down: where, whose (a seat) and when.
const moveSchema = new Schema(
    {
        x: {type: Number, required: true},
        y: {type: Number, required: true},
        seat: {type: Number, required: true},
        at: {type: Date, default: Date.now},
    },
    {_id: false}
);

// One game of Infinite Gomoku between two members. games/gomoku/engine.js
// plays it; utils/gomoku.js saves it, pays the winner and ends games and
// challenges nobody is answering any more.
//   challenge  terms offered (`offer`), waiting on an answer. Nothing is
//              taken from anyone yet.
//   declined   ...turned down
//   expired    ...not answered within three days
//   withdrawn  ...taken back by whoever sent it (or they left the club)
//   starting   accepted, the stakes being taken: nobody can move
//   active     being played
//   over       `winner` (a seat) won, by five in a row or because the other
//              player gave up, ran out of time or left (`endedBy`); or a
//              draw (winner null, endedBy "draw"): the board filled up
// `version` goes up by one on every change. A move or an answer has to say
// which version it was made on and is refused if the game has moved on
// since, so a double tap can't place two stones.
const gomokuMatchSchema = new Schema(
    {
        status: {
            type: String,
            enum: ["challenge", "declined", "expired", "withdrawn", "starting", "active", "over"],
            default: "challenge",
        },
        players: {type: [playerSchema], required: true},

        // The terms: the board, and the stake each puts up (0: For Fun).
        size: {type: Number, enum: BOARD_SIZES, required: true},
        stake: {type: Number, required: true, min: 0},
        // What the winner is paid, in P-PP (0 For Fun).
        prize: {type: Number, required: true, min: 0},

        // A challenge: who offered the current terms, to whom, and when. A
        // counter swaps `by` and `to`. Whoever accepts moves first.
        offer: {
            by: {type: Schema.Types.ObjectId, ref: "User", default: null},
            to: {type: Schema.Types.ObjectId, ref: "User", default: null},
            at: {type: Date, default: null},
        },
        counters: {type: Number, default: 0},
        expiresAt: {type: Date, default: null},

        // The game itself, as engine.js leaves it.
        moves: {type: [moveSchema], default: []},
        current: {type: Number, default: 0}, // the seat whose turn it is
        winner: {type: Number, default: null},
        // The five (or more) in a row that won it.
        winLine: {type: [[Number]], default: []},
        endedBy: {type: String, enum: ["five", "draw", "resign", "forfeit", "left", null], default: null},

        version: {type: Number, default: 0},
        // Three days after this without a move, the player whose turn it
        // is loses (utils/gomoku.js).
        lastMoveAt: {type: Date, default: Date.now},
        endedAt: {type: Date, default: null},
        // Whether the winner has been paid (or, after a draw, both stakes
        // handed back).
        settled: {type: Boolean, default: false},
        // A developer tool (routes/gomokuRouter.js, local testing only) has
        // answered or moved for a player: nobody else hears how it ended.
        devPlayed: {type: Boolean},

        // The two members' ids, sorted and joined ("a:b"), while their
        // challenge or game is open, missing otherwise. Unique, so two
        // members can only have one challenge or game going with each
        // other at a time (but any number with others).
        pairKey: {type: String},
    },
    {timestamps: true}
);

gomokuMatchSchema.index({pairKey: 1}, {unique: true, sparse: true});
gomokuMatchSchema.index({"players.user": 1, status: 1});
// For the sweep: games gone quiet, challenges gone unanswered, and games
// stuck starting or unpaid.
gomokuMatchSchema.index({status: 1, lastMoveAt: 1});
gomokuMatchSchema.index({status: 1, expiresAt: 1});

module.exports = mongoose.model("GomokuMatch", gomokuMatchSchema);
