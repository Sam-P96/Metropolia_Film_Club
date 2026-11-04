const { rankOf, suitOf } = require("./cards");
const { evaluate } = require("./evaluator");

// How the Kino Poker bots play, as plain functions: how good a hand is,
// which cards to throw away, and what to do on their turn. Each has its own
// personality:
//   shark     King Loan Shark: aggressive and chaotic. Raises a lot, bluffs a
//             lot, and now and then goes all in just for fun.
//   kaveri    Kaveri: friendly and cautious. Plays good hands, rarely bluffs.
//   maverick  Bret Maverick: plays the odds, and bluffs when it's likely to
//             work (few players left, after they drew a lot).
// `random()` gives a number from 0 to 1 (Math.random, or the tests' own).

const PERSONALITIES = {
    shark: { raiseAt: 0.5, aggression: 0.75, bluff: 0.3, callMargin: -0.12, chaos: 0.06, sizing: [0.8, 2], standPatBluff: 0.15 },
    kaveri: { raiseAt: 0.78, aggression: 0.35, bluff: 0.03, callMargin: 0.08, chaos: 0, sizing: [0.4, 0.7], standPatBluff: 0 },
    maverick: { raiseAt: 0.66, aggression: 0.6, bluff: 0.12, callMargin: 0, chaos: 0, sizing: [0.6, 1], standPatBluff: 0.06 },
};

// Where each made hand sits from 0 to 1, and how much its ranks move it.
const BASE = [0.08, 0.34, 0.6, 0.72, 0.8, 0.85, 0.91, 0.97, 0.995];
const SPREAD = [0.2, 0.2, 0.1, 0.07, 0.04, 0.04, 0.04, 0.02, 0.005];

// Four cards of one suit: the one that isn't (its index), or -1.
function flushDraw(cards) {
    const bySuit = new Map();
    cards.forEach((card, index) => bySuit.set(suitOf(card), [...(bySuit.get(suitOf(card)) ?? []), index]));
    for (const indexes of bySuit.values()) {
        if (indexes.length === 4) return [0, 1, 2, 3, 4].find((index) => !indexes.includes(index));
    }
    return -1;
}

// Four in a row open at both ends (not A-K-Q-J or A-2-3-4): the card that
// doesn't fit (its index), or -1.
function straightDraw(cards) {
    for (let skip = 0; skip < 5; skip++) {
        const values = cards.filter((_, index) => index !== skip).map(rankOf).sort((a, b) => a - b);
        const distinct = new Set(values).size === 4;
        if (distinct && values[3] - values[0] === 3 && values[3] < 14 && values[0] > 2) return skip;
    }
    return -1;
}

// How good `cards` are, from 0 (nothing) to 1 (unbeatable). Before the
// draw, a four-card flush or open straight counts for something too.
function handStrength(cards, { beforeDraw = false } = {}) {
    const hand = evaluate(cards);
    const top = hand.score[1] ?? 2;
    let strength = BASE[hand.category] + ((top - 2) / 12) * SPREAD[hand.category];
    if (beforeDraw && hand.category < 4) {
        if (flushDraw(cards) >= 0) strength = Math.max(strength, 0.45);
        else if (straightDraw(cards) >= 0) strength = Math.max(strength, 0.4);
    }
    return Math.min(1, strength);
}

// Which cards to throw away (indexes, at most `maxDraw`): keep what's made,
// draw to a four-card flush or open straight, otherwise keep the two
// highest. A bluffer might stand pat on nothing.
function chooseDiscards(cards, personality, { maxDraw = 3, random = Math.random } = {}) {
    const hand = evaluate(cards);
    const p = PERSONALITIES[personality] ?? PERSONALITIES.maverick;
    if (hand.category >= 4) return [];
    const counts = new Map();
    for (const card of cards) counts.set(rankOf(card), (counts.get(rankOf(card)) ?? 0) + 1);
    const notIn = (keep) => cards.map((card, index) => (keep(card) ? null : index)).filter((index) => index !== null);

    if (hand.category === 3 || hand.category === 2 || hand.category === 1) {
        // Keep the pairs and trips; throw the rest (at most maxDraw).
        return notIn((card) => counts.get(rankOf(card)) >= 2).slice(0, maxDraw);
    }
    const flush = flushDraw(cards);
    if (flush >= 0) return [flush];
    const straight = straightDraw(cards);
    if (straight >= 0) return [straight];
    if (random() < p.standPatBluff) return [];
    // Nothing: keep the two highest cards.
    const order = cards.map((card, index) => ({ index, value: rankOf(card) })).sort((a, b) => b.value - a.value);
    return order.slice(2).map((entry) => entry.index).slice(0, maxDraw).sort((a, b) => a - b);
}

const between = ([low, high], random) => low + (high - low) * random();

// What a bot does on its turn. `view`:
//   cards, beforeDraw, legal (betting.js legalActions), pot (all chips in
//   the middle, bets included), opponents (still in the hand), stack.
// Returns { action, amount? } for betting.js applyAction.
function decide(personality, view, random = Math.random) {
    const p = PERSONALITIES[personality] ?? PERSONALITIES.maverick;
    const { legal, pot } = view;
    const raw = handStrength(view.cards, { beforeDraw: view.beforeDraw });
    // More players still in means a hand has to be better to win.
    const strength = Math.max(0, raw - 0.06 * Math.max(0, view.opponents - 1));
    const toCall = legal.toCall ?? 0;
    const odds = toCall > 0 ? toCall / (pot + toCall) : 0;

    const raiseTo = (fraction) => {
        const target = legal.minRaiseTo + Math.round(pot * fraction);
        const to = Math.max(legal.minRaiseTo, Math.min(legal.maxRaiseTo, target));
        return to >= legal.maxRaiseTo * 0.85 ? { action: "allIn" } : { action: "raise", amount: to };
    };

    // King Loan Shark, now and then: everything, for the chaos.
    if (legal.canRaise && p.chaos && random() < p.chaos) return { action: "allIn" };

    // Bret Maverick bluffs when few are left; the others whenever the mood takes them.
    const bluffSpot = personality !== "maverick" || view.opponents <= 2;
    const bluffing = bluffSpot && random() < p.bluff;
    const wantsToRaise = (strength >= p.raiseAt || bluffing) && random() < (bluffing ? 1 : p.aggression + (strength - p.raiseAt));
    if (legal.canRaise && wantsToRaise) return raiseTo(between(p.sizing, random));

    if (legal.canCheck) return { action: "check" };
    // Worth calling: the hand's chances beat the price (looser or tighter
    // by personality). A call for very little is nearly always worth it.
    if (strength >= odds + p.callMargin || toCall <= Math.max(1, pot * 0.1)) return { action: "call" };
    return { action: "fold" };
}

module.exports = { PERSONALITIES, handStrength, chooseDiscards, decide, flushDraw, straightDraw };
