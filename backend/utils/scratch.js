const mongoose = require("mongoose");
const ScratchCard = require("../models/scratchCardModel");
const Jackpot = require("../models/jackpotModel");
const User = require("../models/userModel");
const WalletTx = require("../models/walletTxModel");
const { WalletError, changeWallet, credit, spend } = require("./wallet");
const { noteScratchJackpot, noteScratchWin } = require("./notify");
const { announceJackpot } = require("../games/farkle/live");
const { ScratchError, TILE_COUNT, newLayout, scratchTile, sealLayout, tierByKey } = require("../games/scratch/engine");
const { SCRATCH } = require("../../shared/scratch/config.js");
const {
    DEFAULT_TICKET_TYPE,
    TICKET_TYPES,
    describeHours,
    isTicketType,
    ticketHours,
    ticketType,
    ticketTypeOf,
} = require("../../shared/scratch/tickets.js");

// Box Office Scratch in the database: buying a card, scratching it, paying
// out, and the jackpots. The game itself is in games/scratch/engine.js and
// its numbers in shared/scratch/config.js.

// Each ticket type's jackpot pool is a document of its own, with the type's
// key as its id, except Standard's: it keeps "main", the one pool there was
// before there were ticket types, so its amount and winners carry on.
const jackpotId = (type) => (type === DEFAULT_TICKET_TYPE ? "main" : type);
const JACKPOT_IDS = TICKET_TYPES.map(jackpotId);

// How many wins "Recent jackpots" keeps, per pool and in all.
const RECENT_JACKPOTS = 10;

// A card is bought within a second. One still "pending" after this never
// got going (the server stopped between making it and taking the price), so
// the sweep hands back whatever was taken and deletes it.
const STUCK_PENDING_MS = 10 * 60 * 1000;

// How long a finished card that hasn't been revealed is still offered when
// they come back, with its "Reveal card" button.
const UNREVEALED_KEPT_MS = 24 * 60 * 60 * 1000;

// ---- The jackpots ----

// Makes any ticket type's pool that doesn't exist yet, at its seed. Pools
// already there are left alone.
async function seedJackpots() {
    await Promise.all(
        TICKET_TYPES.map((type) =>
            Jackpot.collection.updateOne(
                { _id: jackpotId(type) },
                { $setOnInsert: { amount: ticketType(type).jackpotSeed, recent: [] } },
                { upsert: true }
            )
        )
    );
}

// The pools as the page shows them: { amounts: { standard, premium, vip },
// recent: [{ username, amount, at, ticketType }] }, the recent wins of every
// type together, newest first. Makes any pool that isn't there yet.
async function jackpotView() {
    let pools = await Jackpot.find({ _id: { $in: JACKPOT_IDS } }).lean();
    if (pools.length < JACKPOT_IDS.length) {
        await seedJackpots();
        pools = await Jackpot.find({ _id: { $in: JACKPOT_IDS } }).lean();
    }

    const byId = new Map(pools.map((pool) => [pool._id, pool]));
    const amounts = {};
    const recent = [];
    for (const type of TICKET_TYPES) {
        const pool = byId.get(jackpotId(type));
        amounts[type] = pool.amount;
        for (const win of pool.recent) {
            recent.push({ username: win.username, amount: win.amount, at: win.at, ticketType: win.ticketType ?? type });
        }
    }
    recent.sort((a, b) => new Date(b.at) - new Date(a.at));

    return { amounts, recent: recent.slice(0, RECENT_JACKPOTS) };
}

// A `type` ticket was sold: its share goes into that type's pool, in one
// atomic step (starting from the seed if there's no pool yet), and every
// page showing the game hears the new amount.
async function addToJackpot(type) {
    const { jackpotSeed, jackpotContribution } = ticketType(type);
    const pool = await Jackpot.collection.findOneAndUpdate(
        { _id: jackpotId(type) },
        [{
            $set: {
                amount: { $add: [{ $ifNull: ["$amount", jackpotSeed] }, jackpotContribution] },
                recent: { $ifNull: ["$recent", []] },
            },
        }],
        { upsert: true, returnDocument: "after" }
    );
    announceJackpot(type, pool.amount);
}

