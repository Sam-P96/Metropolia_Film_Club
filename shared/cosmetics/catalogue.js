// The Black Market's cosmetics: every name style and profile-picture border,
// in this one file. The server (backend/utils/blackMarket.js) reads ids,
// prices and review requirements from it; the pages
// (frontend/src/components/cosmetics/) read how each one looks.
//
// Every colour variant is its own item at the full price ("Neon Blue" and
// "Neon Red" are two items). Ids never change once members own them:
//   name.neon.blue   border.fire.soul   name.jackpot
// "Default" (no effect) is free, needs nothing, and everyone has it.
//
// To change a price or a requirement, change the table rows below. To add
// an effect, it also needs its look: a CSS class in
// frontend/src/components/cosmetics/cosmetics.css, and particles, if any, in
// frontend/src/components/cosmetics/particleEngine.js.

export const CATEGORIES = ['Classic', 'Film', 'Nature', 'Casino']

// ---------- colours ----------
// c: the effect's CSS colours (--c1, --c2, ...). p: its particles' colours
// (the CSS ones if left out).

const NEON = [
  { n: 'Blue', c: ['#2ab7ff'] },
  { n: 'Green', c: ['#39ff6a'] },
  { n: 'Red', c: ['#ff2a4d'] },
  { n: 'Pink', c: ['#ff3dd8'] },
  { n: 'Purple', c: ['#a35bff'] },
  { n: 'Yellow', c: ['#ffe23a'] },
]
const FIRE = [
  { n: 'Classic', c: ['#fff4c2', '#ffd23f', '#ff7b00', '#d10000'], p: ['#ffe27a', '#ff8a1f', '#e0200a'] },
  { n: 'Blue', c: ['#eafcff', '#7fe6ff', '#1f8bff', '#2a2bd6'], p: ['#bff4ff', '#3aa8ff', '#2b3bd6'] },
  { n: 'Green', c: ['#f2ffe2', '#b9ff4a', '#3fd01f', '#0b7a1a'], p: ['#e2ff9a', '#59e02a', '#118a24'] },
  { n: 'Yellow', c: ['#fffbe8', '#fff36b', '#ffd000', '#ff9a00'], p: ['#fff7a8', '#ffd21a', '#ff9d00'] },
  { n: 'Soul', c: ['#f8ecff', '#d9a6ff', '#9a3dff', '#4b0fa8'], p: ['#ecd2ff', '#b06bff', '#5d1ec4'] },
]
const LIGHTNING = [
  { n: 'Blue', c: ['#8fdcff', '#2a7bff'], p: ['#7fd0ff'] },
  { n: 'Red', c: ['#ff8080', '#ff1a1a'], p: ['#ff4a4a'] },
  { n: 'Purple', c: ['#d6a8ff', '#8a3dff'], p: ['#c08bff'] },
  { n: 'Yellow', c: ['#fff08a', '#ffb800'], p: ['#ffe14d'] },
]
const GLITCH = [
  { n: 'Video', c: ['#f2f6ff', '#19e6ff', '#ff2fb3'], p: ['#19e6ff', '#ff2fb3', '#ffffff'] },
  { n: 'RGB', c: ['#ffffff', '#ff2a2a', '#2aff8a'], p: ['#ff2a2a', '#2aff8a', '#3a7bff'] },
  { n: 'Toxic', c: ['#eaffd0', '#a6ff00', '#7a2cff'], p: ['#a6ff00', '#7a2cff'] },
]
const MATRIX = [
  { n: 'Green', c: ['#5dff8a', '#1fd655'], p: ['#3cff73', '#d2ffde'] },
  { n: 'Red Pill', c: ['#ff7a7a', '#ff2a2a'], p: ['#ff4040', '#ffd6d6'] },
  { n: 'Blue Pill', c: ['#7ab8ff', '#2a6bff'], p: ['#4a90ff', '#d6e6ff'] },
]
const GLITTER = [
  { n: 'Pink', c: ['#ff7ac6', '#ffd1ec', '#ff3d9e'], p: ['#ffffff', '#ffd1ec'] },
  { n: 'Gold', c: ['#d9a531', '#fff1b0', '#b07a14'], p: ['#ffffff', '#fff1b0'] },
  { n: 'Silver', c: ['#b8c0cc', '#ffffff', '#7d8696'], p: ['#ffffff'] },
  { n: 'Purple', c: ['#a66bff', '#e3d1ff', '#6a2cd6'], p: ['#ffffff', '#e3d1ff'] },
  { n: 'Teal', c: ['#2ad4c4', '#c8fff8', '#0f9488'], p: ['#ffffff', '#c8fff8'] },
]
const SPARKLE = [
  { n: 'White', c: ['#ffffff'], p: ['#ffffff', '#fff6d8'] },
  { n: 'Gold', c: ['#ffe08a'], p: ['#ffe08a', '#fff6d8'] },
  { n: 'Pink', c: ['#ffb3dc'], p: ['#ffb3dc', '#ffffff'] },
  { n: 'Ice', c: ['#bfefff'], p: ['#bfefff', '#ffffff'] },
]
const METAL = [
  { n: 'Chrome', c: ['#ffffff', '#c9d1dc', '#5b6573', '#9aa4b2'] },
  { n: 'Rose Gold', c: ['#fff0ea', '#f2b8a2', '#9c5a48', '#d8917a'] },
  { n: 'Bronze', c: ['#ffe2c0', '#d08a45', '#6e3d15', '#b06d30'] },
  { n: 'Gunmetal', c: ['#d9dde3', '#7c848f', '#2c3138', '#565d67'] },
]
const WAVE = [
  { n: 'Mint', c: ['#2fe0b0'] },
  { n: 'Sun', c: ['#ffb83a'] },
  { n: 'Coral', c: ['#ff6b5b'] },
  { n: 'Lilac', c: ['#b48cff'] },
]
const SMOKE = [
  { n: 'Grey', c: ['#e6e3ee', '#9d97b3'], p: ['#bdb7cc'] },
  { n: 'Spirit', c: ['#c8fff4', '#3fe0c0'], p: ['#7fffe0'] },
  { n: 'Shadow', c: ['#e2d4ff', '#3c1470'], p: ['#6a44a8'] },
]
const CHIP = [
  { n: 'Red', c: ['#c8102e'] },
  { n: 'Blue', c: ['#1f5fd6'] },
  { n: 'Black', c: ['#1d1b24'] },
  { n: 'Green', c: ['#138a4a'] },
  { n: 'Purple', c: ['#6a2cd6'] },
]
const GOLD = { c: ['#fff5c4', '#f0c040', '#8f6212', '#d9a531'], p: ['#fff1b0', '#ffd65a', '#ffffff'] }
const SHINE = { c: ['#ffffff', '#d6e4ff', '#9ab8ff'], p: ['#ffffff', '#dbe7ff'] }
const only = (p) => ({ c: [], p })

