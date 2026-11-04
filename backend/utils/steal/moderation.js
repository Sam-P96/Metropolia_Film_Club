const crypto = require("crypto");
const mongoose = require("mongoose");
const User = require("../../models/userModel");
const GameBan = require("../../models/gameBanModel");
const StealFlag = require("../../models/stealFlagModel");
const StealAttack = require("../../models/stealAttackModel");
const DeviceSighting = require("../../models/deviceSightingModel");
const Notification = require("../../models/notificationModel");
const { STEAL } = require("../../../shared/steal/config.js");
const { StealError } = require("../../games/steal/rules");

// Steal and Defend's moderation (spec §14): admin bans with a scope, a
// length and a reason, the flags that point admins at suspicious play, and
// the IP and device sightings that spot alt accounts.

const DAY_MS = 24 * 60 * 60 * 1000;
const SCOPES = Object.keys(STEAL.banScopes);

// Which ban scopes stop each action. "games" covers every game on the site
// and "site" covers everything.
const BLOCKED_BY = {
    steal: ["steal", "games", "site"],
    buy: ["buy", "games", "site"],
    trade: ["trade", "games", "site"],
    games: ["games", "site"],
    site: ["site"],
};

const MESSAGES = {
    steal: "You've been banned from stealing in Steal and Defend",
    buy: "You've been banned from buying items",
    trade: "You've been banned from trading items",
    games: "You've been banned from the games",
    site: "You've been banned from the site",
};

const activeFilter = (now = new Date()) => ({ liftedAt: null, $or: [{ until: null }, { until: { $gt: now } }] });

function activeBansOf(userId, session = null) {
    return GameBan.find({ user: userId, ...activeFilter() }).session(session).lean();
}

// The ban that stops `userId` doing `action` (a key of BLOCKED_BY), or null.
function banFor(bans, action) {
    const scopes = BLOCKED_BY[action];
    return bans.find((ban) => ban.scopes.some((scope) => scopes.includes(scope))) ?? null;
}

function banMessage(ban, action) {
    const until = ban.until ? ` until ${ban.until.toISOString().slice(0, 10)}` : "";
    return `${MESSAGES[action]}${until}. Reason: ${ban.reason}`;
}

// Throws a StealError if `userId` is banned from `action`.
async function refuseIfBanned(userId, action, session = null) {
    const ban = banFor(await activeBansOf(userId, session), action);
    if (ban) throw new StealError(banMessage(ban, action), 403, "BANNED");
}

// --- site-wide bans, checked on every logged-in request ---
// Looked up at most every 30 seconds per member, so requireAuth stays quick.

const SITE_CACHE_MS = 30 * 1000;
const siteCache = new Map();

async function siteBanOf(userId) {
    const key = String(userId);
    const hit = siteCache.get(key);
    if (hit && Date.now() - hit.at < SITE_CACHE_MS) return hit.ban;
    const ban = await GameBan.findOne({ user: userId, scopes: "site", ...activeFilter() }).lean();
    siteCache.set(key, { at: Date.now(), ban });
    return ban;
}

const forgetSiteBan = (userId) => siteCache.delete(String(userId));

// --- bans, for the admin page ---

// Bans `userId` from `scopes` for `days` days (null: for good), with a
// written reason. Admins can't ban members they don't outrank.
async function createBan({ admin, userId, scopes, days, reason }) {
    const list = [...new Set(Array.isArray(scopes) ? scopes : [])];
    if (list.length === 0 || !list.every((scope) => SCOPES.includes(scope))) {
        throw new StealError(`Pick what to ban them from: ${SCOPES.join(", ")}.`);
    }
    const why = typeof reason === "string" ? reason.trim() : "";
    if (!why) throw new StealError("A ban needs a written reason.");
    if (why.length > 1000) throw new StealError("Keep the reason under 1000 characters.");

    let until = null;
    if (days !== null && days !== undefined && days !== "") {
        const count = Number(days);
        if (!Number.isInteger(count) || count < 1 || count > 3650) {
            throw new StealError("A temporary ban is a whole number of days, from 1 to 3650. Leave it empty for a permanent one.");
        }
        until = new Date(Date.now() + count * DAY_MS);
    }

    const ban = await GameBan.create({ user: userId, scopes: list, until, reason: why, by: admin._id });
    forgetSiteBan(userId);
    return ban;
}

async function liftBan(admin, banId) {
    const ban = await GameBan.findOneAndUpdate(
        { _id: banId, liftedAt: null },
        { $set: { liftedAt: new Date(), liftedBy: admin._id } },
        { returnDocument: "after" }
    ).lean();
    if (!ban) throw new StealError("That ban isn't active.", 404);
    forgetSiteBan(ban.user);
    return ban;
}

// --- IP and device sightings ---

const hash = (value) => crypto.createHmac("sha256", process.env.SECRET || "kino-kaverit").update(String(value)).digest("hex");

// The browser's device id, sent by the frontend as X-Device-Id (a random
// id it keeps in localStorage), if it looks like one.
function deviceOf(req) {
    const id = req.get?.("x-device-id") ?? null;
    return typeof id === "string" && /^[A-Za-z0-9-]{8,64}$/.test(id) ? id : null;
}

// Notes that `userId` used this IP and device. Only hashes are kept.
async function recordSighting(req, userId) {
    const ip = req.ip ? hash(req.ip) : null;
    const device = deviceOf(req) ? hash(deviceOf(req)) : null;
    if (!ip && !device) return;
    await DeviceSighting.updateOne({ user: userId, ip, device }, { $set: { at: new Date() } }, { upsert: true }).catch((error) => {
        if (error.code !== 11000) throw error;
    });
}

