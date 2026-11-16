// The shockwave a stone sets off as it lands, drawn on a canvas over the
// board (Board.jsx): a ring rushing out across the board in the shockwave's
// colours, and a burst of its particles. Any piece sets one off: it's the
// placer's shockwave (shared/gomoku/catalogue.js), whatever their piece.
// The whole thing is over in about 0.3 seconds. A Deluxe shockwave
// (deluxeShockwave.js) is a recipe of several layers of particles, some
// starting a moment after others, and lasts up to about a second.
//
//   const layer = new ShockwaveLayer(canvas)
//   layer.play({ x, y, cell, look })   // x, y and cell in CSS pixels
//   layer.stop()

import { DELUXE_KINDS, RECIPES, drawDeluxe, drawImplosion } from './deluxeShockwave'

const RING_MS = 300
const PARTICLE_MS = 340

const easeOut = (t) => 1 - (1 - t) ** 3
const pick = (list) => list[Math.floor(Math.random() * list.length)]
const between = (low, high) => low + Math.random() * (high - low)

// How many particles each kind throws out, and how each one starts.
// `speed` is in cells per second; `spin` in turns per second; `swirl`
// turns a particle's path, in radians per second (the Black Hole's spiral).
const KINDS = {
  sparks: { count: 14, speed: [9, 15], size: [0.08, 0.14] },
  embers: { count: 18, speed: [4, 9], size: [0.07, 0.14], rise: 6 },
  ribbons: { count: 7, speed: [6, 9], size: [0.6, 1.1] },
  petals: { count: 14, speed: [4, 8], size: [0.16, 0.26], spin: 2 },
  bolts: { count: 5, speed: [12, 16], size: [1.6, 2.6] },
  shards: { count: 14, speed: [6, 11], size: [0.14, 0.26], spin: 1.5 },
  stars: { count: 14, speed: [3, 8], size: [0.12, 0.22], spin: 1 },
  void: { count: 18, speed: [7, 11], size: [0.08, 0.16], inward: true },
  hearts: { count: 12, speed: [4, 7], size: [0.16, 0.24], rise: 3 },
  bubbles: { count: 14, speed: [3, 6], size: [0.1, 0.24], rise: 5 },
  pixels: { count: 18, speed: [6, 12], size: [0.1, 0.18] },
  digits: { count: 14, speed: [4, 8], size: [0.3, 0.42], fall: 4 },
  coins: { count: 12, speed: [5, 9], size: [0.16, 0.24], fall: 9, spin: 3 },
}

function heart(ctx, size) {
  ctx.beginPath()
  ctx.moveTo(0, size * 0.35)
  ctx.bezierCurveTo(-size * 1.1, -size * 0.35, -size * 0.45, -size * 1.05, 0, -size * 0.45)
  ctx.bezierCurveTo(size * 0.45, -size * 1.05, size * 1.1, -size * 0.35, 0, size * 0.35)
  ctx.fill()
}

function star(ctx, size) {
  ctx.beginPath()
  for (let i = 0; i < 8; i++) {
    const radius = i % 2 ? size * 0.35 : size
    const angle = (i * Math.PI) / 4
    ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius)
  }
  ctx.closePath()
  ctx.fill()
}

// A jagged line out from the middle, `length` long, along +x.
function boltPath(length, cell) {
  const path = [[0, 0]]
  const steps = 5
  for (let i = 1; i <= steps; i++) path.push([(length * i) / steps, i === steps ? 0 : between(-0.35, 0.35) * cell])
  return path
}

// One layer of particles: a basic shockwave's only one, or one of a Deluxe
// recipe's (deluxeShockwave.js), with what the layer changes. Each particle
// starts `delay` ms in and lasts `life` ms.
function makeParticles(kind, cell, colors, layer = {}) {
  const spec = { ...(KINDS[kind] ?? DELUXE_KINDS[kind] ?? KINDS.sparks), ...layer.spec }
  const count = layer.count ?? spec.count
  const palette = layer.colors ?? colors
  const delay = layer.delay ?? [0, 0]
  const life = layer.life ?? [PARTICLE_MS, PARTICLE_MS]
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2 + (spec.center ? 0 : between(-0.25, 0.25))
    const speed = between(...spec.speed) * cell
    const size = between(...spec.size) * cell
    const start = spec.center ? 0 : spec.inward ? cell * between(2.6, 3.6) : spec.scatter ? cell * between(...spec.scatter) : cell * 0.35
    return {
      kind,
      angle,
      x: Math.cos(angle) * start,
      y: Math.sin(angle) * start,
      vx: Math.cos(angle) * speed * (spec.inward ? -1 : 1),
      vy: Math.sin(angle) * speed * (spec.inward ? -1 : 1),
      size,
      color: pick(palette),
      palette,
      rot: Math.random() * Math.PI * 2,
      spin: (spec.spin ?? 0) * Math.PI * 2 * (spec.oneWay || Math.random() < 0.5 ? 1 : -1),
      rise: (spec.rise ?? 0) * cell,
      fall: (spec.fall ?? 0) * cell,
      drag: spec.drag ?? 0.9,
      swirl: spec.swirl ?? 0,
      seed: Math.random() * 10,
      delay: between(...delay),
      life: between(...life),
      digit: Math.random() < 0.5 ? '0' : '1',
      bolt: kind === 'bolts' ? boltPath(size, cell) : null,
      deluxe: !KINDS[kind] && Boolean(DELUXE_KINDS[kind]),
    }
  })
}

