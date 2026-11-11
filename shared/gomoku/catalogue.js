// The Infinite Gomoku shop: every piece, shockwave, board and grid, in this
// one file. The server (backend/utils/gomokuShop.js) reads ids and prices
// from it; the pages (frontend/src/components/gomoku/) read how each one
// looks. Bought with points (PP first, then P-PP), separate from the Black
// Market and Steal and Defend's shop.
//
// Ids never change once members own them. The free ones (price 0) are
// everyone's. To add an item, add a row: a piece needs only its emoji or
// colours here; a shockwave's particles are drawn by
// frontend/src/components/gomoku/shockwave.js, and a board's or grid's
// look is a CSS class in frontend/src/components/gomoku/gomoku.css.

export const KINDS = ['piece', 'shockwave', 'board', 'grid']

export const KIND_LABELS = {
  piece: 'Pieces',
  shockwave: 'Shockwaves',
  board: 'Boards',
  grid: 'Grids',
}

// What a member has on until they choose something else.
export const DEFAULTS = {
  piece: 'piece.black',
  shockwave: 'wave.ripple',
  board: 'board.classic',
  grid: 'grid.classic',
}

const PRICES = {
  gem: 1000,
  emoji: 200,
  gauntlet: 10000,
  shockwave: 500,
  board: 300,
  grid: 300,
}

// ---------- pieces ----------
// look.type: 'stone' (a plain round stone, `color` black or white), 'gem'
// (an Infinity Stone: it glows and breathes in its colours), 'emoji' (with
// `outline`, two colours: a gradient outline round it), or 'image' (a
// picture from frontend/src/assets).

const STONES = [
  { id: 'piece.black', name: 'Black Stone', look: { type: 'stone', color: 'black' } },
  { id: 'piece.white', name: 'White Stone', look: { type: 'stone', color: 'white' } },
]

// The six Infinity Stones, by colour.
const GEMS = [
  { key: 'soul', name: 'Soul', colors: ['#ffd29a', '#ff8a1f', '#a84400'] },
  { key: 'time', name: 'Time', colors: ['#c6ffd4', '#2fe06a', '#0b7a2c'] },
  { key: 'space', name: 'Space', colors: ['#cfe4ff', '#2a7bff', '#0b2f8a'] },
  { key: 'reality', name: 'Reality', colors: ['#ffc2cc', '#ff2a4d', '#8a0018'] },
  { key: 'power', name: 'Power', colors: ['#e7d1ff', '#a35bff', '#4b1497'] },
  { key: 'mind', name: 'Mind', colors: ['#fff6c2', '#ffd21a', '#a37a00'] },
]

// [key, name, emoji, outline colours (optional)].
const EMOJI = [
  ['wolf', 'Wolf', '🐺'],
  ['cool', 'Cool', '😎'],
  ['chicken', 'Chicken', '🐔'],
  ['lips', 'Lips', '🫦'],
  ['spades', 'Spades', '♠️'],
  ['clubs', 'Clubs', '♣️'],
  ['hearts', 'Hearts', '♥️'],
  ['diamonds', 'Diamonds', '♦️'],
  ['burger', 'Burger', '🍔'],
  ['pizza', 'Pizza', '🍕'],
  ['fries', 'Fries', '🍟'],
  ['hot-dog', 'Hot Dog', '🌭'],
  ['popcorn', 'Popcorn', '🍿'],
  ['smirk-cat', 'Smirking Cat', '😼'],
  ['bunny', 'Bunny', '🐰'],
  ['polar-bear', 'Polar Bear', '🐻‍❄️'],
  ['bear', 'Bear', '🐻'],
  ['chick', 'Chick', '🐣'],
  ['snail', 'Snail', '🐌'],
  // Was the Spider Web; the id stays, so whoever bought that has this.
  ['web', 'Spider', '🕷️', ['#ff2a4d', '#2a7bff']],
  ['eye', 'Eye', '👁️'],
]

const PIECES = [
  ...STONES.map((stone) => ({ ...stone, kind: 'piece', category: 'Stones', price: 0 })),
  ...GEMS.map((gem) => ({
    id: `piece.gem.${gem.key}`,
    kind: 'piece',
    name: `${gem.name} Stone`,
    category: 'Infinity Stones',
    price: PRICES.gem,
    look: { type: 'gem', colors: gem.colors },
  })),
  ...EMOJI.map(([key, name, emoji, outline]) => ({
    id: `piece.emoji.${key}`,
    kind: 'piece',
    name,
    category: 'Emoji',
    price: PRICES.emoji,
    look: { type: 'emoji', emoji, ...(outline && { outline }) },
  })),
  {
    id: 'piece.gauntlet',
    kind: 'piece',
    name: 'Infinity Gauntlet',
    category: 'Legendary',
    price: PRICES.gauntlet,
    // The Slot Machine's own Gauntlet (frontend/src/assets/Slot_Machine_Icons/reel).
    look: { type: 'image', image: 'gauntlet.webp' },
  },
]

// ---------- shockwaves ----------
// What a stone sets off as it lands (about 0.3 seconds): a ring in `ring`'s
// colours rushing out across the board, and `particles` of that kind in
// `colors` (frontend/src/components/gomoku/shockwave.js draws them).

