import { useEffect, useRef } from 'react'

// ---- Settings: change these to tune the effects ----

// Fireworks: rainbow bursts from each Gauntlet on a line paid as Maps.
// Particles fly straight out in every direction and shoot off past the
// edges of the screen.
const FIREWORKS = {
  // Bursts from each Gauntlet, and the time between them.
  burstsPerPoint: 3,
  burstGapMs: 260,
  // Gauntlets that fire at most (the rest of a spin's are skipped).
  maxPoints: 4,
  // Particles in one burst at most, and across all of a spin's bursts.
  maxPerBurst: 150,
  maxParticles: 540,
  // How far the fastest particles fly, as a multiple of the distance to the
  // screen's edge in their direction: 1 stops right at the edge, more shoots
  // off past it (the rest just goes off screen).
  reach: 1.7,
  // How fast each particle is, as a share of the fastest. They spread out
  // between these; with reach x the lowest above 1, every particle leaves
  // the screen.
  speedRange: [0.65, 1],
  // How long a particle flies for, in milliseconds. Shorter is faster.
  flightMs: 1400,
  // How much they slow down on the way: 1 is the same speed all the way,
  // higher starts faster and eases off (3 or more drifts to a stop).
  slowing: 1.5,
  // A pull downwards, in pixels per second per second. 0 is none: they go
  // out evenly in every direction.
  gravity: 0,
  // Particle size in pixels (a random size between these), and how big its
  // soft glow is, as a multiple of that.
  size: [1.6, 2.8],
  glow: 3,
}

// Lightning: rainbow bolts shooting out of the reels from the Gauntlets and
// Rings on lines paid as Rings (and INFINITY lines).
const LIGHTNING = {
  // How long it keeps striking, how often a new strike comes, and how many
  // bolts can be on screen at once.
  durationMs: 1100,
  strikeEveryMs: 75,
  maxBolts: 8,
  // How long one bolt flashes for.
  boltMs: 190,
  // Cells it strikes from at most.
  maxPoints: 6,
  // How far a bolt goes, as a multiple of the distance to the screen's edge
  // in its direction: 1 stops right at the edge, more shoots off past it.
  reach: 1.6,
  // How far off pointing straight out of the reels a bolt can head, in
  // radians each way (0 is straight out, 3.14 any direction at all).
  spread: 1,
  // How jagged the bolts are (0 is straight), and how fine the zigzag is
  // (each step doubles the number of kinks).
  jag: 0.26,
  detail: 6,
  // Branches off each bolt (a random number between these), and how long
  // they are as a share of the bolt.
  branches: [1, 3],
  branchLength: [0.25, 0.45],
  // Line widths in pixels: the bright core, and the glow round it.
  width: 2.4,
  glowWidth: 9,
  branchWidth: 1.4,
  branchGlowWidth: 5,
}

// How quickly what's drawn fades, leaving trails: 0 to 1, higher is shorter
// trails.
const TRAIL_FADE = 0.24

// ---- The effects ----

const random = (low, high) => low + Math.random() * (high - low)

// How far it is from (x, y) to the edge of a `width` x `height` screen,
// heading at `angle`.
function toEdge(x, y, angle, width, height) {
  const dx = Math.cos(angle)
  const dy = Math.sin(angle)
  const across = dx > 0 ? (width - x) / dx : dx < 0 ? -x / dx : Infinity
  const down = dy > 0 ? (height - y) / dy : dy < 0 ? -y / dy : Infinity
  return Math.max(0, Math.min(across, down))
}

// A jagged line from (x1, y1) to (x2, y2): each segment's middle pushed
// sideways, `depth` times over.
function jagged(x1, y1, x2, y2, depth) {
  let points = [
    [x1, y1],
    [x2, y2],
  ]
  for (let level = 0; level < depth; level++) {
    const next = [points[0]]
    for (let i = 1; i < points.length; i++) {
      const [ax, ay] = points[i - 1]
      const [bx, by] = points[i]
      const length = Math.hypot(bx - ax, by - ay) || 1
      const push = random(-LIGHTNING.jag, LIGHTNING.jag) * length
      // Sideways: at right angles to the segment.
      next.push([(ax + bx) / 2 + (-(by - ay) / length) * push, (ay + by) / 2 + ((bx - ax) / length) * push], points[i])
    }
    points = next
  }
  return points
}

