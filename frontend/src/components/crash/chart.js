// Crash's chart (CrashStage.jsx): the multiplier over the round so far, on
// a log scale (it moves by shares of itself, so each step looks the same
// size wherever it is), drawn on a canvas in CSS pixels. A dashed line at
// 1x; the area between the line and 1x coloured above it and red below;
// the line itself red below 1x, and above it a colour that follows the
// multiplier at its tip (lineLook): green, fading to purple from 3x to 6x,
// purple until 15x, then pink by 17x; and from 10x, flickering like
// lightning.
// On a crash the line snaps: it drops away in pieces.

export const PAD = { l: 42, r: 20, t: 20, b: 18 }
const GRID = [0.25, 0.5, 0.75, 1, 1.5, 2, 3, 5, 10, 15, 20, 25]
const RED = '#FF4D5E'
// The line's colours above 1x, as [hue, saturation %, lightness %]: they
// blend by hue, so a fade stays bright all the way (blending red, green and
// blue amounts would pass through grey).
const GREEN = [153, 100, 62]
const PURPLE = [272, 100, 71]
const PINK = [326, 100, 68]
// A lightning flash's white-hot pink.
const FLASH = [326, 100, 93]

const clamp01 = (x) => Math.min(1, Math.max(0, x))
const smooth = (a, b, x) => {
  const t = clamp01((x - a) / (b - a))
  return t * t * (3 - 2 * t)
}
const mix = (a, b, t) => a.map((value, i) => value + (b[i] - value) * t)
const hsl = ([h, s, l], alpha = 1) => `hsla(${h.toFixed(1)}, ${s.toFixed(1)}%, ${l.toFixed(1)}%, ${alpha})`

// How the line looks above 1x, when its tip is at `m`, at time `now` (ms):
// { colour, glow, flash }: its colour, how hard it glows (0 to 1), and how
// bright a lightning flash is right now (0 to 1). Green, fading to purple
// from 3x to 6x, purple until 15x, then pink by 17x. From 10x it's
// lightning: a fast, uneven flicker in its glow, and flashes about three
// times a second. With `reduced` motion, a steady glow instead.
function lineLook(m, now, reduced) {
  let colour = mix(GREEN, PURPLE, smooth(3, 6, m))
  colour = mix(colour, PINK, smooth(15, 17, m))
  const storm = smooth(10, 12, m)
  if (storm === 0 || reduced) return { colour, glow: storm ? 0.8 : 0, flash: 0 }
  const s = now / 1000
  // Three fast waves multiplied: an irregular flicker, never a steady beat.
  const shimmer = 0.5 + 0.5 * Math.sin(s * 37.1) * Math.sin(s * 23.3 + 1.7) * Math.sin(s * 11.9 + 0.4)
  // Two quicker waves peaking together: uneven flashes, about three a
  // second (a clear one, over half strength, a little over twice).
  const flash = storm * Math.pow(Math.max(0, Math.sin(s * 15.1) * Math.sin(s * 21.7 + 2)), 2)
  return { colour: mix(colour, FLASH, flash * 0.8), glow: storm * (0.35 + 0.65 * shimmer), flash }
}

// Where a point goes: `x` in ticks, `m` the multiplier. `scale`: { lo, hi,
// xMax }, the multipliers at the bottom and top and the ticks across.
export function makeScale({ lo, hi, xMax }, w, h) {
  const low = Math.log(lo)
  const span = Math.log(hi) - low
  return {
    x: (t) => PAD.l + (t / xMax) * (w - PAD.l - PAD.r),
    y: (m) => PAD.t + (1 - (Math.log(Math.max(m, lo)) - low) / span) * (h - PAD.t - PAD.b),
  }
}

// The fragments a snapped line breaks into: always the same few, so it
// looks the same on every screen.
const PIECES = Array.from({ length: 7 }, (_, i) => ({
  vx: Math.cos(-Math.PI / 2 + (i - 3) * 0.45) * (60 + i * 9),
  vy: Math.sin(-Math.PI / 2 + (i - 3) * 0.45) * (90 + (i % 3) * 30),
  spin: (i % 2 ? 1 : -1) * (4 + i),
  length: 5 + (i % 3) * 3,
}))

