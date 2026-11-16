const User = require("../models/userModel");
const GomokuOwned = require("../models/gomokuOwnedModel");
const { gomokuItem, itemsOfKind } = require("../../shared/gomoku/catalogue.js");

// The shockwave a member has on at 8 Ball Pool: one of Infinite Gomoku's
// shockwaves they own (or a free one), set off where the cue ball first
// hits a ball, its ring only. None until they pick one. Kept on the member
// (user.pool.shockwave); what they own is Infinite Gomoku's shop's
// (models/gomokuOwnedModel.js), bought there.

class PoolLookError extends Error {
    constructor(message, status = 400) {
        super(message);
        this.status = status;
    }
}

// A stored choice, if it's still a shockwave, or null.
function shockwaveOf(user) {
    const item = gomokuItem(user?.pool?.shockwave);
    return item && item.kind === "shockwave" ? item.id : null;
}

// { shockwave, owned }: what they have on (null: none), and every
// shockwave they can pick, the free ones first, in the shop's order.
async function poolLookView(userId) {
    const [user, bought] = await Promise.all([
        User.findById(userId).select("pool").lean(),
        GomokuOwned.find({ user: userId }).select("item").lean(),
    ]);
    if (!user) throw new PoolLookError("That member doesn't exist any more.", 404);
    const mine = new Set(bought.map((entry) => entry.item));
    const owned = itemsOfKind("shockwave")
        .filter((item) => item.price === 0 || mine.has(item.id))
        .map((item) => item.id);
    return { shockwave: shockwaveOf(user), owned };
}

// Puts on `itemId` (null: none). Only a shockwave they own, or a free one.
async function equipPoolShockwave(userId, itemId) {
    const item = itemId === null || itemId === undefined ? null : gomokuItem(itemId);
    if (itemId && !item) throw new PoolLookError("That isn't in the Infinite Gomoku shop.", 404);
    if (item && item.kind !== "shockwave") throw new PoolLookError("Only shockwaves can be used at 8 Ball Pool.");
    if (item && item.price !== 0 && !(await GomokuOwned.exists({ user: userId, item: item.id }))) {
        throw new PoolLookError(`You don't own ${item.name}. Buy it in the Infinite Gomoku shop first.`, 403);
    }
    const done = await User.updateOne({ _id: userId }, { $set: { "pool.shockwave": item ? item.id : null } }, { timestamps: false });
    if (done.matchedCount === 0) throw new PoolLookError("That member doesn't exist any more.", 404);
    return poolLookView(userId);
}

module.exports = { PoolLookError, shockwaveOf, poolLookView, equipPoolShockwave };
