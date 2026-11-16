const mongoose = require("mongoose");
const User = require("../models/userModel");
const PoolOwned = require("../models/poolOwnedModel");
const { WalletError, spend } = require("./wallet");
const { inSession } = require("./steal/tx");
const { DEFAULT_CUE, cueItem } = require("../../shared/pool/cues.js");
const { DEFAULT_IGNITION, ignitionItem } = require("../../shared/pool/ignitions.js");

// 8 Ball Pool's shop (the game page's Shop button): cues (shared/pool/
// cues.js; the Sabers the dearest, 2,000 points) and Ignitions, what flies
// off when balls collide (shared/pool/ignitions.js; up to 1,000).
//   - Paid in points, PP first and then P-PP, like a stake. The points are
//     gone: no refunds, no selling back, no trading.
//   - Classic (the cue) and Classic Sparks are everyone's.
//   - What's bought is kept for good. One of each kind is used at a time,
//     and everyone at the table sees them.

class PoolShopError extends Error {
    constructor(message, status = 400) {
        super(message);
        this.status = status;
    }
}

const KINDS = {
    cue: { find: cueItem, fallback: DEFAULT_CUE, label: "cue" },
    ignition: { find: ignitionItem, fallback: DEFAULT_IGNITION, label: "Ignition" },
};

const format = (points) => points.toLocaleString("en-US");

// A shop item of any kind, or null.
const itemOf = (id) => cueItem(id) ?? ignitionItem(id);

// What a member uses: { cue, ignition }, each their choice if it's still in
// the shop, else the free one.
function lookOf(user) {
    return {
        cue: cueItem(user?.pool?.cue)?.id ?? DEFAULT_CUE,
        ignition: ignitionItem(user?.pool?.ignition)?.id ?? DEFAULT_IGNITION,
    };
}

// What the shop page needs: their points, what they own, and what they use.
async function shopView(userId) {
    const [user, owned] = await Promise.all([
        User.findById(userId).select("wallet pool").lean(),
        PoolOwned.find({ user: userId }).sort({ boughtAt: 1 }).select("item").lean(),
    ]);
    if (!user) throw new PoolShopError("That member doesn't exist any more.", 404);
    const pp = user.wallet?.pp ?? 0;
    const ppp = user.wallet?.ppp ?? 0;
    return {
        pp,
        ppp,
        points: pp + ppp,
        owned: owned.map((entry) => entry.item).filter((id) => itemOf(id)),
        ...lookOf(user),
    };
}

// Buys `itemId` for its price in points. Resolves to { item, price }.
async function buyItem(userId, itemId) {
    const item = itemOf(itemId);
    if (!item) throw new PoolShopError("That isn't for sale.", 404);
    if (item.price === 0) throw new PoolShopError(`${item.name} is free, and already yours.`);

    return inSession(async (session) => {
        // Claimed first, so two clicks can't both pay for it.
        try {
            await PoolOwned.create([{ user: userId, item: item.id, price: item.price }], { session });
        } catch (error) {
            if (error.code === 11000) throw new PoolShopError(`You already own ${item.name}.`, 409);
            throw error;
        }

        try {
            await spend(userId, item.price, { reason: "poolShop", session });
        } catch (error) {
            // Not paid for: it isn't theirs. (A transaction undoes this by
            // itself; without one, it's undone here.)
            if (!session) await PoolOwned.deleteOne({ user: userId, item: item.id });
            if (error instanceof WalletError && error.status === 400) {
                throw new PoolShopError(`${item.name} costs ${format(item.price)} points. ${error.message}`);
            }
            throw error;
        }
        return { item: item.id, price: item.price };
    });
}

// Uses `itemId` as their `kind` ("cue" or "ignition") from now on (null:
// back to the free one). Only one they own, or a free one.
async function equipItem(userId, kind, itemId) {
    const shelf = KINDS[kind];
    if (!shelf) throw new PoolShopError("Pick a cue or an Ignition.");
    const item = itemId === null || itemId === undefined ? null : itemOf(itemId);
    if (itemId && !item) throw new PoolShopError("That isn't in the shop.", 404);
    if (item && item.kind !== kind) throw new PoolShopError(`${item.name} isn't a ${shelf.label}.`);
    if (item && item.price !== 0 && !(await PoolOwned.exists({ user: userId, item: item.id }))) {
        throw new PoolShopError(`You don't own ${item.name}. Buy it first.`, 403);
    }
    const done = await User.updateOne({ _id: userId }, { $set: { [`pool.${kind}`]: item ? item.id : null } }, { timestamps: false });
    if (done.matchedCount === 0) throw new PoolShopError("That member doesn't exist any more.", 404);
}

// Their data (Download my data): what they bought and what they use.
async function poolShopDataOf(userId) {
    const [owned, user] = await Promise.all([
        PoolOwned.find({ user: userId }).sort({ boughtAt: 1 }).select("item price boughtAt -_id").lean(),
        mongoose.isValidObjectId(userId) ? User.findById(userId).select("pool").lean() : null,
    ]);
    return { owned, using: user ? lookOf(user) : null };
}

// An account is being deleted: what they bought goes with it.
function forgetPoolShop(userId) {
    return PoolOwned.deleteMany({ user: userId });
}

module.exports = { PoolShopError, lookOf, shopView, buyItem, equipItem, poolShopDataOf, forgetPoolShop };
