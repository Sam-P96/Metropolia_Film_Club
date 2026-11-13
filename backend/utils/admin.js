const mongoose = require("mongoose");
const User = require("../models/userModel");
const WalletTx = require("../models/walletTxModel");
const { WalletError, changeWallet } = require("./wallet");
const { noteAdminGrant } = require("./notify");
const { MEMBER_FIELDS, userSummary } = require("./serialize");

// The admin panel's own tools (routes/adminRouter.js, admins only). The
// rest of the panel links to tools that already have pages of their own.

// The most one send can be, so a slip of the finger can't add a zero too many.
const MAX_GRANT = 1_000_000;
const MAX_NOTE = 200;

class AdminError extends Error {
    constructor(message, status = 400) {
        super(message);
        this.status = status;
    }
}

// Sends `amount` P-PP to `userId` from nowhere (it's newly made), as
// `adminId`. It's on their wallet history ("Sent by an admin") and they get
// a notification, with `note` if there is one. Resolves to { user, amount,
// note, balance }.
async function grantPpp(adminId, userId, amount, note = "") {
    if (!mongoose.isValidObjectId(userId)) throw new AdminError("Pick a member to send it to.");
    if (!Number.isInteger(amount) || amount < 1) throw new AdminError("Send a whole number of P-PP, at least 1.");
    if (amount > MAX_GRANT) throw new AdminError(`One send can be ${MAX_GRANT.toLocaleString("en-US")} P-PP at most.`);
    const text = typeof note === "string" ? note.trim() : "";
    if (text.length > MAX_NOTE) throw new AdminError(`A note can be ${MAX_NOTE} characters at most.`);

    const user = await User.findById(userId).select(MEMBER_FIELDS).lean();
    if (!user) throw new AdminError("That member doesn't exist any more.", 404);

    let paid;
    try {
        paid = await changeWallet(userId, () => ({ ppp: amount }), { reason: "adminGrant", other: adminId });
    } catch (error) {
        if (error instanceof WalletError) throw new AdminError(error.message, error.status);
        throw error;
    }
    await noteAdminGrant(userId, adminId, amount, text);
    return { user: userSummary(user), amount, note: text, balance: paid.balance };
}

// The latest sends, newest first: who to, how much, and which admin.
async function recentGrants(limit = 20) {
    const rows = await WalletTx.find({ reason: "adminGrant" }).sort({ at: -1 }).limit(limit).lean();
    const ids = [...new Set(rows.flatMap((row) => [row.user, row.other]).filter(Boolean).map(String))];
    const users = await User.find({ _id: { $in: ids } }).select(MEMBER_FIELDS).lean();
    const byId = new Map(users.map((user) => [String(user._id), userSummary(user)]));
    return rows.map((row) => ({
        _id: row._id,
        to: byId.get(String(row.user)) ?? null,
        by: byId.get(String(row.other)) ?? null,
        amount: row.ppp,
        at: row.at,
    }));
}

module.exports = { AdminError, MAX_GRANT, MAX_NOTE, grantPpp, recentGrants };
