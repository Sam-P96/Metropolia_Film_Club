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

// The cue, behind the cue ball at view (cx, cy), pointing along view
// direction (dx, dy), pulled back by `pull` (0 to 1). `alpha` for the other
// player's, shown fainter. `look` is the cue's (shared/pool/cues.js
// cueLook); a Glowing one glows, moving with `now`.
export function drawCue(ctx, cx, cy, dx, dy, pull, alpha = 1, look = null, now = 0) {
  const cue = look ?? CLASSIC_CUE
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

// A burst of sparks at view (x, y) in `color`, as hard as `strength` (0 to
// 1): little streaks flying out and fading. Pushed onto `sparks`.
export function addSparks(sparks, x, y, color, strength, now) {
  const count = Math.round(6 + strength * 14)
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2
    const speed = (80 + Math.random() * 260) * (0.5 + strength)
    sparks.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, born: now, life: 220 + Math.random() * 260, color })
  }
  // And a flash where they touched.
  sparks.push({ x, y, vx: 0, vy: 0, born: now, life: 160, color, flash: 10 + strength * 14 })
}

// Moves and draws the sparks still alive at `now`; returns those left.
export function drawSparks(ctx, sparks, now, dt) {
  const alive = []
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  for (const spark of sparks) {
    const age = now - spark.born
    if (age >= spark.life) continue
    const fade = 1 - age / spark.life
    if (spark.flash) {
      const glow = ctx.createRadialGradient(spark.x, spark.y, 0, spark.x, spark.y, spark.flash)
      glow.addColorStop(0, spark.color)
      glow.addColorStop(1, 'rgba(0, 0, 0, 0)')
      ctx.globalAlpha = fade
      ctx.fillStyle = glow
      ctx.beginPath()
      ctx.arc(spark.x, spark.y, spark.flash, 0, Math.PI * 2)
      ctx.fill()
    } else {
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

