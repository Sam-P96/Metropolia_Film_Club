const crypto = require("crypto");

// Kino Poker's cards. A card is a two-letter code: rank then suit, like
// "Ts" (ten of spades) or "Ah". Ranks 2-9, T, J, Q, K, A; suits s, h, d, c.

const RANKS = "23456789TJQKA";
const SUITS = "shdc";

// 2 to 14 (ace high).
const rankOf = (card) => RANKS.indexOf(card[0]) + 2;
const suitOf = (card) => card[1];

function newDeck() {
    const deck = [];
    for (const suit of SUITS) for (const rank of RANKS) deck.push(rank + suit);
    return deck;
}

// A Fisher-Yates shuffle with crypto.randomInt, which can't be predicted:
// every order of the deck is equally likely. `random(max)` gives 0 to
// max - 1; only the tests pass their own.
function shuffle(cards, random = crypto.randomInt) {
    const deck = [...cards];
    for (let i = deck.length - 1; i > 0; i--) {
        const j = random(i + 1);
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
}

const isCard = (value) => typeof value === "string" && value.length === 2 && RANKS.includes(value[0]) && SUITS.includes(value[1]);

module.exports = { RANKS, SUITS, rankOf, suitOf, newDeck, shuffle, isCard };
