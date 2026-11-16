// Drawing 8 Ball Pool's table, balls, cue and sparks on a canvas
// (PoolTable.jsx). Everything is drawn in "view" units: the table's own
// coordinates (shared/pool/physics.js), turned a quarter round on a phone,
// where the table stands upright with the break end at the bottom.

import { POCKETS, TABLE } from '../../../../shared/pool/physics.js'
import { cueLook } from '../../../../shared/pool/cues.js'

// The cue everyone has: plain maple and dark wood.
const CLASSIC_CUE = cueLook('cue.classic')

const { W, H, R } = TABLE

// The wooden frame and the cushions round the cloth, in table units.
export const FRAME = 62
export const CUSHION = 16

// The size of the whole drawing, frame and all, in view units.
export const viewSize = (vertical) => (vertical ? { w: H + 2 * FRAME, h: W + 2 * FRAME } : { w: W + 2 * FRAME, h: H + 2 * FRAME })

// Table -> view, and back. Upright: the table's x runs up the screen (the
// head, where the break is played from, at the bottom), its y across.
export function toView(vertical, x, y) {
  return vertical ? { x: FRAME + y, y: FRAME + (W - x) } : { x: FRAME + x, y: FRAME + y }
}
export function toTable(vertical, vx, vy) {
  return vertical ? { x: W - (vy - FRAME), y: vx - FRAME } : { x: vx - FRAME, y: vy - FRAME }
}
// A direction on the table, in view terms.
export const dirToView = (vertical, dx, dy) => (vertical ? { x: dy, y: 0 - dx } : { x: dx, y: dy })

// The balls' colours: the usual set. 9 to 15 are 1 to 7 with a stripe.
const COLORS = {
  1: '#f5c400',
  2: '#1d4ed8',
  3: '#dc2626',
  4: '#6d28d9',
  5: '#f97316',
  6: '#15803d',
  7: '#7f1d1d',
  8: '#0b0b0f',
}
export const ballColor = (id) => (id === 0 ? '#f8f4ea' : COLORS[id > 8 ? id - 8 : id])
// A spark's colour, for the ball the cue ball hit: its own, but the black
// sparks purple.
export const sparkColor = (id) => (id === 8 ? '#b26bff' : ballColor(id))

// ---------- the table, drawn once per size ----------

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

