const mongoose = require("mongoose");
const User = require("../models/userModel");
const GomokuOwned = require("../models/gomokuOwnedModel");
const WalletTx = require("../models/walletTxModel");
const { KINDS, KIND_LABELS, gomokuItem, loadoutOf } = require("../../shared/gomoku/catalogue.js");
const { WalletError, changeWallet, spend } = require("./wallet");
const { inSession } = require("./steal/tx");

// The Infinite Gomoku shop (the game page's Shop button): pieces,
// shockwaves, boards and grids, from shared/gomoku/catalogue.js. Its own
// shop, apart from the Black Market and Steal and Defend's.
//   - Paid in points, PP first and then P-PP, like a stake. The points are
//     gone: no refunds, no selling back, no trading.
//   - The free items are everyone's.
//   - What's bought is kept for good, and can be put on and taken off.

class GomokuShopError extends Error {
    constructor(message, status = 400) {
        super(message);
        this.status = status;
    }
}

const isFree = (item) => item.price === 0;
const format = (points) => points.toLocaleString("en-US");

// What the shop page needs: their points, what they own, and what they
// have on.
async function shopView(userId) {
    const [user, owned] = await Promise.all([
        User.findById(userId).select("wallet gomoku").lean(),
        GomokuOwned.find({ user: userId }).sort({ boughtAt: 1 }).select("item").lean(),
    ]);
    if (!user) throw new GomokuShopError("That member doesn't exist any more.", 404);
    const pp = user.wallet?.pp ?? 0;
    const ppp = user.wallet?.ppp ?? 0;
    return {
        pp,
        ppp,
        points: pp + ppp,
        owned: owned.map((entry) => entry.item).filter((id) => gomokuItem(id)),
        equipped: loadoutOf(user.gomoku),
    };
}

// Buys `itemId` for its price in points. Resolves to { item, price }.
async function buyItem(userId, itemId) {
    const item = gomokuItem(itemId);
    if (!item) throw new GomokuShopError("That isn't for sale.", 404);
    if (isFree(item)) throw new GomokuShopError(`${item.name} is free, and already yours.`);

    return inSession(async (session) => {
        // Claimed first, so two clicks can't both pay for it.
        try {
            await GomokuOwned.create([{ user: userId, item: item.id, price: item.price }], { session });
        } catch (error) {
            if (error.code === 11000) throw new GomokuShopError(`You already own ${item.name}.`, 409);
            throw error;
        }

        try {
            await spend(userId, item.price, { reason: "gomokuShop", session });
        } catch (error) {
            // Not paid for: it isn't theirs. (A transaction undoes this by
            // itself; without one, it's undone here.)
            if (!session) await GomokuOwned.deleteOne({ user: userId, item: item.id });
            if (error instanceof WalletError && error.status === 400) {
                throw new GomokuShopError(`${item.name} costs ${format(item.price)} points. ${error.message}`);
            }
            throw error;
        }
        return { item: item.id, price: item.price };
    });
}

// Puts `itemId` on as their `kind` (piece, shockwave, board or grid), or
// takes it off (null: back to the default). Only what they own, or a free
// one. Resolves to what they have on now.
async function equipItem(userId, kind, itemId) {
    if (!KINDS.includes(kind)) throw new GomokuShopError("Pick a piece, a shockwave, a board or a grid.");
    const item = itemId === null || itemId === undefined ? null : gomokuItem(itemId);
    if (itemId && !item) throw new GomokuShopError("That isn't in the shop.", 404);
    if (item && item.kind !== kind) {
        throw new GomokuShopError(`That's one of the ${KIND_LABELS[item.kind].toLowerCase()}, not the ${KIND_LABELS[kind].toLowerCase()}.`);
    }
    if (item && !isFree(item) && !(await GomokuOwned.exists({ user: userId, item: item.id }))) {
        throw new GomokuShopError(`You don't own ${item.name}. Buy it first.`, 403);
    }

    const user = await User.findByIdAndUpdate(userId, { $set: { [`gomoku.${kind}`]: item ? item.id : null } }, { returnDocument: "after", timestamps: false })
        .select("gomoku")
        .lean();
    if (!user) throw new GomokuShopError("That member doesn't exist any more.", 404);
    return loadoutOf(user.gomoku);
}

// Developer tool only (routes/gomokuRouter.js): everything they bought
// goes, and the points it cost come back exactly as they were paid (PP as
// PP, P-PP as P-PP), so the shop can be tried again. Worked out from the
// receipts: what the shop took, less what earlier refunds like this gave
// back (gomokuRefund with no game). Resolves to { items, pp, ppp }.
async function refundShop(userId) {
    const owned = await GomokuOwned.countDocuments({ user: userId });
    const receipts = await WalletTx.find({
        user: userId,
        $or: [{ reason: "gomokuShop" }, { reason: "gomokuRefund", gomoku: null }],
    }).lean();
    const net = receipts.reduce((sum, tx) => ({ pp: sum.pp + tx.pp, ppp: sum.ppp + tx.ppp }), { pp: 0, ppp: 0 });
    const back = { pp: Math.max(0, 0 - net.pp), ppp: Math.max(0, 0 - net.ppp) };

    await GomokuOwned.deleteMany({ user: userId });
    await User.updateOne({ _id: userId }, { $set: { gomoku: { piece: null, shockwave: null, board: null, grid: null } } }, { timestamps: false });
    if (back.pp > 0 || back.ppp > 0) await changeWallet(userId, () => back, { reason: "gomokuRefund" });
    return { items: owned, ...back };
}

// An account is being deleted: what they bought goes with it.
function forgetGomokuShop(userId) {
    return GomokuOwned.deleteMany({ user: userId });
}

// Their shop, for their data export.
async function gomokuShopDataOf(userId) {
    const [owned, user] = await Promise.all([
        GomokuOwned.find({ user: userId }).sort({ boughtAt: 1 }).select("item price boughtAt -_id").lean(),
        mongoose.isValidObjectId(userId) ? User.findById(userId).select("gomoku").lean() : null,
    ]);
    return { owned, equipped: user ? loadoutOf(user.gomoku) : null };
}

module.exports = { GomokuShopError, WalletError, shopView, buyItem, equipItem, refundShop, forgetGomokuShop, gomokuShopDataOf };