// ---------- the looks ----------
// cls: the CSS classes (cosmetics.css). particles: the particle engine's
// type. perChar: each letter in its own span (Wave, Roulette). behind:
// particles behind the letters (Aurora's curtains).

const NAME_LOOKS = {
  neon: { cls: 'cos-n-neon', variants: NEON },
  wave: { cls: 'cos-n-wave', perChar: true, variants: WAVE },
  rainbow: { cls: 'cos-n-rainbow' },
  'rainbow-glow': { cls: 'cos-n-rainbow cos-n-rainbowglow' },
  metal: { cls: 'cos-n-metal', variants: METAL },
  'sparkly-gold': { cls: 'cos-n-metal cos-n-gold', particles: 'sparkles', colors: GOLD },
  holographic: { cls: 'cos-n-holo' },
  sparkle: { cls: 'cos-n-sparkle', particles: 'sparkles', variants: SPARKLE },
  'star-shine': { cls: 'cos-n-shine', particles: 'glint', colors: SHINE },
  glitter: { cls: 'cos-n-glitter', particles: 'specks', variants: GLITTER },
  fire: { cls: 'cos-n-fire', particles: 'embers', variants: FIRE },
  lightning: { cls: 'cos-n-lightning', particles: 'bolts', variants: LIGHTNING },
  glitch: { cls: 'cos-n-glitch', particles: 'pixels', variants: GLITCH },
  matrix: { cls: 'cos-n-matrix', particles: 'digits', variants: MATRIX },
  galaxy: { cls: 'cos-n-galaxy', particles: 'twinkle', colors: only(['#ffffff', '#ffb3e6', '#9fc3ff']) },
  void: { cls: 'cos-n-void', particles: 'void', colors: only(['#8a3dff', '#c79bff', '#5a1ab8']) },
  lovestruck: { cls: 'cos-n-love', particles: 'hearts', colors: only(['#ff5c9a', '#ff9cc4', '#ff2e6e']) },
  'vhs-tape': { cls: 'cos-n-vhs' },
  '3d-glasses': { cls: 'cos-n-anaglyph' },
  'silent-film': { cls: 'cos-n-oldfilm', particles: 'dust', colors: only(['#f6e7c1', '#3a2c14']) },
  paparazzi: { cls: 'cos-n-paparazzi', particles: 'flash', colors: only(['#ffffff', '#fff3c4']) },
  frost: { cls: 'cos-n-frost', particles: 'snow', colors: only(['#ffffff', '#cdf3ff', '#9edcff']) },
  aurora: { cls: 'cos-n-aurora', particles: 'curtain', behind: true, colors: only(['#3dff9a', '#22d3c5', '#9b6bff']) },
  sakura: { cls: 'cos-n-sakura', particles: 'petals', colors: only(['#ffc4dd', '#ff9cc6', '#fff0f6']) },
  'ghost-smoke': { cls: 'cos-n-smoke', particles: 'smoke', variants: SMOKE },
  lava: { cls: 'cos-n-lava', particles: 'drips', colors: only(['#ffb000', '#ff5a00', '#ff2a00']) },
  bubbles: { cls: 'cos-n-bubbles', particles: 'bubbles', colors: only(['#9ff4ff', '#5fd7ff']) },
  'heat-haze': { cls: 'cos-n-haze' },
  jackpot: { cls: 'cos-n-metal cos-n-gold', particles: 'bulbs', colors: { c: GOLD.c, p: ['#fff6c8', '#ffb347'] } },
  roulette: { cls: 'cos-n-roulette', perChar: true, particles: 'ball' },
  'coin-rain': { cls: 'cos-n-coins', particles: 'coins', colors: only(['#ffd65a', '#a8791d']) },
  'card-suits': { cls: 'cos-n-suits', particles: 'suits', colors: only(['#ff3b5c', '#c9c3dd']) },
  'lucky-dice': { cls: 'cos-n-dice', particles: 'dice', colors: only(['#f6f3ec', '#1a1520']) },
}