// The table without the balls: drawn onto `ctx`, already scaled to view
// units.
export function drawTable(ctx, vertical) {
  const { w, h } = viewSize(vertical)
  const cloth = vertical ? { x: FRAME, y: FRAME, w: H, h: W } : { x: FRAME, y: FRAME, w: W, h: H }

  // The frame: dark polished wood, with a sheen along it and a thin gold
  // inlay all round.
  const wood = ctx.createLinearGradient(0, 0, w, h)
  wood.addColorStop(0, '#2a1208')
  wood.addColorStop(0.35, '#4a2311')
  wood.addColorStop(0.55, '#5c2c14')
  wood.addColorStop(0.75, '#3a190b')
  wood.addColorStop(1, '#1f0d05')
  ctx.fillStyle = wood
  roundRect(ctx, 0, 0, w, h, 34)
  ctx.fill()

  // A wood grain, faint.
  ctx.save()
  roundRect(ctx, 0, 0, w, h, 34)
  ctx.clip()
  ctx.globalAlpha = 0.07
  ctx.strokeStyle = '#000'
  for (let i = -h; i < w + h; i += 9) {
    ctx.lineWidth = 1 + ((i * 7) % 3)
    ctx.beginPath()
    if (vertical) {
      ctx.moveTo(i % w, 0)
      ctx.bezierCurveTo((i % w) + 6, h / 3, (i % w) - 6, (2 * h) / 3, i % w, h)
    } else {
      ctx.moveTo(0, i % h)
      ctx.bezierCurveTo(w / 3, (i % h) + 6, (2 * w) / 3, (i % h) - 6, w, i % h)
    }
    ctx.stroke()
  }
  ctx.restore()

  // The gold inlay.
  ctx.strokeStyle = '#d4a63c'
  ctx.lineWidth = 2.5
  roundRect(ctx, 10, 10, w - 20, h - 20, 26)
  ctx.stroke()
  ctx.strokeStyle = 'rgba(255, 228, 150, 0.35)'
  ctx.lineWidth = 1
  roundRect(ctx, 14, 14, w - 28, h - 28, 23)
  ctx.stroke()

  // The cushions: the cloth's green, a shade darker, rising from the bed.
  const rail = ctx.createLinearGradient(0, 0, 0, h)
  rail.addColorStop(0, '#0a5a3a')
  rail.addColorStop(1, '#063d27')
  ctx.fillStyle = rail
  ctx.fillRect(cloth.x - CUSHION, cloth.y - CUSHION, cloth.w + 2 * CUSHION, cloth.h + 2 * CUSHION)

  // The cloth: deep emerald, lit by two lamps hanging over it.
  ctx.fillStyle = '#0b6b45'
  ctx.fillRect(cloth.x, cloth.y, cloth.w, cloth.h)
  const lamps = vertical
    ? [[cloth.x + cloth.w / 2, cloth.y + cloth.h * 0.3], [cloth.x + cloth.w / 2, cloth.y + cloth.h * 0.7]]
    : [[cloth.x + cloth.w * 0.3, cloth.y + cloth.h / 2], [cloth.x + cloth.w * 0.7, cloth.y + cloth.h / 2]]
  for (const [lx, ly] of lamps) {
    const light = ctx.createRadialGradient(lx, ly, 10, lx, ly, Math.max(cloth.w, cloth.h) * 0.42)
    light.addColorStop(0, 'rgba(120, 255, 180, 0.32)')
    light.addColorStop(0.45, 'rgba(60, 200, 130, 0.12)')
    light.addColorStop(1, 'rgba(0, 0, 0, 0)')
    ctx.fillStyle = light
    ctx.fillRect(cloth.x, cloth.y, cloth.w, cloth.h)
  }
  // Darker towards the cushions.
  const shade = ctx.createRadialGradient(cloth.x + cloth.w / 2, cloth.y + cloth.h / 2, Math.min(cloth.w, cloth.h) * 0.35, cloth.x + cloth.w / 2, cloth.y + cloth.h / 2, Math.max(cloth.w, cloth.h) * 0.75)
  shade.addColorStop(0, 'rgba(0, 0, 0, 0)')
  shade.addColorStop(1, 'rgba(0, 20, 10, 0.45)')
  ctx.fillStyle = shade
  ctx.fillRect(cloth.x, cloth.y, cloth.w, cloth.h)
  // The cushions' lip throws a shadow onto the cloth.
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)'
  ctx.lineWidth = 6
  ctx.strokeRect(cloth.x + 3, cloth.y + 3, cloth.w - 6, cloth.h - 6)

  // The head string and the spots, faint.
  const head1 = toView(vertical, TABLE.HEAD_X, 0)
  const head2 = toView(vertical, TABLE.HEAD_X, H)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.13)'
  ctx.lineWidth = 1.5
  ctx.setLineDash([6, 8])
  ctx.beginPath()
  ctx.moveTo(head1.x, head1.y)
  ctx.lineTo(head2.x, head2.y)
  ctx.stroke()
  ctx.setLineDash([])
  ctx.fillStyle = 'rgba(255, 255, 255, 0.28)'
  for (const x of [TABLE.HEAD_X, TABLE.FOOT_X]) {
    const spot = toView(vertical, x, H / 2)
    ctx.beginPath()
    ctx.arc(spot.x, spot.y, 3, 0, Math.PI * 2)
    ctx.fill()
  }

  // The sights on the rails: little gold diamonds.
  ctx.fillStyle = '#e8c56a'
  const diamond = (x, y) => {
    ctx.beginPath()
    ctx.moveTo(x, y - 5)
    ctx.lineTo(x + 3.5, y)
    ctx.lineTo(x, y + 5)
    ctx.lineTo(x - 3.5, y)
    ctx.closePath()
    ctx.fill()
  }
  const mid = (FRAME - CUSHION) / 2
  for (let i = 1; i < 8; i++) {
    if (i === 4) continue
    const along = (W * i) / 8
    for (const across of [-FRAME + mid, H + FRAME - mid]) {
      const at = toView(vertical, along, across)
      diamond(at.x, at.y)
    }
  }
  for (let i = 1; i < 4; i++) {
    const across = (H * i) / 4
    for (const along of [-FRAME + mid, W + FRAME - mid]) {
      const at = toView(vertical, along, across)
      diamond(at.x, at.y)
    }
  }

  // The pockets: deep leather, with a gold rim.
  for (const pocket of POCKETS) {
    const at = toView(vertical, pocket.x, pocket.y)
    const radius = pocket.r + 4
    const hole = ctx.createRadialGradient(at.x, at.y, 2, at.x, at.y, radius)
    hole.addColorStop(0, '#000')
    hole.addColorStop(0.7, '#0a0604')
    hole.addColorStop(1, '#22120a')
    ctx.fillStyle = hole
    ctx.beginPath()
    ctx.arc(at.x, at.y, radius, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#c9982f'
    ctx.lineWidth = 3
    ctx.stroke()
    ctx.strokeStyle = 'rgba(255, 230, 160, 0.45)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.arc(at.x, at.y, radius + 3, 0, Math.PI * 2)
    ctx.stroke()
  }
}

// ---------- the balls ----------

