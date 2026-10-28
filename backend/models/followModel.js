const mongoose = require("mongoose");

const Schema = mongoose.Schema;

// One member following another. Two members who follow each other are
// friends.
const followSchema = new Schema(
    {
        follower: {type: Schema.Types.ObjectId, ref: "User", required: true},
        following: {type: Schema.Types.ObjectId, ref: "User", required: true},
    },
    {timestamps: {createdAt: true, updatedAt: false}}
);

followSchema.index({follower: 1, following: 1}, {unique: true});
// The Followers and Following lists, newest first.
followSchema.index({following: 1, createdAt: -1});
followSchema.index({follower: 1, createdAt: -1});

module.exports = mongoose.model("Follow", followSchema);