function drawParticle(ctx, p, cell, fade) {
  const { kind } = p
  ctx.save()
  ctx.translate(p.x, p.y)
  ctx.rotate(p.rot)
  ctx.globalAlpha = fade
  ctx.fillStyle = p.color
  ctx.strokeStyle = p.color

  switch (kind) {
    case 'sparks':
    case 'shards': {
      ctx.rotate(p.angle - p.rot)
      ctx.lineWidth = Math.max(1, p.size * (kind === 'shards' ? 0.45 : 0.6))
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(-p.size * 2.2, 0)
      ctx.lineTo(p.size * 0.6, 0)
      ctx.stroke()
      break
    }
    case 'embers':
    case 'void': {
      ctx.shadowColor = p.color
      ctx.shadowBlur = p.size * 2
      ctx.beginPath()
      ctx.arc(0, 0, p.size * (kind === 'embers' ? 0.5 + fade * 0.5 : 1), 0, Math.PI * 2)
      ctx.fill()
      break
    }
    case 'ribbons': {
      ctx.rotate(p.angle - p.rot)
      ctx.lineWidth = cell * 0.12
      ctx.lineCap = 'round'
      ctx.shadowColor = p.color
      ctx.shadowBlur = cell * 0.4
      ctx.beginPath()
      ctx.moveTo(0, -p.size / 2)
      ctx.quadraticCurveTo(cell * 0.3 * Math.sin(p.rot * 3), 0, 0, p.size / 2)
      ctx.stroke()
      break
    }
    case 'petals': {
      ctx.beginPath()
      ctx.ellipse(0, 0, p.size, p.size * 0.55, 0, 0, Math.PI * 2)
      ctx.fill()
      break
    }
    case 'bolts': {
      ctx.rotate(p.angle - p.rot)
      ctx.lineWidth = Math.max(1.2, cell * 0.07)
      ctx.lineJoin = 'round'
      ctx.shadowColor = p.color
      ctx.shadowBlur = cell * 0.5
      ctx.globalAlpha = fade * (Math.random() < 0.25 ? 0.4 : 1)
      ctx.beginPath()
      for (const [bx, by] of p.bolt) ctx.lineTo(bx, by)
      ctx.stroke()
      break
    }
    case 'stars': {
      ctx.shadowColor = p.color
      ctx.shadowBlur = p.size
      star(ctx, p.size * (0.6 + 0.4 * Math.abs(Math.sin(p.rot * 2))))
      break
    }
    case 'hearts':
      heart(ctx, p.size)
      break
    case 'bubbles': {
      ctx.lineWidth = Math.max(1, p.size * 0.18)
      ctx.beginPath()
      ctx.arc(0, 0, p.size, 0, Math.PI * 2)
      ctx.stroke()
      ctx.globalAlpha = fade * 0.8
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.arc(-p.size * 0.35, -p.size * 0.35, p.size * 0.22, 0, Math.PI * 2)
      ctx.fill()
      break
    }
    case 'pixels':
      ctx.rotate(-p.rot)
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size)
      break
    case 'digits': {
      ctx.rotate(-p.rot)
      ctx.font = `bold ${p.size}px ui-monospace, monospace`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.shadowColor = p.color
      ctx.shadowBlur = p.size * 0.6
      ctx.fillText(p.digit, 0, 0)
      break
    }
    case 'coins': {
      ctx.scale(Math.max(0.15, Math.abs(Math.cos(p.rot))), 1)
      ctx.beginPath()
      ctx.arc(0, 0, p.size, 0, Math.PI * 2)
      ctx.fill()
      ctx.lineWidth = Math.max(1, p.size * 0.18)
      ctx.strokeStyle = 'rgba(120, 80, 10, 0.8)'
      ctx.stroke()
      break
    }
    default:
      break
  }
  ctx.restore()
}

