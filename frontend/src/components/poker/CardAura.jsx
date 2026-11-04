import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { FX } from './feedback'

// The glow round a card of your best hand, like a Soul Resonance's: the
// glass rim catching the light, breathing slowly (index.css, "Kino Poker's
// glowing cards"), in `colour` ("red green blue": the member's pick in
// Options, glow.js). It fades in slowly once the card has landed (`lit`),
// with a shimmer, and every so often a little lightning crackles along its
// edge. `company` is how many
// cards are glowing, so five of them strike no more often than one.
// It goes inside the card (cards.jsx), so it moves, lifts and turns with it.

const AURA = {
  fadeSeconds: 1.8,
  // Seconds before the first strike, then between strikes (each a random
  // time in the range), times the square root of `company`.
  firstStrike: [1.4, 3.2],
  strikeEvery: [2.6, 6.5],
  // How long a strike flickers.
  strikeSeconds: 0.34,
}

const between = (low, high) => low + Math.random() * (high - low)

// The card is 100 x 140 in the lightning's drawing, with room round it.
const W = 100
const H = 140
const M = 26

// One jagged arc crawling along the card's edge from a random point, drifting
// in and out of it, sometimes with a short fork.
function arc() {
  const side = Math.floor(Math.random() * 4)
  const t = between(0.1, 0.9)
  const [x0, y0, nx, ny] = [
    [t * W, 0, 0, -1],
    [W, t * H, 1, 0],
    [t * W, H, 0, 1],
    [0, t * H, -1, 0],
  ][side]
  const dir = Math.random() < 0.5 ? 1 : -1
  const [tx, ty] = [-ny * dir, nx * dir]
  const clampX = (x) => Math.max(-M + 3, Math.min(W + M - 3, x))
  const clampY = (y) => Math.max(-M + 3, Math.min(H + M - 3, y))
  let [x, y] = [x0 + nx * between(0, 4), y0 + ny * between(0, 4)]
  const points = [[x, y]]
  const steps = 5 + Math.floor(Math.random() * 4)
  for (let i = 0; i < steps; i++) {
    const step = between(6, 13)
    const out = between(-3, 8)
    x = clampX(x + tx * step + nx * out)
    y = clampY(y + ty * step + ny * out)
    points.push([x, y])
  }
  const paths = [points]
  if (Math.random() < 0.5) {
    let [fx, fy] = points[Math.floor(points.length / 2)]
    const fork = [[fx, fy]]
    for (let i = 0; i < 3; i++) {
      fx = clampX(fx + nx * between(4, 9) + tx * between(-5, 5))
      fy = clampY(fy + ny * between(4, 9) + ty * between(-5, 5))
      fork.push([fx, fy])
    }
    paths.push(fork)
  }
  return paths.map((line) => `M${line.map(([px, py]) => `${px.toFixed(1)},${py.toFixed(1)}`).join(' L')}`)
}

function Lightning({ strike, onDone }) {
  return (
    <motion.svg
      aria-hidden="true"
      viewBox={`${-M} ${-M} ${W + 2 * M} ${H + 2 * M}`}
      preserveAspectRatio="none"
      className="pointer-events-none absolute overflow-visible"
      style={{ left: `${(-M / W) * 100}%`, top: `${(-M / H) * 100}%`, width: `${((W + 2 * M) / W) * 100}%`, height: `${((H + 2 * M) / H) * 100}%` }}
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 1, 0.25, 1, 0.6, 0] }}
      transition={{ duration: AURA.strikeSeconds, times: [0, 0.08, 0.3, 0.45, 0.7, 1], ease: 'linear' }}
      onAnimationComplete={onDone}
    >
      {strike.paths.map((d, i) => (
        <g key={i} fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d={d} style={{ stroke: 'rgb(var(--glow))' }} strokeWidth={i ? 2.6 : 3.6} opacity={0.75} />
          <path d={d} stroke="#fff" strokeWidth={i ? 0.9 : 1.3} />
        </g>
      ))}
    </motion.svg>
  )
}

export default function CardAura({ colour, lit, company = 1 }) {
  const reduce = useReducedMotion()
  const [strike, setStrike] = useState(null)

  // The shimmer as it lights up.
  useEffect(() => {
    if (lit) FX.ignite()
  }, [lit])

  // Lightning, now and then.
  useEffect(() => {
    if (!lit || reduce) return
    const spread = Math.sqrt(company)
    let timer
    const next = (range) => {
      timer = setTimeout(() => {
        setStrike({ id: Math.random(), paths: arc() })
        FX.crackle()
        next(AURA.strikeEvery)
      }, between(...range) * spread * 1000)
    }
    next(AURA.firstStrike)
    return () => clearTimeout(timer)
  }, [lit, reduce, company])

  // Just in front of the card's face (it's a 3D card), and hidden when the
  // card is face down.
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 backface-hidden" style={{ transform: 'translateZ(1px)' }}>
      <motion.div
        className="card-glow card-aura absolute inset-0 rounded-[10%]"
        style={{ '--glow': colour }}
        initial={{ opacity: 0 }}
        animate={{ opacity: lit ? 1 : 0 }}
        exit={{ opacity: 0, transition: { duration: 0.5 } }}
        transition={{ duration: AURA.fadeSeconds, ease: 'easeInOut' }}
      >
        <AnimatePresence>{strike && <Lightning key={strike.id} strike={strike} onDone={() => setStrike(null)} />}</AnimatePresence>
      </motion.div>
    </div>
  )
}