// Whether two members have been seen on the same IP or device lately.
async function shareDevice(a, b) {
    const since = new Date(Date.now() - STEAL.flags.sightingDays * DAY_MS);
    const mine = await DeviceSighting.find({ user: a, at: { $gte: since } }).select("ip device").lean();
    const ips = mine.map((row) => row.ip).filter(Boolean);
    const devices = mine.map((row) => row.device).filter(Boolean);
    if (ips.length === 0 && devices.length === 0) return false;
    return Boolean(await DeviceSighting.exists({
        user: b,
        at: { $gte: since },
        $or: [{ ip: { $in: ips } }, { device: { $in: devices } }],
    }));
}

// --- flags ---

const flagKey = (kind, users) => `${kind}:${users.map(String).sort().join(":")}`;

// Raises (or adds to) the open flag of `kind` about `users`. A new flag
// goes into every admin's Notifications.
async function raiseFlag(kind, users, details) {
    const ids = [...new Set(users.map(String))].sort().map((id) => new mongoose.Types.ObjectId(id));
    const key = flagKey(kind, ids);
    const now = new Date();
    const existing = await StealFlag.findOneAndUpdate(
        { key, status: "open" },
        { $inc: { count: 1 }, $set: { lastAt: now, details } },
        { returnDocument: "after" }
    ).lean();
    if (existing) return existing;

    const flag = await StealFlag.create({ kind, users: ids, key, details, firstAt: now, lastAt: now });
    const admins = await User.find({ role: "admin" }).distinct("_id");
    if (admins.length > 0) {
        await Notification.insertMany(admins.map((recipient) => ({ recipient, type: "stealFlag", stealFlag: flag._id, actors: ids })));
    }
    return flag;
}

const within = (days) => new Date(Date.now() - days * DAY_MS);

// After two members traded (or one bought the other's listing, or sent a
// gift): alts sharing a device, and extreme prices. `pp` is what changed
// hands for `items` (their original prices), `gift` for a gift.
async function checkTrade(a, b, { pp, items, gift = false }) {
    try {
        if (await shareDevice(a, b)) {
            await raiseFlag("alt", [a, b], "Two accounts seen on the same IP or device traded items.");
        }
        const worth = items.reduce((sum, item) => sum + (item.originalPrice ?? 0), 0);
        const tiers = items.map((item) => item.tier);
        const { lowRatio, highRatio, giftTiers } = STEAL.flags;
        if (gift) {
            if (tiers.some((tier) => giftTiers.includes(tier))) {
                await raiseFlag("trade", [a, b], `A ${tiers.join(", ")} item was given away for free.`);
            }
        } else if (worth > 0 && (pp <= worth * lowRatio || pp >= worth * highRatio)) {
            await raiseFlag("trade", [a, b], `Items first bought for ${worth} PP changed hands for ${pp} PP.`);
        }
    } catch (error) {
        console.error("Steal and Defend couldn't check a trade:", error.message);
    }
}

// After a successful steal: alts, and the same two stealing from each
// other again and again.
async function checkSteal(attackerId, victimId) {
    try {
        if (await shareDevice(attackerId, victimId)) {
            await raiseFlag("alt", [attackerId, victimId], "Two accounts seen on the same IP or device stole from each other.");
        }
        const steals = await StealAttack.countDocuments({
            outcome: "success",
            resolvedAt: { $gte: within(STEAL.flags.windowDays) },
            $or: [
                { attacker: attackerId, victim: victimId },
                { attacker: victimId, victim: attackerId },
            ],
        });
        if (steals >= STEAL.flags.collusionSteals) {
            await raiseFlag("collusion", [attackerId, victimId], `${steals} successful steals between them in ${STEAL.flags.windowDays} days.`);
        }
    } catch (error) {
        console.error("Steal and Defend couldn't check a steal:", error.message);
    }
}

// After a failed attack left the thief in debt.
async function checkDebt(attackerId) {
    try {
        const debts = await StealAttack.countDocuments({
            attacker: attackerId,
            "amounts.debt": { $gt: 0 },
            resolvedAt: { $gte: within(STEAL.flags.windowDays) },
        });
        if (debts >= STEAL.flags.debts) {
            await raiseFlag("debt", [attackerId], `Went into debt from failed attacks ${debts} times in ${STEAL.flags.windowDays} days.`);
        }
    } catch (error) {
        console.error("Steal and Defend couldn't check a debt:", error.message);
    }
}

// After turning PvP off took steals back. `takebacks`: when it has.
async function checkRefunds(userId, takebacks) {
    const recent = takebacks.filter((at) => at >= within(STEAL.flags.windowDays)).length;
    if (recent >= STEAL.flags.refunds) {
        await raiseFlag("refund", [userId], `Turned PvP off to take steals back ${recent} times in ${STEAL.flags.windowDays} days.`).catch((error) =>
            console.error("Steal and Defend couldn't raise a refund flag:", error.message)
        );
    }
}

module.exports = {
    SCOPES,
    BLOCKED_BY,
    activeBansOf,
    banFor,
    banMessage,
    refuseIfBanned,
    siteBanOf,
    forgetSiteBan,
    createBan,
    liftBan,
    recordSighting,
    shareDevice,
    raiseFlag,
    checkTrade,
    checkSteal,
    checkDebt,
    checkRefunds,
};
