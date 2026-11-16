const mongoose = require("mongoose");
const User = require("../models/userModel");
const PoolCueOwned = require("../models/poolCueOwnedModel");
const { WalletError, spend } = require("./wallet");
const { inSession } = require("./steal/tx");
const { DEFAULT_CUE, cueItem } = require("../../shared/pool/cues.js");

// 8 Ball Pool's shop (the game page's Shop button): cues, from
// shared/pool/cues.js, the dearest (the Glowing ones) 1,000 points.
//   - Paid in points, PP first and then P-PP, like a stake. The points are
//     gone: no refunds, no selling back, no trading.
//   - Classic is everyone's.
//   - What's bought is kept for good. One is used at a time, and everyone
//     at the table sees it.

class PoolShopError extends Error {
    constructor(message, status = 400) {
        super(message);
        this.status = status;
    }
}

const format = (points) => points.toLocaleString("en-US");

// The cue a member uses: their choice if it's still a cue, else Classic.
function cueOf(user) {
    return cueItem(user?.pool?.cue)?.id ?? DEFAULT_CUE;
}

// What the shop page needs: their points, the cues they own, and the one
// they use.
async function shopView(userId) {
    const [user, owned] = await Promise.all([
        User.findById(userId).select("wallet pool").lean(),
        PoolCueOwned.find({ user: userId }).sort({ boughtAt: 1 }).select("item").lean(),
    ]);
    if (!user) throw new PoolShopError("That member doesn't exist any more.", 404);
    const pp = user.wallet?.pp ?? 0;
    const ppp = user.wallet?.ppp ?? 0;
    return {
        pp,
        ppp,
        points: pp + ppp,
        owned: owned.map((entry) => entry.item).filter((id) => cueItem(id)),
        cue: cueOf(user),
    };
}

// Buys `itemId` for its price in points. Resolves to { item, price }.
async function buyCue(userId, itemId) {
    const item = cueItem(itemId);
    if (!item) throw new PoolShopError("That isn't for sale.", 404);
    if (item.price === 0) throw new PoolShopError(`${item.name} is free, and already yours.`);

    return inSession(async (session) => {
        // Claimed first, so two clicks can't both pay for it.
        try {
            await PoolCueOwned.create([{ user: userId, item: item.id, price: item.price }], { session });
        } catch (error) {
            if (error.code === 11000) throw new PoolShopError(`You already own ${item.name}.`, 409);
            throw error;
        }

        try {
            await spend(userId, item.price, { reason: "poolShop", session });
        } catch (error) {
            // Not paid for: it isn't theirs. (A transaction undoes this by
            // itself; without one, it's undone here.)
            if (!session) await PoolCueOwned.deleteOne({ user: userId, item: item.id });
            if (error instanceof WalletError && error.status === 400) {
                throw new PoolShopError(`${item.name} costs ${format(item.price)} points. ${error.message}`);
            }
            throw error;
        }
        return { item: item.id, price: item.price };
    });
}

// Uses `itemId` from now on (null: back to Classic). Only a cue they own,
// or Classic.
async function equipCue(userId, itemId) {
    const item = itemId === null || itemId === undefined ? null : cueItem(itemId);
    if (itemId && !item) throw new PoolShopError("That isn't in the shop.", 404);
    if (item && item.price !== 0 && !(await PoolCueOwned.exists({ user: userId, item: item.id }))) {
        throw new PoolShopError(`You don't own ${item.name}. Buy it first.`, 403);
    }
    const done = await User.updateOne({ _id: userId }, { $set: { "pool.cue": item ? item.id : null } }, { timestamps: false });
    if (done.matchedCount === 0) throw new PoolShopError("That member doesn't exist any more.", 404);
}

// Their data (Download my data): the cues they bought and the one they use.
async function poolShopDataOf(userId) {
    const [owned, user] = await Promise.all([
        PoolCueOwned.find({ user: userId }).sort({ boughtAt: 1 }).select("item price boughtAt -_id").lean(),
        mongoose.isValidObjectId(userId) ? User.findById(userId).select("pool").lean() : null,
    ]);
    return { owned, cue: user ? cueOf(user) : null };
}

// An account is being deleted: what they bought goes with it.
function forgetPoolShop(userId) {
    return PoolCueOwned.deleteMany({ user: userId });
}

module.exports = { PoolShopError, cueOf, shopView, buyCue, equipCue, poolShopDataOf, forgetPoolShop };
