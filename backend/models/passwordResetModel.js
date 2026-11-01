const mongoose = require("mongoose");

const Schema = mongoose.Schema;

// A pending password reset: the SHA-256 of the secret token emailed to the
// member when they use "Forgot password?". Holding the link is the proof, so
// there's no approval step. The token is used once and then deleted; MongoDB
// also clears it at expiresAt.
const passwordResetSchema = new Schema(
    {
        user: {type: Schema.Types.ObjectId, ref: "User", required: true},
        tokenHash: {type: String, required: true, unique: true},
        expiresAt: {type: Date, required: true},
    },
    {timestamps: {createdAt: true, updatedAt: false}}
);

passwordResetSchema.index({expiresAt: 1}, {expireAfterSeconds: 0});
passwordResetSchema.index({user: 1});

module.exports = mongoose.model("PasswordReset", passwordResetSchema);
