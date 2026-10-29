const mongoose = require("mongoose");

const Schema = mongoose.Schema;

// A member who's forgotten their password asking the moderators and admins
// for a reset ("Forgot password?" on the login page). It waits at the top of
// their Notifications until one of them approves or dismisses it, or it
// times out. Once approved, the member can choose a new password, once.
const passwordResetSchema = new Schema(
    {
        user: {type: Schema.Types.ObjectId, ref: "User", required: true},
        // A SHA-256 of the secret only the requester's browser holds. It
        // proves the one choosing the password is the one who asked.
        tokenHash: {type: String, required: true, unique: true},
        status: {
            type: String,
            enum: ["pending", "approved", "dismissed"],
            default: "pending",
        },
        approvedBy: {type: Schema.Types.ObjectId, ref: "User", default: null},
        // When it stops waiting or, once approved, stops letting them choose a
        // password. MongoDB deletes it soon after.
        expiresAt: {type: Date, required: true},
    },
    {timestamps: {createdAt: true, updatedAt: false}}
);

passwordResetSchema.index({expiresAt: 1}, {expireAfterSeconds: 0});
passwordResetSchema.index({user: 1, status: 1});
passwordResetSchema.index({status: 1, createdAt: -1});

module.exports = mongoose.model("PasswordReset", passwordResetSchema);
