const mongoose = require("mongoose");

const Schema = mongoose.Schema;

// A password reset from "Forgot password?", one of two kinds:
//   email  the SHA-256 of the secret token emailed to the member. Holding
//          the link is the proof, so there's no approval step.
//   local  "Reset Locally": the SHA-256 of a secret only the requester's
//          browser holds. It waits at the top of the moderators' and admins'
//          Notifications until one of them approves it (in person, at the
//          club) or dismisses it, or it times out. Once approved, the member
//          can choose a new password, once.
// Either way the token is used once and then deleted; MongoDB also clears
// it at expiresAt. Older email ones have no `kind`, and count as email.
const passwordResetSchema = new Schema(
    {
        user: {type: Schema.Types.ObjectId, ref: "User", required: true},
        tokenHash: {type: String, required: true, unique: true},
        kind: {type: String, enum: ["email", "local"], default: "email"},
        // Local ones only.
        status: {type: String, enum: ["pending", "approved", "dismissed"]},
        approvedBy: {type: Schema.Types.ObjectId, ref: "User", default: null},
        // When it stops working or, for a local one, stops waiting or (once
        // approved) stops letting them choose a password.
        expiresAt: {type: Date, required: true},
    },
    {timestamps: {createdAt: true, updatedAt: false}}
);

passwordResetSchema.index({expiresAt: 1}, {expireAfterSeconds: 0});
passwordResetSchema.index({user: 1});
passwordResetSchema.index({status: 1, createdAt: -1});

module.exports = mongoose.model("PasswordReset", passwordResetSchema);
