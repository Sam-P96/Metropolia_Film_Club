const mongoose = require("mongoose");
const User = require("../../models/userModel");
const StealItem = require("../../models/stealItemModel");
const StealPlayer = require("../../models/stealPlayerModel");
const StealAttack = require("../../models/stealAttackModel");
const StealMarket = require("../../models/stealMarketModel");
const { STEAL } = require("../../../shared/steal/config.js");
const { itemDef } = require("../../games/steal/items");
const { StealError, sellBackValue } = require("../../games/steal/rules");
const { changeWallet } = require("../wallet");
const { inSession } = require("./tx");

// Steal and Defend's items as members own them (spec §10): up to 27 each,
// up to 3 equipped, durability that wears down to nothing, and selling
// back to the shop.

const ACTIVE = ["quiz", "resolving"];

function itemsOf(userId, session = null) {
    return StealItem.find({ owner: userId }).sort({ createdAt: 1, _id: 1 }).session(session).lean();
}

function countItems(userId, session = null) {
    return StealItem.countDocuments({ owner: userId }).session(session);
}

// Throws unless `userId` has room for `adding` more items once `removing`
// have gone.
async function refuseIfFull(userId, adding, { removing = 0, session = null, who = "you" } = {}) {
    const count = await countItems(userId, session);
    if (count - removing + adding > STEAL.inventory.size) {
        throw new StealError(
            who === "you"
                ? `Your inventory is full (${STEAL.inventory.size} items). Sell or send something first.`
                : `${who}'s inventory is full.`,
            409,
            "INVENTORY_FULL"
        );
    }
}

// A brand-new item for `ownerId`, as the shop sells it.
async function createItem(ownerId, key, price, session = null) {
    const def = itemDef(key);
    if (!def) throw new StealError("That item doesn't exist any more.", 410);
    const [item] = await StealItem.create(
        [{ owner: ownerId, key, durability: def.durability, maxDurability: def.durability, originalPrice: price, unique: def.unique }],
        { session }
    );
    return item.toObject();
}

// Their equipped items, as { item, key, def }, skipping any that have since
// gone (broken, sold, traded).
async function equippedOf(userId, session = null) {
    const player = await StealPlayer.findById(userId).select("equipped").session(session).lean();
    const ids = (player?.equipped ?? []).map((slot) => slot.item);
    if (ids.length === 0) return [];
    const items = await StealItem.find({ _id: { $in: ids }, owner: userId }).session(session).lean();
    const byId = new Map(items.map((item) => [String(item._id), item]));
    return ids
        .map((id) => byId.get(String(id)))
        .filter(Boolean)
        .map((item) => ({ item, key: item.key, def: itemDef(item.key) }))
        .filter((entry) => entry.def);
}

// Whether they're playing an attack of their own right now: their items
// are locked until it ends.
function attackingNow(userId, session = null) {
    return StealAttack.exists({ attacker: userId, status: { $in: ACTIVE } }).session(session);
}

// Throws while their points are frozen by an attack (spec §6): no
// trading, listing or selling until it's over.
async function refuseIfFrozen(userId, session = null) {
    const user = await User.findById(userId).select("wallet.frozenUntil").session(session).lean();
    if (user?.wallet?.frozenUntil && user.wallet.frozenUntil > new Date()) {
        throw new StealError("Your points and items are frozen while an attack you're in is being played. Try again when it's over.", 409, "FROZEN");
    }
}

async function ownItem(userId, itemId, session = null) {
    if (!mongoose.isValidObjectId(itemId)) throw new StealError("Pick one of your items.");
    const item = await StealItem.findOne({ _id: itemId, owner: userId }).session(session).lean();
    if (!item) throw new StealError("That isn't one of your items.", 404);
    return item;
}

// Equips one of their items (spec §10.1): PvP on, not in their own attack,
// at most 3, never two of the same.
async function equip(userId, itemId) {
    const item = await ownItem(userId, itemId);
    const def = itemDef(item.key);
    if (!def) throw new StealError("That item doesn't exist any more.", 410);
    if (item.state !== "owned") throw new StealError("That item is up for sale or in a trade.", 409);
    if (await attackingNow(userId)) throw new StealError("Your items are locked until your attack is over.", 409, "LOCKED");

    const [user, player] = await Promise.all([
        User.findById(userId).select("pvp").lean(),
        StealPlayer.findById(userId).select("equipped").lean(),
    ]);
    if (!user?.pvp) throw new StealError("Turn on PVP from your profile page to equip items.", 403, "PVP_OFF");
    const equipped = player?.equipped ?? [];
    if (equipped.some((slot) => String(slot.item) === String(item._id))) return;
    if (equipped.some((slot) => slot.key === item.key)) throw new StealError(`You already have a ${def.name} equipped.`, 409);
    if (equipped.length >= STEAL.inventory.slots) {
        throw new StealError(`You can equip ${STEAL.inventory.slots} items at once. Unequip one first.`, 409, "SLOTS_FULL");
    }

    // In one step, so two at once can't fill a fourth slot or equip a copy.
    // Their settings are made here if they've never played.
    const refused = new StealError("Couldn't equip that. Try again.", 409);
    const result = await StealPlayer.updateOne(
        {
            _id: userId,
            "equipped.key": { $ne: item.key },
            [`equipped.${STEAL.inventory.slots - 1}`]: { $exists: false },
        },
        { $push: { equipped: { item: item._id, key: item.key } } },
        { upsert: true }
    ).catch((error) => {
        if (error.code === 11000) throw refused;
        throw error;
    });
    if (result.modifiedCount + result.upsertedCount === 0) throw refused;
}

