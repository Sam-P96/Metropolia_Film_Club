const crypto = require("crypto");
const { DateTime } = require("luxon");
const { STEAL } = require("../../../shared/steal/config.js");

// Steal and Defend's sums as plain functions, with no database: how much an
// attack takes, the success formula, fines and debt, Critical Hits, prices,
// sell-back, the shop's roll and when the day and week start over. The
// server (utils/steal/) plays the game with these; tests/steal.test.js
// checks them alone. The numbers are in shared/steal/config.js.
//
// Every amount rounds up to a whole PP and is never less than 1 (spec §2).
// The sums are done in whole numbers (a percentage times 100), so 2.25 x 4
// is exactly 9, never 9.000000000000002 rounding up to 10.

// A refusal, sent back as JSON: { error: message, code }. `code` is for the
// page to act on.
class StealError extends Error {
    constructor(message, status = 400, code = null, extra = {}) {
        super(message);
        this.status = status;
        this.code = code;
        this.extra = extra;
    }
}

// Where random numbers come from: crypto.randomInt(max) (0 to max - 1),
// which can't be predicted. Tests pass their own.
const defaultRandom = (max) => crypto.randomInt(max);

// `percent` % of `amount`, rounded up. `percent` can have up to two
// decimals (225 for x2.25).
function ceilPercent(amount, percent) {
    const scaled = Math.round(percent * 100);
    return Math.ceil((amount * scaled) / 10000);
}

// Rounded up, and never less than 1 PP.
const atLeastOne = (amount) => Math.max(1, Math.ceil(amount));

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

// What an attack at `percent` % of `netWorth` tries to take (spec §8.3).
function attemptedAmount(percent, netWorth) {
    return atLeastOne(ceilPercent(netWorth, percent));
}

// Whether `value` is one of the percentages an attack can be for
// (STEAL.percents: 1, 2, 3, 4, 5, 10, 20, 30, 40 or 50).
function isPercent(value) {
    return Number.isInteger(value) && STEAL.percents.includes(value);
}

// The Critical Hit multiplier for a chosen percentage: x2 at 1% up to
// x4.25 at 50%.
function critMultiplier(percent) {
    const multiplier = STEAL.crit.multipliers[percent];
    if (multiplier === undefined) throw new RangeError(`No crit multiplier for ${percent}%`);
    return multiplier;
}

const classOf = (key) => (key && Object.hasOwn(STEAL.classes, key) ? STEAL.classes[key] : null);

// The success formula (spec §8.1).
//   attack  = 10 x correct + attack items + class, clamped to 0..100
//   defense = defense items + Red Pill x wrong + class, capped at 75
//             (or an item's higher cap)
//   success = attack - defense, never below 0
// `attacker` and `defender` are combined item effects
// (games/steal/items.js combinedEffects); classes are keys of STEAL.classes.
function successChance({ correct, wrong, attacker = {}, defender = {}, attackerClass = null, defenderClass = null }) {
    const attackRate = clamp(
        STEAL.quiz.pointsPerCorrect * correct + (attacker.attack ?? 0) + (classOf(attackerClass)?.attack ?? 0),
        STEAL.attackRange.min,
        STEAL.attackRange.max
    );
    const cap = Math.max(STEAL.defenseCap, defender.defenseCap ?? 0);
    const defenseRate = clamp(
        (defender.defense ?? 0) + (defender.redPill ?? 0) * wrong + (classOf(defenderClass)?.defense ?? 0),
        0,
        cap
    );
    return { attack: attackRate, defense: defenseRate, success: clamp(attackRate - defenseRate, 0, 100) };
}

// A failed attack's bill (spec §8.4), from the attempted amount:
//   fine      80% (+20 Paint Can, -30 Getaway Car, +5 Rogue), rounded up
//   revenge   the Revenge Dagger's 100% of the attempted amount
// The defender gets the fine without the Rogue's extra 5% (`burned` goes to
// nobody), plus the revenge. `finePercent` is what the fine came to.
function fineBill({ attempted, attacker = {}, defender = {}, attackerClass = null }) {
    const rogueExtra = classOf(attackerClass)?.fineBonus ?? 0;
    const withoutRogue = Math.max(0, STEAL.fine.base + (attacker.fine ?? 0) + (defender.fine ?? 0));
    const finePercent = withoutRogue + rogueExtra;

    const fine = finePercent > 0 ? atLeastOne(ceilPercent(attempted, finePercent)) : 0;
    const fineToDefender = rogueExtra && withoutRogue > 0 ? Math.min(fine, atLeastOne(ceilPercent(attempted, withoutRogue))) : rogueExtra ? 0 : fine;
    const revenge = (defender.revenge ?? 0) > 0 ? atLeastOne(ceilPercent(attempted, defender.revenge)) : 0;

    return {
        finePercent,
        fine,
        revenge,
        burned: fine - fineToDefender,
        toDefender: fineToDefender + revenge,
        bill: fine + revenge,
    };
}

