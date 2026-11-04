const { DateTime } = require("luxon");
const User = require("../../models/userModel");
const StealPlayer = require("../../models/stealPlayerModel");
const StealItem = require("../../models/stealItemModel");
const StealAttack = require("../../models/stealAttackModel");
const StealMarket = require("../../models/stealMarketModel");
const StealTrade = require("../../models/stealTradeModel");
const StealFlag = require("../../models/stealFlagModel");
const GameBan = require("../../models/gameBanModel");
const DeviceSighting = require("../../models/deviceSightingModel");
const { STEAL } = require("../../../shared/steal/config.js");
const { forgetStealAttacks } = require("../notify");
const { destroyItem } = require("./inventory");
const { releaseEscrow } = require("./market");

// Steal and Defend's housekeeping: Infinity Stones held by members who've
// stopped logging in, and what happens to the game when an account goes.

// Cancels pending trades that hold or ask for any of `itemIds`, handing
// back what they held.
async function cancelTradesWith(itemIds) {
    const trades = await StealTrade.find({
        status: "pending",
        $or: [{ "give.items": { $in: itemIds } }, { "want.items": { $in: itemIds } }],
    }).lean();
    for (const trade of trades) {
        const closed = await StealTrade.updateOne({ _id: trade._id, status: "pending" }, { $set: { status: "cancelled", answeredAt: new Date() } });
        if (closed.modifiedCount === 1) await releaseEscrow(trade);
    }
}

// An Infinity Stone goes back to the shop when its holder hasn't logged in
// for 3 months (spec §11). Members who haven't logged in since logins were
// recorded count from when they got the stone. Returns how many went.
async function reclaimIdleStones(now = new Date()) {
    const cutoff = DateTime.fromJSDate(now).minus({ months: STEAL.stoneInactiveMonths }).toJSDate();
    const stones = await StealItem.find({ unique: true }).lean();
    if (stones.length === 0) return 0;
    const owners = await User.find({ _id: { $in: stones.map((stone) => stone.owner) } }).select("lastLoginAt").lean();
    const lastSeen = new Map(owners.map((owner) => [String(owner._id), owner.lastLoginAt]));

    let reclaimed = 0;
    for (const stone of stones) {
        const seen = lastSeen.get(String(stone.owner));
        const latest = Math.max(seen?.getTime() ?? 0, stone.acquiredAt?.getTime() ?? 0);
        // An owner whose account has gone keeps nothing.
        if (!lastSeen.has(String(stone.owner))) {
            await cancelTradesWith([stone._id]);
            await destroyItem(stone);
            reclaimed += 1;
            continue;
        }
        if (latest >= cutoff.getTime()) continue;
        if (await StealAttack.exists({ status: { $in: ["quiz", "resolving"] }, $or: [{ attacker: stone.owner }, { victim: stone.owner }] })) continue;
        await cancelTradesWith([stone._id]);
        await destroyItem(stone);
        reclaimed += 1;
    }
    return reclaimed;
}

// An account is being deleted (controllers/userControllers.js): their
// game goes with it. Attacks they were in are deleted (any still being
// played simply end, and the other player's freeze lifts), trades with
// them are cancelled (the other side gets back what they put in), and
// their items go, so their Infinity Stones can be found in the shop again.
async function forgetStealPlayer(userId) {
    const attacks = await StealAttack.find({ $or: [{ attacker: userId }, { victim: userId }] }).select("_id attacker victim status").lean();
    const others = new Set(
        attacks
            .filter((attack) => attack.status !== "done")
            .flatMap((attack) => [attack.attacker, attack.victim])
            .map(String)
            .filter((id) => id !== String(userId))
    );
    await StealAttack.deleteMany({ _id: { $in: attacks.map((attack) => attack._id) } });
    await forgetStealAttacks(attacks.map((attack) => attack._id));
    for (const other of others) {
        await require("./attacks").refreeze(other).catch(() => {});
    }

    const trades = await StealTrade.find({ status: "pending", $or: [{ from: userId }, { to: userId }] }).lean();
    for (const trade of trades) {
        await StealTrade.updateOne({ _id: trade._id }, { $set: { status: "cancelled", answeredAt: new Date() } });
        if (String(trade.to) === String(userId)) await releaseEscrow(trade);
    }
    const items = await StealItem.find({ owner: userId }).select("_id").lean();
    await cancelTradesWith(items.map((item) => item._id));
    await StealTrade.deleteMany({ $or: [{ from: userId }, { to: userId }] });
    await StealMarket.deleteMany({ seller: userId });
    await StealMarket.updateMany({ buyer: userId }, { $set: { buyer: null } });
    await StealItem.deleteMany({ owner: userId });
    await StealPlayer.deleteOne({ _id: userId });
    await StealPlayer.updateMany({ "penalties.victim": userId }, { $pull: { penalties: { victim: userId } } });
    await DeviceSighting.deleteMany({ user: userId });
    await StealFlag.deleteMany({ users: userId });
    await GameBan.deleteMany({ user: userId });
}

// Everything the game holds about them, for "Download my data".
async function stealDataOf(userId) {
    const [player, items, attacks, trades, listings, sightings, bans] = await Promise.all([
        StealPlayer.findById(userId).lean(),
        StealItem.find({ owner: userId }).lean(),
        StealAttack.find({ $or: [{ attacker: userId }, { victim: userId }] })
            .select("-questions")
            .sort({ startedAt: -1 })
            .lean(),
        StealTrade.find({ $or: [{ from: userId }, { to: userId }] }).sort({ createdAt: -1 }).lean(),
        StealMarket.find({ seller: userId }).sort({ createdAt: -1 }).lean(),
        DeviceSighting.find({ user: userId }).select("ip device at").lean(),
        GameBan.find({ user: userId }).select("-by -liftedBy").lean(),
    ]);
    return { player, items, attacks, trades, marketListings: listings, deviceSightings: sightings, bans };
}

module.exports = { reclaimIdleStones, forgetStealPlayer, stealDataOf, cancelTradesWith };
