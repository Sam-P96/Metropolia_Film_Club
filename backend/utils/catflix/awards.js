const mongoose = require("mongoose");
const User = require("../../models/userModel");
const Event = require("../../models/eventModel");
const CatflixPlayer = require("../../models/catflixPlayerModel");
const PackAward = require("../../models/packAwardModel");
const { notePackAward } = require("../notify");
const { CATFLIX } = require("../../../shared/catflix/rules.js");
const { CatflixError } = require("./pets");
const { playerOf } = require("./shop");

// Booster packs admins award members, as presents (shared/catflix/rules.js
// packs): from an event page's Reward Mode, a Black & Gold pack for
// attending it (one member, or everyone attending or interested), or from
// the admin panel, any pack to anyone. The pack goes straight into their
// packs, to open in the shop or from the notification they get, and each
// award is kept (models/packAwardModel.js) so the event page knows who's had
// one. An event page's award can only reach the same member once every
// EVENT_AWARD_EVERY_MS, whichever admin and whichever event.

const EVENT_PACK = "blackGold";
const EVENT_AWARD_EVERY_MS = 30 * 1000;
const isPack = (kind) => typeof kind === "string" && Object.hasOwn(CATFLIX.packs, kind);

// Gives `userId` one `kind` pack from `adminId`, and tells them. `event`:
// the event it's for (an event page's award), which only goes through if
// they haven't had one from an event page in the last 30 seconds (a 429
// otherwise). Resolves to the award.
async function awardPack(adminId, userId, { kind = EVENT_PACK, event = null, now = new Date() } = {}) {
    if (!isPack(kind)) throw new CatflixError("There's no pack like that.");
    if (!mongoose.isValidObjectId(userId) || !(await User.exists({ _id: userId }))) throw new CatflixError("That member doesn't exist any more.", 404);
    const pack = `packs.${kind}`;
    // Their Catflix record, made (with everything it starts with) if they've never played.
    await playerOf(userId);
    if (event) {
        // Claimed in one step, so two admins at once can't both get through.
        const ready = new Date(now.getTime() - EVENT_AWARD_EVERY_MS);
        const claimed = await CatflixPlayer.findOneAndUpdate(
            { user: userId, $or: [{ awardedAt: null }, { awardedAt: { $lte: ready } }] },
            { $set: { awardedAt: now }, $inc: { [pack]: 1 } }
        );
        if (!claimed) {
            const player = await CatflixPlayer.findOne({ user: userId }).select("awardedAt").lean();
            const seconds = Math.max(1, Math.ceil((new Date(player?.awardedAt ?? now).getTime() + EVENT_AWARD_EVERY_MS - now.getTime()) / 1000));
            throw new CatflixError(`They were awarded a pack moments ago: again in ${seconds} second${seconds === 1 ? "" : "s"}.`, 429);
        }
    } else {
        await CatflixPlayer.updateOne({ user: userId }, { $inc: { [pack]: 1 } });
    }
    const award = await PackAward.create({ user: userId, by: adminId, kind, event: event?._id ?? null, eventTitle: event?.title ?? null, at: now });
    await notePackAward(userId, adminId, kind, event?.title ?? null);
    return award;
}

// The event `eventId`, or a 404.
async function eventOrThrow(eventId) {
    const event = mongoose.isValidObjectId(eventId) ? await Event.findById(eventId).select("title attending interested").lean() : null;
    if (!event) throw new CatflixError("Event not found.", 404);
    return event;
}

// How many times each member has been awarded a pack for `eventId`:
// { userId: count }.
async function awardsFor(eventId) {
    await eventOrThrow(eventId);
    const rows = await PackAward.aggregate([{ $match: { event: new mongoose.Types.ObjectId(String(eventId)) } }, { $group: { _id: "$user", count: { $sum: 1 } } }]);
    return Object.fromEntries(rows.map((row) => [String(row._id), row.count]));
}

// An event page's Award button: a Black & Gold pack for `userId`, for
// attending `eventId`. Resolves to the event's awards ({ userId: count }).
async function awardForEvent(adminId, eventId, userId, now = new Date()) {
    const event = await eventOrThrow(eventId);
    await awardPack(adminId, userId, { event, now });
    return awardsFor(eventId);
}

// "Award All Attending" (`list`: "attending") or "Award All Interested"
// ("interested"): a Black & Gold pack for everyone on that list, private
// profiles included, except anyone awarded one in the last 30 seconds.
// Resolves to { awarded, skipped, awards }.
async function awardEveryone(adminId, eventId, list, now = new Date()) {
    if (list !== "attending" && list !== "interested") throw new CatflixError("Award everyone attending, or everyone interested.");
    const event = await eventOrThrow(eventId);
    const ids = [...new Set((event[list] ?? []).map(String))];
    let awarded = 0;
    let skipped = 0;
    for (const userId of ids) {
        try {
            await awardPack(adminId, userId, { event, now });
            awarded += 1;
        } catch (error) {
            if (!(error instanceof CatflixError)) throw error;
            skipped += 1; // awarded moments ago, or their account has gone
        }
    }
    return { awarded, skipped, awards: await awardsFor(eventId) };
}

module.exports = { EVENT_PACK, EVENT_AWARD_EVERY_MS, awardPack, awardsFor, awardForEvent, awardEveryone };
