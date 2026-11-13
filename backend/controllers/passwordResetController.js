const crypto = require("crypto");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/userModel");
const PasswordReset = require("../models/passwordResetModel");
const { canApproveReset } = require("../middleware/auth");
const { sessionFor } = require("../utils/session");
const { sendPasswordResetEmail } = require("../utils/email");

// How long the emailed link works for. Also how long a "Reset Locally"
// request waits for a moderator or admin, and, once approved, how long the
// member has to choose their new password. After that they can ask again.
const OPEN_FOR_MS = 20 * 60 * 1000;

// The shortest password we'll let someone reset to.
const MIN_PASSWORD_LENGTH = 8;

const DECISIONS = ["approve", "dismiss"];

function hashToken(token) {
    return crypto.createHash("sha256").update(String(token ?? "")).digest("hex");
}

function emailFrom(body) {
    return typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
}

// A "Reset Locally" request still waiting, or approved and not used yet,
// that hasn't timed out.
function liveLocal() {
    return { kind: "local", status: { $in: ["pending", "approved"] }, expiresAt: { $gt: new Date() } };
}

// The same answer whether or not the email has an account, so this can't be
// used to find out who's a member.
const SENT = {
    message: "If there's an account with that email, we've sent a link to reset the password.",
};

// "Forgot password?": email a reset link, if there's an account. Always
// answers the same way. A fresh request replaces any earlier emailed link
// for the account, so the newest link is the one that works. A "Reset
// Locally" request stays as it is.
async function requestReset(req, res) {
    const email = emailFrom(req.body);

    if (!email) {
        return res.status(400).json({ error: "Enter your email address." });
    }

    const user = await User.findOne({ email }).select("_id email").lean();

    if (user) {
        await PasswordReset.deleteMany({ user: user._id, kind: { $ne: "local" } });

        const token = crypto.randomBytes(32).toString("hex");
        const expiresAt = new Date(Date.now() + OPEN_FOR_MS);

        await PasswordReset.create({
            user: user._id,
            tokenHash: hashToken(token),
            kind: "email",
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

// "Reset Locally": instead of an email, the request goes to the moderators
// and admins, pinned at the top of their Notifications, for one of them to
// approve in person at the club. One open request per account. Resolves to
// { token, email, expiresAt }. Only the requester's browser ever sees the
// token: it's how they check on the request and, once it's approved, choose
// the password.
async function requestLocalReset(req, res) {
    const email = emailFrom(req.body);

    if (!email) {
        return res.status(400).json({ error: "Enter your email address." });
    }

    const user = await User.findOne({ email }).select("_id").lean();

    if (!user) {
        return res.status(404).json({ error: "There's no account with that email." });
    }

    const open = await PasswordReset.findOne({ user: user._id, ...liveLocal() }).select("expiresAt").lean();

    if (open) {
        const minutes = Math.ceil((open.expiresAt - Date.now()) / 60000);
        return res.status(409).json({
            error: `A local password reset for this account is already open. You can ask again in ${minutes} ${minutes === 1 ? "minute" : "minutes"}.`,
        });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + OPEN_FOR_MS);
    await PasswordReset.create({ user: user._id, tokenHash: hashToken(token), kind: "local", status: "pending", expiresAt });

    res.status(201).json({ token, email, expiresAt });
}

// The requester's page checking on its "Reset Locally" request every few
// seconds. Resolves to { status, email, expiresAt, approvedBy }: status is
// "pending", "approved", "dismissed" or "expired", and approvedBy is
// { username, role } once approved. An unknown token counts as expired:
// MongoDB deletes requests once they time out.
async function getResetStatus(req, res) {
    const request = await PasswordReset.findOne({ tokenHash: hashToken(req.body?.token), kind: "local" })
        .populate("user", "email")
        .populate("approvedBy", "username role")
        .lean();

    if (!request || !request.user) {
        return res.json({ status: "expired" });
    }

    const timedOut = request.expiresAt <= Date.now() && request.status !== "dismissed";

    res.json({
        status: timedOut ? "expired" : request.status,
        email: request.user.email,
        expiresAt: request.expiresAt,
        approvedBy: request.status === "approved" && request.approvedBy
            ? { username: request.approvedBy.username, role: request.approvedBy.role }
            : null,
    });
}

// Choosing the new password, with the token from the emailed link or from
// an approved "Reset Locally" request. Uses the token up, then logs the
// member in: resolves to what logging in does.
async function completeReset(req, res) {
    const password = typeof req.body?.password === "string" ? req.body.password : "";

    if (password.length < MIN_PASSWORD_LENGTH) {
        return res.status(400).json({ error: `Your new password must be at least ${MIN_PASSWORD_LENGTH} characters.` });
    }

    // Deleted as it's used, so it can't be used twice. A local one only
    // once a moderator or admin has approved it.
    const request = await PasswordReset.findOneAndDelete({
        tokenHash: hashToken(req.body?.token),
        expiresAt: { $gt: new Date() },
        $or: [{ kind: { $ne: "local" } }, { status: "approved" }],
    }).lean();

    if (!request) {
        return res.status(410).json({ error: "This password reset has expired, was already used, or wasn't approved. Ask for a new one." });
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

// A moderator or admin approving or dismissing a "Reset Locally" request
// from their Notifications. Either way it leaves everyone's at once.
// Approving gives the member a fresh 20 minutes to choose their password.
async function decideReset(req, res) {
    const { decision } = req.body ?? {};

    if (!DECISIONS.includes(decision)) {
        return res.status(400).json({ error: "Approve or dismiss it." });
    }

    const gone = { error: "This request has already been dealt with, or it timed out." };
    const pending = { kind: "local", status: "pending", expiresAt: { $gt: new Date() } };

    const request = mongoose.isValidObjectId(req.params.id)
        ? await PasswordReset.findOne({ _id: req.params.id, ...pending }).populate("user", "role").lean()
        : null;

    if (!request || !request.user) {
        return res.status(404).json(gone);
    }

    if (!canApproveReset(req.user, request.user)) {
        return res.status(403).json({ error: "You can't decide this member's password reset." });
    }

    const set = decision === "approve"
        ? { status: "approved", approvedBy: req.user._id, expiresAt: new Date(Date.now() + OPEN_FOR_MS) }
        : { status: "dismissed" };

    // Only while it's still pending, in case someone else just decided it.
    const updated = await PasswordReset.findOneAndUpdate({ _id: request._id, ...pending }, { $set: set });

    if (!updated) {
        return res.status(404).json(gone);
    }

    res.json({ status: set.status });
}

module.exports = { requestReset, requestLocalReset, getResetStatus, completeReset, decideReset };
