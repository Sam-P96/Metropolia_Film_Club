const mongoose = require("mongoose");
const User = require("../../models/userModel");
const StealItem = require("../../models/stealItemModel");
const StealPlayer = require("../../models/stealPlayerModel");
const StealMarket = require("../../models/stealMarketModel");
const StealTrade = require("../../models/stealTradeModel");
const { STEAL } = require("../../../shared/steal/config.js");
const { itemDef } = require("../../games/steal/items");
const { StealError } = require("../../games/steal/rules");
const { changeWallet, spend } = require("../wallet");
const { inSession } = require("./tx");
const { refuseIfFull, refuseIfFrozen, ownItem, countItems } = require("./inventory");
const { refuseIfBanned, checkTrade, recordSighting } = require("./moderation");
const { buyRefusal } = require("./shop");

// Players trading items (spec §10.5): the player market (fixed prices in
// PP), private trade offers (items and/or PP either way, held in escrow
// until answered), and gifts. PP paid comes out PP first, then P-PP; PP
// received comes in as P-PP, like everything else this game pays.

const MAX_PRICE = 1_000_000_000;
const MAX_PENDING = 20;
const DAY_MS = 24 * 60 * 60 * 1000;

const same = (a, b) => a != null && b != null && String(a) === String(b);

function wholePp(value, what) {
    const amount = Number(value ?? 0);
    if (!Number.isInteger(amount) || amount < 0 || amount > MAX_PRICE) {
        throw new StealError(`${what} has to be a whole number of PP.`);
    }
    return amount;
}

function idList(value, what) {
    const ids = Array.isArray(value) ? value.map(String) : [];
    if (!ids.every((id) => mongoose.isValidObjectId(id))) throw new StealError(`Pick ${what} from the list.`);
    if (new Set(ids).size !== ids.length) throw new StealError(`Each item only once, please.`);
    if (ids.length > STEAL.inventory.size) throw new StealError(`That's more items than anyone can hold.`);
    return ids;
}

async function isEquipped(userId, itemIds, session = null) {
    const player = await StealPlayer.findById(userId).select("equipped").session(session).lean();
    const equipped = new Set((player?.equipped ?? []).map((slot) => String(slot.item)));
    return itemIds.filter((id) => equipped.has(String(id)));
}

async function findMember(id) {
    if (!mongoose.isValidObjectId(id)) throw new StealError("Pick a member.");
    const user = await User.findById(id).select("username").lean();
    if (!user) throw new StealError("That member doesn't exist any more.", 404);
    return user;
}

// --- the player market ---

async function listItem(req, itemId, priceValue) {
    const userId = req.user._id;
    await refuseIfBanned(userId, "trade");
    await refuseIfFrozen(userId);
    const price = wholePp(priceValue, "A price");
    if (price < 1) throw new StealError("A price is at least 1 PP.");
    const item = await ownItem(userId, itemId);
    if (item.state !== "owned") throw new StealError("That item is already up for sale or in a trade.", 409);
    if ((await isEquipped(userId, [item._id])).length > 0) throw new StealError("Unequip it first.", 409, "EQUIPPED");

    const listed = await StealItem.updateOne({ _id: item._id, owner: userId, state: "owned" }, { $set: { state: "listed" } });
    if (listed.modifiedCount === 0) throw new StealError("That item has just changed. Try again.", 409);
    const listing = await StealMarket.create({ seller: userId, item: item._id, key: item.key, price });
    await recordSighting(req, userId).catch(() => {});
    return listing.toObject();
}

async function cancelListing(userId, listingId) {
    if (!mongoose.isValidObjectId(listingId)) throw new StealError("Pick one of your listings.");
    const listing = await StealMarket.findOneAndUpdate(
        { _id: listingId, seller: userId, status: "open" },
        { $set: { status: "cancelled", closedAt: new Date() } },
        { returnDocument: "after" }
    ).lean();
    if (!listing) throw new StealError("That listing isn't open.", 404);
    await StealItem.updateOne({ _id: listing.item, owner: userId, state: "listed" }, { $set: { state: "owned" } });
}

