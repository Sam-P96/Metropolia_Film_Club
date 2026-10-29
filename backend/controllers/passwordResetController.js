const crypto = require("crypto");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/userModel");
const PasswordReset = require("../models/passwordResetModel");
const { canApproveReset } = require("../middleware/auth");
const { sessionFor } = require("../utils/session");

// How long a request waits for a moderator or admin, and, once approved, how
// long the member has to choose their new password. After that they can ask
// again.
const OPEN_FOR_MS = 20 * 60 * 1000;

const DECISIONS = ["approve", "dismiss"];

function hashToken(token) {
    return crypto.createHash("sha256").update(String(token ?? "")).digest("hex");
}

function emailFrom(body) {
    return typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
}

// A request still waiting, or approved and not used yet, that hasn't timed out.
function live() {
    return { status: { $in: ["pending", "approved"] }, expiresAt: { $gt: new Date() } };
}

const NO_ACCOUNT = { error: "There's no account with that email." };

// "Forgot password?", step one: is there an account with this email?
async function checkEmail(req, res) {
    const email = emailFrom(req.body);

    if (!email) {
        return res.status(400).json({ error: "Enter your email address." });
    }

    if (!(await User.exists({ email }))) {
        return res.status(404).json(NO_ACCOUNT);
    }

    res.json({ email });
}

// Step two: send the request to the moderators and admins. One open request
// per account. Resolves to { token, email, expiresAt }. Only the requester's
// browser ever sees the token: it's how they check on the request and, once
// it's approved, choose the password.
async function requestReset(req, res) {
    const email = emailFrom(req.body);
    const user = email ? await User.findOne({ email }).select("_id").lean() : null;

    if (!user) {
        return res.status(404).json(NO_ACCOUNT);
    }

    const open = await PasswordReset.findOne({ user: user._id, ...live() }).select("expiresAt").lean();

    if (open) {
        const minutes = Math.ceil((open.expiresAt - Date.now()) / 60000);
        return res.status(409).json({
            error: `A password reset for this account is already open. You can ask again in ${minutes} ${minutes === 1 ? "minute" : "minutes"}.`,
        });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + OPEN_FOR_MS);
    await PasswordReset.create({ user: user._id, tokenHash: hashToken(token), expiresAt });

    res.status(201).json({ token, email, expiresAt });
}

// The requester's page checking on its request every few seconds. Resolves
// to { status, email, expiresAt, approvedBy }: status is "pending",
// "approved", "dismissed" or "expired", and approvedBy is { username, role }
// once approved. An unknown token counts as expired: MongoDB deletes
// requests once they time out.
async function getResetStatus(req, res) {
    const request = await PasswordReset.findOne({ tokenHash: hashToken(req.body?.token) })
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

// The member choosing their new password, once their request is approved.
// Uses the request up, then logs them in: resolves to what logging in does.
async function completeReset(req, res) {
    const password = typeof req.body?.password === "string" ? req.body.password : "";

    if (!password) {
        return res.status(400).json({ error: "Enter a new password." });
    }

    // Deleted as it's used, so it can't be used twice.
    const request = await PasswordReset.findOneAndDelete({
        tokenHash: hashToken(req.body?.token),
        status: "approved",
        expiresAt: { $gt: new Date() },
    }).lean();

    if (!request) {
        return res.status(410).json({ error: "This password reset has run out or wasn't approved. Ask for a new one." });
    }

    const salt = await bcrypt.genSalt(10);
    const user = await User.findByIdAndUpdate(
        request.user,
        { $set: { password: await bcrypt.hash(password, salt) } },
        { returnDocument: "after" }
    ).lean();

    if (!user) {
        return res.status(404).json(NO_ACCOUNT);
    }

    res.json(sessionFor(user));
}

// A moderator or admin approving or dismissing a request from their
// Notifications. Either way it leaves everyone's at once. Approving gives the
// member a fresh 20 minutes to choose their password.
async function decideReset(req, res) {
    const { decision } = req.body ?? {};

    if (!DECISIONS.includes(decision)) {
        return res.status(400).json({ error: "Approve or dismiss it." });
    }

    const gone = { error: "This request has already been dealt with, or it timed out." };
    const pending = { status: "pending", expiresAt: { $gt: new Date() } };

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

module.exports = { checkEmail, requestReset, getResetStatus, completeReset, decideReset };