// `card` found the Golden Ticket: it wins the whole pool of its ticket type.
// One atomic step empties that pool back to its seed and adds the win to
// "Recent jackpots", both from the pool as it was at that instant, so two
// winners at the same moment can't both take the same pool: the second gets
// what has built up since. A card can only claim once ("recent.card" can't
// already be it), so paying again after a failure gets the same amount, not
// a second pool. Returns the amount won.
async function claimJackpot(card) {
    const type = ticketTypeOf(card);
    const { jackpotSeed } = ticketType(type);
    const winner = await User.findById(card.user).select("username").lean();

    const before = await Jackpot.collection.findOneAndUpdate(
        { _id: jackpotId(type), "recent.card": { $ne: card._id } },
        [{
            $set: {
                recent: {
                    $slice: [
                        {
                            $concatArrays: [
                                [{
                                    user: card.user,
                                    username: winner?.username ?? "A former member",
                                    amount: "$amount",
                                    card: card._id,
                                    ticketType: type,
                                    at: "$$NOW",
                                }],
                                "$recent",
                            ],
                        },
                        RECENT_JACKPOTS,
                    ],
                },
                amount: jackpotSeed,
            },
        }],
        { returnDocument: "before" }
    );

    if (before) {
        announceJackpot(type, jackpotSeed, { won: true });
        return before.amount;
    }

    // Already claimed for this card (paying again after a failure), or there
    // was no pool yet.
    const pool = await Jackpot.findById(jackpotId(type)).lean();
    const claimed = pool?.recent.find((win) => String(win.card) === String(card._id));
    if (claimed) return claimed.amount;

    await seedJackpots();
    return claimJackpot(card);
}

// ---- Opening hours ----

// Whether each ticket type is on sale right now, for the page: { standard:
// { open, opensAt, closesAt, changesIn }, ... }. `changesIn` is how many ms
// until it opens or closes (null if it never does), so the page can switch
// the button over on time by its own timer, without trusting its own clock.
function hoursView(now = new Date()) {
    return Object.fromEntries(
        TICKET_TYPES.map((type) => {
            const { open, opensAt, closesAt } = ticketHours(type, now);
            const next = opensAt ?? closesAt;
            return [type, { open, opensAt, closesAt, changesIn: next ? next.getTime() - now.getTime() : null }];
        })
    );
}

// ---- Cards ----

// A card as the page gets it. Only the tiles already scratched are in
// `tiles` (the rest are null): what's under the others never leaves the
// server until the card is done and they ask to reveal it.
function cardView(card) {
    const tiles = Array(TILE_COUNT).fill(null);
    for (const tile of card.scratched) tiles[tile] = card.layout[tile];

    const type = ticketTypeOf(card);
    const tier = card.tier ? tierByKey(card.tier, type) : null;
    return {
        _id: card._id,
        ticketType: type,
        status: card.status,
        hash: card.hash,
        price: card.price,
        spent: card.spent,
        tiles,
        scratched: card.scratched,
        scratchesLeft: SCRATCH.scratches - card.scratched.length,
        starsFound: card.starsFound,
        tier: tier && { key: tier.key, name: tier.name, scratch: tier.scratch, ppp: tier.ppp ?? null, refund: Boolean(tier.refund) },
        goldenFound: card.goldenFound,
        jackpotAmount: card.jackpotAmount,
        createdAt: card.createdAt,
        completedAt: card.completedAt,
        revealedAt: card.revealedAt,
    };
}