async function buyFromMarket(req, listingId) {
    const userId = req.user._id;
    if (!mongoose.isValidObjectId(listingId)) throw new StealError("Pick something on the market.");
    const listing = await StealMarket.findOne({ _id: listingId, status: "open" }).lean();
    if (!listing) throw new StealError("That listing has gone.", 404);
    if (same(listing.seller, userId)) throw new StealError("That's your own listing.", 400);
    await refuseIfBanned(userId, "buy");
    await refuseIfBanned(userId, "trade");
    const refusal = await buyRefusal(userId);
    if (refusal) throw new StealError(refusal, 403, "CANT_BUY");
    await refuseIfFrozen(userId);
    await refuseIfFull(userId, 1);

    const item = await StealItem.findOne({ _id: listing.item, owner: listing.seller, state: "listed" }).lean();
    if (!item) {
        await StealMarket.updateOne({ _id: listing._id, status: "open" }, { $set: { status: "cancelled", closedAt: new Date() } });
        throw new StealError("That item isn't for sale any more.", 410);
    }

    await inSession(async (session) => {
        const claimed = await StealMarket.updateOne(
            { _id: listing._id, status: "open" },
            { $set: { status: "sold", buyer: userId, closedAt: new Date() } },
            { session }
        );
        if (claimed.modifiedCount === 0) throw new StealError("Someone else bought it first.", 409, "SOLD");
        await spend(userId, listing.price, { reason: "stealBuy", session });
        await changeWallet(listing.seller, () => ({ ppp: listing.price }), {
            reason: "stealSell",
            stealRef: listing._id,
            other: userId,
            session,
        });
        const moved = await StealItem.updateOne(
            { _id: item._id, owner: listing.seller, state: "listed" },
            { $set: { owner: userId, state: "owned", acquiredAt: new Date() } },
            { session }
        );
        if (moved.modifiedCount === 0) throw new StealError("That item has just changed. Try again.", 409);
    }).catch(async (error) => {
        // Without transactions, a payment that didn't go through leaves it for sale.
        await StealMarket.updateOne({ _id: listing._id, status: "sold", buyer: userId }, { $set: { status: "open", buyer: null, closedAt: null } })
            .catch(() => {});
        throw error;
    });

    await recordSighting(req, userId).catch(() => {});
    await checkTrade(listing.seller, userId, { pp: listing.price, items: [{ originalPrice: item.originalPrice, tier: itemDef(item.key)?.tier }] });
}

// --- trade offers ---

async function offerTrade(req, body = {}) {
    const userId = req.user._id;
    const to = await findMember(body.to);
    if (same(to._id, userId)) throw new StealError("You can't trade with yourself.");
    await refuseIfBanned(userId, "trade");
    await refuseIfFrozen(userId);

    const giveIds = idList(body.giveItems, "your items");
    const wantIds = idList(body.wantItems, "their items");
    const givePp = wholePp(body.givePp, "PP you offer");
    const wantPp = wholePp(body.wantPp, "PP you ask for");
    if (giveIds.length + wantIds.length === 0 && givePp + wantPp === 0) throw new StealError("Put something in the trade.");
    if (giveIds.length + givePp === 0) throw new StealError("Offer something: an item or some PP. (To ask for nothing back, send a gift.)");

    const pending = await StealTrade.countDocuments({ from: userId, status: "pending" });
    if (pending >= MAX_PENDING) throw new StealError(`You have ${MAX_PENDING} offers waiting already. Cancel one first.`, 409);

    const [give, want] = await Promise.all([
        StealItem.find({ _id: { $in: giveIds }, owner: userId, state: "owned" }).lean(),
        StealItem.find({ _id: { $in: wantIds }, owner: to._id, state: { $in: ["owned", "listed"] } }).lean(),
    ]);
    if (give.length !== giveIds.length) throw new StealError("Some of those items aren't yours to offer (sold, listed or in another trade).", 409);
    if (want.length !== wantIds.length) throw new StealError(`Some of those items aren't ${to.username}'s any more.`, 409);
    if ((await isEquipped(userId, giveIds)).length > 0) throw new StealError("Unequip the items you're offering first.", 409, "EQUIPPED");

    const trade = await inSession(async (session) => {
        if (giveIds.length > 0) {
            const held = await StealItem.updateMany({ _id: { $in: giveIds }, owner: userId, state: "owned" }, { $set: { state: "escrow" } }, { session });
            if (held.modifiedCount !== giveIds.length) throw new StealError("Those items have just changed. Try again.", 409);
        }
        let held = { pp: 0, ppp: 0 };
        if (givePp > 0) {
            try {
                const taken = await spend(userId, givePp, { reason: "stealTrade", session });
                held = { pp: 0 - taken.pp, ppp: 0 - taken.ppp };
            } catch (error) {
                if (!session) await StealItem.updateMany({ _id: { $in: giveIds }, owner: userId, state: "escrow" }, { $set: { state: "owned" } });
                throw error;
            }
        }
        const [created] = await StealTrade.create(
            [{
                from: userId,
                to: to._id,
                give: { items: giveIds, pp: givePp, held },
                want: { items: wantIds, pp: wantPp },
                keys: { give: give.map((item) => item.key), want: want.map((item) => item.key) },
            }],
            { session }
        );
        return created.toObject();
    });
    await recordSighting(req, userId).catch(() => {});
    return trade;
}

