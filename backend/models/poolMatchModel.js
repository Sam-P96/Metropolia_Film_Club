const mongoose = require("mongoose");

const Schema = mongoose.Schema;

// One seat at the table. Seat 0 breaks: whoever accepted the challenge (so
// the challenger shoots second, as in Infinite Gomoku).
const playerSchema = new Schema(
    {
        user: {type: Schema.Types.ObjectId, ref: "User", default: null},
        // What their stake took from their wallet, so it can be handed back
        // exactly if the game never gets going.
        paid: {
            pp: {type: Number, default: 0},
            ppp: {type: Number, default: 0},
        },
        // How many shots of the game they've seen. When they open the game
        // and the other player has shot since, that shot is played again in
        // front of them.
        seen: {type: Number, default: 0},
    },
    {_id: false}
);

// A ball on (or off) the table: id 0 is the cue ball, 8 the black
// (shared/pool/physics.js). `on` false once it's pocketed.
const ballSchema = new Schema(
    {
        id: {type: Number, required: true},
        x: {type: Number, required: true},
        y: {type: Number, required: true},
        on: {type: Boolean, default: true},
    },
    {_id: false}
);

// One game of 8 Ball Pool between two members. shared/pool/rules.js plays
// it (through games/pool/engine.js); utils/pool.js saves it, pays the
// winner and ends games and challenges nobody is answering any more.
//   challenge  terms offered (`offer`), waiting on an answer. Nothing is
//              taken from anyone yet.
//   declined   ...turned down
//   expired    ...not answered within three days
//   withdrawn  ...taken back by whoever sent it (or they left the club)
//   starting   accepted, the stakes being taken: nobody can shoot
//   active     being played
//   over       `winner` (a seat) won: by pocketing the black, or because
//              the other player pocketed it too soon or with a foul, gave
//              up, ran out of time or left (`endedBy`)
// `version` goes up by one on every change. A shot or an answer has to say
// which version it was made on and is refused if the game has moved on
// since, so a double tap can't shoot twice.
const poolMatchSchema = new Schema(
    {
        status: {
            type: String,
            enum: ["challenge", "declined", "expired", "withdrawn", "starting", "active", "over"],
            default: "challenge",
        },
        players: {type: [playerSchema], required: true},

        // The terms: the stake each puts up (0: For Fun), and what the
        // winner is paid, in P-PP.
        stake: {type: Number, required: true, min: 0},
        prize: {type: Number, required: true, min: 0},

        // A challenge: who offered the current terms, to whom, and when. A
        // counter swaps `by` and `to`. Whoever accepts breaks.
        offer: {
            by: {type: Schema.Types.ObjectId, ref: "User", default: null},
            to: {type: Schema.Types.ObjectId, ref: "User", default: null},
            at: {type: Date, default: null},
        },
        counters: {type: Number, default: 0},
        expiresAt: {type: Date, default: null},

        // The game itself, as shared/pool/rules.js leaves it.
        balls: {type: [ballSchema], default: []},
        current: {type: Number, default: 0}, // the seat whose turn it is
        // The seat that has the solids (the other has the stripes), or null
        // while the table is open.
        solids: {type: Number, default: null},
        breakShot: {type: Boolean, default: true},
        // The cue ball in hand: "kitchen" (behind the head string, for the
        // break), "table" (anywhere, after a foul), or null.
        hand: {type: String, enum: ["kitchen", "table", null], default: null},
        shots: {type: Number, default: 0},
        // The last shot played, so the pages can play it again: the table
        // before it, its direction and speed, and what it did (rules.js
        // playShot).
        lastShot: {type: Schema.Types.Mixed, default: null},
        winner: {type: Number, default: null},
        endedBy: {type: String, enum: ["eight", "eightFoul", "resign", "forfeit", "left", null], default: null},

        version: {type: Number, default: 0},
        // Three days after this without a shot, the player whose turn it
        // is loses (utils/pool.js).
        lastMoveAt: {type: Date, default: Date.now},
        endedAt: {type: Date, default: null},
        // Whether the winner has been paid.
        settled: {type: Boolean, default: false},
        // Whether the crowd's bets on it (models/poolBetModel.js) have all
        // been paid out or handed back.
        betsSettled: {type: Boolean, default: false},

        // The two members' ids, sorted and joined ("a:b"), while their
        // challenge or game is open, missing otherwise. Unique, so two
        // members can only have one challenge or game going with each
        // other at a time (but any number with others).
        pairKey: {type: String},
    },
    {timestamps: true}
);

poolMatchSchema.index({pairKey: 1}, {unique: true, sparse: true});
poolMatchSchema.index({"players.user": 1, status: 1});
// For the sweep: games gone quiet, challenges gone unanswered, and games
// stuck starting or unpaid.
poolMatchSchema.index({status: 1, lastMoveAt: 1});
poolMatchSchema.index({status: 1, expiresAt: 1});

module.exports = mongoose.model("PoolMatch", poolMatchSchema);
