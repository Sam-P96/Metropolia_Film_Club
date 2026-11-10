const User = require("../../models/userModel");
const StealPlayer = require("../../models/stealPlayerModel");
const StealAttack = require("../../models/stealAttackModel");
const { STEAL } = require("../../../shared/steal/config.js");
const { StealError, classOf, lastWeeklyResetAt, settleBill, nextWeeklyResetAt } = require("../../games/steal/rules");
const { changeWallet, WalletError } = require("../wallet");
const { inSession } = require("./tx");
const { checkRefunds } = require("./moderation");
const { moneyElsewhere } = require("./elsewhere");

// Steal and Defend's players: PvP, classes and follow penalties (spec §4,
// §9, §12).
//
// There's one PvP switch on the site, the PVP setting in Edit profile
// (User.pvp). On, a member can dislike and be disliked, and is in Steal and
// Defend: they can attack and be attacked. Off, neither. Everyone starts
// as a Warrior (STEAL.defaultClass) and can change class once a week.

const ACTIVE = ["quiz", "resolving"];

// Their game settings: what's stored (if they've ever played), PvP from
// their profile, and the default class until they pick another.
async function playerOf(userId, session = null) {
    const player = await StealPlayer.findById(userId).session(session).lean();
    const user = await User.findById(userId).select("pvp").session(session).lean();
    return {
        _id: userId,
        takebacks: [],
        classChangedAt: null,
        equipped: [],
        penalties: [],
        attackDay: null,
        attackCount: 0,
        ...(player ?? {}),
        playerClass: classOf(player?.playerClass) ? player.playerClass : STEAL.defaultClass,
        enabled: Boolean(user?.pvp),
    };
}

function inAttack(userId, session = null) {
    return StealAttack.exists({ status: { $in: ACTIVE }, $or: [{ attacker: userId }, { victim: userId }] }).session(session);
}

// Whether their class can be changed now: once a week, from Monday 12:00.
// The first change from the default Warrior can be made any time.
function canChangeClass(player, now = new Date()) {
    return !player.classChangedAt || player.classChangedAt < lastWeeklyResetAt(now);
}

// What turning PvP off now would take back (spec §12): every steal since
// Monday's reset that hasn't been already.
async function takebackOf(userId, now = new Date(), session = null) {
    const steals = await StealAttack.find({
        attacker: userId,
        outcome: "success",
        resolvedAt: { $gte: lastWeeklyResetAt(now) },
        takenBackAt: null,
    })
        .sort({ resolvedAt: 1 })
        .session(session)
        .lean();
    const owed = steals.reduce((sum, attack) => sum + (attack.amounts?.attackerGot ?? 0), 0);
    return { steals, owed };
}

async function previewTurnOff(userId) {
    const { steals, owed } = await takebackOf(userId);
    return { steals: steals.length, owed };
}

// PvP can't go off while an attack they're in is being played (spec §12).
async function refuseTurningOff(userId) {
    if (await inAttack(userId)) {
        throw new StealError("You can't turn PVP off while a Steal and Defend attack you're in is being played. Try again when it's over.", 409, "IN_ATTACK");
    }
}