// What happens when someone owes `bill` and has `available` in their
// wallet (spec §8.5): they pay all they have, and 25% of what's left,
// rounded up, becomes a negative balance (`debt`). The rest is forgiven.
//
// `elsewhere` is the PP they've put outside their wallet (a Slot Machine,
// the poker table, loan offers, money lent out: utils/steal/elsewhere.js).
// That can't dodge a bill: as much of what's left as it could cover becomes
// a negative balance in full (`covered`, part of `debt`), and only the
// rest gets the 25% rule. A wallet already below zero has a claim on it
// first. Whoever the bill is owed to is paid `collected`: `paid` and
// `covered` both (the covered part is real money, only parked, and the
// negative balance gets it back as it comes in).
//
// `inFull` (a defender's Revenge Dagger is in the bill): nothing is
// forgiven. Whatever isn't paid becomes a negative balance, however big,
// and whoever it's owed to is paid the whole bill.
function settleBill(bill, available, elsewhere = 0, { inFull = false } = {}) {
    const paid = Math.min(bill, Math.max(0, available));
    const unpaid = bill - paid;
    const covered = Math.min(unpaid, Math.max(0, elsewhere + Math.min(0, available)));
    if (inFull) return { paid, unpaid, covered, debt: unpaid, forgiven: 0, collected: bill };
    const rest = unpaid - covered;
    const share = rest > 0 ? atLeastOne(ceilPercent(rest, STEAL.debtShare)) : 0;
    return { paid, unpaid, covered, debt: covered + share, forgiven: rest - share, collected: paid + covered };
}

// Who gets what was actually paid of a bill: the defender first, up to
// their share, and anything past it (the Rogue's extra) goes to nobody.
function splitPaid(paid, toDefender) {
    const defenderGets = Math.min(paid, toDefender);
    return { defenderGets, burned: paid - defenderGets };
}

// A successful steal (spec §8.3): the victim loses the attempted amount
// (nothing with the Reality Stone). The thief gets it, times the crit
// multiplier on a Critical Hit, plus the Rogue's 20% of that; both extras
// are newly made.
function successPayout({ attempted, percent, crit = false, attackerClass = null, noLoss = false }) {
    const gain = crit ? ceilPercent(attempted, critMultiplier(percent) * 100) : attempted;
    const rogue = classOf(attackerClass)?.gainBonus ?? 0;
    const rogueBonus = rogue > 0 ? atLeastOne(ceilPercent(gain, rogue)) : 0;
    return {
        victimLoses: noLoss ? 0 : attempted,
        critBonus: gain - attempted,
        rogueBonus,
        attackerGets: gain + rogueBonus,
    };
}

// Wilson: a robbed defender gets back this share of what they actually
// lost, newly made. Nothing back for nothing lost.
function wilsonRefund(lost, percent) {
    return lost > 0 && percent > 0 ? atLeastOne(ceilPercent(lost, percent)) : 0;
}

// The order of checks after the quiz (spec §8.2), as rolls. `random(max)`
// gives 0 to max - 1. Returns { outcome, success, crit, rolls }, outcome
// being "success", "fail" or "neuralyzed". A fizzle happens earlier, when
// the attack starts (rollFizzle).
//   auto      a Power or Soul Stone: it just succeeds
//   doomed    another attack on the victim finished first: it just fails
function rollOutcome({ chance, auto = false, doomed = false, attacker = {}, defender = {}, random = defaultRandom }) {
    const rolls = {};
    let success;
    if (doomed) success = false;
    else if (auto) success = true;
    else {
        rolls.success = random(100);
        success = rolls.success < chance;
    }

    if (!success) return { outcome: "fail", success: false, crit: false, rolls };

    if ((defender.neuralyzer ?? 0) > 0) {
        rolls.neuralyzer = random(100);
        if (rolls.neuralyzer < defender.neuralyzer) return { outcome: "neuralyzed", success: false, crit: false, rolls };
    }

    let crit;
    if (attacker.forceCrit) crit = true;
    else if (defender.critImmune) crit = false;
    else {
        rolls.crit = random(100);
        crit = rolls.crit < Math.max(STEAL.crit.chance, attacker.critChance ?? 0);
    }
    return { outcome: "success", success: true, crit, rolls };
}

// The Invisibility Cloak's roll as an attack starts: true if it fizzles.
function rollFizzle(defender = {}, random = defaultRandom) {
    if (!((defender.fizzle ?? 0) > 0)) return { fizzled: false, roll: null };
    const roll = random(100);
    return { fizzled: roll < defender.fizzle, roll };
}