// Hands back what a trade held: the offered items, and the PP exactly as
// it came out of the wallet.
async function releaseEscrow(trade, session = null) {
    if (trade.give.items.length > 0) {
        await StealItem.updateMany({ _id: { $in: trade.give.items }, owner: trade.from, state: "escrow" }, { $set: { state: "owned" } }, { session });
    }
    const held = trade.give.held ?? { pp: 0, ppp: 0 };
    if (held.pp > 0 || held.ppp > 0) {
        await changeWallet(trade.from, () => ({ pp: held.pp, ppp: held.ppp }), { reason: "stealTrade", stealRef: trade._id, session }).catch(
            (error) => console.error("Steal and Defend couldn't hand back a trade's PP:", error.message)
        );
    }
}

async function closeTrade(filter, status) {
    const trade = await StealTrade.findOneAndUpdate(
        { ...filter, status: "pending" },
        { $set: { status, answeredAt: new Date() } },
        { returnDocument: "after" }
    ).lean();
    if (!trade) throw new StealError("That offer isn't waiting any more.", 404);
    await releaseEscrow(trade);
    return trade;
}

const declineTrade = (userId, tradeId) => {
    if (!mongoose.isValidObjectId(tradeId)) throw new StealError("Pick an offer.");
    return closeTrade({ _id: tradeId, to: userId }, "declined");
};

const cancelTrade = (userId, tradeId) => {
    if (!mongoose.isValidObjectId(tradeId)) throw new StealError("Pick an offer.");
    return closeTrade({ _id: tradeId, from: userId }, "cancelled");
};