const BORDER_LOOKS = {
  neon: { cls: 'cos-b-neon', variants: NEON },
  ripple: { cls: 'cos-b-ripple', variants: NEON },
  rainbow: { cls: 'cos-b-rainbow' },
  'rainbow-glow': { cls: 'cos-b-rainbow cos-b-glowon' },
  metal: { cls: 'cos-b-metal', variants: METAL },
  'sparkly-gold': { cls: 'cos-b-metal cos-b-goldglow', particles: 'sparkles', colors: GOLD },
  holographic: { cls: 'cos-b-holo' },
  sparkle: { cls: 'cos-b-sparkle', particles: 'sparkles', variants: SPARKLE },
  'star-orbit': { cls: 'cos-b-orbit', particles: 'orbit', colors: only(['#ffffff', '#cfe0ff', '#ffe9a8']) },
  glitter: { cls: 'cos-b-glitter', particles: 'specks', variants: GLITTER },
  fire: { cls: 'cos-b-fire', particles: 'embers', variants: FIRE },
  lightning: { cls: 'cos-b-lightning', particles: 'bolts', variants: LIGHTNING },
  glitch: { cls: 'cos-b-glitch', particles: 'pixels', variants: GLITCH },
  matrix: { cls: 'cos-b-matrix', particles: 'digits', variants: MATRIX },
  galaxy: { cls: 'cos-b-galaxy', particles: 'twinkle', colors: only(['#ffffff', '#ffb3e6', '#9fc3ff']) },
  void: { cls: 'cos-b-void', particles: 'void', colors: only(['#8a3dff', '#c79bff', '#5a1ab8']) },
  lovestruck: { cls: 'cos-b-love', particles: 'hearts', colors: only(['#ff5c9a', '#ff9cc4', '#ff2e6e']) },
  'silent-film': { cls: 'cos-b-oldfilm', particles: 'dust', colors: only(['#f6e7c1', '#3a2c14']) },
  paparazzi: { cls: 'cos-b-paparazzi', particles: 'flash', colors: only(['#ffffff', '#fff3c4']) },
  'film-reel': { cls: 'cos-b-film' },
  clapperboard: { cls: 'cos-b-clapper' },
  frost: { cls: 'cos-b-frost', particles: 'snow', colors: only(['#ffffff', '#cdf3ff', '#9edcff']) },
  aurora: { cls: 'cos-b-aurora', particles: 'curtain', colors: only(['#3dff9a', '#22d3c5', '#9b6bff']) },
  sakura: { cls: 'cos-b-sakura', particles: 'petals', colors: only(['#ffc4dd', '#ff9cc6', '#fff0f6']) },
  'ghost-smoke': { cls: 'cos-b-smoke', particles: 'smoke', variants: SMOKE },
  lava: { cls: 'cos-b-lava', particles: 'drips', colors: only(['#ffb000', '#ff5a00', '#ff2a00']) },
  bubbles: { cls: 'cos-b-bubbles', particles: 'bubbles', colors: only(['#9ff4ff', '#5fd7ff']) },
  'heat-haze': { cls: 'cos-b-haze' },
  jackpot: { cls: 'cos-b-metal cos-b-goldglow', particles: 'bulbs', colors: { c: GOLD.c, p: ['#fff6c8', '#ffb347'] } },
  'roulette-wheel': { cls: 'cos-b-roulette', particles: 'ball' },
  'coin-rain': { cls: 'cos-b-coins', particles: 'coins', colors: only(['#ffd65a', '#a8791d']) },
  'card-suits': { cls: 'cos-b-suits', particles: 'suits', colors: only(['#ff3b5c', '#c9c3dd']) },
  'lucky-dice': { cls: 'cos-b-dice', particles: 'dice', colors: only(['#f6f3ec', '#1a1520']) },
  'poker-chip': { cls: 'cos-b-chip', variants: CHIP },
}

