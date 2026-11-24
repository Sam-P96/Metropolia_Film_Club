const mongoose = require("mongoose");
const CatflixPet = require("../../models/catflixPetModel");
const CatflixGiftDay = require("../../models/catflixGiftDayModel");
const { WalletError, changeWallet, playDay } = require("../wallet");
const { noteCatflixGift } = require("../notify");
const { caughtUp, friendIdsOf } = require("./pets");
const { CATFLIX } = require("../../../shared/catflix/rules.js");

// A friend's cat that loves you (shared/catflix/rules.js friendGift): once a
// play day, from 12:00 Helsinki, every cat rolls its chance for each friend
// of its owner (members who follow each other) whose love meter on it is
// high enough, love that only grows by caring for it on Play Dates. A cat
// that steals takes a share of its owner's PP (never P-PP, never into debt)
// and gives it to that friend as P-PP. Both hear about it, with receipts
// on both wallets.

const RULES = CATFLIX.friendGift;

// One steal: the share of the owner's PP as it is right now, taken, then
// given. Resolves to the amount, or 0 (nothing to take, or their points are
// frozen in a Steal and Defend attack).
async function steal(pet, ownerId, friendId) {
    let taken;
    try {
        taken = await changeWallet(
            ownerId,
            (wallet) => {
                const amount = Math.floor(Math.max(0, wallet.pp) * RULES.share);
                return amount > 0 ? { pp: 0 - amount } : null;
            },
            { reason: "catflixStolen", other: friendId }
        );
    } catch (error) {
        if (error instanceof WalletError) return 0;
        throw error;
    }
    if (!taken) return 0;
    const amount = 0 - taken.pp;
    try {
        await changeWallet(friendId, () => ({ ppp: amount }), { reason: "catflixGift", other: ownerId });
    } catch (error) {
        // They can't take it (gone since): the owner gets it back.
        await changeWallet(ownerId, () => ({ pp: amount }), { reason: "refund", other: friendId }).catch(() => {});
        return 0;
    }
    await noteCatflixGift({ ownerId, friendId, pet, amount }).catch((error) => console.error("Catflix couldn't send a cat's gift:", error.message));
    return amount;
}

// The day's round, if it hasn't been done yet this play day (the first
// call after 12:00 does it; the rest find it done). `random()`: 0 to 1
// (tests pass their own). Resolves to how many cats stole.
async function giftRound({ now = new Date(), random = Math.random } = {}) {
    try {
        await CatflixGiftDay.create({ _id: playDay(now), at: now });
    } catch (error) {
        if (error.code === 11000) return 0; // done today
        throw error;
    }
    const loved = await CatflixPet.find({ loveBy: { $exists: true, $ne: {} } }).lean();
    let count = 0;
    for (const stored of loved) {
        // As the cat is now: love fades while it's unhappy.
        const pet = { ...stored, ...(caughtUp(stored, now) ?? {}) };
        const love = pet.loveBy instanceof Map ? [...pet.loveBy] : Object.entries(pet.loveBy ?? {});
        const fans = love.filter(([id, value]) => value >= RULES.loveAtLeast && id !== String(pet.owner) && mongoose.isValidObjectId(id));
        if (!fans.length) continue;
        const friends = new Set((await friendIdsOf(pet.owner)).map(String));
        for (const [friendId] of fans) {
            if (!friends.has(friendId) || random() >= RULES.chance) continue;
            if ((await steal(pet, pet.owner, new mongoose.Types.ObjectId(friendId))) > 0) count += 1;
        }
    }
    return count;
}

module.exports = { giftRound };
