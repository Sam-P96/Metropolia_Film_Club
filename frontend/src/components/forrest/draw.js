// Draws Forrest Bounce: the stage's sky and its effects, the trees and
// bushes, the seesaw, the fruit, the buddies, the shurikens and hearts,
// the floating texts, and the scoreboard along the bottom. It only reads
// the run (shared/forrest/engine.js), so it can use Math.random and the
// clock freely.

import { GROUND, H, MAX_HEARTS, PERCH_Y, PIVOT, W, ease, endPos, fruitY } from '../../../../shared/forrest/engine.js'
import { TIERS, TIER_COLORS, setFor, threshold } from '../../../../shared/forrest/rules.js'

const EF = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'
const BRANCHES = [
  { x1: 10, x2: 100, y: PERCH_Y + 16 },
  { x1: W - 100, x2: W - 10, y: PERCH_Y + 16 },
  { x1: 10, x2: 165, y: 92 },
  { x1: W - 165, x2: W - 10, y: 92 },
]
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

function seeded(a) {
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ---------- the skies' fixed scenery ----------
const STARS = (() => {
  const r = seeded(99)
  const a = []
  for (let i = 0; i < 70; i++) a.push({ x: r() * W, y: r() * (GROUND - 20), s: 0.8 + r() * 1.6, p: r() * 6.28 })
  return a
})()
const BAND = (() => {
  const r = seeded(5)
  const a = []
  for (let i = 0; i < 280; i++) {
    const t = r()
    const off = (r() + r() + r() - 1.5) * 55
    a.push({ x: -20 + t * (W + 40) + off * 0.6, y: 390 - t * 350 + off, s: 0.5 + r() * 1.4, c: r() })
  }
  return a
})()
const SPIRAL = (() => {
  const r = seeded(17)
  const a = []
  for (let arm = 0; arm < 2; arm++)
    for (let i = 0; i < 70; i++) {
      const t = i / 70
      a.push({ ang: arm * Math.PI + t * 4.2 + (r() - 0.5) * 0.3, rad: 6 + t * 46 + (r() - 0.5) * 6, s: 0.6 + r() * 1.3 })
    }
  return a
})()
const INFALL = (() => {
  const r = seeded(13)
  const a = []
  for (let i = 0; i < 80; i++) a.push({ a: r() * 6.28, o: r(), sp: 0.5 + r() * 0.9 })
  return a
})()

// ---------- foliage: clusters of small circles in three shades ----------
function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16)
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  const f = (v) => Math.round(amt < 0 ? v * (1 + amt) : v + (255 - v) * amt)
  return `rgb(${ch.map(f).join(',')})`
}
const CLUMPS = [
  [18, 38, 46],
  [72, 26, 34],
  [112, 68, 30],
  [152, 84, 22],
  [28, 108, 30],
  [-4, 150, 24],
  [102, 184, 13],
]
function buildClusters(clumps, seed) {
  const rnd = seeded(seed)
  const out = []
  for (const [cx, y0, R, mirror] of clumps) {
    const n = Math.round((R * R) / 26)
    for (let i = 0; i < n; i++) {
      const ang = rnd() * Math.PI * 2
      const d = Math.sqrt(rnd()) * R * 0.85
      const dx = Math.cos(ang) * d
      const dy = Math.sin(ang) * d
      const r = 5 + rnd() * 7 * (1 - (d / R) * 0.5)
      // Light from the top left: the lower right sits in shade.
      const t = (dy * 0.8 + (mirror ? -dx : dx) * 0.3) / R + (rnd() - 0.5) * 0.5
      out.push({ x: cx + dx, y: y0 + dy, r, tone: t > 0.25 ? 0 : t < -0.3 ? 2 : 1 })
    }
    out.push({ x: cx, y: y0 + R * 0.12, r: R * 0.82, tone: -1, base: true })
  }
  out.sort((p, q) => (q.base ? 1 : 0) - (p.base ? 1 : 0) || p.tone - q.tone)
  return out
}
const FOLIAGE = buildClusters([...CLUMPS.map((c) => [c[0], c[1], c[2], false]), ...CLUMPS.map((c) => [W - c[0], c[1], c[2], true])], 7)
const BUSHES = buildClusters(
  [
    [30, GROUND - 8, 42],
    [92, GROUND - 22, 52],
    [150, GROUND - 4, 36],
    [218, GROUND - 10, 44],
    [282, GROUND - 26, 58],
    [345, GROUND - 14, 48],
    [395, GROUND - 4, 36],
  ],
  21
)

