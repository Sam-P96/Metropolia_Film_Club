import { SLOTS, SYMBOL_BY_KEY } from '../../../../shared/slots/config.js'

// The pictures for the reels, by file name: drop one in the folder and name
// it in a symbol's `art` (shared/slots/config.js) to use it.
const IMAGES = Object.fromEntries(
  Object.entries(
    import.meta.glob('../../assets/Slot_Machine_Icons/reel/*.{png,jpg,jpeg,gif,webp,svg}', { eager: true, import: 'default' })
  ).map(([path, url]) => [path.split('/').pop(), url])
)

// What a symbol looks like: { emoji } or { src } (a path from the site's
// root, like /favicon.svg, is used as it is).
export function artOf(key) {
  const { art } = SYMBOL_BY_KEY[key]
  if (art.emoji) return { emoji: art.emoji }
  return { src: art.image.startsWith('/') ? art.image : IMAGES[art.image] }
}

// One reel cell as HTML, for the reels, which draw their strips directly
// (components/slots/Reels.jsx). Only ever our own config goes in here.
export function cellHtml(key) {
  const art = artOf(key)
  const face = art.emoji
    ? `<span class="slot-symbol" aria-hidden="true">${art.emoji}</span>`
    : `<img class="slot-symbol" src="${art.src}" alt="" draggable="false">`
  return `<div class="slot-cell" data-symbol="${key}">${face}</div>`
}

const KEYS = SLOTS.symbols.map((symbol) => symbol.key)

// A symbol for the blur between stops. Only for show: what a spin lands on
// always comes from the server.
export function anySymbol() {
  return KEYS[Math.floor(Math.random() * KEYS.length)]
}