// The card in the URL, if it's theirs. Throws a 404 otherwise.
async function findMyCard(userId, cardId) {
    const card = mongoose.isValidObjectId(cardId) ? await ScratchCard.findOne({ _id: cardId, user: userId }).lean() : null;
    if (!card) throw new ScratchError("Card not found.", 404);
    return card;
}

// Their card to show when they open the game: the one they're scratching,
// or else the last one they finished but haven't revealed yet (for its
// "Reveal card" button). null if neither. Pays anything a failure left
// unpaid on it.
async function currentCard(userId) {
    let card = await ScratchCard.findOne({ user: userId, status: "active" }).lean();
    if (!card) {
        card = await ScratchCard.findOne({
            user: userId,
            status: "complete",
            revealedAt: null,
            completedAt: { $gt: new Date(Date.now() - UNREVEALED_KEPT_MS) },
        })
            .sort({ completedAt: -1 })
            .lean();
    }
    if (!card) return null;

    await payWhatsOwed(card);
    return cardView(await ScratchCard.findById(card._id).lean());
}

// A new ticket of type `type` (a key in config.js ticketTypes), if it's on
// sale at `now`: a VIP ticket only in its hours, by the clocks in Helsinki.
// The card is made first, as "pending", holding their activeFor: it's
// unique, so a second Buy tap (or a card already going) fails here, before
// anything is taken. Then the price is taken, PP first and then P-PP, and
// the card goes live. If taking the price fails (not enough points), the
// card is deleted again. Each ticket sold adds to its type's jackpot.
// Returns the card, with its seal (`hash`).
async function buyCard(userId, type = DEFAULT_TICKET_TYPE, now = new Date()) {
    if (!isTicketType(type)) {
        throw new ScratchError(`Pick a ticket: ${TICKET_TYPES.join(", ")}.`);
    }
    const kind = ticketType(type);
    if (!ticketHours(type, now).open) {
        throw new ScratchError(`${kind.name} tickets are on sale ${describeHours(kind.hours)}.`, 403);
    }

    const layout = newLayout();
    const { salt, hash } = sealLayout(layout);

    let card;
    try {
        card = await ScratchCard.create({ user: userId, ticketType: type, layout, salt, hash, price: kind.price, activeFor: userId });
    } catch (error) {
        if (error.code === 11000) {
            throw new ScratchError("You already have a card going. Finish it first.", 409);
        }
        throw error;
    }

    let paid;
    try {
        paid = await spend(userId, kind.price, { reason: "scratchTicket", card: card._id });
    } catch (error) {
        await ScratchCard.deleteOne({ _id: card._id });
        throw error;
    }

    const active = await ScratchCard.findOneAndUpdate(
        { _id: card._id, status: "pending" },
        { $set: { status: "active", spent: { pp: 0 - paid.pp, ppp: 0 - paid.ppp } } },
        { returnDocument: "after" }
    ).lean();
    if (!active) throw new Error(`Scratch card ${card._id} changed before it went live`);

    try {
        await addToJackpot(type);
    } catch (error) {
        // The ticket is theirs either way; the pool just misses one share.
        console.error("Couldn't add to the jackpot:", error.message);
    }

    return cardView(active);
}

// One scratch, of tile `tile`. Checked against the card as it is (theirs,
// being played, tile not scratched yet, scratches left: engine.js
// scratchTile), then saved in one atomic step that only goes through if the
// card still has exactly as many scratches as when it was read and that
// tile isn't among them. So a double tap, or two requests at once, can only
// ever reveal one tile: the second finds the card already moved on and is
// refused. A win is paid as soon as it's locked in, and the Golden Ticket's
// jackpot the moment it's found. Returns { card, tile: { index, content } }.
async function scratchCard(userId, cardId, tile) {
    const card = await findMyCard(userId, cardId);
    if (card.status !== "active") throw new ScratchError("This card is finished.", 409);

    const result = scratchTile(card, tile);

    const set = { starsFound: result.starsFound };
    if (result.tier) set.tier = result.tier;
    if (result.golden) set.goldenFound = true;
    const update = { $push: { scratched: tile }, $set: set };
    if (result.last) {
        set.status = "complete";
        set.completedAt = new Date();
        update.$unset = { activeFor: 1 };
    }

    const saved = await ScratchCard.findOneAndUpdate(
        { _id: card._id, user: userId, status: "active", scratched: { $size: card.scratched.length, $ne: tile } },
        update,
        { returnDocument: "after" }
    ).lean();
    if (!saved) throw new ScratchError("That scratch was already made.", 409);

    await payWhatsOwed(saved);
    const paid = await ScratchCard.findById(saved._id).lean();
    return { card: cardView(paid), tile: { index: tile, content: result.content } };
}

