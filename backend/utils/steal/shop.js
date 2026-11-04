const mongoose = require("mongoose");
const User = require("../../models/userModel");
const Review = require("../../models/reviewModel");
const StealItem = require("../../models/stealItemModel");
const StealListing = require("../../models/stealListingModel");
const StealMarket = require("../../models/stealMarketModel");
const { STEAL } = require("../../../shared/steal/config.js");
const { ITEMS, itemDef } = require("../../games/steal/items");
const { StealError, itemPrice, rollShop, shopDay, nextDailyResetAt } = require("../../games/steal/rules");
const { changeWallet, dailyPp, spend } = require("../wallet");
const { inSession } = require("./tx");
const { refuseIfFull, createItem } = require("./inventory");
const { refuseIfBanned } = require("./moderation");

// The shop (spec §10.3): nine listings a day, each a tier roll, each sold
// once to whoever's first. Prices are the item's multiplier times the
// buyer's daily PP, so everyone sees their own.

// The Infinity Stones that exist right now: owned by someone (inventory,
// player market or a trade) or listed in today's shop and not yet bought.
async function existingStones(day) {
    const stones = ITEMS.filter((item) => item.unique).map((item) => item.id);
    const [owned, listed] = await Promise.all([
        StealItem.distinct("key", { unique: true }),
        StealListing.distinct("key", { day, soldTo: null, key: { $in: stones } }),
    ]);
    return [...new Set([...owned, ...listed])];
}

// Makes the day's listings if they aren't there yet. Only once at a time
// in this server; the unique index stops a second server making more.
const making = new Map();

async function ensureShop(day = shopDay()) {
    if (await StealListing.exists({ day })) return;
    if (!making.has(day)) {
        making.set(day, (async () => {
            const picks = rollShop({ items: ITEMS, existing: await existingStones(day) });
            const docs = picks.map((key, slot) => ({ day, slot, key }));
            await StealListing.insertMany(docs, { ordered: false }).catch((error) => {
                if (error.code !== 11000 && !error.writeErrors?.every((e) => e.code === 11000)) throw error;
            });
        })().finally(() => making.delete(day)));
    }
    await making.get(day);
}

async function reviewCountOf(userId) {
    return Review.countDocuments({ user: userId });
}

// Why `userId` can't buy items, or null: 5 reviews, no debt, no ban.
async function buyRefusal(userId) {
    const [reviews, user] = await Promise.all([reviewCountOf(userId), User.findById(userId).select("wallet").lean()]);
    if (reviews < STEAL.eligibility.reviewsToBuy) {
        return `You need ${STEAL.eligibility.reviewsToBuy} reviews to buy items. You have ${reviews}.`;
    }
    if ((user?.wallet?.pp ?? 0) + (user?.wallet?.ppp ?? 0) < 0) return "You can't buy items while your balance is negative.";
    return null;
}

// Today's listings with this member's prices, and when the next ones go up.
async function shopFor(userId, now = new Date()) {
    const day = shopDay(now);
    await ensureShop(day);
    const [listings, reviews, refusal] = await Promise.all([
        StealListing.find({ day }).sort({ slot: 1 }).lean(),
        userId ? reviewCountOf(userId) : 0,
        userId ? buyRefusal(userId) : "Log in to buy items.",
    ]);
    const daily = dailyPp(reviews);
    return {
        day,
        nextRefreshAt: nextDailyResetAt(now),
        dailyPp: daily,
        canBuy: !refusal,
        refusal,
        listings: listings.map((listing) => {
            const def = itemDef(listing.key);
            return {
                _id: listing._id,
                key: listing.key,
                name: def?.name ?? "Unknown item",
                type: def?.type ?? null,
                tier: def?.tier ?? null,
                unique: Boolean(def?.unique),
                effect: def?.effect ?? "",
                durability: def?.durability ?? 0,
                price: def ? itemPrice(def.priceMultiplier, daily) : null,
                sold: Boolean(listing.soldTo),
                boughtByYou: Boolean(userId && listing.soldTo && String(listing.soldTo) === String(userId)),
            };
        }),
    };
}

// Buys a listing (spec §10.3): first come, first served. PP first, then P-PP.
async function buyListing(userId, listingId) {
    if (!mongoose.isValidObjectId(listingId)) throw new StealError("Pick something in the shop.");
    await refuseIfBanned(userId, "buy");
    const refusal = await buyRefusal(userId);
    if (refusal) throw new StealError(refusal, 403, "CANT_BUY");
    await refuseIfFull(userId, 1);

    const day = shopDay();
    const listing = await StealListing.findOne({ _id: listingId, day }).lean();
    if (!listing) throw new StealError("That listing has gone: the shop has refreshed.", 404);
    const def = itemDef(listing.key);
    if (!def) throw new StealError("That item doesn't exist any more.", 410);
    if (listing.soldTo) throw new StealError("Someone else bought that one first.", 409, "SOLD");
    const price = itemPrice(def.priceMultiplier, dailyPp(await reviewCountOf(userId)));

    const item = await inSession(async (session) => {
        const claimed = await StealListing.updateOne(
            { _id: listing._id, soldTo: null },
            { $set: { soldTo: userId, soldAt: new Date(), price } },
            { session }
        );
        if (claimed.modifiedCount === 0) throw new StealError("Someone else bought that one first.", 409, "SOLD");
        const taken = await spend(userId, price, { reason: "stealBuy", session });
        try {
            return await createItem(userId, listing.key, price, session);
        } catch (error) {
            // A transaction undoes the payment by itself; without one, hand it back.
            if (!session) await changeWallet(userId, () => ({ pp: 0 - taken.pp, ppp: 0 - taken.ppp }), { reason: "refund" });
            throw error;
        }
    }).catch(async (error) => {
        // Without transactions (a local MongoDB), undo the claim by hand.
        await StealListing.updateOne({ _id: listing._id, soldTo: userId, price }, { $set: { soldTo: null, soldAt: null, price: null } })
            .catch(() => {});
        if (error.code === 11000) throw new StealError("That Infinity Stone already belongs to someone.", 409, "SOLD");
        throw error;
    });
    return { item, price };
}

// The player market's open listings, newest first.
function openMarket() {
    return StealMarket.find({ status: "open" }).sort({ createdAt: -1 }).limit(100).lean();
}

module.exports = { existingStones, ensureShop, buyRefusal, shopFor, buyListing, openMarket, reviewCountOf };
