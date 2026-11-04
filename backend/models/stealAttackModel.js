const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const itemRef = {_id: false, item: {type: Schema.Types.ObjectId, ref: "StealItem"}, key: String};

// One Steal and Defend attack (utils/steal/attacks.js), from the moment it
// starts to its result. Everything is decided and kept here on the server:
// the questions and their answers, every answer given and when, and every
// roll, so refreshing or closing the page changes nothing.
//   quiz       being played (or a Power/Soul Stone or fizzle, for an instant)
//   resolving  the result is being paid out
//   done       finished: `outcome` says how
const stealAttackSchema = new Schema({
    attacker: {type: Schema.Types.ObjectId, ref: "User", required: true},
    victim: {type: Schema.Types.ObjectId, ref: "User", required: true},

    // The snapshot when it started: the chosen %, the victim's net worth
    // (PP + P-PP), what it tries to take, and the fine if it fails.
    percent: {type: Number, required: true},
    netWorth: {type: Number, required: true},
    attempted: {type: Number, required: true},
    potentialFine: {type: Number, required: true},

    status: {type: String, enum: ["quiz", "resolving", "done"], default: "quiz"},
    // success, fail, fizzle (the Invisibility Cloak) or neuralyzed.
    outcome: {type: String, enum: ["success", "fail", "fizzle", "neuralyzed", null], default: null},
    crit: {type: Boolean, default: false},
    // "power" or "soul": an Infinity Stone attack with no quiz.
    stone: {type: String, enum: ["power", "soul", null], default: null},
    // Another attack on the victim finished first, so this one fails.
    doomed: {type: Boolean, default: false},

    startedAt: {type: Date, default: Date.now},
    // The latest it can still be going: the freeze on both wallets ends
    // then, and the sweep finishes it with any unanswered questions wrong.
    expiresAt: {type: Date, required: true},
    resolvedAt: {type: Date, default: null},

    classes: {attacker: String, defender: String},
    // Equipped as it started (the attacker's are locked for the whole
    // attack), and the defender's as it ended.
    attackerItems: {type: [itemRef], default: []},
    defenderItemsAtStart: {type: [itemRef], default: []},
    defenderItemsAtEnd: {type: [itemRef], default: []},
    // The Marauder's Map: the attacker sees defenderItemsAtStart.
    seesDefenderItems: {type: Boolean, default: false},

    // The quiz: how it's set up (games/steal/quiz.js quizSetup), the
    // questions with their answers (never sent to the page), and the one
    // being asked now, open from opensAt to closesAt.
    setup: {type: Schema.Types.Mixed, default: null},
    questions: {type: [Schema.Types.Mixed], default: []},
    current: {type: Number, default: 0},
    opensAt: {type: Date, default: null},
    closesAt: {type: Date, default: null},
    // The DeLorean: tries left, and whether the current question is one.
    retriesLeft: {type: Number, default: 0},
    retrying: {type: Boolean, default: false},
    answers: {
        type: [{
            _id: false,
            index: Number,
            input: Schema.Types.Mixed,
            correct: Boolean,
            timedOut: Boolean,
            retry: Boolean,
            at: Date,
        }],
        default: [],
    },
    correct: {type: Number, default: 0},
    wrong: {type: Number, default: 0},

    // The success formula's parts and the rolls, as they came out.
    rates: {attack: Number, defense: Number, success: Number},
    rolls: {type: Schema.Types.Mixed, default: {}},

    // What moved, once it's over.
    amounts: {
        victimLost: {type: Number, default: 0},
        attackerGot: {type: Number, default: 0},
        critBonus: {type: Number, default: 0},
        rogueBonus: {type: Number, default: 0},
        wilson: {type: Number, default: 0},
        fine: {type: Number, default: 0},
        revenge: {type: Number, default: 0},
        bill: {type: Number, default: 0},
        paid: {type: Number, default: 0},
        defenderGot: {type: Number, default: 0},
        burned: {type: Number, default: 0},
        debt: {type: Number, default: 0},
        forgiven: {type: Number, default: 0},
    },
    // Every durability change: whose item, from what to what.
    durability: {
        type: [{_id: false, owner: {type: Schema.Types.ObjectId, ref: "User"}, item: Schema.Types.ObjectId, key: String, before: Number, after: Number, destroyed: Boolean}],
        default: [],
    },

    // The Soul Stone: the victim can't attack the attacker until then.
    immunityUntil: {type: Date, default: null},

    // Turning PvP off took this success back (utils/steal/players.js).
    takenBackAt: {type: Date, default: null},
});

// Today's and this week's attempts by an attacker, and on a victim.
stealAttackSchema.index({attacker: 1, startedAt: -1});
stealAttackSchema.index({victim: 1, startedAt: -1});
// Attacks still being played, for the sweep and the freeze.
stealAttackSchema.index({status: 1, expiresAt: 1});
// The public feed of successful steals, newest first.
stealAttackSchema.index({outcome: 1, resolvedAt: -1});

module.exports = mongoose.model("StealAttack", stealAttackSchema);
