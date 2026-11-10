const mongoose = require("mongoose");
const User = require("../models/userModel");
const Review = require("../models/reviewModel");
const CosmeticOwned = require("../models/cosmeticOwnedModel");
const CosmeticWish = require("../models/cosmeticWishModel");
const { cosmeticById } = require("../../shared/cosmetics/catalogue.js");
const { WalletError, changeWallet } = require("./wallet");
const { inSession } = require("./steal/tx");
const { cosmeticsOf } = require("./serialize");

// The Black Market (the Loan Shark page's "Black Market" button): name
// styles and profile-picture borders, from shared/cosmetics/catalogue.js.
//   - Bought with P-PP only, never PP, and the P-PP is burned.
//   - The review requirement is checked when buying, and only then: what's
//     bought is kept for good.
//   - No refunds, no selling back, no trading, no gifting.
//   - "Default" (no effect) is free, and everyone has it.
// The page asks before every purchase; the rules are all checked here.

class ShopError extends Error {
    constructor(message, status = 400) {
        super(message);
        this.status = status;
    }
}

const isDefault = (item) => !item.look;

// How many members have hearted each item: { [itemId]: count }, only the
// items with any. The shop's "Popular" sort.
async function popularity() {
    const counts = await CosmeticWish.aggregate([{ $group: { _id: "$item", hearts: { $sum: 1 } } }]);
    return Object.fromEntries(counts.filter((entry) => cosmeticById(entry._id)).map((entry) => [entry._id, entry.hearts]));
}

// What the page needs: the member's P-PP, reviews, what they own, what
// they've hearted and what they're wearing, and every item's hearts.
async function shopView(userId) {
    const [user, reviews, owned, wished, hearts] = await Promise.all([
        User.findById(userId).select("wallet cosmetics").lean(),
        Review.countDocuments({ user: userId }),
        CosmeticOwned.find({ user: userId }).sort({ boughtAt: 1 }).select("item").lean(),
        CosmeticWish.find({ user: userId }).sort({ at: 1 }).select("item").lean(),
        popularity(),
    ]);
    if (!user) throw new ShopError("That member doesn't exist any more.", 404);
    return {
        ppp: user.wallet?.ppp ?? 0,
        reviews,
        owned: owned.map((entry) => entry.item).filter((id) => cosmeticById(id)),
        wishlist: wished.map((entry) => entry.item).filter((id) => cosmeticById(id)),
        wearing: cosmeticsOf(user),
        hearts,
    };
}

// Hearts `itemId` (`on` true) or takes the heart off (false): their
// wishlist, owned or not. Default can't be hearted. Resolves to
// { item, on }. Doing it twice is the same as once.
async function wishCosmetic(userId, itemId, on) {
    const item = cosmeticById(typeof itemId === "string" ? itemId : null);
    if (!item) throw new ShopError("That isn't a cosmetic.", 404);
    if (isDefault(item)) throw new ShopError("Default is free, and already yours.");
    if (typeof on !== "boolean") throw new ShopError("Heart it, or take the heart off.");

    if (on) {
        await CosmeticWish.updateOne({ user: userId, item: item.id }, { $setOnInsert: { at: new Date() } }, { upsert: true }).catch((error) => {
            // Two hearts at once: one of them made it, which is all we want.
            if (error.code !== 11000) throw error;
        });
    } else {
        await CosmeticWish.deleteOne({ user: userId, item: item.id });
    }
    return { item: item.id, on };
}

// Buys `itemId` for its price in P-PP. Resolves to { item, price, ppp }
// (their P-PP after).
async function buyCosmetic(userId, itemId) {
    const item = cosmeticById(typeof itemId === "string" ? itemId : null);
    if (!item) throw new ShopError("That isn't for sale.", 404);
    if (isDefault(item)) throw new ShopError("Default is free, and already yours.");

    const reviews = await Review.countDocuments({ user: userId });
    if (reviews < item.reviews) {
        throw new ShopError(`${item.name} needs ${item.reviews} reviews, and you have ${reviews}. Write ${item.reviews - reviews} more first.`, 403);
    }

    return inSession(async (session) => {
        // Claimed first, so two clicks can't both pay for it.
        try {
            await CosmeticOwned.create([{ user: userId, item: item.id, price: item.price }], { session });
        } catch (error) {
            if (error.code === 11000) throw new ShopError(`You already own ${item.name}.`, 409);
            throw error;
        }

        let paid;
        try {
            paid = await changeWallet(
                userId,
                (wallet) => {
                    if (wallet.ppp < item.price) {
                        throw new ShopError(`${item.name} costs ${item.price.toLocaleString("en-US")} P-PP, and you have ${Math.max(0, wallet.ppp).toLocaleString("en-US")}. The Black Market only takes P-PP.`);
                    }
                    return { ppp: 0 - item.price };
                },
                { reason: "blackMarket", session },
            );
        } catch (error) {
            // Not paid for: it isn't theirs. (A transaction undoes this by
            // itself; without one, it's undone here.)
            if (!session) await CosmeticOwned.deleteOne({ user: userId, item: item.id });
            throw error;
        }

        return { item: item.id, price: item.price, ppp: paid.balance.ppp };
    });
}

// Wears `itemId` as their name style or border (`type`), or takes it off
// (null, or the Default item). Only what they own. Resolves to what they're
// wearing now.
async function wearCosmetic(userId, type, itemId) {
    if (type !== "name" && type !== "border") throw new ShopError("Pick a name style or a border.");
    const item = itemId ? cosmeticById(typeof itemId === "string" ? itemId : null) : null;
    if (itemId && !item) throw new ShopError("That isn't a cosmetic.", 404);
    if (item && item.type !== type) throw new ShopError(`That's a ${item.type === "name" ? "name style" : "border"}, not a ${type === "name" ? "name style" : "border"}.`);

    const wearing = item && !isDefault(item) ? item.id : null;
    if (wearing && !(await CosmeticOwned.exists({ user: userId, item: wearing }))) {
        throw new ShopError(`You don't own ${item.name}. Buy it first.`, 403);
    }

    const user = await User.findByIdAndUpdate(userId, { $set: { [`cosmetics.${type}`]: wearing } }, { returnDocument: "after", timestamps: false })
        .select("cosmetics")
        .lean();
    if (!user) throw new ShopError("That member doesn't exist any more.", 404);
    return cosmeticsOf(user);
}

// An account is being deleted: what they bought, and their hearts, go with it.
function forgetCosmetics(userId) {
    return Promise.all([CosmeticOwned.deleteMany({ user: userId }), CosmeticWish.deleteMany({ user: userId })]);
}

// Everything the Black Market holds about a member, for their data export.
async function cosmeticsDataOf(userId) {
    const [owned, wishlist, user] = await Promise.all([
        CosmeticOwned.find({ user: userId }).sort({ boughtAt: 1 }).select("item price boughtAt -_id").lean(),
        CosmeticWish.find({ user: userId }).sort({ at: 1 }).select("item at -_id").lean(),
        mongoose.isValidObjectId(userId) ? User.findById(userId).select("cosmetics").lean() : null,
    ]);
    return { owned, wishlist, wearing: user ? cosmeticsOf(user) : null };
}

module.exports = { ShopError, WalletError, shopView, buyCosmetic, wearCosmetic, wishCosmetic, forgetCosmetics, cosmeticsDataOf };
