const { rankOf, suitOf } = require("./cards");

// Five-card poker hands, best to worst, with standard tie-breaks. A hand's
// `score` is a list of numbers compared left to right: the category first
// (8 straight flush ... 0 high card), then the ranks that break ties within
// it, in the order they count. Suits never break ties: equal scores split
// the pot.

const CATEGORIES = [
    "High card",
    "Pair",
    "Two pair",
    "Three of a kind",
    "Straight",
    "Flush",
    "Full house",
    "Four of a kind",
    "Straight flush",
];

const RANK_NAMES = { 2: "Two", 3: "Three", 4: "Four", 5: "Five", 6: "Six", 7: "Seven", 8: "Eight", 9: "Nine", 10: "Ten", 11: "Jack", 12: "Queen", 13: "King", 14: "Ace" };
const plural = (rank) => (rank === 6 ? "Sixes" : `${RANK_NAMES[rank]}s`);

// The straight's top card, or 0 if `values` (five, high to low, no
// duplicates) aren't one. A-2-3-4-5 (the wheel) is a straight to the five.
function straightHigh(values) {
    if (new Set(values).size !== 5) return 0;
    if (values[0] - values[4] === 4) return values[0];
    if (values.join(",") === "14,5,4,3,2") return 5;
    return 0;
}

// `cards`: five codes. Returns { category, name, label, score }.
function evaluate(cards) {
    if (!Array.isArray(cards) || cards.length !== 5) throw new Error("A poker hand is five cards");
    const values = cards.map(rankOf).sort((a, b) => b - a);
    const flush = new Set(cards.map(suitOf)).size === 1;
    const high = straightHigh(values);

    // Groups of equal rank, biggest group first, then highest rank.
    const counts = new Map();
    for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
    const groups = [...counts].sort((a, b) => b[1] - a[1] || b[0] - a[0]);
    const shape = groups.map(([, count]) => count).join("");
    const ranks = groups.map(([value]) => value);

    let category;
    let tiebreak;
    let label;
    if (high && flush) {
        category = 8;
        tiebreak = [high];
        label = high === 14 ? "Royal flush" : `Straight flush, ${RANK_NAMES[high]} high`;
    } else if (shape === "41") {
        category = 7;
        tiebreak = ranks;
        label = `Four ${plural(ranks[0])}`;
    } else if (shape === "32") {
        category = 6;
        tiebreak = ranks;
        label = `Full house, ${plural(ranks[0])} over ${plural(ranks[1])}`;
    } else if (flush) {
        category = 5;
        tiebreak = values;
        label = `Flush, ${RANK_NAMES[values[0]]} high`;
    } else if (high) {
        category = 4;
        tiebreak = [high];
        label = `Straight, ${RANK_NAMES[high]} high`;
    } else if (shape === "311") {
        category = 3;
        tiebreak = ranks;
        label = `Three ${plural(ranks[0])}`;
    } else if (shape === "221") {
        category = 2;
        tiebreak = ranks;
        label = `Two pair, ${plural(ranks[0])} and ${plural(ranks[1])}`;
    } else if (shape === "2111") {
        category = 1;
        tiebreak = ranks;
        label = `Pair of ${plural(ranks[0])}`;
    } else {
        category = 0;
        tiebreak = values;
        label = `${RANK_NAMES[values[0]]} high`;
    }

    return { category, name: CATEGORIES[category], label, score: [category, ...tiebreak] };
}

// Below 0 if hand a loses to b, above 0 if it beats it, 0 for a tie.
function compareHands(a, b) {
    for (let i = 0; i < Math.max(a.score.length, b.score.length); i++) {
        const difference = (a.score[i] ?? 0) - (b.score[i] ?? 0);
        if (difference !== 0) return difference;
    }
    return 0;
}

module.exports = { CATEGORIES, evaluate, compareHands, straightHigh };
