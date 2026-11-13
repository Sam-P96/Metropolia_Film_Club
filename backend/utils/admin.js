const mongoose = require("mongoose");
const User = require("../models/userModel");
const WalletTx = require("../models/walletTxModel");
const { WalletError, changeWallet } = require("./wallet");
const { noteAdminGrant } = require("./notify");
const { MEMBER_FIELDS, userSummary } = require("./serialize");
const { ADMIN_GRANT } = require("../../shared/admin/config.js");

// The admin panel's own tools (routes/adminRouter.js, admins only). The
// rest of the panel links to tools that already have pages of their own.

// The most one send can be, and the longest note (shared/admin/config.js).
const MAX_GRANT = ADMIN_GRANT.max;
const MAX_NOTE = ADMIN_GRANT.maxNote;

class AdminError extends Error {
    constructor(message, status = 400) {
        super(message);
        this.status = status;
    }
}

// Sends `amount` P-PP to `userId` from nowhere (it's newly made), as
// `adminId`, who may send it to themselves. It's on their wallet history
// ("Sent by an admin"), with `note` if there is one, so every admin can
// see it in the list of sends, and they get a notification with the note.
// Resolves to { user, amount, note, balance }.
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
        paid = await changeWallet(userId, () => ({ ppp: amount }), { reason: "adminGrant", other: adminId, note: text || null });
    } catch (error) {
        if (error instanceof WalletError) throw new AdminError(error.message, error.status);
        throw error;
    }
    await noteAdminGrant(userId, adminId, amount, text);
    return { user: userSummary(user), amount, note: text, balance: paid.balance };
}

// How many sends a page of the list holds.
const GRANTS_PAGE = 20;

// Every send by every admin, newest first, a page at a time: who to, how
// much, which admin and their note. `before` is the last send of the page
// before (its _id), for the next page. Resolves to { grants, hasMore }.
async function recentGrants(before = null) {
    if (before && !mongoose.isValidObjectId(before)) throw new AdminError("That's not a page of the list.");
    const query = { reason: "adminGrant", ...(before && { _id: { $lt: before } }) };
    // One more than a page, to know whether there's another.
    const rows = await WalletTx.find(query).sort({ _id: -1 }).limit(GRANTS_PAGE + 1).lean();
    const page = rows.slice(0, GRANTS_PAGE);

    const ids = [...new Set(page.flatMap((row) => [row.user, row.other]).filter(Boolean).map(String))];
    const users = await User.find({ _id: { $in: ids } }).select(MEMBER_FIELDS).lean();
    const byId = new Map(users.map((user) => [String(user._id), userSummary(user)]));
    const grants = page.map((row) => ({
        _id: row._id,
        to: byId.get(String(row.user)) ?? null,
        by: byId.get(String(row.other)) ?? null,
        amount: row.ppp,
        note: row.note ?? null,
        at: row.at,
    }));
    return { grants, hasMore: rows.length > GRANTS_PAGE };
}

module.exports = { AdminError, GRANTS_PAGE, MAX_GRANT, MAX_NOTE, grantPpp, recentGrants };
