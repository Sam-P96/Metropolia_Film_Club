// The Deluxe shockwaves (shared/gomoku/catalogue.js), for shockwave.js: each
// one is a recipe of several layers of particles, some starting a moment
// after the others, living longer than the basic ones (up to about a
// second), and mostly drawn with light added to light ('lighter'), so where
// they cross they burn brighter. Glows are drawn as a faint wide shape under
// a bright one rather than with canvas shadows, which are slow on phones.

const TAU = Math.PI * 2
const easeOut = (t) => 1 - (1 - t) ** 3
const easeIn = (t) => t ** 2

// How each Deluxe particle kind starts (like shockwave.js KINDS). `center`:
// it sits where the stone landed; `scatter`: it starts this many cells out,
// anywhere round; `drag`: how much speed it keeps each frame (0.9 if left
// out); `life`: how long it lasts, in ms.
export const DELUXE_KINDS = {
  flare: { count: 1, center: true, speed: [0, 0], size: [1, 1] },
  rays: { count: 16, speed: [16, 22], size: [0.9, 1.6] },
  dust: { count: 40, speed: [2, 7], size: [0.03, 0.06], drag: 0.95 },
  disk: { count: 1, center: true, speed: [0, 0], size: [1, 1], spin: 1.6, oneWay: true },
  core: { count: 1, center: true, speed: [0, 0], size: [1, 1] },
  infall: { count: 36, speed: [5, 8], size: [0.05, 0.11], inward: true, swirl: 9 },
  burst: { count: 20, speed: [9, 15], size: [0.06, 0.1] },
  shell: { count: 40, speed: [8, 14], size: [0.05, 0.09], fall: 7 },
  crackle: { count: 14, scatter: [1, 3.2], speed: [0, 0.5], size: [0.14, 0.24] },
  glitter: { count: 30, speed: [2, 5], size: [0.03, 0.06], fall: 3, drag: 0.94, spin: 3 },
  beam: { count: 6, center: true, speed: [0, 0], size: [1, 1], spin: 0.25, oneWay: true },
  diamonds: { count: 22, speed: [5, 10], size: [0.14, 0.22], spin: 2.5 },
  twinkle: { count: 16, speed: [3, 7], size: [0.12, 0.2] },
}

// The recipes, by the catalogue's `particles`. `ring`: the ring's style
// ('big' rushes further, with three bands; 'implode' falls in instead of
// rushing out) and `ringMs` how long it lasts. Each layer: a kind, and
// anything to change from DELUXE_KINDS (`count`, `delay` and `life` as
// [shortest, longest] ms, `colors`, `spec`).
export const RECIPES = {
  supernova: {
    ring: 'big',
    ringMs: 460,
    layers: [
      { kind: 'flare', life: [560, 560] },
      { kind: 'rays', life: [380, 470] },
      { kind: 'rays', count: 10, delay: [90, 150], life: [320, 400], spec: { speed: [10, 14], size: [0.5, 0.9] } },
      { kind: 'dust', life: [650, 950] },
    ],
  },
  'black-hole': {
    ring: 'implode',
    ringMs: 440,
    layers: [
      { kind: 'disk', life: [720, 720] },
      { kind: 'infall', life: [520, 700] },
      { kind: 'core', life: [600, 600] },
      // The flash as it closes: a puff of light thrown back out.
      { kind: 'burst', delay: [560, 600], life: [300, 380], colors: ['#ffffff', '#e0ccff', '#b98cff'] },
    ],
  },
  'firework-show': {
    ringMs: 320,
    layers: [
      { kind: 'shell', life: [560, 780] },
      { kind: 'crackle', delay: [200, 480], life: [180, 280] },
      { kind: 'glitter', delay: [220, 380], life: [700, 1000] },
    ],
  },
  'prism-burst': {
    ringMs: 340,
    layers: [
      { kind: 'beam', life: [520, 620] },
      { kind: 'diamonds', life: [520, 720] },
      { kind: 'twinkle', delay: [60, 340], life: [260, 380] },
    ],
  },
}

// A four-pointed sparkle, `size` from the middle to each point.
function sparkle(ctx, size) {
  const waist = size * 0.18
  ctx.beginPath()
  ctx.moveTo(0, -size)
  ctx.quadraticCurveTo(waist, -waist, size, 0)
  ctx.quadraticCurveTo(waist, waist, 0, size)
  ctx.quadraticCurveTo(-waist, waist, -size, 0)
  ctx.quadraticCurveTo(-waist, -waist, 0, -size)
  ctx.fill()
}

