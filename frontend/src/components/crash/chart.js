// Crash's chart (CrashStage.jsx): the multiplier over the round so far, on
// a log scale (it moves by shares of itself, so each step looks the same
// size wherever it is), drawn on a canvas in CSS pixels. A dashed line at
// 1x; the area between the line and 1x green above it and red below; the
// line itself green above 1x and red below, glowing. On a crash the line
// snaps: it drops away in pieces.

export const PAD = { l: 42, r: 20, t: 20, b: 18 }
const GRID = [0.25, 0.5, 0.75, 1, 1.5, 2, 3, 5, 10, 15, 20, 25]
const GREEN = '#3DFFA8'
const RED = '#FF4D5E'

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
// 0 to 1.
export function drawChart(ctx, w, h, { points, scale, crashed = false, crashAge = 0, glow = 0.5 }) {
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

  // The area between the line and 1x: green above, red below.
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
  up.addColorStop(0, 'rgba(61, 255, 168, 0.38)')
  up.addColorStop(1, 'rgba(61, 255, 168, 0.06)')
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

  // The line: green above 1x, red below, glowing.
  const split = Math.min(1, Math.max(0, base / h))
  const colour = ctx.createLinearGradient(0, 0, 0, h)
  colour.addColorStop(0, GREEN)
  colour.addColorStop(Math.max(0, split - 0.001), GREEN)
  colour.addColorStop(Math.min(1, split + 0.001), RED)
  colour.addColorStop(1, RED)
  ctx.save()
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  ctx.strokeStyle = colour
  ctx.lineWidth = 3
  ctx.shadowColor = last.y <= base ? GREEN : RED
  ctx.shadowBlur = 6 + glow * 14
  ctx.beginPath()
  pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)))
  ctx.stroke()
  ctx.restore()

  if (!crashed) {
    // The tip.
    ctx.save()
    ctx.fillStyle = '#fff'
    ctx.shadowColor = last.y <= base ? GREEN : RED
    ctx.shadowBlur = 14
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
