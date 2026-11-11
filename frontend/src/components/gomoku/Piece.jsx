import { useId, useState } from 'react'
import gauntletUrl from '../../assets/Slot_Machine_Icons/reel/gauntlet.webp'
import { DEFAULTS, gomokuItem } from '../../../../shared/gomoku/catalogue.js'

// The pictures pieces can use, by the file name in shared/gomoku/catalogue.js.
// The Infinity Gauntlet is the Slot Machine's own.
const IMAGES = { 'gauntlet.webp': gauntletUrl }

// The eight corners of an octagon around the middle of a 100 x 100 box.
const octagon = (radius) =>
  Array.from({ length: 8 }, (_, i) => {
    const angle = Math.PI / 8 + (i * Math.PI) / 4
    return [50 + radius * Math.cos(angle), 50 + radius * Math.sin(angle)]
  })
const OUTER = octagon(46)
const TABLE = octagon(24)
const points = (corners) => corners.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ')

// An Infinity Stone, cut like a gem, seen from above: `colors` are its
// light, its own colour and its shadow. It glows in its colour and breathes
// (gomoku.css .gmk-gem), each one at its own pace and from its own point in
// the breath, so a row of them never pulses together. On the board, the
// point sets both (--gmk-delay, --gmk-length: Board.jsx), so a stone keeps
// its rhythm when it's drawn again.
function Gem({ colors }) {
  const id = useId()
  const [breath] = useState(() => ({ delay: -Math.random() * 3, length: 2.2 + Math.random() * 1.2 }))
  const [light, mid, dark] = colors
  return (
    <svg
      viewBox="0 0 100 100"
      className="gmk-gem"
      style={{
        '--gmk-glow': mid,
        animationDelay: `var(--gmk-delay, ${breath.delay.toFixed(2)}s)`,
        animationDuration: `var(--gmk-length, ${breath.length.toFixed(2)}s)`,
      }}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id={`${id}-body`} cx="40%" cy="35%" r="70%">
          <stop offset="0%" stopColor={light} />
          <stop offset="45%" stopColor={mid} />
          <stop offset="100%" stopColor={dark} />
        </radialGradient>
        <linearGradient id={`${id}-table`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={light} />
          <stop offset="100%" stopColor={mid} />
        </linearGradient>
      </defs>
      <polygon points={points(OUTER)} fill={`url(#${id}-body)`} stroke={dark} strokeWidth="1.5" />
      {/* The crown's facets, light and shade in turn. */}
      {OUTER.map((corner, i) => {
        const next = OUTER[(i + 1) % 8]
        const inner = TABLE[i]
        const innerNext = TABLE[(i + 1) % 8]
        return (
          <polygon
            key={i}
            points={points([corner, next, innerNext, inner])}
            fill={i % 2 ? '#ffffff' : '#000000'}
            opacity={i % 2 ? 0.16 : 0.14}
          />
        )
      })}
      <polygon points={points(TABLE)} fill={`url(#${id}-table)`} opacity="0.92" />
      <polygon points="36,30 50,26 44,40" fill="#ffffff" opacity="0.75" />
      <circle cx="33" cy="34" r="3.2" fill="#ffffff" opacity="0.9" />
    </svg>
  )
}

// An emoji, centred on the point. With `outline` (two colours), a gradient
// outline round it: the emoji's own shape, a little fatter (a filter on a
// white copy of it, used as a mask), filled with the gradient and drawn
// just behind it. Colour emoji ignore an ordinary text outline, so it's
// done this way.
function Emoji({ emoji, outline }) {
  const id = useId().replace(/:/g, '')
  const glyph = (props) => (
    <text x="50" y="52" textAnchor="middle" dominantBaseline="central" fontSize="80" {...props}>
      {emoji}
    </text>
  )

  if (!outline) {
    return (
      <svg viewBox="0 0 100 100" className="gmk-emoji" aria-hidden="true">
        {glyph()}
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 100 100" className="gmk-emoji" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-paint`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={outline[0]} />
          <stop offset="100%" stopColor={outline[1]} />
        </linearGradient>
        <filter id={`${id}-fatter`} x="-25%" y="-25%" width="150%" height="150%">
          <feMorphology in="SourceAlpha" operator="dilate" radius="5" result="shape" />
          <feFlood floodColor="#ffffff" />
          <feComposite in2="shape" operator="in" />
        </filter>
        <mask id={`${id}-shape`} x="0" y="0" width="100" height="100" maskUnits="userSpaceOnUse">
          {glyph({ filter: `url(#${id}-fatter)` })}
        </mask>
      </defs>
      <rect width="100" height="100" fill={`url(#${id}-paint)`} mask={`url(#${id}-shape)`} />
      {glyph()}
    </svg>
  )
}

// What a piece is made of, without anything round it.
export function PieceFace({ id }) {
  const item = gomokuItem(id) ?? gomokuItem(DEFAULTS.piece)
  const { look } = item

  if (look.type === 'stone') return <span className={`gmk-stone gmk-stone-${look.color}`} />
  if (look.type === 'gem') return <Gem colors={look.colors} />
  if (look.type === 'emoji') return <Emoji emoji={look.emoji} outline={look.outline} />
  return <img src={IMAGES[look.image]} alt="" className="gmk-image" draggable="false" />
}

// One piece on the board: `id` from shared/gomoku/catalogue.js, in negative
// if `invert` (the other player has the same piece: catalogue.js
// pieceAgainst). `className` is for what it's doing: landing, jolting,
// winning, a ghost of your choice. `style` carries the jolt's direction.
export default function Piece({ id, invert = false, className = '', style }) {
  return (
    <span className={`gmk-piece ${className}`} style={style}>
      <span className={`gmk-face ${invert ? 'gmk-invert' : ''}`}>
        <PieceFace id={id} />
      </span>
    </span>
  )
}

// A piece on its own, the size of a big board point: the shop, the
// scoreboard. `size` in pixels.
export function PieceSwatch({ id, invert = false, size = 44, label }) {
  return (
    <span className="gmk-swatch" style={{ '--cell': `${size}px` }} role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      <Piece id={id} invert={invert} />
    </span>
  )
}