const SHOCKWAVES = [
  { key: 'ripple', name: 'Ripple', price: 0, ring: ['#ffffff', '#d9d0ee'], particles: 'sparks', colors: ['#ffffff'] },
  { key: 'fire', name: 'Fire', ring: ['#fff4c2', '#ff7b00', '#d10000'], particles: 'embers', colors: ['#ffe27a', '#ff8a1f', '#e0200a'] },
  { key: 'aurora', name: 'Aurora', ring: ['#3dff9a', '#22d3c5', '#9b6bff'], particles: 'ribbons', colors: ['#3dff9a', '#22d3c5', '#9b6bff'] },
  { key: 'sakura', name: 'Sakura', ring: ['#fff0f6', '#ff9cc6'], particles: 'petals', colors: ['#ffc4dd', '#ff9cc6', '#fff0f6'] },
  { key: 'lightning', name: 'Lightning', ring: ['#eaf6ff', '#2a7bff'], particles: 'bolts', colors: ['#bfe6ff', '#7fd0ff', '#ffffff'] },
  { key: 'frost', name: 'Frost', ring: ['#ffffff', '#9edcff'], particles: 'shards', colors: ['#ffffff', '#cdf3ff', '#9edcff'] },
  { key: 'galaxy', name: 'Galaxy', ring: ['#ffb3e6', '#7a5cff', '#2a1a6b'], particles: 'stars', colors: ['#ffffff', '#ffb3e6', '#9fc3ff'] },
  { key: 'void', name: 'Void', ring: ['#c79bff', '#5a1ab8', '#12051f'], particles: 'void', colors: ['#8a3dff', '#c79bff', '#1a0833'] },
  { key: 'lovestruck', name: 'Lovestruck', ring: ['#ffd1e3', '#ff2e6e'], particles: 'hearts', colors: ['#ff5c9a', '#ff9cc4', '#ff2e6e'] },
  { key: 'bubbles', name: 'Bubbles', ring: ['#e6fdff', '#5fd7ff'], particles: 'bubbles', colors: ['#9ff4ff', '#5fd7ff', '#ffffff'] },
  { key: 'glitch', name: 'Glitch', ring: ['#19e6ff', '#ff2fb3'], particles: 'pixels', colors: ['#19e6ff', '#ff2fb3', '#ffffff'] },
  { key: 'matrix', name: 'Matrix', ring: ['#d2ffde', '#1fd655'], particles: 'digits', colors: ['#3cff73', '#d2ffde'] },
  { key: 'coin-rain', name: 'Coin Rain', ring: ['#fff1b0', '#d9a531'], particles: 'coins', colors: ['#ffd65a', '#f0c040', '#a8791d'] },
].map((wave) => ({
  id: `wave.${wave.key}`,
  kind: 'shockwave',
  name: wave.name,
  category: wave.price === 0 ? 'Free' : 'Shockwaves',
  price: wave.price ?? PRICES.shockwave,
  look: { ring: wave.ring, particles: wave.particles, colors: wave.colors },
}))

// ---------- boards and grids ----------
// look.cls: the CSS class (gomoku.css). A board's `ink` is the colour the
// coordinates and the last-move dot are drawn in on it.

const BOARDS = [
  { key: 'classic', name: 'Classic Wood', price: 0, ink: '#3b2410' },
  { key: 'dark', name: 'Dark', ink: '#c9c3dd' },
  { key: 'light', name: 'Light', ink: '#4a3c2a' },
  { key: 'sparkly-gold', name: 'Sparkly Gold', ink: '#5a3c00' },
  { key: 'purple', name: 'Purple', ink: '#e8dcff' },
  { key: 'black-glass', name: 'Black Glass', ink: '#d6d6e6' },
].map((board) => ({
  id: `board.${board.key}`,
  kind: 'board',
  name: board.name,
  category: board.price === 0 ? 'Free' : 'Boards',
  price: board.price ?? PRICES.board,
  look: { cls: `gmk-board-${board.key}`, ink: board.ink },
}))

const GRIDS = [
  { key: 'classic', name: 'Classic Lines', price: 0 },
  { key: 'gold', name: 'Gold' },
  { key: 'red', name: 'Red' },
  { key: 'rainbow', name: 'Animated Rainbow' },
  { key: 'silver', name: 'Silver' },
  { key: 'neon', name: 'Neon Blue' },
].map((grid) => ({
  id: `grid.${grid.key}`,
  kind: 'grid',
  name: grid.name,
  category: grid.price === 0 ? 'Free' : 'Grids',
  price: grid.price ?? PRICES.grid,
  look: { cls: `gmk-grid-${grid.key}` },
}))

export const ALL_ITEMS = [...PIECES, ...SHOCKWAVES, ...BOARDS, ...GRIDS]

const BY_ID = new Map(ALL_ITEMS.map((item) => [item.id, item]))

// The item with `id`, or null.
export function gomokuItem(id) {
  return (typeof id === 'string' && BY_ID.get(id)) || null
}

export const itemsOfKind = (kind) => ALL_ITEMS.filter((item) => item.kind === kind)

// What a member has on: their choices, with anything missing, unknown or of
// the wrong kind put back to the default.
export function loadoutOf(chosen = {}) {
  const loadout = {}
  for (const kind of KINDS) {
    const item = gomokuItem(chosen?.[kind])
    loadout[kind] = item && item.kind === kind ? item.id : DEFAULTS[kind]
  }
  return loadout
}

const STONE_OPPOSITE = { 'piece.black': 'piece.white', 'piece.white': 'piece.black' }

// How the other player's stones look on your screen: their own piece, but
// if it's the same as yours, the opposite. For the plain stones that's the
// other colour (both on Black: they show as White); for anything else, the
// same piece in negative. { id, invert }.
export function pieceAgainst(mine, theirs) {
  if (mine !== theirs) return { id: theirs, invert: false }
  if (STONE_OPPOSITE[theirs]) return { id: STONE_OPPOSITE[theirs], invert: false }
  return { id: theirs, invert: true }
}