// ---------- the shop ----------
// [look, name, reviews required, price in P-PP]. Variants come from the look.

const NAME_TABLE = [
  ['neon', 'Neon', 50, 5000],
  ['wave', 'Wave', 50, 5000],
  ['rainbow', 'Rainbow', 50, 3000],
  ['rainbow-glow', 'Rainbow Glow', 150, 4000],
  ['metal', 'Metal', 20, 1000],
  ['sparkly-gold', 'Sparkly Gold', 200, 8000],
  ['holographic', 'Holographic', 100, 5000],
  ['sparkle', 'Sparkle', 200, 8000],
  ['star-shine', 'Star Shine', 100, 6000],
  ['glitter', 'Glitter', 150, 10000],
  ['fire', 'Fire', 150, 10000],
  ['lightning', 'Lightning', 50, 3000],
  ['glitch', 'Glitch', 200, 10000],
  ['matrix', 'Matrix', 200, 15000],
  ['galaxy', 'Galaxy', 200, 15000],
  ['void', 'Void', 200, 10000],
  ['lovestruck', 'Lovestruck', 100, 5000],
  ['vhs-tape', 'VHS Tape', 100, 4000],
  ['3d-glasses', '3D Glasses', 100, 4000],
  ['silent-film', 'Silent Film', 100, 4000],
  ['paparazzi', 'Paparazzi', 200, 20000],
  ['frost', 'Frost', 150, 12000],
  ['aurora', 'Aurora', 150, 12000],
  ['sakura', 'Sakura', 150, 20000],
  ['ghost-smoke', 'Ghost Smoke', 100, 3000],
  ['lava', 'Lava', 20, 1000],
  ['bubbles', 'Bubbles', 150, 16500],
  ['heat-haze', 'Heat Haze', 150, 12000],
  ['jackpot', 'Jackpot', 200, 100000],
  ['roulette', 'Roulette', 20, 1500],
  ['coin-rain', 'Coin Rain', 150, 12000],
  ['card-suits', 'Card Suits', 150, 12000],
  ['lucky-dice', 'Lucky Dice', 150, 12000],
]

