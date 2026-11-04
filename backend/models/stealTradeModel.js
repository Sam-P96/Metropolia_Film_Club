const mongoose = require("mongoose");

const Schema = mongoose.Schema;

// A private trade offer (utils/steal/market.js): `from` offers items and/or
// PP for items and/or PP of `to`'s. What `from` offers is held in escrow
// until `to` accepts or declines, or `from` cancels. A gift is a trade that
// asks for nothing and is accepted at once.
//   pending   waiting on `to`
//   accepted  done: everything has changed hands
//   declined  `to` said no; escrow went back
//   cancelled `from` took it back (or it expired); escrow went back
const stealTradeSchema = new Schema({
    from: {type: Schema.Types.ObjectId, ref: "User", required: true},
    to: {type: Schema.Types.ObjectId, ref: "User", required: true},
    gift: {type: Boolean, default: false},
    give: {
        items: {type: [{type: Schema.Types.ObjectId, ref: "StealItem"}], default: []},
        pp: {type: Number, default: 0, min: 0},
        // What the escrowed PP came out of `from`'s wallet as, to hand back.
        held: {pp: {type: Number, default: 0}, ppp: {type: Number, default: 0}},
    },
    want: {
        items: {type: [{type: Schema.Types.ObjectId, ref: "StealItem"}], default: []},
        pp: {type: Number, default: 0, min: 0},
    },
    // The item keys at the time, for showing the trade after items break.
    keys: {give: {type: [String], default: []}, want: {type: [String], default: []}},
    status: {type: String, enum: ["pending", "accepted", "declined", "cancelled"], default: "pending"},
    createdAt: {type: Date, default: Date.now},
    answeredAt: {type: Date, default: null},
});

stealTradeSchema.index({to: 1, status: 1, createdAt: -1});
stealTradeSchema.index({from: 1, status: 1, createdAt: -1});
stealTradeSchema.index({status: 1, createdAt: 1});

module.exports = mongoose.model("StealTrade", stealTradeSchema);