// Draws the chart. `points`: [{ x, m }] from the start to the tip.
// `crashed`/`crashAge` (ms): the snap. `glow`: how much the line glows,
// 0 to 1. `now` (ms) runs the lightning; `reduced`: reduced motion.
export function drawChart(ctx, w, h, { points, scale, crashed = false, crashAge = 0, glow = 0.5, now = 0, reduced = false }) {
  const to = makeScale(scale, w, h)
  const base = to.y(1)

  // Grid lines and their multipliers.
  ctx.save()
  ctx.font = '600 11px system-ui, sans-serif'
  ctx.textAlign = 'right'
  ctx.textBaseline = 'middle'
  for (const g of GRID) {
    if (g <= scale.lo * 1.02 || g >= scale.hi * 0.98) continue
    const y = to.y(g)
    ctx.strokeStyle = g === 1 ? 'rgba(255, 255, 255, 0.55)' : 'rgba(255, 255, 255, 0.08)'
    ctx.lineWidth = 1
    ctx.setLineDash(g === 1 ? [6, 6] : [])
    ctx.beginPath()
    ctx.moveTo(PAD.l, y)
    ctx.lineTo(w - PAD.r, y)
    ctx.stroke()
    ctx.fillStyle = g === 1 ? 'rgba(255, 255, 255, 0.85)' : 'rgba(255, 255, 255, 0.4)'
    ctx.fillText(`${g}x`, PAD.l - 6, y)
  }
  ctx.setLineDash([])
  ctx.restore()

  if (points.length === 0) return to

  const pts = points.map((p) => ({ x: to.x(p.x), y: to.y(p.m) }))
  const last = pts[pts.length - 1]
  const look = lineLook(points[points.length - 1].m, now, reduced)
  const above = hsl(look.colour)

  // The area between the line and 1x: the line's colour above, red below.
  const area = new Path2D()
  area.moveTo(pts[0].x, base)
  for (const p of pts) area.lineTo(p.x, p.y)
  area.lineTo(last.x, base)
  area.closePath()
  ctx.save()
  ctx.beginPath()
  ctx.rect(0, 0, w, base)
  ctx.clip()
  const up = ctx.createLinearGradient(0, PAD.t, 0, base)
  up.addColorStop(0, hsl(look.colour, 0.38 + 0.15 * look.flash))
  up.addColorStop(1, hsl(look.colour, 0.06))
  ctx.fillStyle = up
  ctx.fill(area)
  ctx.restore()
  ctx.save()
  ctx.beginPath()
  ctx.rect(0, base, w, h - base)
  ctx.clip()
  const down = ctx.createLinearGradient(0, base, 0, h)
  down.addColorStop(0, 'rgba(255, 77, 94, 0.08)')
  down.addColorStop(1, 'rgba(255, 77, 94, 0.42)')
  ctx.fillStyle = down
  ctx.fill(area)
  ctx.restore()

  // The line: its colour above 1x, red below, glowing (from 10x, as
  // hard as the lightning says).
  const split = Math.min(1, Math.max(0, base / h))
  const colour = ctx.createLinearGradient(0, 0, 0, h)
  colour.addColorStop(0, above)
  colour.addColorStop(Math.max(0, split - 0.001), above)
  colour.addColorStop(Math.min(1, split + 0.001), RED)
  colour.addColorStop(1, RED)
  ctx.save()
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  ctx.strokeStyle = colour
  ctx.lineWidth = 3 + look.flash * 1.5
  ctx.shadowColor = last.y <= base ? above : RED
  ctx.shadowBlur = 6 + glow * 14 + look.glow * 22
  ctx.beginPath()
  pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)))
  ctx.stroke()
  ctx.restore()

  // A lightning flash: a thin white-hot arc crackling along the line,
  // jumping about a little every frame.
  if (look.flash > 0.15 && !crashed) {
    ctx.save()
    ctx.strokeStyle = hsl(FLASH, look.flash)
    ctx.lineWidth = 1.2
    ctx.lineJoin = 'miter'
    ctx.shadowColor = above
    ctx.shadowBlur = 12
    ctx.beginPath()
    pts.forEach((p, i) => {
      if (p.y > base) return
      const jag = (Math.random() - 0.5) * 7 * look.flash
      if (i) ctx.lineTo(p.x, p.y + jag)
      else ctx.moveTo(p.x, p.y + jag)
    })
    ctx.stroke()
    ctx.restore()
  }

  if (!crashed) {
    // The tip.
    ctx.save()
    ctx.fillStyle = '#fff'
    ctx.shadowColor = last.y <= base ? above : RED
    ctx.shadowBlur = 14 + look.glow * 16
    ctx.beginPath()
    ctx.arc(last.x, last.y, 4.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
    return to
  }

  // The snap: a jagged drop to the floor, and pieces flying off.
  const t = crashAge / 1000
  const fade = Math.max(0, 1 - crashAge / 1600)
  const drop = Math.min(1, crashAge / 200)
  ctx.save()
  ctx.strokeStyle = `rgba(255, 77, 94, ${fade})`
  ctx.lineWidth = 3
  ctx.lineJoin = 'miter'
  ctx.beginPath()
  ctx.moveTo(last.x, last.y)
  const floor = h - PAD.b
  for (let i = 1; i <= 6; i++) {
    const k = (i / 6) * drop
    ctx.lineTo(last.x + (i % 2 ? 7 : -5), last.y + (floor - last.y) * k)
  }
  ctx.stroke()
  ctx.lineWidth = 2.5
  ctx.lineCap = 'round'
  for (const piece of PIECES) {
    const px = last.x + piece.vx * t
    const py = last.y + piece.vy * t + 0.5 * 600 * t * t
    const angle = piece.spin * t
    ctx.strokeStyle = `rgba(255, ${120 + piece.length * 10}, 120, ${fade})`
    ctx.beginPath()
    ctx.moveTo(px - Math.cos(angle) * piece.length, py - Math.sin(angle) * piece.length)
    ctx.lineTo(px + Math.cos(angle) * piece.length, py + Math.sin(angle) * piece.length)
    ctx.stroke()
  }
  ctx.restore()
  return to
}