// They're turning PvP off (controllers/userControllers.js, before the
// profile is saved). Everything they stole since Monday 12:00 is taken
// back: each victim gets back what they lost (Wilson's refund aside), and
// the newly made extras (crits, the Rogue's bonus) are gone. If they can't
// cover it, the usual debt rule applies, and victims only get what was
// actually recovered (paid, or owed in full for PP they'd parked
// elsewhere), oldest steal first. Their items stay theirs,
// unequipped. Returns what was taken back.
async function takeBackSteals(userId) {
    await refuseTurningOff(userId);
    const now = new Date();

    const takenBack = await inSession(async (session) => {
        const { steals } = await takebackOf(userId, now, session);

        // Each one claimed, so two saves at once can't take it back twice.
        const claimed = [];
        for (const attack of steals) {
            const result = await StealAttack.updateOne({ _id: attack._id, takenBackAt: null }, { $set: { takenBackAt: now } }, { session });
            if (result.modifiedCount === 1) claimed.push(attack);
        }

        const owed = claimed.reduce((sum, attack) => sum + (attack.amounts?.attackerGot ?? 0), 0);
        let settled = { paid: 0, unpaid: 0, covered: 0, debt: 0, forgiven: 0, collected: 0 };
        if (owed > 0) {
            // PP parked outside the wallet can't dodge it either.
            const elsewhere = (await moneyElsewhere(userId, session)).total;
            await changeWallet(
                userId,
                (wallet) => {
                    settled = settleBill(owed, wallet.pp + wallet.ppp, elsewhere);
                    const fromPp = Math.min(Math.max(0, wallet.pp), settled.paid);
                    return { pp: 0 - fromPp, ppp: 0 - (settled.paid - fromPp) - settled.debt };
                },
                { reason: "stealTakeback", steal: true, allowDebt: true, session }
            );
        }

        // What was paid, and what parked PP covers (owed in full).
        let left = settled.collected;
        const refunds = [];
        for (const attack of claimed) {
            const lost = Math.max(0, (attack.amounts?.victimLost ?? 0) - (attack.amounts?.wilson ?? 0));
            const back = Math.min(lost, left);
            if (back <= 0) continue;
            try {
                await changeWallet(attack.victim, () => ({ ppp: back }), {
                    reason: "stealTakeback",
                    steal: true,
                    stealRef: attack._id,
                    other: userId,
                    session,
                });
                left -= back;
                refunds.push({ victim: attack.victim, amount: back });
            } catch (error) {
                // A victim who has left the club: their share goes to nobody.
                if (!(error instanceof WalletError)) throw error;
            }
        }

        const update = claimed.length > 0 ? { $set: { equipped: [] }, $push: { takebacks: now } } : { $set: { equipped: [] } };
        await StealPlayer.updateOne({ _id: userId }, update, { session });

        return { steals: claimed.length, owed, paid: settled.paid, covered: settled.covered, debt: settled.debt, refunds };
    });

    if (takenBack.steals > 0) {
        const after = await playerOf(userId);
        await checkRefunds(userId, after.takebacks ?? []);
    }
    return takenBack;
}

// A new class, once a week (spec §9).
async function changeClass(userId, playerClass) {
    if (!classOf(playerClass)) throw new StealError("Pick Warrior, Mage or Rogue.");
    const player = await playerOf(userId);
    if (!player.enabled) throw new StealError("Turn on PVP from your profile page first.", 403, "PVP_OFF");
    if (player.playerClass === playerClass) return player;
    const now = new Date();
    const locked = new StealError(`You've changed class this week. You can again from ${nextWeeklyResetAt(now).toISOString()}.`, 409, "CLASS_LOCKED");
    if (!canChangeClass(player, now)) throw locked;
    try {
        // Made if they've never played: a first pick is a change from Warrior.
        await StealPlayer.updateOne(
            { _id: userId, $or: [{ classChangedAt: null }, { classChangedAt: { $lt: lastWeeklyResetAt(now) } }] },
            { $set: { playerClass, classChangedAt: now } },
            { upsert: true }
        );
    } catch (error) {
        // Their row exists but was changed this week after all.
        if (error.code === 11000) throw locked;
        throw error;
    }
    return playerOf(userId);
}

// How many times they've unfollowed `victimId` after stealing from them.
function unfollowsOf(player, victimId) {
    return player.penalties?.find((entry) => String(entry.victim) === String(victimId))?.unfollows ?? 0;
}

// `followerId` unfollowed `followingId` (controllers/followController.js).
// If they've ever stolen from them, the follow time they need for them
// doubles (spec §4). Otherwise unfollowing only restarts the clock, which
// the follow itself does: a new follow has a new date.
async function onUnfollow(followerId, followingId) {
    const stole = await StealAttack.exists({ attacker: followerId, victim: followingId, outcome: "success" });
    if (!stole) return;
    const bumped = await StealPlayer.updateOne(
        { _id: followerId, "penalties.victim": followingId },
        { $inc: { "penalties.$.unfollows": 1 } }
    );
    if (bumped.matchedCount === 0) {
        await StealPlayer.updateOne(
            { _id: followerId, "penalties.victim": { $ne: followingId } },
            { $push: { penalties: { victim: followingId, unfollows: 1 } } },
            { upsert: true }
        ).catch((error) => {
            if (error.code !== 11000) throw error;
        });
    }
}

// The player as their own pages show it.
function playerView(player, now = new Date()) {
    return {
        enabled: Boolean(player.enabled),
        playerClass: player.playerClass,
        classLabel: classOf(player.playerClass)?.label ?? null,
        canChangeClass: canChangeClass(player, now),
        classChangesAt: canChangeClass(player, now) ? null : nextWeeklyResetAt(now),
    };
}

module.exports = {
    playerOf,
    inAttack,
    canChangeClass,
    takebackOf,
    previewTurnOff,
    refuseTurningOff,
    takeBackSteals,
    changeClass,
    unfollowsOf,
    onUnfollow,
    playerView,
};
