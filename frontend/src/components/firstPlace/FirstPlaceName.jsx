import { useMemo, useRef, useState } from 'react'
import { useCosmeticsStill } from '../cosmetics/stillCosmetics'
import { STONES, WAVE_STEP } from '../../../../shared/firstPlace/config.js'
import './firstPlace.css'

const N = 6
// A soft edge between a lit sixth and an unlit one.
const FEATHER = (1 / N) * 0.18
const TIP_MS = 2500

const pct = (fraction) => `${(fraction * 100).toFixed(3)}%`

// The six colours across the name, each at the middle of its sixth. `mix`
// is how much of the colour is kept, blending toward `toward` (0: pure).
function gradient(order, mix, toward) {
  const stops = order.map((id, i) => {
    const colour = mix ? `color-mix(in srgb, ${STONES[id].color} ${mix}%, ${toward})` : STONES[id].color
    return `${colour} ${pct((i + 0.5) / N)}`
  })
  return `linear-gradient(90deg, ${stops.join(', ')})`
}

// A left-to-right mask, solid over the sixths in `on` (by position) and
// clear elsewhere. `pad` lets the glow layers be bigger than the letters
// (so the blur isn't cut off) while the sixths still line up with them.
function mask(on, pad) {
  const at = (fraction) => (pad ? `calc(${pad} + (100% - 2 * ${pad}) * ${fraction.toFixed(4)})` : pct(fraction))
  const stops = []
  for (let i = 0; i < N; i++) {
    const colour = on[i] ? '#000' : 'transparent'
    const start = i === 0 ? '0%' : at(i / N + FEATHER)
    const end = i === N - 1 ? '100%' : at((i + 1) / N - FEATHER)
    stops.push(`${colour} ${start}`, `${colour} ${end}`)
  }
  return `linear-gradient(90deg, ${stops.join(', ')})`
}

// A small seeded random (mulberry32): the same seed, the same numbers, so
// Random's timings stay put for as long as the name is on screen.
function seeded(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Everything about the layers that comes from the settings: the gradients,
// the masks and, for each stone that's on, its place, colour and timing.
// Random: a random start and up to 30% either way on its interval. Wave:
// each starts WAVE_STEP after the one to its left, already running.
function layersFor(settings, seed) {
  const { order, intervals, random } = settings
  const on = order.map((id) => settings.stones.includes(id))
  const next = seeded(seed)

  const stones = order.flatMap((id, position) => {
    if (!on[position]) return []
    const base = intervals[id]
    let duration = base
    let delay = position * WAVE_STEP - base
    if (random) {
      duration = base * (0.7 + next() * 0.6)
      delay = -next() * duration
    }
    return [{ id, position, colour: STONES[id].color, duration: `${duration.toFixed(3)}s`, delay: `${delay.toFixed(3)}s` }]
  })

  return {
    stones,
    all: stones.length === N,
    style: {
      '--fp-grad': gradient(order, 38, '#8f8ca6'),
      '--fp-grad-lit': gradient(order, 72, '#fff'),
      '--fp-grad-glow': gradient(order, 0),
      '--fp-mask': mask(on, 0),
    },
    midMask: mask(on, 'var(--fp-pad)'),
    pulseMask: (position) => mask(on.map((_, i) => i === position), 'var(--fp-pad)'),
  }
}

// The First Place name effect, for whoever holds a title (`titles`, their
// labels) with `settings` (shared/firstPlace/config.js): the name in the
// stones' colours, glowing and flaring, in the font, size and weight of
// wherever it sits, wrapping like the plain name. StyledUsername puts it in
// place of their Black Market name style. Hovering shows the titles; so
// does a tap, where the name isn't a link or a button.
//
// The timings are worked out once while it's on screen (and again only if
// the settings change), or the animations would restart on every render.
export default function FirstPlaceName({ name, settings, titles = [] }) {
  const still = useCosmeticsStill()
  const [seed] = useState(() => Math.floor(Math.random() * 4294967296))
  const [tip, setTip] = useState(false)
  const timer = useRef(null)
  // The settings as text, so a new object with the same settings (every
  // fetch makes one) keeps the same timings.
  const key = JSON.stringify({ order: settings.order, stones: settings.stones, intervals: settings.intervals, random: settings.random })
  const fx = useMemo(() => JSON.parse(key), [key])
  const layers = useMemo(() => layersFor(fx, seed), [fx, seed])
  const label = titles.join(' · ')

  const showTip = (event) => {
    // In a link or a button, a tap does what it always did.
    if (!label || event.target.closest('a, button')) return
    setTip(true)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setTip(false), TIP_MS)
  }

  return (
    <span className={`fp${still ? ' fp-still' : ''}`} style={layers.style} title={label || undefined} onClick={showTip}>
      {layers.stones.map((stone) => (
        <span
          key={`glow-${stone.id}`}
          className="fp-glow fp-glow--pulse"
          aria-hidden="true"
          style={{ '--m': layers.pulseMask(stone.position), '--dur': stone.duration, '--d': stone.delay }}
        >
          {name}
        </span>
      ))}
      <span className="fp-glow fp-glow--mid" aria-hidden="true" style={{ '--m': layers.midMask }}>
        {name}
      </span>
      <span className="fp-base">{name}</span>
      <span className="fp-lit" aria-hidden="true">
        {name}
      </span>
      {layers.all && (
        <span className="fp-sheen" aria-hidden="true">
          {name}
        </span>
      )}
      <span className="fp-flares" aria-hidden="true">
        {layers.stones.map((stone) => (
          <i
            key={`flare-${stone.id}`}
            className="fp-flare"
            style={{ '--x': ((stone.position + 0.5) / N).toFixed(4), '--c': stone.colour, '--dur': stone.duration, '--d': stone.delay }}
          >
            <b />
          </i>
        ))}
      </span>
      {tip && (
        <span className="fp-tip" role="tooltip">
          {label}
        </span>
      )}
    </span>
  )
}
