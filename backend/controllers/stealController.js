const mongoose = require("mongoose");
const User = require("../models/userModel");
const StealItem = require("../models/stealItemModel");
const StealAttack = require("../models/stealAttackModel");
const StealTrade = require("../models/stealTradeModel");
const StealFlag = require("../models/stealFlagModel");
const GameBan = require("../models/gameBanModel");
const { STEAL } = require("../../shared/steal/config.js");
const { ITEMS, itemDef } = require("../games/steal/items");
const { StealError, lastWeeklyResetAt } = require("../games/steal/rules");
const { WalletError, dailyPp } = require("../utils/wallet");
const { MEMBER_FIELDS, userSummary } = require("../utils/serialize");
const { hasRole, outranks } = require("../middleware/auth");
const players = require("../utils/steal/players");
const inventory = require("../utils/steal/inventory");
const shop = require("../utils/steal/shop");
const market = require("../utils/steal/market");
const attacks = require("../utils/steal/attacks");
const moderation = require("../utils/steal/moderation");

// Steal and Defend's routes (routes/stealRouter.js). The game itself is in
// utils/steal/ and games/steal/; these only read the request and answer.

// Runs a route, turning the game's refusals into { error, code } answers.
const handle = (fn) => async (req, res) => {
    try {
        const result = await fn(req, res);
        if (!res.headersSent) res.json(result ?? { ok: true });
    } catch (error) {
        if (error instanceof StealError || error instanceof WalletError) {
            return res.status(error.status ?? 400).json({ error: error.message, code: error.code ?? null, ...(error.extra ?? {}) });
        }
        throw error;
    }
};

const same = (a, b) => a != null && b != null && String(a) === String(b);

// --- for anyone ---

// Every item in the game, and the classes, for How to Play and the shop.
const getItems = handle(async () => ({
    items: ITEMS.map((item) => ({
        key: item.id,
        name: item.name,
        type: item.type,
        tier: item.tier,
        unique: item.unique,
        effect: item.effect,
        durability: item.durability,
        priceMultiplier: item.priceMultiplier,
    })),
}));

// The public feed of successful steals.
const getFeed = handle(async () => ({ steals: await attacks.publicFeed() }));

// --- the member's own game ---

// Just whether their PvP is on, for the Games page card.
const getStatus = handle(async (req) => {
    const player = await players.playerOf(req.user._id);
    return { pvp: Boolean(player.enabled), playerClass: player.playerClass ?? null };
});

// The hub (spec §15): class, slots, inventory, attack status, incoming
// attacks, waiting trades and bans.
const getHub = handle(async (req) => {
    const userId = req.user._id;
    const now = new Date();
    const [player, user, items, standing, incoming, waiting, bans, reviews] = await Promise.all([
        players.playerOf(userId),
        User.findById(userId).select("wallet").lean(),
        inventory.itemsOf(userId),
        attacks.attackerStanding(userId, now),
        attacks.incomingAttacks(userId),
        StealTrade.countDocuments({ to: userId, status: "pending" }),
        moderation.activeBansOf(userId),
        shop.reviewCountOf(userId),
    ]);
    const equipped = new Set(player.equipped.map((slot) => String(slot.item)));
    const weekAttacks = await StealAttack.find({ attacker: userId, startedAt: { $gte: lastWeeklyResetAt(now) } })
        .sort({ startedAt: -1 })
        .select("victim outcome status startedAt")
        .populate("victim", MEMBER_FIELDS)
        .lean();
    const buyRefusal = await shop.buyRefusal(userId);

    return {
        player: players.playerView(player, now),
        wallet: {
            pp: user?.wallet?.pp ?? 0,
            ppp: user?.wallet?.ppp ?? 0,
            net: (user?.wallet?.pp ?? 0) + (user?.wallet?.ppp ?? 0),
            frozenUntil: user?.wallet?.frozenUntil && user.wallet.frozenUntil > now ? user.wallet.frozenUntil : null,
        },
        reviews,
        dailyPp: dailyPp(reviews),
        canBuy: !buyRefusal,
        buyRefusal,
        inventory: items.map((item) => inventory.itemView(item, { equipped })),
        equipped: player.equipped.map((slot) => String(slot.item)).filter((id) => items.some((item) => same(item._id, id))),
        attack: {
            canAttack: !standing.refusal,
            refusal: standing.refusal?.message ?? null,
            code: standing.refusal?.code ?? null,
            active: standing.active ? { _id: standing.active._id } : null,
            attacksToday: standing.attacksToday,
            perDay: STEAL.limits.attacksPerDay,
            nextDailyAt: standing.nextDailyAt,
            nextWeeklyAt: standing.nextWeeklyAt,
            thisWeek: weekAttacks
                .filter((attack) => attack.victim)
                .map((attack) => ({
                    _id: attack._id,
                    victim: userSummary(attack.victim),
                    outcome: attack.outcome,
                    playing: attack.status !== "done",
                    at: attack.startedAt,
                })),
        },
        incoming,
        tradesWaiting: waiting,
        bans: bans.map((ban) => ({ scopes: ban.scopes, until: ban.until, reason: ban.reason })),
        isAdmin: hasRole(req.user, "admin"),
    };
});