// "Collect": the card ends now, and its scratches left go unused. Anything
// won is already paid, as soon as it was won.
async function collectCard(userId, cardId) {
    const card = await findMyCard(userId, cardId);
    if (card.status !== "active") throw new ScratchError("This card is finished.", 409);

    const saved = await ScratchCard.findOneAndUpdate(
        { _id: card._id, status: "active" },
        { $set: { status: "complete", completedAt: new Date() }, $unset: { activeFor: 1 } },
        { returnDocument: "after" }
    ).lean();
    if (!saved) throw new ScratchError("This card is finished.", 409);
    return cardView(saved);
}

// "Reveal card", once a card is done: its whole layout and the salt, so the
// page can show every tile and check them against the seal it was given
// when the card was bought.
async function revealCard(userId, cardId) {
    const card = await findMyCard(userId, cardId);
    if (card.status !== "complete") throw new ScratchError("Finish the card first.", 409);

    if (!card.revealedAt) await ScratchCard.updateOne({ _id: card._id }, { $set: { revealedAt: new Date() } });
    return { layout: card.layout, salt: card.salt, hash: card.hash };
}

// ---- Paying out ----

// Pays the tier `card` locked in, once: claimed first (prizePaid false to
// true), so two requests can never both pay it, and let go again if paying
// fails, for the sweep to try later. A win pays P-PP, as much as the card's
// ticket type pays for that tier; the refund tier hands back exactly what
// the ticket took, PP as PP and P-PP as P-PP. Their followers hear about it.
async function payPrize(cardId) {
    const card = await ScratchCard.findOneAndUpdate(
        { _id: cardId, tier: { $ne: null }, prizePaid: false },
        { $set: { prizePaid: true } },
        { returnDocument: "after" }
    ).lean();
    if (!card) return;

    const type = ticketTypeOf(card);
    const tier = tierByKey(card.tier, type);
    const amount = tier.refund ? card.price : tier.ppp;

    try {
        if (tier.refund) {
            await changeWallet(card.user, () => ({ pp: card.spent.pp, ppp: card.spent.ppp }), { reason: "scratchRefund", card: card._id });
        } else {
            await credit(card.user, tier.ppp, { reason: "scratchWin", card: card._id });
        }
    } catch (error) {
        // An account that's been deleted can't be paid. Anything else is
        // worth trying again.
        if (error instanceof WalletError && error.status === 404) return;
        await ScratchCard.updateOne({ _id: cardId }, { $set: { prizePaid: false } });
        throw error;
    }

    await noteScratchWin(card.user, tier.key, amount, type);
}

// Pays the jackpot `card` won with the Golden Ticket, once, the same way:
// its type's pool is claimed (claimJackpot), then the card is claimed for
// paying. Every member hears about it, and which ticket it was.
async function payJackpot(cardId) {
    const found = await ScratchCard.findOne({ _id: cardId, goldenFound: true, jackpotPaid: false }).lean();
    if (!found) return;

    const amount = await claimJackpot(found);
    const card = await ScratchCard.findOneAndUpdate(
        { _id: cardId, jackpotPaid: false },
        { $set: { jackpotPaid: true, jackpotAmount: amount } },
        { returnDocument: "after" }
    ).lean();
    if (!card) return;

    try {
        await credit(card.user, amount, { reason: "jackpot", card: card._id });
    } catch (error) {
        if (error instanceof WalletError && error.status === 404) return;
        await ScratchCard.updateOne({ _id: cardId }, { $set: { jackpotPaid: false } });
        throw error;
    }

    await noteScratchJackpot(card.user, amount, ticketTypeOf(card));
}

