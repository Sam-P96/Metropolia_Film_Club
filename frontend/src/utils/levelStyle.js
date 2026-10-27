// The fonts are bundled with the site rather than loaded from Google Fonts,
// which would send every visitor's IP address to Google (a GDPR problem).
// All are free to use: OFL-1.1, except Permanent Marker, which is Apache-2.0.
// A browser only downloads a font once something on the page uses it.
import '@fontsource/bebas-neue'
import '@fontsource/cinzel/700.css'
import '@fontsource/playfair-display/700.css'
import '@fontsource/orbitron/700.css'
import '@fontsource/press-start-2p'
import '@fontsource/monoton'
import '@fontsource/pacifico'
import '@fontsource/permanent-marker'

// How "Level: X" looks on a review card. The server only accepts these font,
// effect, backing and shape ids (backend/controllers/userControllers.js).
export const DEFAULT_LEVEL_STYLE = {
  textColor: '#FFFFFF',
  effect: 'shadow',
  effectColor: '#000000',
  backing: 'none',
  shape: 'round',
  font: 'default',
}

// `size` evens them out: Bebas Neue is narrow, Press Start 2P is wide.
// `nudge` (in em) moves the letters down to the middle of the line. These
// fonts are all capitals, or pixels drawn above the baseline, and leave room
// underneath for descenders "Level: X" doesn't have, so they sit high.
// Measured in Chrome.
export const LEVEL_FONTS = [
  { id: 'default', label: 'Default', family: 'inherit', weight: 600, size: '1em' },
  { id: 'bebas', label: 'Bebas Neue', family: "'Bebas Neue', sans-serif", weight: 400, size: '1.3em', nudge: 0.05 },
  { id: 'cinzel', label: 'Cinzel', family: "'Cinzel', serif", weight: 700, size: '1em', nudge: 0.05 },
  { id: 'playfair', label: 'Playfair', family: "'Playfair Display', serif", weight: 700, size: '1.05em' },
  { id: 'orbitron', label: 'Orbitron', family: "'Orbitron', sans-serif", weight: 700, size: '0.9em' },
  { id: 'pixel', label: 'Pixel', family: "'Press Start 2P', monospace", weight: 400, size: '0.7em', nudge: 0.065 },
  { id: 'monoton', label: 'Monoton', family: "'Monoton', sans-serif", weight: 400, size: '1.05em', nudge: 0.045 },
  { id: 'pacifico', label: 'Pacifico', family: "'Pacifico', cursive", weight: 400, size: '1.05em' },
  { id: 'marker', label: 'Marker', family: "'Permanent Marker', cursive", weight: 400, size: '1.05em' },
]

export const LEVEL_EFFECTS = [
  { id: 'none', label: 'None' },
  { id: 'shadow', label: 'Shadow' },
  { id: 'glow', label: 'Glow' },
]

export const LEVEL_BACKINGS = [
  { id: 'none', label: 'None' },
  { id: 'glass', label: 'Glass' },
  { id: 'frosted', label: 'Frosted glass' },
]

export const LEVEL_SHAPES = [
  { id: 'round', label: 'Round', radius: '9999px' },
  { id: 'rounded', label: 'Rounded', radius: '0.4em' },
  { id: 'sharp', label: 'Sharp', radius: '0' },
]

function rgba(hex, alpha) {
  const value = parseInt(hex.slice(1), 16)
  return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`
}

const TEXT_SHADOWS = {
  none: () => 'none',
  shadow: (color) => `0 2px 4px ${rgba(color, 0.85)}`,
  glow: (color) =>
    `0 0 4px ${rgba(color, 0.9)}, 0 0 12px ${rgba(color, 0.75)}, 0 0 24px ${rgba(color, 0.55)}`,
}

// A panel behind the text, in any shape and with any effect. Glass is clear,
// with a sheen and a bright edge; frosted glass is milky and blurs what's
// behind it.
const BACKINGS = {
  glass: {
    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.22), rgba(255, 255, 255, 0.04))',
    border: '1px solid rgba(255, 255, 255, 0.35)',
    backdropFilter: 'blur(2px) saturate(140%)',
    WebkitBackdropFilter: 'blur(2px) saturate(140%)',
    boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.4), 0 4px 12px rgba(0, 0, 0, 0.25)',
  },
  frosted: {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    border: '1px solid rgba(255, 255, 255, 0.25)',
    backdropFilter: 'blur(14px)',
    WebkitBackdropFilter: 'blur(14px)',
    boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.2)',
  },
}

// The room between the text and the backing's edge, in em.
const BACKING_PADDING_Y = 0.5
const BACKING_PADDING_X = 0.9

function backingStyle(backing, shape) {
  if (!BACKINGS[backing]) return {}

  const radius = (LEVEL_SHAPES.find((option) => option.id === shape) ?? LEVEL_SHAPES[0]).radius
  return { ...BACKINGS[backing], borderRadius: radius }
}

// The same room above and below the letters, with the font's nudge moved
// from the bottom to the top so they sit in the middle of the backing.
// Without a backing there's no room, but the nudge still centres them on
// the banner. Padding is in the font's own em, so it's divided by the
// font's size to give every font the same room.
function centredPadding(hasBacking, font) {
  const round = (em) => `${Number(em.toFixed(3))}em`
  const scale = parseFloat(font.size)
  const nudge = font.nudge ?? 0
  const bottom = Math.max((hasBacking ? BACKING_PADDING_Y / scale : 0) - nudge, 0)
  const sides = hasBacking ? BACKING_PADDING_X / scale : 0

  return `${round(bottom + 2 * nudge)} ${round(sides)} ${round(bottom)}`
}

export function levelFont(id) {
  return LEVEL_FONTS.find((font) => font.id === id) ?? LEVEL_FONTS[0]
}

// The inline style for "Level: X", from a member's levelStyle.
export function levelTextStyle(levelStyle) {
  const style = { ...DEFAULT_LEVEL_STYLE, ...levelStyle }
  const font = levelFont(style.font)
  const shadow = TEXT_SHADOWS[style.effect] ?? TEXT_SHADOWS.shadow

  return {
    color: style.textColor,
    textShadow: shadow(style.effectColor),
    fontFamily: font.family,
    fontWeight: font.weight,
    fontSize: font.size,
    padding: centredPadding(Boolean(BACKINGS[style.backing]), font),
    ...backingStyle(style.backing, style.shape),
  }
}
