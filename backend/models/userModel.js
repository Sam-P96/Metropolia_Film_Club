const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const userSchema = new Schema(
    {
        username: {type: String, required: true, unique: true},
        email: {type: String, required: true, unique: true},
        password: {type: String, required: true},
        memberTitle: {type: String, default: "Human"},
        avatarUrl: {type: String, default: null},
        // This looks weird down here, but it is just how MongoDB handles it.
        reviewCardBanner: {type: String, default: "color"},
        value: {type: String, default: "#2D1B47"},
    }
)

module.exports = mongoose.model("User", userSchema);