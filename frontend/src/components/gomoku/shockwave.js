// The shockwave a stone sets off as it lands, drawn on a canvas over the
// board (Board.jsx): a ring rushing out across the board in the shockwave's
// colours, and a burst of its particles. Any piece sets one off: it's the
// placer's shockwave (shared/gomoku/catalogue.js), whatever their piece.
// The whole thing is over in about 0.3 seconds.
//
//   const layer = new ShockwaveLayer(canvas)
//   layer.play({ x, y, cell, look })   // x, y and cell in CSS pixels
//   layer.stop()

const RING_MS = 300
const PARTICLE_MS = 340

const easeOut = (t) => 1 - (1 - t) ** 3
const pick = (list) => list[Math.floor(Math.random() * list.length)]
const between = (low, high) => low + Math.random() * (high - low)

// How many particles each kind throws out, and how each one starts.
// `speed` is in cells per second; `spin` in turns per second.
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

function makeParticles(kind, cell, colors) {
  const spec = KINDS[kind] ?? KINDS.sparks
  return Array.from({ length: spec.count }, (_, i) => {
    const angle = (i / spec.count) * Math.PI * 2 + between(-0.25, 0.25)
    const speed = between(...spec.speed) * cell
    const size = between(...spec.size) * cell
    const start = spec.inward ? cell * between(2.6, 3.6) : cell * 0.35
    return {
      angle,
      x: Math.cos(angle) * start,
      y: Math.sin(angle) * start,
      vx: Math.cos(angle) * speed * (spec.inward ? -1 : 1),
      vy: Math.sin(angle) * speed * (spec.inward ? -1 : 1),
      size,
      color: pick(colors),
      rot: Math.random() * Math.PI * 2,
      spin: (spec.spin ?? 0) * Math.PI * 2 * (Math.random() < 0.5 ? -1 : 1),
      rise: (spec.rise ?? 0) * cell,
      fall: (spec.fall ?? 0) * cell,
      digit: Math.random() < 0.5 ? '0' : '1',
      bolt: kind === 'bolts' ? boltPath(size, cell) : null,
    }
  })
}

function drawParticle(ctx, kind, p, cell, fade) {
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
function drawRing(ctx, colors, cell, t, reduced) {
  const grow = easeOut(t)
  const reach = reduced ? cell * 1.2 : cell * 5
  const bands = reduced ? [0] : [0, 0.22]

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
    this.effects.push({
      x,
      y,
      cell,
      ring: look.ring,
      kind: look.particles,
      particles: reduced ? [] : makeParticles(look.particles, cell, look.colors),
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

    this.effects = this.effects.filter((effect) => now - effect.start < Math.max(RING_MS, PARTICLE_MS))
    for (const effect of this.effects) {
      const elapsed = now - effect.start
      const dt = Math.min(0.05, (now - effect.last) / 1000)
      effect.last = now

      ctx.setTransform(this.ratio, 0, 0, this.ratio, effect.x * this.ratio, effect.y * this.ratio)
      if (elapsed < RING_MS) drawRing(ctx, effect.ring, effect.cell, elapsed / RING_MS, effect.reduced)

      const fade = Math.max(0, 1 - elapsed / PARTICLE_MS)
      for (const p of effect.particles) {
        p.vx *= 0.9
        p.vy = p.vy * 0.9 - p.rise * dt + p.fall * dt
        p.x += p.vx * dt
        p.y += p.vy * dt
        p.rot += p.spin * dt
        drawParticle(ctx, effect.kind, p, effect.cell, fade)
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