// What turning PVP off would take back right now, for Edit profile's
// warning. PVP itself is the profile's setting (PATCH /api/users/me).
const getTakeback = handle(async (req) => players.previewTurnOff(req.user._id));

const setClass = handle(async (req) => ({ player: players.playerView(await players.changeClass(req.user._id, req.body?.playerClass)) }));

const equipItem = handle(async (req) => {
    await inventory.equip(req.user._id, req.params.id);
});

const unequipItem = handle(async (req) => {
    await inventory.unequip(req.user._id, req.params.id);
});

const sellItem = handle(async (req) => inventory.sellBack(req.user._id, req.params.id));

// --- attacks ---

const getTargets = handle(async (req) => {
    const { standing, targets } = await attacks.targetsFor(req.user._id);
    return {
        canAttack: !standing.refusal,
        refusal: standing.refusal?.message ?? null,
        code: standing.refusal?.code ?? null,
        active: standing.active ? { _id: standing.active._id } : null,
        targets,
    };
});

const startAttack = handle(async (req, res) => {
    const attackId = await attacks.startAttack(req, req.body?.victim, req.body?.percent);
    res.status(201).json(await attacks.attackView(attackId, req.user));
});

const getAttack = handle(async (req) => attacks.attackView(req.params.id, req.user));

// { index, answer }: the answer to question `index`. Answers with the
// attack as it is afterwards, and whether that answer was right.
const answer = handle(async (req) => {
    const result = await attacks.answerQuestion(req.user._id, req.params.id, req.body?.index, req.body?.answer);
    return { ...result, attack: await attacks.attackView(req.params.id, req.user) };
});

const getHistory = handle(async (req) => ({ attacks: await attacks.historyOf(req.user._id) }));

// --- the shop ---

const getShop = handle(async (req) => shop.shopFor(req.user._id));

const buyListing = handle(async (req, res) => {
    const { item, price } = await shop.buyListing(req.user._id, req.params.id);
    res.status(201).json({ item: inventory.itemView(item), price });
});

// --- the player market, trades and gifts ---

async function marketView(listings) {
    const items = await StealItem.find({ _id: { $in: listings.map((listing) => listing.item) } }).lean();
    const itemById = new Map(items.map((item) => [String(item._id), item]));
    const sellers = await User.find({ _id: { $in: listings.map((listing) => listing.seller) } }).select(MEMBER_FIELDS).lean();
    const sellerById = new Map(sellers.map((user) => [String(user._id), userSummary(user)]));
    return listings
        .filter((listing) => itemById.has(String(listing.item)) && sellerById.has(String(listing.seller)))
        .map((listing) => ({
            _id: listing._id,
            price: listing.price,
            createdAt: listing.createdAt,
            seller: sellerById.get(String(listing.seller)),
            item: inventory.itemView(itemById.get(String(listing.item))),
        }));
}

const getMarket = handle(async () => ({ listings: await marketView(await shop.openMarket()) }));