async function unequip(userId, itemId) {
    if (!mongoose.isValidObjectId(itemId)) throw new StealError("Pick one of your items.");
    if (await attackingNow(userId)) throw new StealError("Your items are locked until your attack is over.", 409, "LOCKED");
    await StealPlayer.updateOne({ _id: userId }, { $pull: { equipped: { item: itemId } } });
}

// An item breaks or leaves the game: it's gone from its owner's slots and
// the player market. A broken Infinity Stone can be rolled in the shop again.
async function destroyItem(item, session = null) {
    await StealItem.deleteOne({ _id: item._id }).session(session);
    await StealPlayer.updateOne({ _id: item.owner }, { $pull: { equipped: { item: item._id } } }, { session });
    await StealMarket.updateMany({ item: item._id, status: "open" }, { $set: { status: "cancelled", closedAt: new Date() } }, { session });
}

// Wears items down: `changes` is [{ item, loss }]. Each that reaches 0
// breaks. Returns what happened to each, for the attack's result:
// { owner, item, key, before, after, destroyed }.
async function wear(changes, session = null) {
    const records = [];
    for (const { item, loss } of changes) {
        if (!(loss > 0)) continue;
        const after = await StealItem.findOneAndUpdate(
            { _id: item._id },
            { $inc: { durability: -loss } },
            { returnDocument: "after", session }
        ).lean();
        if (!after) continue;
        const destroyed = after.durability <= 0;
        if (destroyed) await destroyItem(after, session);
        records.push({
            owner: after.owner,
            item: after._id,
            key: after.key,
            before: after.durability + loss,
            after: Math.max(0, after.durability),
            destroyed,
        });
    }
    return records;
}

// Breaks items outright (the Power Stone).
async function destroyAll(items, session = null) {
    const records = [];
    for (const item of items) {
        await destroyItem(item, session);
        records.push({ owner: item.owner, item: item._id, key: item.key, before: item.durability, after: 0, destroyed: true });
    }
    return records;
}

// What the shop pays for `item` back.
const sellValueOf = (item) => sellBackValue(item.originalPrice, item.durability, item.maxDurability);

// Sells one of their items back to the shop (spec §10.5), for P-PP.
async function sellBack(userId, itemId) {
    const item = await ownItem(userId, itemId);
    if (item.state !== "owned") throw new StealError("Take it off the market or out of the trade first.", 409);
    const player = await StealPlayer.findById(userId).select("equipped").lean();
    if (player?.equipped?.some((slot) => String(slot.item) === String(item._id))) {
        throw new StealError("Unequip it first.", 409, "EQUIPPED");
    }
    await refuseIfFrozen(userId);

    const value = sellValueOf(item);
    await inSession(async (session) => {
        const gone = await StealItem.deleteOne({ _id: item._id, owner: userId, state: "owned" }).session(session);
        if (gone.deletedCount === 0) throw new StealError("That item has just changed. Try again.", 409);
        await changeWallet(userId, () => ({ ppp: value }), { reason: "stealSell", stealRef: item._id, session });
    });
    return { value };
}

// Wears down equipped items that tick down each day (`dailyTickdown` in
// the items file) by 1. No item does yet, but the shop could sell one.
async function dailyTickdown() {
    const keys = require("../../games/steal/items").ITEMS.filter((def) => def.dailyTickdown).map((def) => def.id);
    if (keys.length === 0) return 0;
    const players = await StealPlayer.find({ "equipped.key": { $in: keys } }).select("equipped").lean();
    let worn = 0;
    for (const player of players) {
        const ids = player.equipped.filter((slot) => keys.includes(slot.key)).map((slot) => slot.item);
        const items = await StealItem.find({ _id: { $in: ids }, owner: player._id }).lean();
        worn += (await wear(items.map((item) => ({ item, loss: 1 })))).length;
    }
    return worn;
}

// An item as the pages show it. `equipped`: a Set of equipped item ids,
// only ever for the owner (who has what equipped is a secret, bar the
// Marauder's Map).
function itemView(item, { equipped = null } = {}) {
    const def = itemDef(item.key);
    return {
        _id: item._id,
        key: item.key,
        name: def?.name ?? "Unknown item",
        type: def?.type ?? null,
        tier: def?.tier ?? null,
        unique: Boolean(def?.unique),
        effect: def?.effect ?? "",
        durability: item.durability,
        maxDurability: item.maxDurability,
        originalPrice: item.originalPrice,
        sellValue: sellValueOf(item),
        state: item.state,
        ...(equipped ? { equipped: equipped.has(String(item._id)) } : {}),
    };
}

module.exports = {
    itemsOf,
    countItems,
    refuseIfFull,
    createItem,
    equippedOf,
    attackingNow,
    refuseIfFrozen,
    ownItem,
    equip,
    unequip,
    destroyItem,
    wear,
    destroyAll,
    sellValueOf,
    sellBack,
    dailyTickdown,
    itemView,
};