// An item's price for a buyer who gets `dailyPp` PP a day (spec §10.2).
function itemPrice(priceMultiplier, dailyPp) {
    return atLeastOne(ceilPercent(Math.max(0, dailyPp), priceMultiplier * 100));
}

// What the shop pays for an item back (spec §10.5): half what it first
// cost, times how much durability is left.
function sellBackValue(originalPrice, remaining, max) {
    const share = Math.round(STEAL.shop.sellBack * 100);
    return atLeastOne((originalPrice * share * Math.max(0, remaining)) / (100 * max));
}

// How long someone must have followed a victim before attacking them:
// 72 hours, doubled for each unfollow after a successful steal from them,
// never past 21 days (spec §4).
function requiredFollowHours(unfollows = 0) {
    return Math.min(STEAL.follow.capHours, STEAL.follow.hours * 2 ** Math.max(0, unfollows));
}

// A tier for one shop listing, from STEAL.shop.tierChances.
function rollTier(random = defaultRandom) {
    const chances = STEAL.shop.tierChances;
    const total = Object.values(chances).reduce((sum, chance) => sum + chance, 0);
    let roll = random(total);
    for (const tier of STEAL.tiers) {
        const chance = chances[tier] ?? 0;
        if (roll < chance) return tier;
        roll -= chance;
    }
    return STEAL.tiers[0];
}

// The day's listings (spec §10.3): `count` item ids, each a tier roll then
// a random item in it. An Infinity Stone is only picked if it doesn't
// exist anywhere (`existing`: ids of stones owned or listed) and isn't
// already one of these listings. A Legendary roll with nothing left
// becomes Epic. A tier with no items at all falls to the one below.
function rollShop({ items, existing = [], count = STEAL.shop.listings, random = defaultRandom }) {
    const taken = new Set(existing);
    const picks = [];

    for (let i = 0; i < count; i++) {
        let tier = rollTier(random);
        let pool = [];
        for (;;) {
            pool = items.filter((item) => item.tier === tier && !(item.unique && taken.has(item.id)));
            if (pool.length > 0) break;
            const below = tier === "Legendary" ? STEAL.shop.noStonesLeft : STEAL.tiers[STEAL.tiers.indexOf(tier) - 1];
            if (!below || below === tier) break;
            tier = below;
        }
        if (pool.length === 0) break;

        const item = pool[random(pool.length)];
        if (item.unique) taken.add(item.id);
        picks.push(item.id);
    }
    return picks;
}

// --- when the day and week start over ---

// The latest daily reset (12:00 Helsinki) at or before `now`.
function lastDailyResetAt(now = new Date()) {
    const here = DateTime.fromJSDate(now, { zone: STEAL.zone });
    let reset = here.set({ hour: STEAL.daily.hour, minute: 0, second: 0, millisecond: 0 });
    if (reset > here) reset = reset.minus({ days: 1 });
    return reset.toJSDate();
}

function nextDailyResetAt(now = new Date()) {
    return DateTime.fromJSDate(lastDailyResetAt(now), { zone: STEAL.zone }).plus({ days: 1 }).toJSDate();
}

// The latest weekly reset (Monday 12:00 Helsinki) at or before `now`.
function lastWeeklyResetAt(now = new Date()) {
    const here = DateTime.fromJSDate(now, { zone: STEAL.zone });
    let reset = here.set({ weekday: STEAL.weekly.weekday, hour: STEAL.weekly.hour, minute: 0, second: 0, millisecond: 0 });
    if (reset > here) reset = reset.minus({ weeks: 1 });
    return reset.toJSDate();
}

function nextWeeklyResetAt(now = new Date()) {
    return DateTime.fromJSDate(lastWeeklyResetAt(now), { zone: STEAL.zone }).plus({ weeks: 1 }).toJSDate();
}

// The shop's day: the Helsinki date its listings went up, like
// "2026-11-04". Until 12:00 it's still yesterday's.
function shopDay(now = new Date()) {
    return DateTime.fromJSDate(lastDailyResetAt(now), { zone: STEAL.zone }).toISODate();
}

module.exports = {
    StealError,
    defaultRandom,
    ceilPercent,
    atLeastOne,
    attemptedAmount,
    isPercent,
    critMultiplier,
    classOf,
    successChance,
    fineBill,
    settleBill,
    splitPaid,
    successPayout,
    wilsonRefund,
    rollOutcome,
    rollFizzle,
    itemPrice,
    sellBackValue,
    requiredFollowHours,
    rollTier,
    rollShop,
    lastDailyResetAt,
    nextDailyResetAt,
    lastWeeklyResetAt,
    nextWeeklyResetAt,
    shopDay,
};
