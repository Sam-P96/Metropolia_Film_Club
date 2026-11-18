const mongoose = require("mongoose");

const Schema = mongoose.Schema;

// A member in Forrest Bounce (utils/forrest.js): the two buddies they play
// with (shared/forrest/buddies.js: the frog and the rabbit, or animals they
// bought in the Infinite Gomoku shop), and their best run, in fruit points
// (before the entry's multiplier, so every entry counts the same).
const forrestPlayerSchema = new Schema({
    _id: { type: Schema.Types.ObjectId, ref: "User" },
    buddies: { type: [String], default: undefined },
    best: { type: Number, default: 0 },
    bestScore: { type: Number, default: 0 },
    bestLevel: { type: Number, default: 1 },
    bestAt: { type: Date, default: null },
});

forrestPlayerSchema.index({ best: -1, bestAt: 1 });

module.exports = mongoose.model("ForrestPlayer", forrestPlayerSchema);