const BORDER_TABLE = [
  ['neon', 'Neon', 50, 5000],
  ['ripple', 'Ripple', 50, 5500],
  ['rainbow', 'Rainbow', 100, 7000],
  ['rainbow-glow', 'Rainbow Glow', 150, 8000],
  ['metal', 'Metal', 20, 1000],
  ['sparkly-gold', 'Sparkly Gold', 200, 8000],
  ['holographic', 'Holographic', 100, 5000],
  ['sparkle', 'Sparkle', 200, 8000],
  ['star-orbit', 'Star Orbit', 100, 6000],
  ['glitter', 'Glitter', 150, 10000],
  ['fire', 'Fire', 150, 10000],
  ['lightning', 'Lightning', 50, 3000],
  ['glitch', 'Glitch', 200, 10000],
  ['matrix', 'Matrix', 200, 15000],
  ['galaxy', 'Galaxy', 200, 10000],
  ['void', 'Void', 200, 50000],
  ['lovestruck', 'Lovestruck', 100, 5000],
  ['silent-film', 'Silent Film', 100, 4000],
  ['paparazzi', 'Paparazzi', 200, 20000],
  ['film-reel', 'Film Reel', 150, 12000],
  ['clapperboard', 'Clapperboard', 150, 12000],
  ['frost', 'Frost', 150, 12000],
  ['aurora', 'Aurora', 150, 12000],
  ['sakura', 'Sakura', 200, 25000],
  ['ghost-smoke', 'Ghost Smoke', 100, 3000],
  ['lava', 'Lava', 20, 1000],
  ['bubbles', 'Bubbles', 150, 16500],
  ['heat-haze', 'Heat Haze', 150, 12000],
  ['jackpot', 'Jackpot', 200, 100000],
  ['roulette-wheel', 'Roulette Wheel', 20, 6000],
  ['coin-rain', 'Coin Rain', 150, 12000],
  ['card-suits', 'Card Suits', 150, 12000],
  ['lucky-dice', 'Lucky Dice', 150, 12000],
  ['poker-chip', 'Poker Chip', 150, 12000],
]

const CATEGORY_OF = {
  'vhs-tape': 'Film',
  '3d-glasses': 'Film',
  'silent-film': 'Film',
  paparazzi: 'Film',
  'film-reel': 'Film',
  clapperboard: 'Film',
  frost: 'Nature',
  aurora: 'Nature',
  sakura: 'Nature',
  'ghost-smoke': 'Nature',
  lava: 'Nature',
  bubbles: 'Nature',
  'heat-haze': 'Nature',
  jackpot: 'Casino',
  roulette: 'Casino',
  'roulette-wheel': 'Casino',
  'coin-rain': 'Casino',
  'card-suits': 'Casino',
  'lucky-dice': 'Casino',
  'poker-chip': 'Casino',
}

const slug = (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

// One item per look, or per colour variant.
function itemsOf(type, table, looks) {
  const items = [{ id: `${type}.default`, type, name: 'Default', look: null, category: 'Classic', reviews: 0, price: 0, colors: [], particleColors: [] }]
  for (const [look, name, reviews, price] of table) {
    const def = looks[look]
    const variants = def.variants ?? [{ n: null, ...(def.colors ?? { c: [], p: [] }) }]
    for (const variant of variants) {
      items.push({
        id: variant.n ? `${type}.${look}.${slug(variant.n)}` : `${type}.${look}`,
        type,
        name: variant.n ? `${name} ${variant.n}` : name,
        effect: name,
        look,
        category: CATEGORY_OF[look] ?? 'Classic',
        reviews,
        price,
        colors: variant.c ?? [],
        particleColors: variant.p?.length ? variant.p : (variant.c ?? []),
      })
    }
  }
  return items
}

export const NAME_ITEMS = itemsOf('name', NAME_TABLE, NAME_LOOKS)
export const BORDER_ITEMS = itemsOf('border', BORDER_TABLE, BORDER_LOOKS)
export const ALL_ITEMS = [...NAME_ITEMS, ...BORDER_ITEMS]

const BY_ID = new Map(ALL_ITEMS.map((item) => [item.id, item]))

// The item with `id`, or null.
export function cosmeticById(id) {
  return (id && BY_ID.get(id)) || null
}

// How an item looks: { cls, particles, perChar, behind }, or null for Default.
export function lookOf(item) {
  if (!item?.look) return null
  const def = (item.type === 'name' ? NAME_LOOKS : BORDER_LOOKS)[item.look]
  return { cls: def.cls, particles: def.particles ?? null, perChar: Boolean(def.perChar), behind: Boolean(def.behind) }
}

export const DEFAULT_NAME = 'name.default'
export const DEFAULT_BORDER = 'border.default'
