// The particles of the Black Market's cosmetics (embers, bolts, digits,
// sparkles, snow, hearts, petals, coins, dice, ...), drawn on a canvas laid
// over a name (StyledUsername) or a profile picture (StyledAvatar). Ported
// from the cosmetics prototype, so they look the same.
//
// One shared engine for the whole page:
// - one requestAnimationFrame loop for every canvas, running only while
//   there's a canvas to draw
// - canvases off the screen are skipped (IntersectionObserver)
// - each resizes with what it's laid over (ResizeObserver)
// - devicePixelRatio is capped at 2
// - attachParticles returns a function that removes everything it set up
// The canvas is bigger than what it's over (a margin of 1.4x the text size
// round a name, half the width round a picture) and never takes up space:
// it's absolutely positioned, with pointer-events: none (cosmetics.css).
//
// A name that wraps onto several lines gets particles round each line, not
// one box round them all.

const TAU = Math.PI * 2
const MAX_PARTICLES = 320
const rand = (a, b) => a + Math.random() * (b - a)
const pick = (list) => list[(Math.random() * list.length) | 0]
const lerp = (a, b, t) => a + (b - a) * t

function hexA(hex, alpha) {
  const h = hex.replace('#', '')
  const n = parseInt(h.length === 3 ? h.split('').map((x) => x + x).join('') : h, 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${Math.max(0, Math.min(1, alpha)).toFixed(3)})`
}

function star4(c, x, y, R, rot, ratio) {
  if (R <= 0) return
  const r2 = R * (ratio || 0.22)
  c.save()
  c.translate(x, y)
  c.rotate(rot || 0)
  c.beginPath()
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2
    c.lineTo(Math.cos(a) * R, Math.sin(a) * R)
    c.lineTo(Math.cos(a + Math.PI / 4) * r2, Math.sin(a + Math.PI / 4) * r2)
  }
  c.closePath()
  c.fill()
  c.restore()
}

function heart(c, x, y, s) {
  c.beginPath()
  c.moveTo(x, y + 0.35 * s)
  c.bezierCurveTo(x - 0.9 * s, y - 0.25 * s, x - 0.45 * s, y - 0.95 * s, x, y - 0.45 * s)
  c.bezierCurveTo(x + 0.45 * s, y - 0.95 * s, x + 0.9 * s, y - 0.25 * s, x, y + 0.35 * s)
  c.fill()
}

// A point near the name or the ring.
function around(s, k) {
  if (s.circle) {
    const a = rand(0, TAU)
    const rr = s.r * (1 + rand(-0.05, k))
    return [s.cx + Math.cos(a) * rr, s.cy + Math.sin(a) * rr]
  }
  const ex = s.fs * k
  return [rand(s.x0 - ex, s.x1 + ex), rand(s.y0 - ex * 0.6, s.y1 + ex * 0.6)]
}

// Per text size of name, across every line.
const perEm = (s, n) => ((s.TW ?? s.W) / s.fs) * n

const PIPS = {
  1: [[0, 0]],
  2: [[-1, -1], [1, 1]],
  3: [[-1, -1], [0, 0], [1, 1]],
  4: [[-1, -1], [1, -1], [-1, 1], [1, 1]],
  5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]],
  6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]],
}

// Each type: rate(s) particles a second made by make(s), or tick(s, dt)
// making its own; update(p, dt, s) and draw(c, p, s, k) per particle (k is
// 0 to 1 through its life); render(c, s) for what isn't particles. `whole`:
// it goes round the whole name, not line by line.
const TYPES = {
  embers: {
    blend: 'lighter',
    rate: (s) => (s.circle ? 55 : perEm(s, 7)),
    make(s) {
      let x
      let y
      if (s.circle) {
        const a = rand(0, TAU)
        const rr = s.r * rand(0.92, 1.02)
        x = s.cx + Math.cos(a) * rr
        y = s.cy + Math.sin(a) * rr
      } else {
        x = rand(s.x0, s.x1)
        y = rand(s.y0 + s.H * 0.15, s.y1 - s.H * 0.2)
      }
      return {
        x,
        y,
        vx: rand(-6, 6) * s.u,
        vy: -rand(s.circle ? 22 : 14, s.circle ? 48 : 30) * s.u,
        size: s.circle ? Math.max(1.2, rand(2.2, 5) * s.u) : rand(0.7, 1.6) * s.u,
        max: rand(0.45, 0.95),
        seed: rand(0, 9),
      }
    },
    update(p, dt, s) {
      p.x += Math.sin(s.t * 7 + p.seed) * 6 * s.u * dt
    },
    draw(c, p, s, k) {
      c.globalAlpha = (1 - k) * 0.9
      c.fillStyle = k < 0.25 ? s.col[0] : k < 0.6 ? s.col[1] || s.col[0] : s.col[2] || s.col[0]
      c.beginPath()
      c.arc(p.x, p.y, Math.max(0.4, p.size * (1 - k * 0.7)), 0, TAU)
      c.fill()
    },
  },
  bolts: {
    blend: 'lighter',
    tick(s, dt) {
      s.timer -= dt
      if (s.timer <= 0) {
        s.add(this.bolt(s))
        if (Math.random() < 0.3) s.add(this.bolt(s))
        s.timer = rand(0.25, 0.9)
      }
    },
    bolt(s) {
      const pts = []
      let branch = null
      if (s.circle) {
        const a0 = rand(0, TAU)
        const span = rand(0.5, 1.3)
        const n = 9
        for (let i = 0; i <= n; i++) {
          const a = a0 + (span * i) / n
          const rr = s.r * (1 + (i === 0 || i === n ? 0 : rand(-0.13, 0.13)))
          pts.push([s.cx + Math.cos(a) * rr, s.cy + Math.sin(a) * rr])
        }
        if (Math.random() < 0.5) {
          const a = a0 + span / 2
          let rr = s.r
          branch = [pts[4]]
          for (let j = 1; j <= 4; j++) {
            rr += s.r * 0.09
            const aa = a + rand(-0.15, 0.15)
            branch.push([s.cx + Math.cos(aa) * rr, s.cy + Math.sin(aa) * rr])
          }
        }
      } else {
        const top = Math.random() < 0.5
        const n = 8
        const y = top ? s.y0 + s.H * 0.1 : s.y1 - s.H * 0.1
        const xa = rand(s.x0 - s.fs * 0.2, s.x0 + s.W * 0.5)
        const xb = Math.min(s.x1 + s.fs * 0.2, xa + rand(s.W * 0.25, s.W * 0.6))
        for (let i = 0; i <= n; i++) pts.push([lerp(xa, xb, i / n), y + rand(-0.22, 0.22) * s.fs + (top ? -0.08 : 0.08) * s.fs])
        if (Math.random() < 0.4) {
          const m = pts[4]
          branch = [m]
          let yy = m[1]
          let xx = m[0]
          for (let j = 1; j <= 3; j++) {
            yy += (top ? -1 : 1) * s.fs * 0.18
            xx += rand(-0.15, 0.15) * s.fs
            branch.push([xx, yy])
          }
        }
      }
      return { pts, branch, max: rand(0.12, 0.24) }
    },
    draw(c, p, s) {
      if (Math.random() < 0.22) return
      const line = (pts) => {
        c.beginPath()
        pts.forEach((q, i) => (i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1])))
        c.stroke()
      }
      c.lineJoin = 'round'
      c.lineCap = 'round'
      c.shadowBlur = Math.max(4, 9 * s.u)
      c.shadowColor = s.col[0]
      c.strokeStyle = s.col[0]
      c.lineWidth = Math.max(1, 2 * s.u)
      line(p.pts)
      if (p.branch) line(p.branch)
      c.shadowBlur = 0
      c.strokeStyle = '#fff'
      c.lineWidth = Math.max(0.6, 0.9 * s.u)
      line(p.pts)
      if (p.branch) line(p.branch)
    },
  },
  digits: {
    blend: 'lighter',
    rate: (s) => (s.circle ? 16 : perEm(s, 3.2)),
    make(s) {
      let x
      let y
      let size
      if (s.circle) {
        const a = rand(0, TAU)
        const rr = s.r * rand(1.02, 1.3)
        x = s.cx + Math.cos(a) * rr
        y = s.cy + Math.sin(a) * rr
        size = Math.max(7, rand(8, 12) * s.u)
      } else {
        x = rand(s.x0 - 0.3 * s.fs, s.x1 + 0.3 * s.fs)
        y = rand(s.y0 + 0.2 * s.H, s.y1 + 0.3 * s.fs)
        size = Math.max(7, s.fs * rand(0.45, 0.65))
      }
      return { x, y, vy: -rand(10, 24) * Math.max(s.u, 0.5), size, ch: Math.random() < 0.5 ? '0' : '1', head: Math.random() < 0.2, max: rand(1, 2) }
    },
    draw(c, p, s, k) {
      if (Math.random() < 0.01) p.ch = p.ch === '0' ? '1' : '0'
      c.globalAlpha = Math.sin(Math.PI * k)
      c.fillStyle = p.head ? s.col[1] || s.col[0] : s.col[0]
      c.font = `600 ${p.size.toFixed(1)}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`
      c.textAlign = 'center'
      c.textBaseline = 'middle'
      c.fillText(p.ch, p.x, p.y)
    },
  },
  pixels: {
    blend: 'lighter',
    rate: (s) => (s.circle ? 3 : perEm(s, 0.6)),
    make(s) {
      const [x, y] = around(s, 0.3)
      const sz = Math.max(1.4, rand(1.5, 3) * s.u)
      return { x, y, w: sz, h: sz, vx: rand(-20, 20) * s.u, max: rand(0.08, 0.2) }
    },
    tick(s, dt) {
      s.timer -= dt
      if (s.timer > 0) return
      s.timer = rand(0.3, 1.1)
      const [cx, cy] = around(s, 0.35)
      const spread = s.circle ? s.r * 0.18 : s.fs * 0.6
      const n = 3 + ((Math.random() * 5) | 0)
      for (let i = 0; i < n; i++) {
        const sz = Math.max(1.4, rand(1.5, 3.4) * s.u)
        s.add({
          x: cx + rand(-1, 1) * spread,
          y: cy + rand(-0.5, 0.5) * spread,
          w: Math.random() < 0.25 ? sz * rand(3, 6) : sz,
          h: sz,
          vx: rand(-30, 30) * s.u,
          max: rand(0.08, 0.28),
        })
      }
    },
    draw(c, p, s, k) {
      c.globalAlpha = k < 0.8 ? 1 : (1 - k) * 5
      c.fillStyle = p.col
      c.fillRect(p.x, p.y, p.w, p.h)
    },
  },
  sparkles: {
    blend: 'lighter',
    rate: (s) => (s.circle ? 7 : perEm(s, 1.1) + 0.6),
    make(s) {
      const [x, y] = around(s, 0.28)
      return { x, y, R: s.circle ? Math.max(3, rand(4, 8) * s.u) : s.fs * rand(0.22, 0.4), rot: rand(0, TAU), vr: rand(-2, 2), max: rand(0.6, 1.1) }
    },
    draw(c, p, s, k) {
      const R = p.R * Math.sin(Math.PI * k)
      c.fillStyle = p.col
      star4(c, p.x, p.y, R, p.rot)
      c.fillStyle = '#fff'
      c.beginPath()
      c.arc(p.x, p.y, R * 0.14, 0, TAU)
      c.fill()
    },
  },
  specks: {
    blend: 'lighter',
    rate: (s) => (s.circle ? 36 : perEm(s, 9)),
    make(s) {
      let x
      let y
      if (s.circle) {
        const a = rand(0, TAU)
        const rr = rand(s.rin, s.r)
        x = s.cx + Math.cos(a) * rr
        y = s.cy + Math.sin(a) * rr
      } else {
        x = rand(s.x0, s.x1)
        y = rand(s.y0 + 0.15 * s.H, s.y1 - 0.15 * s.H)
      }
      return { x, y, size: rand(0.5, 1.1) * Math.max(s.u, 0.9), max: rand(0.15, 0.45) }
    },
    draw(c, p, s, k) {
      c.globalAlpha = Math.sin(Math.PI * k)
      c.fillStyle = p.col
      c.beginPath()
      c.arc(p.x, p.y, p.size, 0, TAU)
      c.fill()
      if (p.size > 0.9) {
        c.fillRect(p.x - p.size * 3, p.y - 0.3, p.size * 6, 0.6)
        c.fillRect(p.x - 0.3, p.y - p.size * 3, 0.6, p.size * 6)
      }
    },
  },
  glint: {
    blend: 'lighter',
    tick(s, dt) {
      s.timer -= dt
      if (s.timer > 0) return
      s.timer = rand(1.4, 2.8)
      let x
      let y
      let R
      if (s.circle) {
        const a = -Math.PI / 4 + rand(-0.7, 0.7)
        x = s.cx + Math.cos(a) * s.r
        y = s.cy + Math.sin(a) * s.r
        R = Math.max(7, rand(13, 20) * s.u)
      } else {
        x = rand(s.x0 + 0.1 * s.W, s.x1 - 0.1 * s.W)
        y = s.y0 + s.H * 0.32
        R = s.fs * rand(0.7, 1)
      }
      s.add({ x, y, R, max: 0.9 })
    },
    draw(c, p, s, k) {
      const e = Math.sin(Math.PI * k)
      c.fillStyle = '#fff'
      c.shadowBlur = Math.max(4, p.R * 0.5)
      c.shadowColor = s.col[1] || '#fff'
      star4(c, p.x, p.y, p.R * e, k * 0.6, 0.09)
      star4(c, p.x, p.y, p.R * 0.45 * e, Math.PI / 4 + k * 0.6, 0.12)
      c.shadowBlur = 0
    },
  },
  orbit: {
    blend: 'lighter',
    whole: true,
    tick(s) {
      if (s.init) return
      s.init = 1
      for (let i = 0; i < 3; i++) s.add({ a: (i * TAU) / 3, sp: rand(1.1, 1.5), max: Infinity, trail: [], seed: rand(0, 9) })
    },
    update(p, dt, s) {
      p.a += p.sp * dt
      if (s.circle) {
        const rr = s.r * 1.16
        p.x = s.cx + Math.cos(p.a) * rr
        p.y = s.cy + Math.sin(p.a) * rr
      } else {
        const cx = (s.x0 + s.x1) / 2
        const cy = (s.y0 + s.y1) / 2
        p.x = cx + Math.cos(p.a) * (s.W / 2 + 0.4 * s.fs)
        p.y = cy + Math.sin(p.a) * (s.H / 2 + 0.25 * s.fs)
      }
      p.trail.push([p.x, p.y])
      if (p.trail.length > 12) p.trail.shift()
    },
    draw(c, p, s) {
      const R = (s.circle ? Math.max(3, 5 * s.u) : s.fs * 0.28) * (0.85 + 0.15 * Math.sin(s.t * 6 + p.seed))
      p.trail.forEach((q, i) => {
        c.globalAlpha = (i / p.trail.length) * 0.5
        c.fillStyle = p.col
        c.beginPath()
        c.arc(q[0], q[1], R * 0.25 * (i / p.trail.length), 0, TAU)
        c.fill()
      })
      c.globalAlpha = 1
      c.fillStyle = p.col
      star4(c, p.x, p.y, R, s.t * 2)
    },
  },
  snow: {
    blend: 'source-over',
    rate: (s) => (s.circle ? 11 : perEm(s, 2.2)),
    make(s) {
      let x
      let y
      let vy
      if (s.circle) {
        const a = rand(0, TAU)
        const rr = s.r * rand(0.95, 1.2)
        x = s.cx + Math.cos(a) * rr
        y = s.cy + Math.sin(a) * rr
        vy = rand(7, 15) * s.u
      } else {
        x = rand(s.x0 - 0.2 * s.fs, s.x1 + 0.2 * s.fs)
        y = rand(s.y0 - 0.35 * s.fs, s.y0 + 0.3 * s.H)
        vy = rand(6, 12) * s.u
      }
      return { x, y, vx: rand(-3, 3) * s.u, vy, size: rand(0.7, 1.6) * Math.max(s.u, 0.75), max: rand(1.2, 2.2), seed: rand(0, 9) }
    },
    update(p, dt, s) {
      p.x += Math.sin(s.t * 2 + p.seed) * 4 * s.u * dt
    },
    draw(c, p, s, k) {
      c.globalAlpha = Math.sin(Math.PI * k) * 0.95
      c.fillStyle = p.col
      c.beginPath()
      c.arc(p.x, p.y, p.size, 0, TAU)
      c.fill()
    },
  },
  void: {
    blend: 'source-over',
    rate: (s) => (s.circle ? 28 : perEm(s, 6)),
    make(s) {
      if (s.circle) return { circ: 1, a: rand(0, TAU), r0: s.r * rand(1.3, 1.6), r1: s.r * 0.97, size: rand(0.8, 2) * Math.max(s.u, 0.7), max: rand(0.6, 1.1) }
      const tx = rand(s.x0, s.x1)
      const ty = rand(s.y0 + 0.3 * s.H, s.y1 - 0.3 * s.H)
      const ang = rand(0, TAU)
      const d = s.fs * rand(0.7, 1.2)
      return { tx, ty, sx: tx + Math.cos(ang) * d, sy: ty + Math.sin(ang) * d * 0.7, size: rand(0.8, 2) * Math.max(s.u, 0.7), max: rand(0.6, 1.1) }
    },
    draw(c, p, s, k) {
      const e = k * k
      if (p.circ) {
        const rr = lerp(p.r0, p.r1, e)
        const a = p.a + e * 0.6
        p.x = s.cx + Math.cos(a) * rr
        p.y = s.cy + Math.sin(a) * rr
      } else {
        p.x = lerp(p.sx, p.tx, e)
        p.y = lerp(p.sy, p.ty, e)
      }
      c.globalAlpha = Math.min(1, k * 3) * (k > 0.85 ? (1 - k) / 0.15 : 1)
      c.fillStyle = p.col
      c.beginPath()
      c.arc(p.x, p.y, p.size * (1 - e * 0.5), 0, TAU)
      c.fill()
    },
  },
  hearts: {
    blend: 'source-over',
    rate: (s) => (s.circle ? 3.2 : perEm(s, 0.7) + 0.4),
    make(s) {
      if (s.circle) {
        const a = rand(-Math.PI * 0.9, -Math.PI * 0.1)
        return { x: s.cx + Math.cos(a) * s.r, y: s.cy + Math.sin(a) * s.r, vy: -rand(10, 20) * s.u, size: Math.max(3, rand(4, 7) * s.u), max: rand(1, 1.6), seed: rand(0, 9) }
      }
      return { x: rand(s.x0, s.x1), y: s.y0 + 0.35 * s.H, vy: -rand(8, 15) * s.u, size: s.fs * rand(0.28, 0.42), max: rand(1, 1.6), seed: rand(0, 9) }
    },
    update(p, dt, s) {
      p.x += Math.sin(s.t * 3 + p.seed) * 6 * s.u * dt
    },
    draw(c, p, s, k) {
      c.globalAlpha = k < 0.6 ? 1 : (1 - k) / 0.4
      c.fillStyle = p.col
      heart(c, p.x, p.y, p.size * (0.6 + 0.4 * Math.min(1, k * 4)))
    },
  },
  dust: {
    blend: 'source-over',
    rate: (s) => (s.circle ? 20 : perEm(s, 5)),
    make(s) {
      if (Math.random() < 0.06) {
        const x = s.circle ? rand(s.cx - s.r, s.cx + s.r) : rand(s.x0, s.x1)
        return { scratch: 1, x, y: 0, max: rand(0.08, 0.16) }
      }
      const [x, y] = around(s, 0.3)
      return { x, y, size: rand(0.5, 1.4) * Math.max(s.u, 0.8), max: rand(0.05, 0.14) }
    },
    draw(c, p, s) {
      if (p.scratch) {
        const y0 = s.circle ? s.cy - s.r * 1.2 : s.y0 - 0.3 * s.fs
        const y1 = s.circle ? s.cy + s.r * 1.2 : s.y1 + 0.3 * s.fs
        c.globalAlpha = 0.45
        c.strokeStyle = s.col[0]
        c.lineWidth = Math.max(0.6, 0.7 * s.u)
        c.beginPath()
        c.moveTo(p.x, y0)
        c.lineTo(p.x + rand(-1, 1), y1)
        c.stroke()
        return
      }
      c.globalAlpha = 0.9
      c.fillStyle = p.col
      c.beginPath()
      c.arc(p.x, p.y, p.size, 0, TAU)
      c.fill()
    },
  },
  flash: {
    blend: 'lighter',
    tick(s, dt) {
      s.timer -= dt
      if (s.timer > 0) return
      s.timer = rand(0.2, 1.2)
      const n = Math.random() < 0.3 ? 2 : 1
      for (let i = 0; i < n; i++) {
        let x
        let y
        let R
        if (s.circle) {
          const a = rand(0, TAU)
          const rr = s.r * rand(1, 1.3)
          x = s.cx + Math.cos(a) * rr
          y = s.cy + Math.sin(a) * rr
          R = Math.max(6, rand(11, 18) * s.u)
        } else {
          ;[x, y] = around(s, 0.6)
          R = s.fs * rand(0.45, 0.75)
        }
        s.add({ x, y, R, max: 0.24 })
      }
    },
    draw(c, p, s, k) {
      const e = 1 - k
      const R = p.R * (0.5 + k)
      const g = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, R)
      g.addColorStop(0, `rgba(255,255,255,${e})`)
      g.addColorStop(1, 'rgba(255,255,255,0)')
      c.fillStyle = g
      c.fillRect(p.x - R, p.y - R, R * 2, R * 2)
      c.globalAlpha = e
      c.fillStyle = p.col
      star4(c, p.x, p.y, p.R * 1.3 * e, 0, 0.1)
    },
  },
  twinkle: {
    blend: 'lighter',
    rate: (s) => (s.circle ? 12 : perEm(s, 3)),
    make(s) {
      const [x, y] = around(s, 0.4)
      return { x, y, size: rand(1, 2.6) * Math.max(s.u, 0.75), max: rand(0.8, 1.6) }
    },
    draw(c, p, s, k) {
      const e = Math.sin(Math.PI * k)
      c.fillStyle = p.col
      if (p.size > 2) star4(c, p.x, p.y, p.size * 1.6 * e, 0)
      else {
        c.globalAlpha = e
        c.beginPath()
        c.arc(p.x, p.y, p.size * 0.6, 0, TAU)
        c.fill()
      }
    },
  },
  curtain: {
    blend: 'lighter',
    whole: true,
    tick(s) {
      if (s.init) return
      s.init = 1
      const n = s.circle ? 10 : Math.max(4, Math.round((s.W / s.fs) * 1.4))
      for (let i = 0; i < n; i++) s.add({ f: (i + rand(-0.3, 0.3)) / n, ph: rand(0, TAU), sp: rand(0.6, 1.3), col: s.col[i % s.col.length], max: Infinity })
    },
    draw(c, p, s) {
      const a = 0.45 + 0.55 * Math.sin(s.t * p.sp * 1.4 + p.ph)
      if (s.circle) {
        const ang = p.f * TAU + s.t * 0.12 + Math.sin(s.t * p.sp + p.ph) * 0.12
        const r0 = s.r * 0.98
        const r1 = s.r * (1.28 + 0.1 * Math.sin(s.t * p.sp + p.ph))
        const x0 = s.cx + Math.cos(ang) * r0
        const y0 = s.cy + Math.sin(ang) * r0
        const x1 = s.cx + Math.cos(ang) * r1
        const y1 = s.cy + Math.sin(ang) * r1
        const g = c.createLinearGradient(x0, y0, x1, y1)
        g.addColorStop(0, hexA(p.col, 0.55 * a))
        g.addColorStop(1, hexA(p.col, 0))
        c.strokeStyle = g
        c.lineWidth = s.r * 0.16
        c.lineCap = 'round'
        c.beginPath()
        c.moveTo(x0, y0)
        c.lineTo(x1, y1)
        c.stroke()
      } else {
        const bw = s.fs * 0.32
        const x = s.x0 + p.f * s.W + Math.sin(s.t * p.sp + p.ph) * s.fs * 0.18 - bw / 2
        const yb = s.y0 + s.H * 0.45
        const yt = s.y0 - s.fs * (0.6 + 0.25 * Math.sin(s.t * 0.8 + p.ph))
        const g = c.createLinearGradient(0, yb, 0, yt)
        g.addColorStop(0, hexA(p.col, 0.45 * a))
        g.addColorStop(1, hexA(p.col, 0))
        c.fillStyle = g
        c.fillRect(x, yt, bw, yb - yt)
      }
    },
  },
  petals: {
    blend: 'source-over',
    rate: (s) => (s.circle ? 5 : perEm(s, 1) + 0.5),
    make(s) {
      const base = { vx: rand(4, 10) * s.u, vy: rand(8, 16) * s.u, rot: rand(0, TAU), vr: rand(-3, 3), max: rand(1.4, 2.4), seed: rand(0, 9) }
      if (s.circle) {
        const a = rand(0, TAU)
        return { ...base, x: s.cx + Math.cos(a) * s.r, y: s.cy + Math.sin(a) * s.r, size: Math.max(2.5, rand(3.5, 6) * s.u) }
      }
      return { ...base, x: rand(s.x0 - 0.3 * s.fs, s.x1 + 0.3 * s.fs), y: s.y0 - 0.5 * s.fs, size: s.fs * rand(0.18, 0.28) }
    },
    update(p, dt, s) {
      p.x += Math.sin(s.t * 2.5 + p.seed) * 8 * s.u * dt
    },
    draw(c, p, s, k) {
      c.save()
      c.translate(p.x, p.y)
      c.rotate(p.rot)
      c.scale(1, 0.4 + 0.6 * Math.abs(Math.sin(s.t * 3 + p.seed)))
      c.globalAlpha = k > 0.8 ? (1 - k) / 0.2 : 1
      c.fillStyle = p.col
      c.beginPath()
      c.ellipse(0, 0, p.size, p.size * 0.55, 0, 0, TAU)
      c.fill()
      c.restore()
    },
  },
  smoke: {
    blend: 'source-over',
    rate: (s) => (s.circle ? 9 : perEm(s, 2.5)),
    make(s) {
      let x
      let y
      let size
      if (s.circle) {
        const a = rand(0, TAU)
        x = s.cx + Math.cos(a) * s.r
        y = s.cy + Math.sin(a) * s.r
        size = Math.max(4, rand(6, 10) * s.u)
      } else {
        x = rand(s.x0, s.x1)
        y = rand(s.y0 + 0.3 * s.H, s.y1)
        size = s.fs * rand(0.25, 0.4)
      }
      return { x, y, vx: rand(-3, 3) * s.u, vy: -rand(6, 14) * s.u, size, max: rand(1.4, 2.4) }
    },
    draw(c, p, s, k) {
      const R = p.size * (1 + k * 1.8)
      const g = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, R)
      g.addColorStop(0, hexA(p.col, Math.sin(Math.PI * k) * 0.32))
      g.addColorStop(1, hexA(p.col, 0))
      c.fillStyle = g
      c.fillRect(p.x - R, p.y - R, R * 2, R * 2)
    },
  },
  drips: {
    blend: 'lighter',
    rate: (s) => (s.circle ? 2.5 : perEm(s, 0.6) + 0.3),
    make(s) {
      if (s.circle) {
        const a = rand(0.25 * Math.PI, 0.75 * Math.PI)
        return { x: s.cx + Math.cos(a) * s.r * 0.98, y: s.cy + Math.sin(a) * s.r * 0.98, vy: 0, size: Math.max(1.2, rand(1.8, 2.8) * s.u), hang: rand(0.25, 0.5), max: rand(1, 1.5) }
      }
      return { x: rand(s.x0 + 0.1 * s.W, s.x1 - 0.1 * s.W), y: s.y1 - s.H * 0.22, vy: 0, size: Math.max(0.8, s.fs * 0.09), hang: rand(0.25, 0.5), max: rand(1, 1.5) }
    },
    update(p, dt, s) {
      if (p.life > p.hang * p.max) p.vy += 90 * s.u * dt
    },
    draw(c, p, s, k) {
      const grow = Math.min(1, p.life / (p.hang * p.max))
      const sz = p.size * (0.4 + 0.6 * grow)
      const stretch = 1 + Math.min(1.6, p.vy / (25 * s.u))
      c.globalAlpha = k > 0.85 ? (1 - k) / 0.15 : 1
      c.fillStyle = p.col
      c.beginPath()
      c.ellipse(p.x, p.y, sz, sz * stretch, 0, 0, TAU)
      c.fill()
    },
  },
  bubbles: {
    blend: 'source-over',
    rate: (s) => (s.circle ? 6 : perEm(s, 1.6)),
    make(s) {
      if (s.circle) {
        const a = rand(0, Math.PI)
        return { x: s.cx + Math.cos(a) * s.r, y: s.cy + Math.sin(a) * s.r * 0.6, vy: -rand(10, 20) * s.u, size: Math.max(1.5, rand(2, 4.5) * s.u), max: rand(1, 1.8), seed: rand(0, 9) }
      }
      return { x: rand(s.x0 - 0.2 * s.fs, s.x1 + 0.2 * s.fs), y: s.y1, vy: -rand(10, 20) * s.u, size: s.fs * rand(0.08, 0.18), max: rand(1, 1.8), seed: rand(0, 9) }
    },
    update(p, dt, s) {
      p.x += Math.sin(s.t * 4 + p.seed) * 5 * s.u * dt
    },
    draw(c, p, s, k) {
      const R = p.size
      c.globalAlpha = k > 0.85 ? ((1 - k) / 0.15) * 0.85 : 0.85
      c.strokeStyle = p.col
      c.lineWidth = Math.max(0.6, R * 0.22)
      c.beginPath()
      c.arc(p.x, p.y, R, 0, TAU)
      c.stroke()
      c.fillStyle = 'rgba(255,255,255,.85)'
      c.beginPath()
      c.arc(p.x - R * 0.35, p.y - R * 0.35, Math.max(0.4, R * 0.22), 0, TAU)
      c.fill()
    },
  },
  bulbs: {
    blend: 'source-over',
    whole: true,
    render(c, s) {
      const key = `${s.CW}x${s.CH}`
      if (s.bk !== key) {
        s.bk = key
        s.pts = []
        if (s.circle) {
          const n = s.W < 50 ? 14 : 22
          const rr = s.r * 1.14
          for (let i = 0; i < n; i++) {
            const a = (i / n) * TAU - Math.PI / 2
            s.pts.push([s.cx + Math.cos(a) * rr, s.cy + Math.sin(a) * rr])
          }
        } else {
          const e = 0.4 * s.fs
          const ax = s.x0 - e
          const ay = s.y0 - e * 0.6
          const bx = s.x1 + e
          const by = s.y1 + e * 0.6
          const w = bx - ax
          const h = by - ay
          const P = 2 * (w + h)
          const n = Math.max(8, Math.round(P / (0.6 * s.fs)))
          for (let i = 0; i < n; i++) {
            let d = (i * P) / n
            let x
            let y
            if (d < w) {
              x = ax + d
              y = ay
            } else if ((d -= w) < h) {
              x = bx
              y = ay + d
            } else if ((d -= h) < w) {
              x = bx - d
              y = by
            } else {
              d -= w
              x = ax
              y = by - d
            }
            s.pts.push([x, y])
          }
        }
      }
      const sz = s.circle ? Math.max(1.3, 2.4 * s.u) : Math.max(1.1, s.fs * 0.09)
      const ph = Math.floor(s.t * 7)
      s.pts.forEach((q, i) => {
        const lit = (i + ph) % 3 === 0
        c.globalAlpha = lit ? 1 : 0.35
        c.fillStyle = lit ? s.col[0] : s.col[1] || s.col[0]
        c.shadowBlur = lit ? sz * 4 : 0
        c.shadowColor = s.col[1] || s.col[0]
        c.beginPath()
        c.arc(q[0], q[1], lit ? sz : sz * 0.8, 0, TAU)
        c.fill()
      })
      c.shadowBlur = 0
    },
  },
  suits: {
    blend: 'source-over',
    rate: (s) => (s.circle ? 4 : perEm(s, 1) + 0.4),
    make(s) {
      const [x, y] = around(s, 0.3)
      const g = pick(['♠', '♥', '♦', '♣'])
      const red = g === '♥' || g === '♦'
      return {
        x,
        y,
        g,
        col: red ? s.col[0] : s.col[1] || s.col[0],
        vy: -rand(6, 14) * s.u,
        rot: rand(-0.4, 0.4),
        vr: rand(-1, 1),
        size: s.circle ? Math.max(7, rand(9, 13) * s.u) : s.fs * rand(0.45, 0.65),
        max: rand(1.2, 2),
      }
    },
    draw(c, p, s, k) {
      c.save()
      c.translate(p.x, p.y)
      c.rotate(p.rot)
      c.globalAlpha = Math.sin(Math.PI * k)
      c.fillStyle = p.col
      c.font = `${p.size.toFixed(1)}px "Segoe UI Symbol","Apple Symbols","DejaVu Sans",sans-serif`
      c.textAlign = 'center'
      c.textBaseline = 'middle'
      c.fillText(p.g, 0, 0)
      c.restore()
    },
  },
  coins: {
    blend: 'source-over',
    rate: (s) => (s.circle ? 4 : perEm(s, 1) + 0.4),
    make(s) {
      const base = { spin: rand(5, 9), seed: rand(0, 9), max: rand(0.9, 1.4) }
      if (s.circle) return { ...base, x: s.cx + rand(-1, 1) * s.r, y: s.cy - s.r * 1.3, vy: rand(18, 30) * s.u, size: Math.max(2.5, rand(4, 6) * s.u) }
      return { ...base, x: rand(s.x0 - 0.3 * s.fs, s.x1 + 0.3 * s.fs), y: s.y0 - 0.4 * s.fs, vy: rand(14, 26) * s.u, size: s.fs * rand(0.18, 0.26) }
    },
    draw(c, p, s, k) {
      const sx = Math.max(0.15, Math.abs(Math.cos(s.t * p.spin + p.seed)))
      c.globalAlpha = k > 0.75 ? (1 - k) / 0.25 : 1
      c.save()
      c.translate(p.x, p.y)
      c.scale(sx, 1)
      c.beginPath()
      c.arc(0, 0, p.size, 0, TAU)
      c.fillStyle = s.col[0]
      c.fill()
      c.lineWidth = p.size * 0.22
      c.strokeStyle = s.col[1] || s.col[0]
      c.stroke()
      c.restore()
    },
  },
  dice: {
    blend: 'source-over',
    rate: (s) => (s.circle ? 1.6 : perEm(s, 0.45) + 0.3),
    make(s) {
      const base = { rot: rand(0, TAU), vr: rand(-5, 5), face: 1 + ((Math.random() * 6) | 0), max: rand(1, 1.5) }
      if (s.circle) return { ...base, x: s.cx + rand(-0.9, 0.9) * s.r, y: s.cy - s.r * 1.25, vy: rand(14, 24) * s.u, size: Math.max(5, rand(7, 10) * s.u) }
      return { ...base, x: rand(s.x0 - 0.3 * s.fs, s.x1 + 0.3 * s.fs), y: s.y0 - 0.5 * s.fs, vy: rand(10, 18) * s.u, size: s.fs * rand(0.35, 0.45) }
    },
    draw(c, p, s, k) {
      if (Math.random() < 0.02) p.face = 1 + ((Math.random() * 6) | 0)
      const h = p.size / 2
      const o = h * 0.5
      const pr = h * 0.18
      c.globalAlpha = k > 0.75 ? (1 - k) / 0.25 : 1
      c.save()
      c.translate(p.x, p.y)
      c.rotate(p.rot)
      c.beginPath()
      if (c.roundRect) c.roundRect(-h, -h, 2 * h, 2 * h, h * 0.3)
      else c.rect(-h, -h, 2 * h, 2 * h)
      c.fillStyle = s.col[0]
      c.fill()
      c.lineWidth = Math.max(0.5, h * 0.08)
      c.strokeStyle = 'rgba(0,0,0,.35)'
      c.stroke()
      c.fillStyle = s.col[1] || '#000'
      PIPS[p.face].forEach((q) => {
        c.beginPath()
        c.arc(q[0] * o, q[1] * o, pr, 0, TAU)
        c.fill()
      })
      c.restore()
    },
  },
  ball: {
    blend: 'source-over',
    whole: true,
    tick(s) {
      if (!s.init) {
        s.init = 1
        s.add({ a: rand(0, TAU), max: Infinity })
      }
    },
    update(p, dt, s) {
      p.a -= (2.4 + 1.4 * Math.sin(s.t * 0.6)) * dt
      if (s.circle) {
        const rr = (s.rin + s.r) / 2
        p.x = s.cx + Math.cos(p.a) * rr
        p.y = s.cy + Math.sin(p.a) * rr
      } else {
        const cx = (s.x0 + s.x1) / 2
        const cy = (s.y0 + s.y1) / 2
        p.x = cx + Math.cos(p.a) * (s.W / 2 + 0.35 * s.fs)
        p.y = cy + Math.sin(p.a) * (s.H / 2 + 0.2 * s.fs)
      }
    },
    draw(c, p, s) {
      const R = s.circle ? Math.max(1.3, (s.r - s.rin) * 0.32) : Math.max(1.2, s.fs * 0.1)
      c.fillStyle = '#fff'
      c.shadowBlur = R * 2
      c.shadowColor = 'rgba(0,0,0,.6)'
      c.beginPath()
      c.arc(p.x, p.y, R, 0, TAU)
      c.fill()
      c.shadowBlur = 0
    },
  },
}

// ---------- the area a name covers ----------

function setArea(s, area) {
  s.x0 = area.x0
  s.x1 = area.x1
  s.y0 = area.y0
  s.y1 = area.y1
  s.W = area.x1 - area.x0
  s.H = area.y1 - area.y0
}

// The whole name (or ring).
function toBox(s) {
  if (!s.circle) setArea(s, s.box)
}

// One line of the name, picked at random by its length.
function toLine(s) {
  if (s.circle) return
  if (s.lines.length === 1) return setArea(s, s.lines[0])
  let left = Math.random() * s.TW
  for (const line of s.lines) {
    left -= line.x1 - line.x0
    if (left <= 0) return setArea(s, line)
  }
  setArea(s, s.lines[s.lines.length - 1])
}

// Where each line of a (wrapped) name sits on the canvas.
function textLines(s, pad) {
  const range = document.createRange()
  range.selectNodeContents(s.nameEl)
  const rects = [...range.getClientRects()].filter((rect) => rect.width > 0 && rect.height > 0)
  if (rects.length === 0) return [s.box]
  const hostRect = s.host.getBoundingClientRect()
  const lines = []
  for (const rect of rects) {
    const x0 = rect.left - hostRect.left + pad
    const x1 = rect.right - hostRect.left + pad
    const y0 = rect.top - hostRect.top + pad
    const y1 = rect.bottom - hostRect.top + pad
    const middle = (y0 + y1) / 2
    const line = lines.find((other) => Math.abs(other.middle - middle) < s.fs * 0.5)
    if (line) {
      line.x0 = Math.min(line.x0, x0)
      line.x1 = Math.max(line.x1, x1)
      line.y0 = Math.min(line.y0, y0)
      line.y1 = Math.max(line.y1, y1)
    } else {
      lines.push({ x0, x1, y0, y1, middle })
    }
  }
  return lines
}

function resize(s) {
  const w = s.host.offsetWidth
  const h = s.host.offsetHeight
  if (!w || !h) return
  const dpr = Math.min(2, window.devicePixelRatio || 1)
  if (s.circle) {
    s.u = w / 100
    s.pad = Math.round(w * 0.5)
  } else {
    s.fs = parseFloat(getComputedStyle(s.nameEl ?? s.host).fontSize) || 16
    s.u = s.fs / 16
    s.pad = Math.round(s.fs * 1.4)
  }
  const pad = s.pad
  s.CW = w + pad * 2
  s.CH = h + pad * 2
  s.cv.width = Math.round(s.CW * dpr)
  s.cv.height = Math.round(s.CH * dpr)
  s.cv.style.width = `${s.CW}px`
  s.cv.style.height = `${s.CH}px`
  s.cv.style.left = `${-pad}px`
  s.cv.style.top = `${-pad}px`
  s.ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  if (s.circle) {
    const ring = s.host.querySelector('.cos-ring-main')
    s.W = w
    s.H = h
    s.cx = pad + w / 2
    s.cy = pad + h / 2
    s.rin = w / 2
    s.r = ring && ring.offsetWidth ? ring.offsetWidth / 2 : (w / 2) * 1.075
  } else {
    s.box = { x0: pad, y0: pad, x1: pad + w, y1: pad + h }
    s.lines = s.nameEl ? textLines(s, pad) : [s.box]
    s.TW = s.lines.reduce((total, line) => total + (line.x1 - line.x0), 0) || w
    toBox(s)
  }
  s.bk = null
}

// ---------- the one loop ----------

const systems = new Set()
let intersections = null
let resizes = null
let frame = 0
let last = 0

function step(s, dt) {
  const T = TYPES[s.type]
  s.t += dt
  if (T.tick) {
    if (T.whole) toBox(s)
    else toLine(s)
    T.tick(s, dt)
  }
  if (T.rate) {
    s.acc += T.rate(s) * dt
    let made = 0
    while (s.acc >= 1 && made++ < 40) {
      s.acc -= 1
      toLine(s)
      s.add(T.make(s))
    }
  }
  toBox(s)
  const c = s.ctx
  c.clearRect(0, 0, s.CW, s.CH)
  c.globalCompositeOperation = T.blend || 'source-over'
  for (let i = s.P.length - 1; i >= 0; i--) {
    const p = s.P[i]
    p.life += dt
    if (p.life >= p.max) {
      s.P.splice(i, 1)
      continue
    }
    if (T.update) T.update(p, dt, s)
    if (p.vx) p.x += p.vx * dt
    if (p.vy) p.y += p.vy * dt
    if (p.vr) p.rot += p.vr * dt
    c.globalAlpha = 1
    T.draw(c, p, s, p.life / p.max)
  }
  if (T.render) {
    c.globalAlpha = 1
    T.render(c, s)
  }
  c.globalAlpha = 1
  c.shadowBlur = 0
}

function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000)
  last = now
  for (const s of systems) {
    if (s.visible && s.W) step(s, dt)
  }
  frame = systems.size > 0 ? requestAnimationFrame(loop) : 0
}

function observers() {
  if (!intersections) {
    intersections = new IntersectionObserver(
      (entries) => entries.forEach((entry) => {
        const s = entry.target.cosParticles
        if (s) s.visible = entry.isIntersecting
      }),
      { rootMargin: '80px' },
    )
  }
  if (!resizes) {
    resizes = new ResizeObserver((entries) => entries.forEach((entry) => entry.target.cosParticles && resize(entry.target.cosParticles)))
  }
}

// Once the fonts are in, names are their real size: measure them again.
if (typeof document !== 'undefined' && document.fonts?.ready) {
  document.fonts.ready.then(() => systems.forEach(resize))
}

// Starts particles of `type` on `canvas`, laid over `host`: a profile
// picture's ring (`circle`) or a name (`nameEl`, the letters). `colors`
// are the particles' colours. Returns a function that stops them and
// cleans everything up.
export function attachParticles({ host, canvas, nameEl = null, type, circle = false, colors }) {
  const ctx = canvas?.getContext?.('2d')
  if (!host || !ctx || !TYPES[type]) return () => {}
  observers()

  const s = { host, cv: canvas, ctx, nameEl, type, circle, col: colors?.length ? colors : ['#ffffff'], P: [], acc: 0, t: 0, timer: rand(0, 0.4), visible: true }
  s.add = (p) => {
    if (s.P.length > MAX_PARTICLES) return
    p.life = 0
    if (!p.col) p.col = pick(s.col)
    s.P.push(p)
  }
  host.cosParticles = s
  resize(s)
  intersections.observe(host)
  resizes.observe(host)
  systems.add(s)
  if (!frame) {
    last = performance.now()
    frame = requestAnimationFrame(loop)
  }

  return () => {
    systems.delete(s)
    intersections.unobserve(host)
    resizes.unobserve(host)
    if (host.cosParticles === s) delete host.cosParticles
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    if (systems.size === 0 && frame) {
      cancelAnimationFrame(frame)
      frame = 0
    }
  }
}