// One ball at view (x, y), `scale` 1 normally (smaller while it drops into
// a pocket), `alpha` its opacity.
export function drawBall(ctx, id, x, y, scale = 1, alpha = 1, sprite = null) {
  const r = R * scale
  ctx.save()
  ctx.globalAlpha = alpha

  // Its shadow on the cloth, cast away from the lamps.
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)'
  ctx.beginPath()
  ctx.ellipse(x + r * 0.25, y + r * 0.35, r * 0.95, r * 0.8, 0, 0, Math.PI * 2)
  ctx.fill()

  // The ball as it's rolled (spin.js).
  if (sprite) {
    ctx.drawImage(sprite, x - r, y - r, 2 * r, 2 * r)
    ctx.restore()
    return
  }

  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.clip()

  const stripe = id > 8
  ctx.fillStyle = stripe ? '#f6f1e4' : ballColor(id)
  ctx.fillRect(x - r, y - r, 2 * r, 2 * r)
  if (stripe) {
    ctx.fillStyle = ballColor(id)
    ctx.fillRect(x - r, y - r * 0.55, 2 * r, r * 1.1)
  }
  // The number, on a white disc.
  if (id > 0) {
    ctx.fillStyle = '#fbf8f0'
    ctx.beginPath()
    ctx.arc(x, y, r * 0.48, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#111'
    ctx.font = `bold ${Math.round(r * 0.62)}px system-ui, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(String(id), x, y + r * 0.04)
  }
  // Round: lit from the top left, dark underneath, with a bright glint.
  const shade = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r * 1.05)
  shade.addColorStop(0, 'rgba(255, 255, 255, 0.35)')
  shade.addColorStop(0.4, 'rgba(255, 255, 255, 0)')
  shade.addColorStop(1, 'rgba(0, 0, 0, 0.55)')
  ctx.fillStyle = shade
  ctx.fillRect(x - r, y - r, 2 * r, 2 * r)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)'
  ctx.beginPath()
  ctx.ellipse(x - r * 0.38, y - r * 0.42, r * 0.22, r * 0.15, -0.6, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

// ---------- the aim ----------

// Where the shot goes (PoolTable.jsx traceAim), in view units: a dotted
// line from the cue ball (`from`) to where it first touches something
// (`contact`), a faint cue ball there, and the ball it hits (`target`, id
// `targetId`) ringed in its spark colour, with a short line (a third of a
// ball) the way it'll be knocked. No ball: the line ends at the cushion.
export function drawAimLine(ctx, from, contact, target, targetId, alpha, now) {
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.lineCap = 'round'
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)'
  ctx.lineWidth = 1.6
  ctx.setLineDash([2, 6])
  ctx.lineDashOffset = -now / 40
  ctx.beginPath()
  ctx.moveTo(from.x, from.y)
  ctx.lineTo(contact.x, contact.y)
  ctx.stroke()
  ctx.setLineDash([])

  // The cue ball where it touches.
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)'
  ctx.fillStyle = 'rgba(255, 255, 255, 0.12)'
  ctx.lineWidth = 1.4
  ctx.beginPath()
  ctx.arc(contact.x, contact.y, R, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()

  if (target) {
    const colour = sparkColor(targetId)
    // The ball it hits, ringed and glowing.
    ctx.strokeStyle = colour
    ctx.shadowColor = colour
    ctx.shadowBlur = 10 + Math.sin(now / 160) * 3
    ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.arc(target.x, target.y, R + 4, 0, Math.PI * 2)
    ctx.stroke()
    ctx.shadowBlur = 0
    // The way it'll go, along the line between the two centres: a short
    // line from its ring, a third of a ball long.
    const ux = target.x - contact.x
    const uy = target.y - contact.y
    const d = Math.sqrt(ux * ux + uy * uy) || 1
    const sx = target.x + (ux / d) * (R + 4)
    const sy = target.y + (uy / d) * (R + 4)
    const length = (2 * R) / 3
    ctx.strokeStyle = colour
    ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.moveTo(sx, sy)
    ctx.lineTo(sx + (ux / d) * length, sy + (uy / d) * length)
    ctx.stroke()
  }
  ctx.restore()
}

// ---------- the cue ----------

// A glowing cue's colour at `now`: its own, or going round every colour.
function glowColour(look, now) {
  if (look.glow !== 'rainbow') return look.glow
  return `hsl(${Math.round((now / 12) % 360)}, 100%, 62%)`
}

// How bright a glowing cue is at `now`, about 1: breathing, flickering
// like a flame, or steady (its light runs down it instead).
function glowStrength(look, now) {
  if (look.pulse === 'breathe') return 0.75 + 0.25 * Math.sin(now / 420)
  if (look.pulse === 'flicker') return 0.8 + 0.12 * Math.sin(now / 47) + 0.08 * Math.sin(now / 113)
  return 0.95
}

// The pattern on the butt, between `from` and `to` along it (0 to 1 from
// the joint to the end), as a path the butt is clipped to already.
function drawInlay(ctx, look, joint, butt, nx, ny, width) {
  const at = (k) => ({ x: joint.x + (butt.x - joint.x) * k, y: joint.y + (butt.y - joint.y) * k })
  ctx.fillStyle = look.inlayColor
  ctx.strokeStyle = look.inlayColor
  if (look.inlay === 'stripes') {
    ctx.lineWidth = 2.4
    for (const k of [0.12, 0.2, 0.28, 0.72, 0.8, 0.88]) {
      const p = at(k)
      const w = width(k) + 1
      ctx.beginPath()
      ctx.moveTo(p.x + nx * w, p.y + ny * w)
      ctx.lineTo(p.x - nx * w, p.y - ny * w)
      ctx.stroke()
    }
  } else if (look.inlay === 'diamonds') {
    for (const k of [0.16, 0.34, 0.52, 0.7, 0.86]) {
      const p = at(k)
      const ux = (butt.x - joint.x) / 300
      const uy = (butt.y - joint.y) / 300
      ctx.beginPath()
      ctx.moveTo(p.x + ux * 14, p.y + uy * 14)
      ctx.lineTo(p.x + nx * 2.6, p.y + ny * 2.6)
      ctx.lineTo(p.x - ux * 14, p.y - uy * 14)
      ctx.lineTo(p.x - nx * 2.6, p.y - ny * 2.6)
      ctx.closePath()
      ctx.fill()
    }
  } else if (look.inlay === 'flames') {
    // Points of flame licking from the end towards the joint, both sides.
    for (const side of [1, -1]) {
      ctx.beginPath()
      const base = at(1)
      ctx.moveTo(base.x + nx * width(1) * side, base.y + ny * width(1) * side)
      for (let i = 0; i < 5; i++) {
        const tipK = 0.32 + i * 0.1
        const valleyK = 0.5 + i * 0.1
        const tip = at(tipK)
        const valley = at(Math.min(1, valleyK))
        ctx.lineTo(tip.x + nx * width(tipK) * side * 0.1, tip.y + ny * width(tipK) * side * 0.1)
        ctx.lineTo(valley.x + nx * width(valleyK) * side * 0.85, valley.y + ny * width(valleyK) * side * 0.85)
      }
      ctx.lineTo(base.x + nx * width(1) * side, base.y + ny * width(1) * side)
      ctx.closePath()
      ctx.globalAlpha *= 0.85
      ctx.fill()
      ctx.globalAlpha /= 0.85
    }
  }
}

// A blade of light from its tip (ax, ay) back to (bx, by), `width` across:
// a wide glow in `colour`, then the colour, then a thick white-hot core.
// Rounded at the tip, or `sharp`: coming to a point. `hum` (about 1)
// makes it flicker.
function drawBlade(ctx, ax, ay, bx, by, colour, width, hum, sharp = false) {
  const length = Math.hypot(ax - bx, ay - by) || 1
  const ux = (ax - bx) / length
  const uy = (ay - by) / length
  const nx = -uy
  const ny = ux
  // One layer, `w` across: a line with round ends, or a point at the tip.
  const layer = (w, fill) => {
    if (!sharp) {
      ctx.strokeStyle = fill
      ctx.lineCap = 'round'
      ctx.lineWidth = w
      ctx.beginPath()
      ctx.moveTo(ax, ay)
      ctx.lineTo(bx, by)
      ctx.stroke()
      return
    }
    const point = w * 1.6
    ctx.fillStyle = fill
    ctx.beginPath()
    ctx.moveTo(ax + ux * point * 0.35, ay + uy * point * 0.35)
    ctx.lineTo(ax - ux * point + nx * (w / 2), ay - uy * point + ny * (w / 2))
    ctx.lineTo(bx + nx * (w / 2), by + ny * (w / 2))
    ctx.lineTo(bx - nx * (w / 2), by - ny * (w / 2))
    ctx.lineTo(ax - ux * point - nx * (w / 2), ay - uy * point - ny * (w / 2))
    ctx.closePath()
    ctx.fill()
  }

  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  ctx.shadowColor = colour
  ctx.shadowBlur = 26 * hum
  ctx.globalAlpha *= 0.45 * hum
  layer(width * 3.2, colour)
  ctx.restore()

  ctx.save()
  ctx.shadowColor = colour
  ctx.shadowBlur = 14 * hum
  layer(width * 2, colour)
  ctx.shadowBlur = 4
  ctx.shadowColor = '#ffffff'
  layer(width * 1.25, '#ffffff')
  ctx.restore()
}

// A Saber (shared/pool/cues.js), nothing like a cue: a long, even blade
// of light ending in a round tip just behind the cue ball, lighting the
// cloth round it, then a short, chunky metal hilt: an emitter shroud, a
// ribbed grip, a glowing switch and a pommel. A Crossguard Saber has two
// short blades out of the sides of the emitter, crackling and never quite
// steady, and all three of its blades come to sharp points. (cx, cy) is the cue ball; (dx, dy) the way the shot goes.
const BLADE = 250
const HILT = 92
function drawSaber(ctx, cue, cx, cy, dx, dy, pull, alpha, now) {
  const colour = cue.saber
  const hum = 0.88 + 0.08 * Math.sin(now / 33) + 0.04 * Math.sin(now / 71)
  const nx = -dy
  const ny = dx
  const gap = R + 6 + pull * 70
  const tipX = cx - dx * gap
  const tipY = cy - dy * gap
  const emitX = tipX - dx * BLADE
  const emitY = tipY - dy * BLADE
  const endX = emitX - dx * HILT
  const endY = emitY - dy * HILT

  ctx.save()
  ctx.globalAlpha = alpha

  // Its light on the cloth, all along the blade.
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  ctx.globalAlpha = alpha * 0.22 * hum
  ctx.strokeStyle = colour
  ctx.lineCap = 'round'
  ctx.shadowColor = colour
  ctx.shadowBlur = 40
  ctx.lineWidth = 30
  ctx.beginPath()
  ctx.moveTo(tipX, tipY)
  ctx.lineTo(emitX, emitY)
  ctx.stroke()
  ctx.restore()

  // The hilt's shadow (the blade casts none: it's light).
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)'
  ctx.lineWidth = 12
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(emitX + 5, emitY + 7)
  ctx.lineTo(endX + 5, endY + 7)
  ctx.stroke()

  // The blade.
  drawBlade(ctx, tipX, tipY, emitX - dx * 4, emitY - dy * 4, colour, 5, hum, cue.crossguard)

  // The crossguard's side blades, out of vents at the emitter.
  if (cue.crossguard) {
    const vx = emitX - dx * 12
    const vy = emitY - dy * 12
    for (const side of [1, -1]) {
      const crackle = 0.82 + 0.14 * Math.sin(now / 19 + side * 2) + (Math.random() - 0.5) * 0.14
      const length = 26 * crackle
      drawBlade(ctx, vx + nx * side * (8 + length), vy + ny * side * (8 + length), vx + nx * side * 8, vy + ny * side * 8, colour, 3, hum, true)
    }
    // The unstable blade spitting sparks along its edges.
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    ctx.fillStyle = '#ffd2c2'
    for (let i = 0; i < 4; i++) {
      if (Math.random() < 0.5) continue
      const k = Math.random()
      const side = Math.random() < 0.5 ? 1 : -1
      const off = 5 + Math.random() * 6
      ctx.globalAlpha = alpha * 0.85
      ctx.fillRect(tipX - dx * BLADE * k + nx * side * off - 0.9, tipY - dy * BLADE * k + ny * side * off - 0.9, 1.8, 1.8)
    }
    ctx.restore()
  }

  // The hilt: a metal tube, lit from one side.
  const half = 5.6
  const along = (k) => ({ x: emitX + (endX - emitX) * k, y: emitY + (endY - emitY) * k })
  const band = (from, to, width, fill) => {
    const p = along(from)
    const q = along(to)
    ctx.fillStyle = fill
    ctx.beginPath()
    ctx.moveTo(p.x + nx * width, p.y + ny * width)
    ctx.lineTo(q.x + nx * width, q.y + ny * width)
    ctx.lineTo(q.x - nx * width, q.y - ny * width)
    ctx.lineTo(p.x - nx * width, p.y - ny * width)
    ctx.closePath()
    ctx.fill()
  }
  const metal = ctx.createLinearGradient(emitX + nx * half, emitY + ny * half, emitX - nx * half, emitY - ny * half)
  metal.addColorStop(0, '#f6f8fb')
  metal.addColorStop(0.3, '#b9c0ca')
  metal.addColorStop(0.7, '#5d636d')
  metal.addColorStop(1, '#2b2f36')
  const dark = ctx.createLinearGradient(emitX + nx * half, emitY + ny * half, emitX - nx * half, emitY - ny * half)
  dark.addColorStop(0, '#5a5f68')
  dark.addColorStop(0.4, cue.butt[0])
  dark.addColorStop(1, '#050506')

  band(0, 1, half, metal)
  // The emitter shroud, wider, with its dark mouth.
  band(0, 0.2, half + 1.6, metal)
  band(0, 0.03, half + 0.6, '#16181c')
  // The grip: black, ribbed.
  band(0.36, 0.86, half + 0.3, dark)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)'
  ctx.lineWidth = 1
  for (let i = 0; i < 8; i++) {
    const p = along(0.4 + i * 0.058)
    ctx.beginPath()
    ctx.moveTo(p.x + nx * (half + 0.3), p.y + ny * (half + 0.3))
    ctx.lineTo(p.x - nx * (half + 0.3), p.y - ny * (half + 0.3))
    ctx.stroke()
  }
  // The pommel.
  band(0.9, 1, half + 1.2, metal)
  // The switch, glowing the blade's colour.
  const button = along(0.27)
  ctx.save()
  ctx.fillStyle = colour
  ctx.shadowColor = colour
  ctx.shadowBlur = 8
  ctx.beginPath()
  ctx.arc(button.x + nx * half * 0.45, button.y + ny * half * 0.45, 1.8, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  ctx.restore()
}

// The cue, behind the cue ball at view (cx, cy), pointing along view
// direction (dx, dy), pulled back by `pull` (0 to 1). `alpha` for the other
// player's, shown fainter. `look` is the cue's (shared/pool/cues.js
// cueLook); a Glowing one glows, moving with `now`.
export function drawCue(ctx, cx, cy, dx, dy, pull, alpha = 1, look = null, now = 0) {
  const cue = look ?? CLASSIC_CUE
  // A Saber: a blade of light and a hilt, not a cue at all.
  if (cue.saber) {
    drawSaber(ctx, cue, cx, cy, dx, dy, pull, alpha, now)
    return
  }
  const gap = R + 6 + pull * 70
  const length = 380
  const tipX = cx - dx * gap
  const tipY = cy - dy * gap
  const buttX = tipX - dx * length
  const buttY = tipY - dy * length
  const nx = -dy
  const ny = dx
  // Half its thickness, `k` of the way from the tip (0) to the butt (1).
  const halfAt = (k) => 2.2 + (5.5 - 2.2) * k
  const JOINT = 0.6
  const jointX = tipX - dx * length * JOINT
  const jointY = tipY - dy * length * JOINT

  const outline = (from, to) => {
    const ax = tipX - dx * length * from
    const ay = tipY - dy * length * from
    const bx = tipX - dx * length * to
    const by = tipY - dy * length * to
    ctx.beginPath()
    ctx.moveTo(ax + nx * halfAt(from), ay + ny * halfAt(from))
    ctx.lineTo(bx + nx * halfAt(to), by + ny * halfAt(to))
    ctx.lineTo(bx - nx * halfAt(to), by - ny * halfAt(to))
    ctx.lineTo(ax - nx * halfAt(from), ay - ny * halfAt(from))
    ctx.closePath()
  }

  ctx.save()
  ctx.globalAlpha = alpha
  // Its shadow.
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)'
  ctx.lineWidth = 9
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(tipX + 5, tipY + 7)
  ctx.lineTo(buttX + 5, buttY + 7)
  ctx.stroke()

  // A Glowing cue's light, round the whole of it.
  const glow = cue.glow ? glowColour(cue, now) : null
  const strength = glow ? glowStrength(cue, now) : 0
  if (glow) {
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    ctx.shadowColor = glow
    ctx.shadowBlur = 22 * strength
    ctx.strokeStyle = glow
    ctx.globalAlpha = alpha * 0.55 * strength
    ctx.lineWidth = 7
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(tipX, tipY)
    ctx.lineTo(buttX, buttY)
    ctx.stroke()
    ctx.restore()
  }

  // The shaft, light wood, from the tip to the joint.
  const shaft = ctx.createLinearGradient(tipX, tipY, jointX, jointY)
  shaft.addColorStop(0, cue.shaft[0])
  shaft.addColorStop(1, cue.shaft[1])
  ctx.fillStyle = shaft
  outline(0, JOINT)
  ctx.fill()

  // The butt, from the joint to the end, with its pattern.
  const butt = ctx.createLinearGradient(jointX, jointY, buttX, buttY)
  butt.addColorStop(0, cue.butt[0])
  butt.addColorStop(1, cue.butt[1])
  ctx.fillStyle = butt
  outline(JOINT, 1)
  ctx.fill()
  if (cue.inlay) {
    ctx.save()
    outline(JOINT, 1)
    ctx.clip()
    drawInlay(ctx, cue, { x: jointX, y: jointY }, { x: buttX, y: buttY }, nx, ny, (k) => halfAt(JOINT + (1 - JOINT) * k))
    ctx.restore()
  }
  // Light along its length, so it's round.
  const sheen = ctx.createLinearGradient(tipX + nx * 5, tipY + ny * 5, tipX - nx * 5, tipY - ny * 5)
  sheen.addColorStop(0, 'rgba(255, 255, 255, 0.28)')
  sheen.addColorStop(0.5, 'rgba(255, 255, 255, 0)')
  sheen.addColorStop(1, 'rgba(0, 0, 0, 0.25)')
  ctx.fillStyle = sheen
  outline(0, 1)
  ctx.fill()

  // The joint ring, and the butt cap.
  ctx.strokeStyle = cue.joint
  ctx.lineCap = 'butt'
  ctx.lineWidth = 3.5
  ctx.beginPath()
  ctx.moveTo(jointX + nx * (halfAt(JOINT) + 0.4), jointY + ny * (halfAt(JOINT) + 0.4))
  ctx.lineTo(jointX - nx * (halfAt(JOINT) + 0.4), jointY - ny * (halfAt(JOINT) + 0.4))
  ctx.stroke()
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.moveTo(buttX + dx * 2 + nx * 5.5, buttY + dy * 2 + ny * 5.5)
  ctx.lineTo(buttX + dx * 2 - nx * 5.5, buttY + dy * 2 - ny * 5.5)
  ctx.stroke()

  // A Glowing cue: light running down it ('flow'), and a bright core.
  if (glow) {
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    ctx.lineCap = 'round'
    if (cue.pulse === 'flow') {
      const k = (now / 900) % 1
      const runner = ctx.createLinearGradient(tipX, tipY, buttX, buttY)
      const a = Math.max(0, k - 0.12)
      const b = Math.min(1, k + 0.12)
      runner.addColorStop(0, 'rgba(255,255,255,0)')
      runner.addColorStop(a, 'rgba(255,255,255,0)')
      runner.addColorStop(k, glow)
      runner.addColorStop(b, 'rgba(255,255,255,0)')
      runner.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.strokeStyle = runner
      ctx.lineWidth = 3
      ctx.globalAlpha = alpha * 0.9
      ctx.beginPath()
      ctx.moveTo(tipX, tipY)
      ctx.lineTo(buttX, buttY)
      ctx.stroke()
    }
    ctx.strokeStyle = glow
    ctx.globalAlpha = alpha * 0.35 * strength
    ctx.lineWidth = 1.2
    ctx.beginPath()
    ctx.moveTo(jointX, jointY)
    ctx.lineTo(buttX, buttY)
    ctx.stroke()
    ctx.restore()
  }

  // The ferrule and the blue chalked tip.
  ctx.strokeStyle = '#fbf7ee'
  ctx.lineWidth = 4.4
  ctx.lineCap = 'butt'
  ctx.beginPath()
  ctx.moveTo(tipX, tipY)
  ctx.lineTo(tipX - dx * 10, tipY - dy * 10)
  ctx.stroke()
  ctx.strokeStyle = '#3b82f6'
  ctx.beginPath()
  ctx.moveTo(tipX + dx * 1.5, tipY + dy * 1.5)
  ctx.lineTo(tipX - dx * 1.5, tipY - dy * 1.5)
  ctx.stroke()
  ctx.restore()
}

// ---------- sparks ----------

// How big each Ignition's particles are, in view units, before they're
// doubled (Ignitions throw theirs twice the size, to be easy to see).
const SHAPE_SIZE = { ember: 1.6, bubble: 2.2, flake: 2.6, petal: 2.2, pixel: 1.8, star: 2.6, heart: 2.4, confetti: 2.2, bolt: 5, coin: 2.2, nebula: 1.8 }
const IGNITION_SCALE = 2

const pickFrom = (list) => list[Math.floor(Math.random() * list.length)]

// A burst at view (x, y) when balls collide, as hard as `strength` (0 to
// 1). Classic Sparks (`ignition` null, or shape 'spark'): little streaks
// in `color`, flying out and fading. Any other Ignition
// (shared/pool/ignitions.js look): its own particles, in its colours or
// `color`, twice the size. Pushed onto `sparks`.
export function addSparks(sparks, x, y, color, strength, now, ignition = null) {
  if (!ignition || ignition.shape === 'spark') {
    const count = Math.round(6 + strength * 14)
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = (80 + Math.random() * 260) * (0.5 + strength)
      sparks.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, born: now, life: 220 + Math.random() * 260, color })
    }
    // And a flash where they touched.
    sparks.push({ x, y, vx: 0, vy: 0, born: now, life: 160, color, flash: 10 + strength * 14 })
    return
  }

  const colours = ignition.colors ?? [color]
  const count = Math.round(5 + strength * 9)
  const size = SHAPE_SIZE[ignition.shape] * IGNITION_SCALE
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2
    const speed = (60 + Math.random() * 200) * (0.5 + strength)
    sparks.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      born: now,
      life: 420 + Math.random() * 380,
      color: pickFrom(colours),
      shape: ignition.shape,
      size: size * (0.75 + Math.random() * 0.5),
      rot: Math.random() * Math.PI * 2,
      spin: ignition.spin * (Math.random() < 0.5 ? -1 : 1) * Math.PI * 2,
      fall: ignition.fall,
      glow: ignition.glow,
      seed: Math.random(),
    })
  }
  sparks.push({ x, y, vx: 0, vy: 0, born: now, life: 180, color: colours[0], flash: 12 + strength * 16 })
}

function starPath(ctx, size, points = 5) {
  ctx.beginPath()
  for (let i = 0; i < points * 2; i++) {
    const radius = i % 2 ? size * 0.45 : size
    const angle = (i * Math.PI) / points - Math.PI / 2
    ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius)
  }
  ctx.closePath()
}

// One Ignition particle, at the origin, already turned.
function drawShape(ctx, p, age) {
  const s = p.size
  ctx.fillStyle = p.color
  ctx.strokeStyle = p.color
  switch (p.shape) {
    case 'ember': {
      const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 1.8)
      glow.addColorStop(0, '#fff4c2')
      glow.addColorStop(0.35, p.color)
      glow.addColorStop(1, 'rgba(0, 0, 0, 0)')
      ctx.fillStyle = glow
      ctx.beginPath()
      ctx.arc(0, 0, s * 1.8, 0, Math.PI * 2)
      ctx.fill()
      break
    }
    case 'bubble':
      ctx.lineWidth = Math.max(0.8, s * 0.22)
      ctx.beginPath()
      ctx.arc(0, 0, s, 0, Math.PI * 2)
      ctx.stroke()
      ctx.fillStyle = 'rgba(255, 255, 255, 0.75)'
      ctx.beginPath()
      ctx.arc(-s * 0.35, -s * 0.35, s * 0.22, 0, Math.PI * 2)
      ctx.fill()
      break
    case 'flake':
      ctx.lineWidth = Math.max(0.8, s * 0.2)
      ctx.lineCap = 'round'
      for (let i = 0; i < 3; i++) {
        const angle = (i * Math.PI) / 3
        ctx.beginPath()
        ctx.moveTo(Math.cos(angle) * s, Math.sin(angle) * s)
        ctx.lineTo(-Math.cos(angle) * s, -Math.sin(angle) * s)
        ctx.stroke()
      }
      break
    case 'petal':
      ctx.scale(1, 0.5 + 0.5 * Math.abs(Math.sin(p.rot * 1.3)))
      ctx.beginPath()
      ctx.ellipse(0, 0, s, s * 0.55, 0, 0, Math.PI * 2)
      ctx.fill()
      break
    case 'pixel':
      ctx.fillRect(-s * 0.6, -s * 0.6, s * 1.2, s * 1.2)
      break
    case 'star':
      starPath(ctx, s)
      ctx.fill()
      break
    case 'heart':
      ctx.beginPath()
      ctx.moveTo(0, s * 0.35)
      ctx.bezierCurveTo(-s * 1.1, -s * 0.35, -s * 0.45, -s * 1.05, 0, -s * 0.45)
      ctx.bezierCurveTo(s * 0.45, -s * 1.05, s * 1.1, -s * 0.35, 0, s * 0.35)
      ctx.fill()
      break
    case 'confetti':
      ctx.scale(1, Math.cos(p.rot * 2))
      ctx.fillRect(-s * 0.7, -s * 0.35, s * 1.4, s * 0.7)
      break
    case 'bolt': {
      // A jagged flash along the way it's flying, flickering.
      ctx.lineWidth = Math.max(1, s * 0.22)
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      const flick = Math.floor(age / 40)
      const jag = (i) => (Math.sin((p.seed * 10 + i) * 12.9898 + flick) * 43758.5453) % 1
      ctx.beginPath()
      ctx.moveTo(-s, 0)
      for (let i = 1; i < 4; i++) ctx.lineTo(-s + (i * 2 * s) / 4, jag(i) * s * 0.6)
      ctx.lineTo(s, 0)
      ctx.stroke()
      break
    }
    case 'coin': {
      const face = Math.cos(p.rot * 2)
      ctx.scale(Math.max(0.15, Math.abs(face)), 1)
      ctx.beginPath()
      ctx.arc(0, 0, s, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = '#8a5f12'
      ctx.lineWidth = Math.max(0.6, s * 0.18)
      ctx.stroke()
      ctx.fillStyle = 'rgba(255, 250, 220, 0.8)'
      ctx.beginPath()
      ctx.arc(-s * 0.3, -s * 0.3, s * 0.25, 0, Math.PI * 2)
      ctx.fill()
      break
    }
    case 'nebula': {
      const halo = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 3)
      halo.addColorStop(0, '#ffffff')
      halo.addColorStop(0.25, p.color)
      halo.addColorStop(1, 'rgba(0, 0, 0, 0)')
      ctx.fillStyle = halo
      ctx.beginPath()
      ctx.arc(0, 0, s * 3, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#ffffff'
      starPath(ctx, s * 1.1, 4)
      ctx.fill()
      break
    }
    default:
      ctx.beginPath()
      ctx.arc(0, 0, s, 0, Math.PI * 2)
      ctx.fill()
  }
}

// Moves and draws the sparks still alive at `now`; returns those left.
export function drawSparks(ctx, sparks, now, dt) {
  const alive = []
  ctx.save()
  for (const spark of sparks) {
    const age = now - spark.born
    if (age >= spark.life) continue
    const fade = 1 - age / spark.life
    if (spark.flash) {
      ctx.globalCompositeOperation = 'lighter'
      const glow = ctx.createRadialGradient(spark.x, spark.y, 0, spark.x, spark.y, spark.flash)
      glow.addColorStop(0, spark.color)
      glow.addColorStop(1, 'rgba(0, 0, 0, 0)')
      ctx.globalAlpha = fade
      ctx.fillStyle = glow
      ctx.beginPath()
      ctx.arc(spark.x, spark.y, spark.flash, 0, Math.PI * 2)
      ctx.fill()
    } else if (spark.shape) {
      // An Ignition's particle: it slows, drifts, turns and fades.
      spark.vx *= 0.92
      spark.vy *= 0.92
      spark.vy += spark.fall * dt
      spark.x += spark.vx * dt
      spark.y += spark.vy * dt
      spark.rot += spark.spin * dt
      ctx.globalCompositeOperation = spark.glow ? 'lighter' : 'source-over'
      ctx.globalAlpha = Math.min(1, fade * 1.6)
      ctx.save()
      ctx.translate(spark.x, spark.y)
      ctx.rotate(spark.shape === 'bolt' ? Math.atan2(spark.vy, spark.vx) : spark.rot)
      drawShape(ctx, spark, age)
      ctx.restore()
    } else {
      ctx.globalCompositeOperation = 'lighter'
      spark.vx *= 0.9
      spark.vy *= 0.9
      spark.x += spark.vx * dt
      spark.y += spark.vy * dt
      ctx.globalAlpha = fade
      ctx.strokeStyle = spark.color
      ctx.lineWidth = 2
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(spark.x, spark.y)
      ctx.lineTo(spark.x - spark.vx * 0.03, spark.y - spark.vy * 0.03)
      ctx.stroke()
      ctx.fillStyle = '#fff'
      ctx.globalAlpha = fade * 0.9
      ctx.fillRect(spark.x - 0.8, spark.y - 0.8, 1.6, 1.6)
    }
    alive.push(spark)
  }
  ctx.restore()
  return alive
}