// A bolt from (x, y) to the edge of the screen, heading out from the reel
// window's centre (`from`), with branches off it.
function makeBolt(x, y, from, now, width, height) {
  const outward = Math.atan2(y - from.y, x - from.x) || random(0, Math.PI * 2)
  const angle = outward + random(-LIGHTNING.spread, LIGHTNING.spread)
  const length = toEdge(x, y, angle, width, height) * LIGHTNING.reach
  const main = jagged(x, y, x + Math.cos(angle) * length, y + Math.sin(angle) * length, LIGHTNING.detail)
  const count = Math.floor(random(LIGHTNING.branches[0], LIGHTNING.branches[1] + 0.99))
  const branches = Array.from({ length: count }, () => {
    const [bx, by] = main[Math.floor(random(main.length * 0.15, main.length * 0.75))]
    const turn = angle + random(0.4, 1) * (Math.random() < 0.5 ? -1 : 1)
    const reach = length * random(...LIGHTNING.branchLength)
    return jagged(bx, by, bx + Math.cos(turn) * reach, by + Math.sin(turn) * reach, LIGHTNING.detail - 1)
  })
  return { paths: [main, ...branches], born: now, hue: random(0, 360) }
}

function tracePath(ctx, points) {
  ctx.beginPath()
  ctx.moveTo(points[0][0], points[0][1])
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1])
  ctx.stroke()
}

