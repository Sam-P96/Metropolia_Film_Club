// Kino Kasino, the slot machine: everything about it that players may see,
// in this one file, read by the server (backend/utils/slots.js) and the page
// (pages/SlotMachine.jsx) alike. How often each symbol lands is NOT here:
// that's kept on the server (backend/games/slots/luck.js), and never sent
// to the page.
export const SLOTS = {
  // What the game is called, everywhere it's shown.
  name: 'Kino Kasino',

  reels: 5,
  rows: 3,

  // The bet covers all five lines. A line pays when it starts on the
  // leftmost reel with 3, 4 or 5 of the same symbol in a row; every line is
  // paid separately and the wins added together. Each line is the row it
  // passes through on each reel, left to right (0 is the top row).
  paylines: [
    { key: 'top', name: 'Top row', rows: [0, 0, 0, 0, 0] },
    { key: 'middle', name: 'Middle row', rows: [1, 1, 1, 1, 1] },
    { key: 'bottom', name: 'Bottom row', rows: [2, 2, 2, 2, 2] },
    { key: 'v', name: 'V', rows: [0, 1, 2, 1, 0] },
    { key: 'invertedV', name: 'Inverted V', rows: [2, 1, 0, 1, 2] },
  ],

  // The symbols, most common first. `pays` is what 3, 4 and 5 in a row pay,
  // as multiples of the bet. `art` is what the reels show: an emoji, or an
  // image (a file in frontend/src/assets/Slot_Machine_Icons/reel/, or a
  // path from the site's root like /favicon.svg), to swap freely.
  symbols: [
    { key: 'ticket', name: 'Movie Ticket', rarity: 'Common', art: { emoji: '🎟️' }, pays: [2, 5, 15] },
    { key: 'popcorn', name: 'Popcorn', rarity: 'Common', art: { emoji: '🍿' }, pays: [2.5, 8, 20] },
    { key: 'clapper', name: 'Clapperboard', rarity: 'Uncommon', art: { emoji: '🎬' }, pays: [4, 12, 40] },
    { key: 'film', name: 'Film Strip', rarity: 'Uncommon', art: { emoji: '🎞️' }, pays: [6, 20, 75] },
    { key: 'map', name: "The Marauder's Map", rarity: 'Rare', art: { image: 'map.webp' }, pays: [10, 40, 150] },
    { key: 'ring', name: 'The One Ring', rarity: 'Rare', art: { image: 'ring.webp' }, pays: [15, 75, 400] },
    { key: 'gauntlet', name: 'Infinity Gauntlet', rarity: 'Epic', art: { image: 'gauntlet.webp' }, pays: [25, 150, 1000] },
    // 5 in a row on any line is the jackpot instead of a 5-in-a-row pay.
    { key: 'logo', name: 'Kino Kaveri', rarity: 'Legendary', art: { image: '/favicon.svg' }, pays: [20, 100, null], jackpot: true },
  ],

  // 5 Kino Kaveri logos on a line pay this many times the bet.
  jackpotMultiplier: 28500,

  // A win of this many times the bet or more is a big win.
  bigWinMultiple: 20,

  // Bets go up and down in whole PP, from this many; MAX bets everything.
  minBet: 1,

  // Add credits: the quick buttons, which add to the amount picked.
  quickCredits: [10, 50],

  // Cash out: P-PP winnings taken back to the wallet are capped each day
  // (12:00 to 12:00 Helsinki time) at this many times what the richest
  // member held at 12:00. What's over the cap waits in the machine.
  cashOutCapMultiple: 3,
}

// Every symbol by its key.
export const SYMBOL_BY_KEY = Object.fromEntries(SLOTS.symbols.map((symbol) => [symbol.key, symbol]))