async function acceptTrade(req, tradeId) {
    const userId = req.user._id;
    if (!mongoose.isValidObjectId(tradeId)) throw new StealError("Pick an offer.");
    const trade = await StealTrade.findOne({ _id: tradeId, to: userId, status: "pending" }).lean();
    if (!trade) throw new StealError("That offer isn't waiting any more.", 404);
    await refuseIfBanned(userId, "trade");
    await refuseIfBanned(trade.from, "trade").catch(() => {
        throw new StealError("The member who sent this can't trade right now.", 409);
    });
    await refuseIfFrozen(userId);
    await refuseIfFrozen(trade.from).catch(() => {
        throw new StealError("The member who sent this is in an attack right now. Try again in a few minutes.", 409, "FROZEN");
    });

    const want = await StealItem.find({ _id: { $in: trade.want.items }, owner: userId, state: "owned" }).lean();
    if (want.length !== trade.want.items.length) {
        throw new StealError("Some of the items asked for aren't yours to give any more (gone, listed or in another trade).", 409);
    }
    const equipped = await isEquipped(userId, trade.want.items);
    if (equipped.length > 0) throw new StealError("Unequip the items they asked for first.", 409, "EQUIPPED");
    await refuseIfFull(userId, trade.give.items.length, { removing: trade.want.items.length });
    const theirs = await countItems(trade.from);
    if (theirs - trade.give.items.length + trade.want.items.length > STEAL.inventory.size) {
        throw new StealError("Their inventory would be too full for this trade.", 409, "INVENTORY_FULL");
    }
    const give = await StealItem.find({ _id: { $in: trade.give.items } }).lean();

    await inSession(async (session) => {
        const claimed = await StealTrade.updateOne(
            { _id: trade._id, status: "pending" },
            { $set: { status: "accepted", answeredAt: new Date() } },
            { session }
        );
        if (claimed.modifiedCount === 0) throw new StealError("That offer isn't waiting any more.", 404);

        if (trade.want.pp > 0) {
            await spend(userId, trade.want.pp, { reason: "stealTrade", session });
            await changeWallet(trade.from, () => ({ ppp: trade.want.pp }), { reason: "stealTrade", stealRef: trade._id, other: userId, session });
        }
        if (trade.give.pp > 0) {
            await changeWallet(userId, () => ({ ppp: trade.give.pp }), { reason: "stealTrade", stealRef: trade._id, other: trade.from, session });
        }
        const now = new Date();
        if (trade.give.items.length > 0) {
            const moved = await StealItem.updateMany(
                { _id: { $in: trade.give.items }, owner: trade.from, state: "escrow" },
                { $set: { owner: userId, state: "owned", acquiredAt: now } },
                { session }
            );
            if (moved.modifiedCount !== trade.give.items.length) throw new StealError("Some of the offered items have gone.", 409);
        }
        if (trade.want.items.length > 0) {
            const moved = await StealItem.updateMany(
                { _id: { $in: trade.want.items }, owner: userId, state: "owned" },
                { $set: { owner: trade.from, acquiredAt: now } },
                { session }
            );
            if (moved.modifiedCount !== trade.want.items.length) throw new StealError("Some of the items asked for have gone.", 409);
        }
    }).catch(async (error) => {
        // Without transactions: put the offer back if paying for it failed.
        await StealTrade.updateOne({ _id: trade._id, status: "accepted" }, { $set: { status: "pending", answeredAt: null } }).catch(() => {});
        throw error;
    });

    await recordSighting(req, userId).catch(() => {});
    // A price check only makes sense for items one way and PP the other.
    const items = [...give, ...want].map((item) => ({ originalPrice: item.originalPrice, tier: itemDef(item.key)?.tier }));
    const oneWay = (trade.give.items.length === 0) !== (trade.want.items.length === 0);
    await checkTrade(trade.from, userId, { pp: oneWay ? trade.give.pp + trade.want.pp : Number.NaN, items: oneWay ? items : [] });
}

// Pending offers nobody answered in a week are cancelled.
async function expireTrades(now = new Date()) {
    const old = await StealTrade.find({ status: "pending", createdAt: { $lt: new Date(now - STEAL.tradeExpiryDays * DAY_MS) } })
        .select("_id")
        .lean();
    for (const { _id } of old) await closeTrade({ _id }, "cancelled").catch(() => {});
    return old.length;
}

// --- gifts ---

async function giftItem(req, body = {}) {
    const userId = req.user._id;
    const to = await findMember(body.to);
    if (same(to._id, userId)) throw new StealError("You can't send yourself a gift.");
    await refuseIfBanned(userId, "trade");
    await refuseIfFrozen(userId);
    const item = await ownItem(userId, body.item);
    if (item.state !== "owned") throw new StealError("That item is up for sale or in a trade.", 409);
    if ((await isEquipped(userId, [item._id])).length > 0) throw new StealError("Unequip it first.", 409, "EQUIPPED");
    await refuseIfFull(to._id, 1, { who: to.username });

    const moved = await StealItem.updateOne(
        { _id: item._id, owner: userId, state: "owned" },
        { $set: { owner: to._id, acquiredAt: new Date() } }
    );
    if (moved.modifiedCount === 0) throw new StealError("That item has just changed. Try again.", 409);
    await StealTrade.create({
        from: userId,
        to: to._id,
        gift: true,
        give: { items: [item._id] },
        keys: { give: [item.key] },
        status: "accepted",
        answeredAt: new Date(),
    });
    await recordSighting(req, userId).catch(() => {});
    await checkTrade(userId, to._id, { gift: true, pp: 0, items: [{ originalPrice: item.originalPrice, tier: itemDef(item.key)?.tier }] });
    return { to: to.username };
}

module.exports = {
    listItem,
    cancelListing,
    buyFromMarket,
    offerTrade,
    acceptTrade,
    declineTrade,
    cancelTrade,
    releaseEscrow,
    expireTrades,
    giftItem,
};