// A dot with a soft glow round it: a faint wide circle under a bright one.
function glowDot(ctx, radius, alpha) {
  ctx.globalAlpha = alpha * 0.25
  ctx.beginPath()
  ctx.arc(0, 0, radius * 3, 0, TAU)
  ctx.fill()
  ctx.globalAlpha = alpha
  ctx.beginPath()
  ctx.arc(0, 0, radius, 0, TAU)
  ctx.fill()
}

// A streak along -x to the particle, fading back: `length` long, `width` wide,
// with a wider faint copy under it for the glow.
function streak(ctx, length, width, color, alpha) {
  const gradient = ctx.createLinearGradient(-length, 0, 0, 0)
  gradient.addColorStop(0, 'transparent')
  gradient.addColorStop(1, color)
  ctx.strokeStyle = gradient
  ctx.lineCap = 'round'
  ctx.globalAlpha = alpha * 0.3
  ctx.lineWidth = width * 3
  ctx.beginPath()
  ctx.moveTo(-length, 0)
  ctx.lineTo(0, 0)
  ctx.stroke()
  ctx.globalAlpha = alpha
  ctx.lineWidth = width
  ctx.stroke()
}

// Draws one Deluxe particle, already moved to where it is. `k` is how far
// through its life it is (0 to 1), `age` its age in ms.
export function drawDeluxe(ctx, p, cell, k, age) {
  const fade = 1 - k
  ctx.save()
  ctx.translate(p.x, p.y)
  ctx.globalCompositeOperation = 'lighter'
  ctx.fillStyle = p.color
  ctx.strokeStyle = p.color

  switch (p.kind) {
    // Supernova's heart: a white-hot glow swelling out, with long lens-flare
    // streaks crossing it.
    case 'flare': {
      const [white, gold, pink] = p.palette
      const radius = cell * (0.6 + 2.4 * easeOut(k))
      const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, radius)
      glow.addColorStop(0, white)
      glow.addColorStop(0.3, gold)
      glow.addColorStop(0.65, pink)
      glow.addColorStop(1, 'transparent')
      ctx.globalAlpha = fade ** 1.6
      ctx.fillStyle = glow
      ctx.beginPath()
      ctx.arc(0, 0, radius, 0, TAU)
      ctx.fill()
      for (const [angle, reach] of [[0, 1], [Math.PI / 2, 1], [Math.PI / 4, 0.45], [-Math.PI / 4, 0.45]]) {
        const length = cell * (1.5 + 5 * easeOut(k)) * reach
        const line = ctx.createLinearGradient(-length, 0, length, 0)
        line.addColorStop(0, 'transparent')
        line.addColorStop(0.5, white)
        line.addColorStop(1, 'transparent')
        ctx.save()
        ctx.rotate(angle)
        ctx.globalAlpha = fade ** 1.2
        ctx.strokeStyle = line
        ctx.lineWidth = Math.max(1, cell * 0.06)
        ctx.beginPath()
        ctx.moveTo(-length, 0)
        ctx.lineTo(length, 0)
        ctx.stroke()
        ctx.restore()
      }
      break
    }
    case 'rays': {
      ctx.rotate(p.angle)
      streak(ctx, p.size, Math.max(1, cell * 0.07), p.color, fade)
      ctx.fillStyle = '#ffffff'
      glowDot(ctx, Math.max(1, cell * 0.05), fade)
      break
    }
    // Stardust: tiny motes drifting out, twinkling.
    case 'dust':
    case 'glitter': {
      const twinkle = 0.5 + 0.5 * Math.sin(age * 0.035 + p.seed)
      if (p.kind === 'glitter') {
        ctx.rotate(p.rot)
        ctx.globalAlpha = fade * twinkle
        ctx.fillRect(-p.size, -p.size, p.size * 2, p.size * 2)
      } else {
        glowDot(ctx, p.size, fade * twinkle)
      }
      break
    }
    // The Black Hole's accretion disk: a tilted ring of light whirling round
    // and drawn in as it shrinks.
    case 'disk': {
      const radius = cell * (2.6 - 2 * easeIn(k))
      ctx.rotate(p.rot)
      ctx.scale(1, 0.36)
      const width = cell * 0.22 * (1 - k * 0.4)
      const pieces = 10
      for (let i = 0; i < pieces; i++) {
        ctx.strokeStyle = p.palette[i % p.palette.length]
        ctx.globalAlpha = fade * (i % 2 ? 0.55 : 0.9)
        ctx.lineWidth = width
        ctx.beginPath()
        ctx.arc(0, 0, radius, (i / pieces) * TAU, ((i + 0.8) / pieces) * TAU)
        ctx.stroke()
      }
      ctx.globalAlpha = fade * 0.4
      ctx.lineWidth = width * 0.4
      ctx.strokeStyle = '#ffffff'
      ctx.beginPath()
      ctx.arc(0, 0, radius * 0.72, 0, TAU)
      ctx.stroke()
      break
    }
    // The event horizon: a dark hole with a glowing rim that opens and
    // closes again. Drawn over the board, so not with light.
    case 'core': {
      const radius = cell * 0.42 * Math.sin(Math.PI * k)
      if (radius <= 0.5) break
      ctx.globalCompositeOperation = 'source-over'
      ctx.globalAlpha = 0.3
      ctx.fillStyle = p.palette[0]
      ctx.beginPath()
      ctx.arc(0, 0, radius * 1.7, 0, TAU)
      ctx.fill()
      ctx.globalAlpha = 0.85
      ctx.fillStyle = '#05010b'
      ctx.beginPath()
      ctx.arc(0, 0, radius, 0, TAU)
      ctx.fill()
      ctx.globalAlpha = 1
      ctx.strokeStyle = p.palette[1] ?? p.palette[0]
      ctx.lineWidth = Math.max(1, cell * 0.06)
      ctx.stroke()
      break
    }
    // Motes falling in, each with a tail behind it.
    case 'infall':
    case 'burst':
    case 'shell': {
      ctx.rotate(Math.atan2(p.vy, p.vx))
      const speed = Math.hypot(p.vx, p.vy)
      const length = Math.min(cell * (p.kind === 'shell' ? 1 : 0.7), speed * 0.06)
      const alpha = p.kind === 'shell' ? fade * (0.65 + 0.35 * Math.sin(age * 0.05 + p.seed)) : fade
      streak(ctx, length, Math.max(1, p.size), p.color, alpha)
      glowDot(ctx, p.size * 1.1, alpha)
      break
    }
    // A firework's crackle: sparkles popping, white at the heart.
    case 'crackle':
    case 'twinkle': {
      const pop = Math.sin(Math.PI * k)
      const size = p.size * (p.kind === 'crackle' ? pop : 0.5 + 0.5 * pop)
      ctx.rotate(p.rot)
      ctx.globalAlpha = Math.min(1, pop * 1.4)
      sparkle(ctx, size)
      ctx.fillStyle = '#ffffff'
      sparkle(ctx, size * 0.45)
      break
    }
    // Prism's beams: wedges of coloured light turning as they reach out.
    case 'beam': {
      const reach = cell * (1 + 4.5 * easeOut(k))
      const half = 0.1
      ctx.rotate(p.angle + p.rot)
      const light = ctx.createLinearGradient(0, 0, reach, 0)
      light.addColorStop(0, p.color)
      light.addColorStop(1, 'transparent')
      ctx.globalAlpha = fade * 0.7
      ctx.fillStyle = light
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.lineTo(reach * Math.cos(-half), reach * Math.sin(-half))
      ctx.lineTo(reach * Math.cos(half), reach * Math.sin(half))
      ctx.closePath()
      ctx.fill()
      break
    }
    // Spinning diamonds of colour with a bright edge.
    case 'diamonds': {
      ctx.rotate(p.rot)
      ctx.beginPath()
      ctx.moveTo(0, -p.size)
      ctx.lineTo(p.size * 0.6, 0)
      ctx.lineTo(0, p.size)
      ctx.lineTo(-p.size * 0.6, 0)
      ctx.closePath()
      ctx.globalAlpha = fade * 0.3
      ctx.lineWidth = p.size * 0.9
      ctx.stroke()
      ctx.globalAlpha = fade
      ctx.fill()
      ctx.lineWidth = Math.max(1, p.size * 0.16)
      ctx.strokeStyle = '#ffffff'
      ctx.stroke()
      break
    }
    default:
      break
  }
  ctx.restore()
}

// The Black Hole's ring: falling in from far out instead of rushing out,
// brightening as it closes. `t` from 0 to 1.
export function drawImplosion(ctx, colors, cell, t) {
  const radius = cell * 0.4 + cell * 4.6 * (1 - t) ** 1.6
  const alpha = Math.sin(Math.PI * Math.min(1, t * 1.1))
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  colors.forEach((color, i) => {
    ctx.strokeStyle = color
    ctx.globalAlpha = alpha * (1 - i / (colors.length + 1)) * 0.3
    ctx.lineWidth = cell * 0.5 * (0.4 + 0.6 * t)
    ctx.beginPath()
    ctx.arc(0, 0, radius + i * cell * 0.12, 0, TAU)
    ctx.stroke()
    ctx.globalAlpha = alpha * (1 - i / (colors.length + 1))
    ctx.lineWidth = Math.max(1, cell * 0.12 * (0.4 + 0.6 * t))
    ctx.stroke()
  })
  ctx.restore()
}