// Whatever `card` has won and hasn't been paid yet.
async function payWhatsOwed(card) {
    if (card.tier && !card.prizePaid) await payPrize(card._id);
    if (card.goldenFound && !card.jackpotPaid) await payJackpot(card._id);
}

// A card stuck "pending": deleted (the claim, so two sweeps can't both
// refund it), then whatever was taken for it handed back, going by the
// receipts.
async function cancelStuckCard(cardId) {
    const claimed = await ScratchCard.findOneAndDelete({ _id: cardId, status: "pending" }).lean();
    if (!claimed) return;

    const receipts = await WalletTx.find({ card: cardId, reason: { $in: ["scratchTicket", "scratchRefund"] } }).lean();
    const owed = receipts.reduce((sum, tx) => ({ pp: sum.pp + tx.pp, ppp: sum.ppp + tx.ppp }), { pp: 0, ppp: 0 });
    if (owed.pp < 0 || owed.ppp < 0) {
        const back = { pp: owed.pp < 0 ? 0 - owed.pp : 0, ppp: owed.ppp < 0 ? 0 - owed.ppp : 0 };
        await changeWallet(claimed.user, () => back, { reason: "refund", card: cardId });
    }
}

// Every few minutes (jobs/scratchSweep.js): pays wins and jackpots a
// failure left unpaid, and refunds cards stuck pending. One card's trouble
// doesn't stop the rest. Returns how many of each.
async function sweepScratchCards(now = Date.now()) {
    const counts = { paid: 0, refunded: 0 };

    const unpaid = await ScratchCard.find({
        status: { $ne: "pending" },
        $or: [{ tier: { $ne: null }, prizePaid: false }, { goldenFound: true, jackpotPaid: false }],
    }).lean();
    for (const card of unpaid) {
        try {
            await payWhatsOwed(card);
            counts.paid += 1;
        } catch (error) {
            console.error(`Scratch sweep couldn't pay card ${card._id}:`, error.message);
        }
    }

    const stuck = await ScratchCard.find({ status: "pending", createdAt: { $lt: new Date(now - STUCK_PENDING_MS) } }).select("_id").lean();
    for (const { _id } of stuck) {
        try {
            await cancelStuckCard(_id);
            counts.refunded += 1;
        } catch (error) {
            console.error(`Scratch sweep couldn't refund card ${_id}:`, error.message);
        }
    }

    return counts;
}

// Account deletion: their cards go, and so does their name from every
// pool's "Recent jackpots".
async function forgetScratchPlayer(userId) {
    await ScratchCard.deleteMany({ user: userId });
    await Jackpot.updateMany({ _id: { $in: JACKPOT_IDS } }, { $pull: { recent: { user: userId } } });
}

// Their cards for the data export: as the page sees them, so an active
// card's hidden tiles stay hidden.
async function scratchCardsOf(userId) {
    const cards = await ScratchCard.find({ user: userId }).sort({ createdAt: -1 }).lean();
    return cards.map((card) => (card.status === "complete" ? { ...cardView(card), layout: card.layout, salt: card.salt } : cardView(card)));
}

module.exports = {
    jackpotId,
    STUCK_PENDING_MS,
    jackpotView,
    hoursView,
    addToJackpot,
    claimJackpot,
    cardView,
    currentCard,
    buyCard,
    scratchCard,
    collectCard,
    revealCard,
    payPrize,
    payJackpot,
    sweepScratchCards,
    forgetScratchPlayer,
    scratchCardsOf,
};