// A drawing surface: the canvas and two offscreen ones for the stage
// backgrounds (one fading into the next). `draw(s, { buddies })` each frame.
export function createRenderer(canvas) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  canvas.width = W * dpr
  canvas.height = H * dpr
  const main = canvas.getContext('2d')
  main.setTransform(dpr, 0, 0, dpr, 0, 0)
  const offscreen = () => {
    const c = document.createElement('canvas')
    c.width = W * dpr
    c.height = H * dpr
    c.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0)
    return c
  }
  const bgOld = offscreen()
  const bgNew = offscreen()

  const emoji = (ctx, e, x, y, size) => {
    ctx.font = `${size}px ${EF}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(e, x, y)
  }
  const roundRect = (ctx, x, y, w, h, r) => {
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.arcTo(x + w, y, x + w, y + h, r)
    ctx.arcTo(x + w, y + h, x, y + h, r)
    ctx.arcTo(x, y + h, x, y, r)
    ctx.arcTo(x, y, x + w, y, r)
    ctx.closePath()
  }
  const glow = (ctx, x, y, r, color) => {
    const gr = ctx.createRadialGradient(x, y, 0, x, y, r)
    gr.addColorStop(0, color)
    gr.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = gr
    ctx.fillRect(x - r, y - r, r * 2, r * 2)
  }
  const drawClusters = (ctx, list, color) => {
    const tones = { '-1': shade(color, -0.35), 0: shade(color, -0.22), 1: color, 2: shade(color, 0.22) }
    for (const p of list) {
      ctx.fillStyle = tones[p.tone]
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.r, 0, 7)
      ctx.fill()
    }
    ctx.fillStyle = shade(color, 0.42)
    for (let i = 0; i < list.length; i += 9) {
      const p = list[i]
      if (p.tone === 2) {
        ctx.beginPath()
        ctx.arc(p.x - p.r * 0.3, p.y - p.r * 0.3, p.r * 0.35, 0, 7)
        ctx.fill()
      }
    }
  }

  // ---------- skies ----------
  const drawStars = (ctx, t, color, alpha) => {
    ctx.fillStyle = color
    for (const st of STARS) {
      ctx.globalAlpha = alpha * (0.55 + 0.45 * Math.sin(t * 2 + st.p))
      ctx.fillRect(st.x, st.y, st.s, st.s)
    }
    ctx.globalAlpha = 1
  }
  const drawMeteors = (ctx, t) => {
    for (let k = 0; k < 3; k++) {
      const P = 2.4 + k * 0.9
      const tt = t + k * 1.3
      const cyc = Math.floor(tt / P)
      const ph = tt % P
      const life = 0.9
      if (ph > life) continue
      const r = seeded(cyc * 31 + k * 7 + 1)
      const sx = W * 0.25 + r() * W * 0.85
      const sy = 10 + r() * 170
      const ang = Math.PI * 0.78 + (r() - 0.5) * 0.25
      const len = 80 + r() * 70
      const sp = 420 + r() * 180
      const hx = sx + Math.cos(ang) * sp * ph
      const hy = sy + Math.sin(ang) * sp * ph
      const tx = hx - Math.cos(ang) * len
      const ty = hy - Math.sin(ang) * len
      const a = 1 - ph / life
      const gr = ctx.createLinearGradient(tx, ty, hx, hy)
      gr.addColorStop(0, 'rgba(255,255,255,0)')
      gr.addColorStop(1, `rgba(255,240,205,${a})`)
      ctx.strokeStyle = gr
      ctx.lineWidth = 2.4
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(tx, ty)
      ctx.lineTo(hx, hy)
      ctx.stroke()
      ctx.fillStyle = `rgba(255,255,255,${a})`
      ctx.beginPath()
      ctx.arc(hx, hy, 2.6, 0, 7)
      ctx.fill()
    }
  }
  const drawGalaxy = (ctx, t) => {
    glow(ctx, 80, 340, 150, 'rgba(255,80,200,.22)')
    glow(ctx, 200, 230, 170, 'rgba(140,90,255,.24)')
    glow(ctx, 330, 110, 140, 'rgba(70,170,255,.2)')
    glow(ctx, 250, 270, 90, 'rgba(255,200,120,.13)')
    for (const b of BAND) {
      ctx.globalAlpha = 0.3 + 0.55 * Math.abs(Math.sin(t * 1.4 + b.c * 20))
      ctx.fillStyle = b.c < 0.2 ? '#ffd6f5' : b.c < 0.4 ? '#c9d8ff' : '#ffffff'
      ctx.fillRect(b.x, b.y, b.s, b.s)
    }
    ctx.globalAlpha = 1
    const cx = 205
    const cy = 118
    glow(ctx, cx, cy, 36, 'rgba(255,230,200,.55)')
    ctx.save()
    ctx.translate(cx, cy)
    ctx.scale(1, 0.5)
    ctx.rotate(t * 0.12)
    for (const p of SPIRAL) {
      ctx.globalAlpha = 0.85 - p.rad / 70
      ctx.fillStyle = p.rad < 20 ? '#fff1d6' : '#d7c4ff'
      ctx.beginPath()
      ctx.arc(Math.cos(p.ang) * p.rad, Math.sin(p.ang) * p.rad, p.s, 0, 7)
      ctx.fill()
    }
    ctx.restore()
    ctx.globalAlpha = 1
  }
  const diskHalf = (ctx, t, a0, a1) => {
    const rings = [
      [78, 9, 'rgba(160,80,255,.35)'],
      [64, 9, 'rgba(255,120,60,.55)'],
      [52, 7, 'rgba(255,175,95,.8)'],
      [43, 5, 'rgba(255,230,180,.9)'],
    ]
    for (const [r, w, c] of rings) {
      ctx.strokeStyle = c
      ctx.lineWidth = w
      ctx.beginPath()
      ctx.arc(0, 0, r, a0, a1)
      ctx.stroke()
    }
    for (let k = 0; k < 14; k++) {
      const ang = (t * (1.6 - k * 0.05) + k * 0.45) % (Math.PI * 2)
      if (ang < a0 || ang > a1) continue
      const r = 46 + (k % 4) * 9
      ctx.fillStyle = 'rgba(255,240,210,.9)'
      ctx.beginPath()
      ctx.arc(Math.cos(ang) * r, Math.sin(ang) * r, 2.2, 0, 7)
      ctx.fill()
    }
  }
  const drawVoid = (ctx, t) => {
    const cx = W / 2
    const cy = 200
    drawStars(ctx, t, '#b9a6ff', 0.35)
    glow(ctx, cx, cy, 170, 'rgba(120,50,230,.28)')
    for (const p of INFALL) {
      const life = (t * p.sp * 0.22 + p.o) % 1
      const r = 34 + 150 * (1 - life)
      const a = p.a + life * 5
      ctx.globalAlpha = 0.15 + 0.7 * life
      ctx.fillStyle = life > 0.7 ? '#ffcf8a' : '#b38cff'
      ctx.beginPath()
      ctx.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.42, 1 + life * 1.4, 0, 7)
      ctx.fill()
    }
    ctx.globalAlpha = 1
    ctx.save()
    ctx.translate(cx, cy)
    ctx.scale(1, 0.3)
    diskHalf(ctx, t, Math.PI, Math.PI * 2)
    ctx.restore()
    ctx.strokeStyle = 'rgba(255,170,100,.45)'
    ctx.lineWidth = 5
    ctx.beginPath()
    ctx.arc(cx, cy, 40, Math.PI * 1.05, Math.PI * 1.95)
    ctx.stroke()
    ctx.fillStyle = '#000'
    ctx.beginPath()
    ctx.arc(cx, cy, 31, 0, 7)
    ctx.fill()
    ctx.strokeStyle = 'rgba(255,215,160,.9)'
    ctx.lineWidth = 1.6
    ctx.beginPath()
    ctx.arc(cx, cy, 32.5, 0, 7)
    ctx.stroke()
    ctx.save()
    ctx.translate(cx, cy)
    ctx.scale(1, 0.3)
    diskHalf(ctx, t, 0, Math.PI)
    ctx.restore()
  }
  const drawSkyFX = (ctx, S, t) => {
    if (S.fx === 'stars') drawStars(ctx, t, '#ffffff', 0.75)
    else if (S.fx === 'meteors') {
      drawStars(ctx, t, '#ffffff', 0.8)
      drawMeteors(ctx, t)
    } else if (S.fx === 'galaxy') {
      drawStars(ctx, t, '#ffffff', 0.6)
      drawGalaxy(ctx, t)
    } else if (S.fx === 'void') drawVoid(ctx, t)
  }

  // ---------- the ground, trees and seesaw ----------
  const drawTrees = (ctx, S) => {
    ctx.fillStyle = S.wood
    ctx.fillRect(-4, 30, 24, GROUND - 30)
    ctx.fillRect(W - 20, 30, 24, GROUND - 30)
    ctx.fillStyle = shade(S.wood, -0.3)
    ctx.fillRect(12, 30, 8, GROUND - 30)
    ctx.fillRect(W - 20, 30, 8, GROUND - 30)
    ctx.strokeStyle = S.wood
    ctx.lineCap = 'round'
    for (const b of BRANCHES) {
      const left = b.x1 < W / 2
      ctx.lineWidth = b.y < PERCH_Y ? 10 : 12
      ctx.beginPath()
      ctx.moveTo(left ? 12 : W - 12, b.y + 8)
      ctx.lineTo(left ? b.x2 : b.x1, b.y)
      ctx.stroke()
    }
    drawClusters(ctx, FOLIAGE, S.leaf)
  }
  const paintBackground = (S, target, t) => {
    const ctx = target.getContext('2d')
    const gr = ctx.createLinearGradient(0, 0, 0, GROUND)
    gr.addColorStop(0, S.sky[0])
    gr.addColorStop(1, S.sky[1])
    ctx.fillStyle = gr
    ctx.fillRect(0, 0, W, H)
    drawSkyFX(ctx, S, t)
    drawClusters(ctx, BUSHES, S.hill)
    ctx.fillStyle = S.soil
    ctx.fillRect(0, GROUND, W, H - GROUND)
    ctx.fillStyle = S.grass
    ctx.fillRect(0, GROUND, W, 12)
    drawTrees(ctx, S)
  }
  const drawSeesaw = (ctx, s) => {
    const L = endPos(s, -1)
    const R = endPos(s, 1)
    ctx.fillStyle = '#4b506b'
    ctx.beginPath()
    ctx.moveTo(PIVOT.x, PIVOT.y)
    ctx.lineTo(PIVOT.x - 20, GROUND)
    ctx.lineTo(PIVOT.x + 20, GROUND)
    ctx.closePath()
    ctx.fill()
    ctx.lineCap = 'round'
    ctx.strokeStyle = '#b8742f'
    ctx.lineWidth = 9
    ctx.beginPath()
    ctx.moveTo(L.x, L.y)
    ctx.lineTo(R.x, R.y)
    ctx.stroke()
    ctx.fillStyle = '#2b2f45'
    ctx.beginPath()
    ctx.arc(PIVOT.x, PIVOT.y, 4, 0, 7)
    ctx.fill()
  }
  const drawShuriken = (ctx, x, y, r) => {
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(r)
    ctx.fillStyle = '#cfd6e6'
    ctx.strokeStyle = '#3b4256'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4
      const rad = i % 2 === 0 ? 13 : 4.5
      ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad)
    }
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = '#3b4256'
    ctx.beginPath()
    ctx.arc(0, 0, 2.5, 0, 7)
    ctx.fill()
    ctx.restore()
  }

  // ---------- the scoreboard ----------
  const drawHUD = (ctx, s, S) => {
    const top = GROUND + 26
    ctx.fillStyle = 'rgba(10,16,10,.6)'
    roundRect(ctx, 14, top, W - 28, H - top - 14, 16)
    ctx.fill()
    ctx.textBaseline = 'middle'
    ctx.textAlign = 'left'
    ctx.fillStyle = '#fff'
    ctx.font = '800 26px system-ui'
    ctx.fillText(`⭐ ${s.score}`, 30, top + 28)
    ctx.textAlign = 'right'
    if (s.hp > 0) {
      ctx.font = `20px ${EF}`
      ctx.fillStyle = '#fff'
      ctx.fillText('💖'.repeat(s.hp), W - 30 - (MAX_HEARTS - s.hp) * 26, top + 28)
      ctx.globalAlpha = 0.25
      ctx.fillText('🤍'.repeat(MAX_HEARTS - s.hp), W - 30, top + 28)
      ctx.globalAlpha = 1
    } else {
      ctx.font = '700 13px system-ui'
      ctx.fillStyle = '#ef476f'
      ctx.fillText('☠️ one hit = out', W - 30, top + 28)
    }
    ctx.font = '600 13px system-ui'
    ctx.fillStyle = '#d6efd0'
    ctx.textAlign = 'left'
    ctx.fillText(s.free ? `Free play · ×${s.mult}` : `${s.cost} point game · ×${s.mult}`, 30, top + 56)
    ctx.textAlign = 'right'
    ctx.fillText(`Lv ${s.level} · ${S.name}`, W - 30, top + 56)
    const a = threshold(s.level)
    const b = threshold(s.level + 1)
    const p = clamp((s.basic - a) / (b - a), 0, 1)
    ctx.fillStyle = 'rgba(255,255,255,.18)'
    ctx.fillRect(30, top + 72, W - 60, 4)
    ctx.fillStyle = '#06d6a0'
    ctx.fillRect(30, top + 72, (W - 60) * p, 4)
    for (let i = 0; i < 5; i++) {
      const x = 30 + ((W - 60) * (i + 0.5)) / 5
      emoji(ctx, S.fruit[i], x, top + 100, 22)
      ctx.font = '700 12px system-ui'
      ctx.fillStyle = TIER_COLORS[i]
      ctx.textAlign = 'center'
      ctx.fillText('×' + TIERS[i].m, x, top + 122)
    }
    if (s.phase === 'ready' && !s.over) {
      ctx.globalAlpha = 0.55 + 0.45 * Math.sin(s.t * 6)
      ctx.fillStyle = '#ffd166'
      ctx.font = '800 13px system-ui'
      ctx.textAlign = 'center'
      ctx.fillText('TAP TO JUMP', W / 2, top + 146)
      ctx.globalAlpha = 1
    }
    if (s.banner.t > 0) {
      ctx.globalAlpha = clamp(s.banner.t, 0, 1)
      ctx.fillStyle = 'rgba(10,16,10,.7)'
      roundRect(ctx, 40, 222, W - 80, 54, 14)
      ctx.fill()
      ctx.fillStyle = '#ffd166'
      ctx.font = '800 20px system-ui'
      ctx.textAlign = 'center'
      ctx.fillText(s.banner.text, W / 2, 249)
      ctx.globalAlpha = 1
    }
  }

  // One frame of run `s` (or the menu's idle scene), with `buddies`
  // [first, second] for chars 0 and 1.
  function draw(s, { buddies }) {
    const ctx = main
    const S = setFor(s.level)
    const fading = s.fadeT < 1 && setFor(s.fadeFrom) !== S
    const k = fading ? ease(s.fadeT) : 1
    const P = fading ? setFor(s.fadeFrom) : null
    paintBackground(S, bgNew, s.t)
    if (fading) paintBackground(P, bgOld, s.t)
    ctx.save()
    if (s.shake > 0) ctx.translate((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10)
    if (fading) {
      ctx.drawImage(bgOld, 0, 0, W, H)
      ctx.globalAlpha = k
    }
    ctx.drawImage(bgNew, 0, 0, W, H)
    ctx.globalAlpha = 1

    for (const fr of s.fruits) {
      const y = fruitY(s, fr)
      if (fr.life !== null && fr.life < 3 && Math.floor(s.t * 8) % 2) continue
      if (fr.tier >= 2) {
        ctx.fillStyle = ['', '', 'rgba(76,201,240,.28)', 'rgba(199,125,255,.33)', 'rgba(255,209,102,.5)'][fr.tier]
        ctx.beginPath()
        ctx.arc(fr.x, y, fr.tier === 4 ? 22 + Math.sin(s.t * 6) * 3 : 17, 0, 7)
        ctx.fill()
      }
      const size = fr.tier === 4 ? 28 : 24
      if (fading) {
        ctx.globalAlpha = 1 - k
        emoji(ctx, P.fruit[fr.tier], fr.x, y, size)
        ctx.globalAlpha = k
        emoji(ctx, S.fruit[fr.tier], fr.x, y, size)
        ctx.globalAlpha = 1
      } else emoji(ctx, S.fruit[fr.tier], fr.x, y, size)
    }

    drawSeesaw(ctx, s)
    const blink = s.inv > 0 && Math.floor(s.t * 14) % 2 === 0
    if (!blink) {
      s.chars.forEach((c, i) => {
        const face = buddies[i]
        if (c.rot) {
          ctx.save()
          ctx.translate(c.x, c.y)
          ctx.rotate(c.rot)
          emoji(ctx, face, 0, 0, 34)
          ctx.restore()
        } else emoji(ctx, face, c.x, c.y, 34)
      })
    }

    for (const sh of s.shurikens) {
      if (sh.warn > 0) {
        if (Math.floor(s.t * 10) % 2) {
          const x = sh.vx > 0 ? 14 : W - 14
          ctx.fillStyle = sh.heart ? '#ff7ac8' : '#ef476f'
          ctx.beginPath()
          ctx.arc(x, sh.y, 10, 0, 7)
          ctx.fill()
          ctx.fillStyle = '#fff'
          ctx.font = 'bold 14px system-ui'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(sh.heart ? '♥' : '!', x, sh.y + 1)
        }
        continue
      }
      if (sh.heart) {
        const pulse = 1 + Math.sin(s.t * 8) * 0.08
        glow(ctx, sh.x, sh.y, 30 * pulse, 'rgba(255,90,190,.75)')
        emoji(ctx, '💖', sh.x, sh.y, 24 * pulse)
      } else drawShuriken(ctx, sh.x, sh.y, sh.r)
    }
    for (const p of s.fx) {
      const a = clamp(p.t / p.max, 0, 1)
      ctx.globalAlpha = a
      if (p.emoji) emoji(ctx, p.emoji, p.x, p.y, 30 * (1.4 - a * 0.4))
      else {
        ctx.font = `800 ${p.size}px system-ui`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.lineWidth = 4
        ctx.strokeStyle = 'rgba(0,0,0,.55)'
        ctx.strokeText(p.text, p.x, p.y)
        ctx.fillStyle = p.color
        ctx.fillText(p.text, p.x, p.y)
      }
      ctx.globalAlpha = 1
    }
    ctx.restore()
    if (!s.idle) drawHUD(ctx, s, S)
  }

  return { draw }
}