const listOnMarket = handle(async (req, res) => {
    const listing = await market.listItem(req, req.body?.item, req.body?.price);
    res.status(201).json(listing);
});

const cancelListing = handle(async (req) => {
    await market.cancelListing(req.user._id, req.params.id);
});

const buyFromMarket = handle(async (req) => {
    await market.buyFromMarket(req, req.params.id);
});

async function tradeViews(trades, viewerId) {
    const itemIds = trades.flatMap((trade) => [...trade.give.items, ...trade.want.items]);
    const items = await StealItem.find({ _id: { $in: itemIds } }).lean();
    const itemById = new Map(items.map((item) => [String(item._id), item]));
    const people = await User.find({ _id: { $in: trades.flatMap((trade) => [trade.from, trade.to]) } }).select(MEMBER_FIELDS).lean();
    const personById = new Map(people.map((user) => [String(user._id), userSummary(user)]));
    const itemsOf = (ids, keys) =>
        ids.map((id, i) => {
            const item = itemById.get(String(id));
            if (item) return inventory.itemView(item);
            const def = itemDef(keys[i]);
            return { _id: id, key: keys[i], name: def?.name ?? "Unknown item", tier: def?.tier ?? null, gone: true };
        });
    return trades.map((trade) => ({
        _id: trade._id,
        mine: same(trade.from, viewerId),
        gift: trade.gift,
        status: trade.status,
        from: personById.get(String(trade.from)) ?? null,
        to: personById.get(String(trade.to)) ?? null,
        give: { items: itemsOf(trade.give.items, trade.keys?.give ?? []), pp: trade.give.pp },
        want: { items: itemsOf(trade.want.items, trade.keys?.want ?? []), pp: trade.want.pp },
        createdAt: trade.createdAt,
        answeredAt: trade.answeredAt,
    }));
}

// Offers waiting on them, offers they've sent, and the last few answered.
const getTrades = handle(async (req) => {
    const userId = req.user._id;
    const [incoming, outgoing, recent] = await Promise.all([
        StealTrade.find({ to: userId, status: "pending" }).sort({ createdAt: -1 }).lean(),
        StealTrade.find({ from: userId, status: "pending" }).sort({ createdAt: -1 }).lean(),
        StealTrade.find({ $or: [{ from: userId }, { to: userId }], status: { $ne: "pending" } }).sort({ answeredAt: -1 }).limit(10).lean(),
    ]);
    return {
        incoming: await tradeViews(incoming, userId),
        outgoing: await tradeViews(outgoing, userId),
        recent: await tradeViews(recent, userId),
    };
});

const offerTrade = handle(async (req, res) => {
    const trade = await market.offerTrade(req, req.body);
    res.status(201).json({ _id: trade._id });
});

const acceptTrade = handle(async (req) => {
    await market.acceptTrade(req, req.params.id);
});

const declineTrade = handle(async (req) => {
    await market.declineTrade(req.user._id, req.params.id);
});

const cancelTrade = handle(async (req) => {
    await market.cancelTrade(req.user._id, req.params.id);
});

const sendGift = handle(async (req, res) => {
    res.status(201).json(await market.giftItem(req, req.body));
});

// Another member's items, to ask for in a trade: never which are equipped
// (that's what the Marauder's Map is for).
const getPlayerItems = handle(async (req) => {
    if (!mongoose.isValidObjectId(req.params.id)) throw new StealError("Pick a member.");
    const user = await User.findById(req.params.id).select(MEMBER_FIELDS).lean();
    if (!user) throw new StealError("That member doesn't exist any more.", 404);
    const items = await StealItem.find({ owner: user._id, state: { $in: ["owned", "listed"] } }).sort({ createdAt: 1 }).lean();
    return { user: userSummary(user), items: items.map((item) => inventory.itemView(item)) };
});

// --- admins (spec §14) ---

