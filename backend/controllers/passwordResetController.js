const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const User = require("../models/userModel");
const PasswordReset = require("../models/passwordResetModel");
const { sessionFor } = require("../utils/session");
const { sendPasswordResetEmail } = require("../utils/email");

// How long the emailed link works for.
const OPEN_FOR_MS = 20 * 60 * 1000;

// The shortest password we'll let someone reset to.
const MIN_PASSWORD_LENGTH = 8;

function hashToken(token) {
    return crypto.createHash("sha256").update(String(token ?? "")).digest("hex");
}

function emailFrom(body) {
    return typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
}

// The same answer whether or not the email has an account, so this can't be
// used to find out who's a member.
const SENT = {
    message: "If there's an account with that email, we've sent a link to reset the password.",
};

// "Forgot password?": email a reset link, if there's an account. Always
// answers the same way. A fresh request replaces any earlier one for the
// account, so the newest link is the one that works.
async function requestReset(req, res) {
    const email = emailFrom(req.body);

    if (!email) {
        return res.status(400).json({ error: "Enter your email address." });
    }

    const user = await User.findOne({ email }).select("_id email").lean();

    if (user) {
        await PasswordReset.deleteMany({ user: user._id });

        const token = crypto.randomBytes(32).toString("hex");
        const expiresAt = new Date(Date.now() + OPEN_FOR_MS);

        await PasswordReset.create({
            user: user._id,
            tokenHash: hashToken(token),
            expiresAt,
        });

        const appUrl = process.env.APP_URL || "http://localhost:5173";
        const resetUrl = `${appUrl}/reset-password?token=${token}`;

        try {
            await sendPasswordResetEmail(user.email, resetUrl);
        } catch (error) {
            console.error("Password reset email failed:", error);
        }
    }

    res.json(SENT);
}

// Choosing the new password with the token from the emailed link. Uses the
// token up, then logs the member in: resolves to what logging in does.
async function completeReset(req, res) {
    const password = typeof req.body?.password === "string" ? req.body.password : "";

    if (password.length < MIN_PASSWORD_LENGTH) {
        return res.status(400).json({ error: `Your new password must be at least ${MIN_PASSWORD_LENGTH} characters.` });
    }

    // Deleted as it's used, so the link can't be used twice.
    const request = await PasswordReset.findOneAndDelete({
        tokenHash: hashToken(req.body?.token),
        expiresAt: { $gt: new Date() },
    }).lean();

    if (!request) {
        return res.status(410).json({ error: "This reset link has expired or already been used. Ask for a new one." });
    }

    const salt = await bcrypt.genSalt(10);
    const user = await User.findByIdAndUpdate(
        request.user,
        { $set: { password: await bcrypt.hash(password, salt) } },
        { returnDocument: "after" }
    ).lean();

    if (!user) {
        return res.status(404).json({ error: "There's no account for this reset." });
    }

    res.json(sessionFor(user));
}

module.exports = { requestReset, completeReset };