// Rainbow fireworks and lightning over the reels, on the spinner's own
// screen only (settings above). Like the wheel's confetti: a canvas that
// lets every tap through, here over the whole machine (it fills whatever
// it's put in), under the CRITICAL HIT! and INFINITY words. Each new
// `burst` ({ id, fireworks: [{ x, y }], lightning: [{ x, y }], window:
// DOMRect }, in window pixels) plays once: fireworks bursting from the Gauntlet cells, and
// lightning shooting out of the reels from the Gauntlet and Ring cells,
// both at once if both. The page leaves it out with reduced motion.
// `onBurst(index)` and `onStrike(first)` hear each firework burst and each
// lightning strike as it happens, for their sounds.
export default function SlotEffects({ burst, onBurst, onStrike }) {
  const canvasRef = useRef(null)
  const listeners = useRef({ onBurst, onStrike })
  useEffect(() => {
    listeners.current = { onBurst, onStrike }
  })

  useEffect(() => {
    if (!burst) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1
    // The canvas's own box: points come in window pixels, so they're moved
    // to where it starts.
    const box = canvas.getBoundingClientRect()
    const width = box.width
    const height = box.height
    const local = (point) => ({ x: point.x - box.left, y: point.y - box.top })
    canvas.width = width * dpr
    canvas.height = height * dpr
    ctx.scale(dpr, dpr)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    const start = performance.now()
    const centre = burst.window
      ? local({ x: burst.window.left + burst.window.width / 2, y: burst.window.top + burst.window.height / 2 })
      : { x: width / 2, y: height / 2 }

    // Fireworks: when each burst goes off, and its share of particles.
    const fireworkPoints = burst.fireworks.slice(0, FIREWORKS.maxPoints).map(local)
    const perBurst = fireworkPoints.length
      ? Math.max(40, Math.min(FIREWORKS.maxPerBurst, Math.floor(FIREWORKS.maxParticles / (fireworkPoints.length * FIREWORKS.burstsPerPoint))))
      : 0
    const pending = fireworkPoints
      .flatMap((point, p) =>
        Array.from({ length: FIREWORKS.burstsPerPoint }, (_, b) => ({
          at: b * FIREWORKS.burstGapMs + p * 60,
          x: point.x + random(-14, 14),
          y: point.y + random(-14, 14),
        }))
      )
      .sort((a, b) => a.at - b.at)
    const particles = []
    let bursts = 0
    let struck = 0

    const lightningPoints = burst.lightning.slice(0, LIGHTNING.maxPoints).map(local)
    const bolts = []
    let nextStrike = 0
    const lastSpark = Math.max(
      fireworkPoints.length ? (FIREWORKS.burstsPerPoint - 1) * FIREWORKS.burstGapMs + FIREWORKS.flightMs : 0,
      lightningPoints.length ? LIGHTNING.durationMs + LIGHTNING.boltMs : 0
    )

    let frame

    const tick = (now) => {
      const elapsed = now - start

      // Fade what's already drawn, leaving short trails.
      ctx.globalCompositeOperation = 'destination-out'
      ctx.fillStyle = `rgba(0, 0, 0, ${TRAIL_FADE})`
      ctx.fillRect(0, 0, width, height)
      ctx.globalCompositeOperation = 'lighter'

      // Fireworks: each particle heads straight out at its own angle, as far
      // as its share of the way to the screen's edge, slowing as it goes.
      while (pending.length && pending[0].at <= elapsed) {
        const { x, y } = pending.shift()
        listeners.current.onBurst?.(bursts++)
        const hue = random(0, 360)
        for (let i = 0; i < perBurst; i++) {
          const angle = (i / perBurst) * Math.PI * 2 + random(-0.06, 0.06)
          particles.push({
            x,
            y,
            angle,
            distance: Math.min(width, height) * 0.65 * random(...FIREWORKS.speedRange),
            born: now,
            hue: (hue + (i / perBurst) * 360) % 360,
            size: random(...FIREWORKS.size),
          })
        }
      }
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]
        const t = (now - p.born) / FIREWORKS.flightMs
        if (t >= 1) {
          particles.splice(i, 1)
          continue
        }
        const travelled = p.distance * (1 - (1 - t) ** FIREWORKS.slowing)
        const seconds = (now - p.born) / 1000
        const px = p.x + Math.cos(p.angle) * travelled
        const py = p.y + Math.sin(p.angle) * travelled + 0.5 * FIREWORKS.gravity * seconds * seconds
        // Bright almost all the way, fading only at the very end.
        const life = 1 - t ** 4
        ctx.fillStyle = `hsla(${p.hue}, 100%, 62%, ${life * 0.22})`
        ctx.beginPath()
        ctx.arc(px, py, p.size * FIREWORKS.glow, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = `hsla(${p.hue}, 100%, 70%, ${life})`
        ctx.beginPath()
        ctx.arc(px, py, p.size, 0, Math.PI * 2)
        ctx.fill()
      }

      // Lightning: new strikes until it's over, a few bolts at a time.
      if (lightningPoints.length && elapsed < LIGHTNING.durationMs && elapsed >= nextStrike) {
        nextStrike = elapsed + LIGHTNING.strikeEveryMs * random(0.7, 1.4)
        const strikes = Math.min(2, LIGHTNING.maxBolts - bolts.length)
        for (let s = 0; s < strikes; s++) {
          const point = lightningPoints[Math.floor(random(0, lightningPoints.length))]
          bolts.push(makeBolt(point.x, point.y, centre, now, width, height))
        }
        // One crack for the strike, however many bolts it threw.
        if (strikes > 0) listeners.current.onStrike?.(struck++ === 0)
      }
      for (let i = bolts.length - 1; i >= 0; i--) {
        const bolt = bolts[i]
        const age = (now - bolt.born) / LIGHTNING.boltMs
        if (age >= 1) {
          bolts.splice(i, 1)
          continue
        }
        // A flash: bright at once, then gone, its colour cycling as it goes.
        const alpha = 1 - age
        const hue = (bolt.hue + elapsed * 0.6) % 360
        bolt.paths.forEach((path, b) => {
          const main = b === 0
          ctx.strokeStyle = `hsla(${hue}, 100%, 60%, ${alpha * 0.3})`
          ctx.lineWidth = main ? LIGHTNING.glowWidth : LIGHTNING.branchGlowWidth
          tracePath(ctx, path)
          ctx.strokeStyle = `hsla(${(hue + 40) % 360}, 100%, ${main ? 82 : 72}%, ${alpha})`
          ctx.lineWidth = main ? LIGHTNING.width : LIGHTNING.branchWidth
          tracePath(ctx, path)
        })
      }

      if (elapsed < lastSpark + 900 || particles.length || bolts.length) {
        frame = requestAnimationFrame(tick)
      } else {
        ctx.clearRect(0, 0, width, height)
      }
    }

    frame = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(frame)
      ctx.globalCompositeOperation = 'source-over'
      ctx.clearRect(0, 0, width, height)
    }
  }, [burst])

  return <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none absolute inset-0 z-5 h-full w-full" />
}