const getFlags = handle(async (req) => {
    const status = req.query.status === "dismissed" ? "dismissed" : "open";
    const flags = await StealFlag.find({ status }).sort({ lastAt: -1 }).limit(100).lean();
    const people = await User.find({ _id: { $in: flags.flatMap((flag) => flag.users) } }).select(MEMBER_FIELDS).lean();
    const byId = new Map(people.map((user) => [String(user._id), userSummary(user)]));
    return {
        flags: flags.map((flag) => ({
            _id: flag._id,
            kind: flag.kind,
            users: flag.users.map((id) => byId.get(String(id))).filter(Boolean),
            details: flag.details,
            count: flag.count,
            status: flag.status,
            firstAt: flag.firstAt,
            lastAt: flag.lastAt,
        })),
    };
});

const dismissFlag = handle(async (req) => {
    if (!mongoose.isValidObjectId(req.params.id)) throw new StealError("Pick a flag.");
    const result = await StealFlag.updateOne({ _id: req.params.id, status: "open" }, { $set: { status: "dismissed", dismissedBy: req.user._id } });
    if (result.modifiedCount === 0) throw new StealError("That flag isn't open.", 404);
});

// The Ban List: every active ban, newest first.
const getBans = handle(async () => {
    const now = new Date();
    const bans = await GameBan.find({ liftedAt: null, $or: [{ until: null }, { until: { $gt: now } }] }).sort({ createdAt: -1 }).lean();
    const people = await User.find({ _id: { $in: bans.flatMap((ban) => [ban.user, ban.by]) } }).select(MEMBER_FIELDS).lean();
    const byId = new Map(people.map((user) => [String(user._id), userSummary(user)]));
    return {
        bans: bans
            .filter((ban) => byId.has(String(ban.user)))
            .map((ban) => ({
                _id: ban._id,
                user: byId.get(String(ban.user)),
                by: byId.get(String(ban.by)) ?? null,
                scopes: ban.scopes,
                until: ban.until,
                reason: ban.reason,
                createdAt: ban.createdAt,
            })),
    };
});

// { user, scopes, days, reason }: days empty or null for a permanent ban.
const createBan = handle(async (req, res) => {
    const userId = req.body?.user;
    if (!mongoose.isValidObjectId(userId)) throw new StealError("Pick a member to ban.");
    const target = await User.findById(userId).select("role").lean();
    if (!target) throw new StealError("That member doesn't exist any more.", 404);
    if (!outranks(req.user, target)) throw new StealError("You can only ban members below you.", 403);
    const ban = await moderation.createBan({ admin: req.user, userId, scopes: req.body?.scopes, days: req.body?.days ?? null, reason: req.body?.reason });
    res.status(201).json({ _id: ban._id });
});

// When an admin last reset the steal timer for everyone, and who.
const getAttackReset = handle(async () => {
    const reset = await attacks.lastAttackReset();
    const by = reset?.by ? await User.findById(reset.by).select(MEMBER_FIELDS).lean() : null;
    return { reset: reset ? { at: reset.at, by: by ? userSummary(by) : null } : null };
});

// "Reset steal timer": everyone gets today's attack back.
const resetAttacks = handle(async (req) => {
    const { at, players } = await attacks.resetAttacksForEveryone(req.user._id);
    return { reset: { at, by: userSummary(await User.findById(req.user._id).select(MEMBER_FIELDS).lean()) }, players };
});

const liftBan = handle(async (req) => {
    if (!mongoose.isValidObjectId(req.params.id)) throw new StealError("Pick a ban.");
    await moderation.liftBan(req.user, req.params.id);
});

module.exports = {
    getItems,
    getFeed,
    getStatus,
    getHub,
    getTakeback,
    setClass,
    equipItem,
    unequipItem,
    sellItem,
    getTargets,
    startAttack,
    getAttack,
    answer,
    getHistory,
    getShop,
    buyListing,
    getMarket,
    listOnMarket,
    cancelListing,
    buyFromMarket,
    getTrades,
    offerTrade,
    acceptTrade,
    declineTrade,
    cancelTrade,
    sendGift,
    getPlayerItems,
    getFlags,
    dismissFlag,
    getBans,
    createBan,
    liftBan,
    getAttackReset,
    resetAttacks,
};