// The ring: a glowing band in the shockwave's colours, rushing out and
// thinning as it goes, and a fainter one just behind it. `t` from 0 to 1.
// `style` (a Deluxe recipe's): 'big' rushes further, in three bands;
// 'implode' falls in instead (deluxeShockwave.js).
function drawRing(ctx, colors, cell, t, reduced, style = null) {
  if (style === 'implode' && !reduced) {
    drawImplosion(ctx, colors, cell, t)
    return
  }
  const grow = easeOut(t)
  const reach = reduced ? cell * 1.2 : cell * (style === 'big' ? 6.5 : 5)
  const bands = reduced ? [0] : style === 'big' ? [0, 0.16, 0.32] : [0, 0.22]

  for (const lag of bands) {
    const local = Math.max(0, (t - lag) / (1 - lag))
    if (local <= 0) continue
    const eased = reduced ? grow : easeOut(local)
    const radius = cell * 0.45 + reach * eased
    const width = cell * (lag ? 0.12 : 0.32) * (1 - eased * 0.75)
    const alpha = (1 - local) ** 1.4 * (lag ? 0.5 : 1)

    colors.forEach((color, i) => {
      ctx.save()
      ctx.globalAlpha = alpha
      ctx.strokeStyle = color
      ctx.lineWidth = Math.max(1, width * (1 - i / (colors.length + 1)))
      ctx.shadowColor = color
      ctx.shadowBlur = cell * 0.6
      ctx.beginPath()
      ctx.arc(0, 0, radius + i * width * 0.6, 0, Math.PI * 2)
      ctx.stroke()
      ctx.restore()
    })
  }

  // A flash where the stone lands.
  if (t < 0.4) {
    ctx.save()
    const flash = ctx.createRadialGradient(0, 0, 0, 0, 0, cell * 1.1)
    flash.addColorStop(0, colors[0])
    flash.addColorStop(1, 'transparent')
    ctx.globalAlpha = (1 - t / 0.4) * 0.8
    ctx.fillStyle = flash
    ctx.beginPath()
    ctx.arc(0, 0, cell * 1.1, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
}

export class ShockwaveLayer {
  constructor(canvas) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    this.effects = []
    this.frame = null
    this.tick = this.tick.bind(this)
  }

  // Matches the canvas to its size on the page, sharp on high-density screens.
  fit() {
    const rect = this.canvas.getBoundingClientRect()
    const ratio = window.devicePixelRatio || 1
    const width = Math.round(rect.width * ratio)
    const height = Math.round(rect.height * ratio)
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width
      this.canvas.height = height
    }
    this.ratio = ratio
  }

  // A shockwave at (x, y), `cell` being one point's width, all in CSS
  // pixels. `look` is the shockwave's look from the catalogue.
  play({ x, y, cell, look }) {
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    this.fit()
    const recipe = RECIPES[look.particles] ?? null
    const particles = reduced
      ? []
      : recipe
        ? recipe.layers.flatMap((layer) => makeParticles(layer.kind, cell, look.colors, layer))
        : makeParticles(look.particles, cell, look.colors)
    const ringMs = recipe?.ringMs ?? RING_MS
    this.effects.push({
      x,
      y,
      cell,
      ring: look.ring,
      ringStyle: recipe?.ring ?? null,
      ringMs,
      particles,
      // When it's all over: the ring, and the last particle to go.
      end: Math.max(ringMs, PARTICLE_MS, ...particles.map((p) => p.delay + p.life)),
      start: performance.now(),
      last: performance.now(),
      reduced,
    })
    if (!this.frame) this.frame = requestAnimationFrame(this.tick)
  }

  tick(now) {
    const { ctx, canvas } = this
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    this.effects = this.effects.filter((effect) => now - effect.start < effect.end)
    for (const effect of this.effects) {
      const elapsed = now - effect.start
      const dt = Math.min(0.05, (now - effect.last) / 1000)
      effect.last = now

      ctx.setTransform(this.ratio, 0, 0, this.ratio, effect.x * this.ratio, effect.y * this.ratio)
      if (elapsed < effect.ringMs) drawRing(ctx, effect.ring, effect.cell, elapsed / effect.ringMs, effect.reduced, effect.ringStyle)

      for (const p of effect.particles) {
        const age = elapsed - p.delay
        if (age < 0 || age >= p.life) continue
        if (p.swirl) {
          const turn = p.swirl * dt
          const vx = p.vx * Math.cos(turn) - p.vy * Math.sin(turn)
          p.vy = p.vx * Math.sin(turn) + p.vy * Math.cos(turn)
          p.vx = vx
        }
        p.vx *= p.drag
        p.vy = p.vy * p.drag - p.rise * dt + p.fall * dt
        p.x += p.vx * dt
        p.y += p.vy * dt
        p.rot += p.spin * dt
        if (p.deluxe) drawDeluxe(ctx, p, effect.cell, age / p.life, age)
        else drawParticle(ctx, p, effect.cell, 1 - age / p.life)
      }
    }

    this.frame = this.effects.length ? requestAnimationFrame(this.tick) : null
    if (!this.frame) {
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    }
  }

  stop() {
    if (this.frame) cancelAnimationFrame(this.frame)
    this.frame = null
    this.effects = []
  }
}
