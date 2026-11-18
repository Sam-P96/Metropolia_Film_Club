// Crash's scene, behind the chart (CrashStage.jsx), driven by the live
// multiplier. Every tier fades in and out smoothly as the multiplier moves
// both ways, so nothing pops:
//   below 0.8x   big flames, embers, a red glow, the screen shaking a little
//   0.8x to 1x   small flames licking the bottom edge
//   1x to 2x     calm deep green (the chart's line glows)
//   2x to 5x     the green darkens into space; mint and white stars drift
//                past in layers, faster as it climbs, the brightest with
//                four-point lens flares
//   5x to 10x    a black hole opens, like Forrest Bounce's Void: a void
//                swallowing the stars, its accretion disk whirling, matter
//                spiralling in; pink and gold sparkles. It starts tiny and
//                grows with the multiplier, until at 25x it nearly fills
//                the view
//   10x to 25x   spiral galaxies (green cores, pink arms) fly in from off
//                the edges, aqua dust, shooting stars; from about 17x the
//                black hole pulls the galaxies in, and by about 21x it has
//                eaten them
//   a crash      a flash, then everything fades to grey
// Over it all, a feathered shadow in from the edges, round a clear circle
// in the middle, so the chart (on its own canvas, on top) stands apart.
// The background blends from deep red below 1x to deep green above it,
// with no hard edge at 1x.
//
// Particles come from a fixed pool (no new objects while it runs): about
// 300 on a computer, 120 on a phone. With reduced motion: no shake, no
// shooting stars, far fewer particles, mostly colour changes.

export const PALETTE = {
  space: '#04140F',
  calm: '#0B3A25',
  emerald: '#1FD18B',
  mint: '#B8FFE0',
  pink: '#FF4FA3',
  violet: '#9B5CFF',
  aqua: '#3EE8FF',
  gold: '#FFD76A',
  fireTop: '#2A060C',
  fireBottom: '#D81E3A',
  flame: '#FF7A1A',
}

const TAU = Math.PI * 2
const clamp01 = (x) => Math.min(1, Math.max(0, x))
const smooth = (a, b, x) => {
  const t = clamp01((x - a) / (b - a))
  return t * t * (3 - 2 * t)
}
const hexRgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
function mix(a, b, t) {
  const [r1, g1, b1] = hexRgb(a)
  const [r2, g2, b2] = hexRgb(b)
  return `rgb(${Math.round(r1 + (r2 - r1) * t)}, ${Math.round(g1 + (g2 - g1) * t)}, ${Math.round(b1 + (b2 - b1) * t)})`
}
const rgba = (hex, a) => {
  const [r, g, b] = hexRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${a})`
}

// ---- Pictures drawn once ----

function sprite(size, draw) {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  draw(canvas.getContext('2d'), size)
  return canvas
}

// A flame: white-yellow at the heart, orange, then nothing.
const makeFlame = () =>
  sprite(96, (c, s) => {
    const g = c.createRadialGradient(s / 2, s * 0.6, 0, s / 2, s * 0.55, s / 2)
    g.addColorStop(0, 'rgba(255, 244, 176, 0.95)')
    g.addColorStop(0.25, 'rgba(255, 200, 80, 0.8)')
    g.addColorStop(0.55, rgba(PALETTE.flame, 0.55))
    g.addColorStop(1, 'rgba(216, 30, 58, 0)')
    c.fillStyle = g
    c.fillRect(0, 0, s, s)
  })

// A four-point lens flare, for the brightest stars: a soft core, and two
// long thin spikes crossing it, each brightest in the middle and fading to
// nothing at its tips.
const makeFlare = () =>
  sprite(128, (c, s) => {
    const mid = s / 2
    const core = c.createRadialGradient(mid, mid, 0, mid, mid, s * 0.16)
    core.addColorStop(0, 'rgba(255, 255, 255, 1)')
    core.addColorStop(0.3, rgba(PALETTE.mint, 0.6))
    core.addColorStop(1, rgba(PALETTE.mint, 0))
    c.fillStyle = core
    c.fillRect(0, 0, s, s)
    for (const across of [true, false]) {
      const spike = across ? c.createLinearGradient(0, mid, s, mid) : c.createLinearGradient(mid, 0, mid, s)
      spike.addColorStop(0, 'rgba(255, 255, 255, 0)')
      spike.addColorStop(0.5, 'rgba(255, 255, 255, 0.95)')
      spike.addColorStop(1, 'rgba(255, 255, 255, 0)')
      c.fillStyle = spike
      c.beginPath()
      // A thin diamond: widest (3 pixels) at the core, to a point at each end.
      if (across) {
        c.moveTo(0, mid)
        c.lineTo(mid, mid - 1.5)
        c.lineTo(s, mid)
        c.lineTo(mid, mid + 1.5)
      } else {
        c.moveTo(mid, 0)
        c.lineTo(mid + 1.5, mid)
        c.lineTo(mid, s)
        c.lineTo(mid - 1.5, mid)
      }
      c.fill()
    }
  })

// ---- The black hole ----
// Drawn like Forrest Bounce's, in its last stage, the Void
// (components/forrest/draw.js drawVoid), at its sizes: the hole 31 across
// the middle, its photon ring, and the accretion disk round it, scaled to
// fit the stage. Where it sits, as shares of the stage (moving to the
// middle as it grows), and its radius as a share of the stage's shorter
// side: tiny as it opens at 5x, growing with the multiplier, until at
// 25x it nearly fills the view.
const HOLE = { x: 0.56, y: 0.5, bigX: 0.5, smallest: 0.03, biggest: 0.46 }
// Where each galaxy lives (shares of the stage), and where it flies in
// from, off the edge of the stage, as it fades in.
const GALAXIES = [
  { x: 0.3, y: 0.6, fromX: -0.45, fromY: 0.35, size: 0.8 },
  { x: 0.78, y: 0.3, fromX: 0.45, fromY: -0.45, size: 0.55 },
]
// The accretion disk's rings, from the outside in: radius, width and colour.
const DISK_RINGS = [
  [78, 9, 'rgba(160,80,255,.35)'],
  [64, 9, 'rgba(255,120,60,.55)'],
  [52, 7, 'rgba(255,175,95,.8)'],
  [43, 5, 'rgba(255,230,180,.9)'],
]

// Half the accretion disk, from angle `from` to `to` (radians), round
// (0, 0) in the hole's own units, with bright knots of matter whirling
// along it. Forrest's diskHalf.
function diskHalf(ctx, t, from, to) {
  for (const [r, width, colour] of DISK_RINGS) {
    ctx.strokeStyle = colour
    ctx.lineWidth = width
    ctx.beginPath()
    ctx.arc(0, 0, r, from, to)
    ctx.stroke()
  }
  ctx.fillStyle = 'rgba(255,240,210,.9)'
  for (let k = 0; k < 14; k++) {
    const angle = (t * (1.6 - k * 0.05) + k * 0.45) % TAU
    if (angle < from || angle > to) continue
    const r = 46 + (k % 4) * 9
    ctx.beginPath()
    ctx.arc(Math.cos(angle) * r, Math.sin(angle) * r, 2.2, 0, TAU)
    ctx.fill()
  }
}

// A soft round glow of `colour` at (x, y), out to radius `r`.
function softGlow(ctx, x, y, r, colour) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r)
  g.addColorStop(0, colour)
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = g
  ctx.fillRect(x - r, y - r, r * 2, r * 2)
}

// A spiral galaxy: a green core and two pink arms of stars.
const makeGalaxy = (seed) =>
  sprite(256, (c, s) => {
    let a = seed
    const rand = () => ((a = (a * 16807) % 2147483647) / 2147483647)
    const mid = s / 2
    c.globalCompositeOperation = 'lighter'
    const core = c.createRadialGradient(mid, mid, 0, mid, mid, s * 0.2)
    core.addColorStop(0, 'rgba(230, 255, 240, 0.95)')
    core.addColorStop(0.3, rgba(PALETTE.emerald, 0.7))
    core.addColorStop(1, rgba(PALETTE.emerald, 0))
    c.fillStyle = core
    c.fillRect(0, 0, s, s)
    for (let arm = 0; arm < 2; arm++) {
      for (let i = 0; i < 260; i++) {
        const t = i / 260
        const angle = arm * Math.PI + t * 3.4 * Math.PI + (rand() - 0.5) * 0.35
        const r = s * (0.04 + t * 0.44) + (rand() - 0.5) * 6
        const x = mid + Math.cos(angle) * r
        const y = mid + Math.sin(angle) * r * 0.62
        c.fillStyle = rand() < 0.75 ? rgba(PALETTE.pink, (1 - t) * 0.75) : `rgba(255, 255, 255, ${(1 - t) * 0.8})`
        c.beginPath()
        c.arc(x, y, 0.6 + rand() * 1.6 * (1 - t * 0.5), 0, TAU)
        c.fill()
      }
    }
  })

function fourPoint(ctx, size) {
  ctx.beginPath()
  ctx.moveTo(0, -size)
  ctx.quadraticCurveTo(0, 0, size, 0)
  ctx.quadraticCurveTo(0, 0, 0, size)
  ctx.quadraticCurveTo(0, 0, -size, 0)
  ctx.quadraticCurveTo(0, 0, 0, -size)
  ctx.fill()
}

// ---- The scene ----

export function createEffects({ mobile = false, reduced = false } = {}) {
  const cap = reduced ? (mobile ? 30 : 60) : mobile ? 120 : 300
  const pool = Array.from({ length: cap }, () => ({ alive: false }))
  let cursor = 0
  function spawn() {
    for (let i = 0; i < cap; i++) {
      const particle = pool[(cursor + i) % cap]
      if (!particle.alive) {
        cursor = (cursor + i + 1) % cap
        particle.alive = true
        return particle
      }
    }
    return null
  }

  // Each star has a depth, 0.25 (far: small, slow) to 1 (near: bigger,
  // faster), so they drift past in layers. About one in eight, the
  // nearest, shine bright enough for a lens flare.
  const starCount = reduced ? (mobile ? 30 : 50) : mobile ? 55 : 110
  const stars = Array.from({ length: starCount }, () => {
    const depth = 0.25 + Math.random() * 0.75
    return {
      x: Math.random(),
      y: Math.random(),
      depth,
      r: 0.3 + depth * 1.4,
      phase: Math.random() * TAU,
      speed: 0.6 + Math.random() * 1.8,
      colour: Math.random() < 0.6 ? PALETTE.mint : '#ffffff',
      flare: depth > 0.9,
    }
  })
  const flame = makeFlame()
  const flare = makeFlare()
  // The black hole's sparks of matter spiralling in, each at its own
  // angle, place in its fall, and speed (Forrest's INFALL).
  const infall = Array.from({ length: reduced ? 30 : mobile ? 50 : 80 }, () => ({ a: Math.random() * TAU, o: Math.random(), sp: 0.5 + Math.random() * 0.9 }))
  const galaxies = [makeGalaxy(11), makeGalaxy(23)]

  // How strong each tier is now, eased towards where the multiplier says.
  const level = { fire: 0, bigFire: 0, green: 0.6, space: 0, stars: 0, hole: 0, holeSize: 0, galaxy: 0, swallow: 0 }
  const debt = { flame: 0, ember: 0, sparkle: 0, dust: 0 }
  let nextShooting = 1.5
  const rate = reduced ? 0.25 : 1

  function emit(kind, perSecond, dt, make) {
    debt[kind] += perSecond * rate * dt
    while (debt[kind] >= 1) {
      debt[kind] -= 1
      const particle = spawn()
      if (!particle) {
        debt[kind] = 0
        return
      }
      make(particle)
    }
  }

  // Draws a frame: `scene` is { m, crashed, crashAge } (crashAge in ms).
  // Returns how far to shake the stage: { x, y } in CSS pixels.
  function frame(ctx, w, h, scene, dt, now) {
    const m = scene.m
    const targets = {
      fire: 1 - smooth(0.8, 1.0, m),
      bigFire: 1 - smooth(0.7, 0.82, m),
      green: smooth(0.96, 1.08, m),
      space: smooth(1.7, 2.6, m),
      stars: smooth(1.9, 2.8, m),
      hole: smooth(4.6, 6.2, m),
      galaxy: smooth(9.2, 11.5, m),
      // The galaxies falling into the black hole, at about 20x.
      swallow: smooth(17, 21.5, m),
      // How far the black hole has grown, 0 at 5x to 1 at 25x, evenly on
      // the multiplier's log scale (as the chart is): each doubling, the
      // same step.
      holeSize: clamp01(Math.log(Math.max(m, 5) / 5) / Math.log(5)),
    }
    const ease = 1 - Math.exp(-dt * 4)
    for (const key of Object.keys(level)) level[key] += (targets[key] - level[key]) * ease
    const calm = !scene.crashed
    const unit = Math.min(w, h) / 400

    // The background: fire red below 1x, deep green above, darkening to space.
    ctx.globalCompositeOperation = 'source-over'
    ctx.globalAlpha = 1
    ctx.fillStyle = mix(PALETTE.calm, PALETTE.space, level.space)
    ctx.fillRect(0, 0, w, h)
    if (level.green < 0.999) {
      const fire = ctx.createLinearGradient(0, 0, 0, h)
      fire.addColorStop(0, PALETTE.fireTop)
      fire.addColorStop(1, PALETTE.fireBottom)
      ctx.globalAlpha = 1 - level.green
      ctx.fillStyle = fire
      ctx.fillRect(0, 0, w, h)
      ctx.globalAlpha = 1
    }
    if (level.fire > 0.01) {
      const glow = ctx.createRadialGradient(w / 2, h * 1.05, 0, w / 2, h * 1.05, h * 0.9)
      glow.addColorStop(0, `rgba(255, 70, 40, ${0.55 * level.fire})`)
      glow.addColorStop(1, 'rgba(255, 70, 40, 0)')
      ctx.fillStyle = glow
      ctx.fillRect(0, 0, w, h)
    }

    ctx.globalCompositeOperation = 'lighter'

    // Stars, drifting past to the lower left, the nearest fastest, and
    // quicker as the multiplier climbs: flying up through space with the
    // chart. One that leaves comes back in at the far side. `flow`: how far
    // a near star goes in a second, as a share of the screen.
    const flow = reduced ? 0 : 0.01 + 0.035 * smooth(2, 20, m)
    for (const star of stars) {
      star.x -= flow * star.depth * dt
      star.y += flow * star.depth * 0.45 * dt
      if (star.x < -0.02) {
        star.x += 1.04
        star.y = Math.random()
      } else if (star.y > 1.02) {
        star.y -= 1.04
        star.x = Math.random()
      }
    }
    if (level.stars > 0.01) {
      for (const star of stars) {
        const twinkle = reduced ? 0.8 : 0.55 + 0.45 * Math.sin(now * 0.001 * star.speed + star.phase)
        const x = star.x * w
        const y = star.y * h
        const r = star.r * Math.max(0.8, unit)
        ctx.globalAlpha = level.stars * twinkle
        // The brightest: a lens flare, its spikes swelling as it twinkles
        // (and turning a touch).
        if (star.flare) {
          const size = r * (14 + 10 * twinkle)
          ctx.save()
          ctx.translate(x, y)
          ctx.rotate(reduced ? 0 : Math.sin(now * 0.0004 + star.phase) * 0.12)
          ctx.drawImage(flare, -size / 2, -size / 2, size, size)
          ctx.restore()
          continue
        }
        // The nearest ones, going fast, leave a short streak behind them.
        const streak = flow * star.depth * 0.3
        if (star.depth > 0.7 && streak * w > 2) {
          ctx.strokeStyle = star.colour
          ctx.lineWidth = r
          ctx.lineCap = 'round'
          ctx.beginPath()
          ctx.moveTo(x, y)
          ctx.lineTo(x + streak * w, y - streak * 0.45 * h)
          ctx.stroke()
        } else {
          ctx.fillStyle = star.colour
          ctx.beginPath()
          ctx.arc(x, y, r, 0, TAU)
          ctx.fill()
        }
      }
    }

    // Where the black hole is now: drifting a little round its spot.
    const t = reduced ? 0 : now / 1000
    const grown = Math.pow(level.holeSize, 1.6)
    const holeR = Math.min(w, h) * (HOLE.smallest + (HOLE.biggest - HOLE.smallest) * grown)
    const drift = 0.02 * (1 - grown)
    const hole = { x: w * (HOLE.x + (HOLE.bigX - HOLE.x) * grown + Math.sin(t / 15) * drift), y: h * (HOLE.y + Math.cos(t / 19) * drift) }
    const swallow = level.swallow

    // Galaxies, turning and wandering slowly, until the black hole pulls
    // them in (from about 17x, gone by about 21x): each spirals round it as
    // it falls, shrinking, stretched out towards it, spinning faster, and
    // fading into the dark. Drawn before the hole, so it covers them.
    if (level.galaxy > 0.01 && swallow < 0.995) {
      galaxies.forEach((galaxy, i) => {
        // Flying in from off the stage as they fade in (level.galaxy).
        const home = GALAXIES[i]
        const away = 1 - level.galaxy
        const homeX = w * (home.x + home.fromX * away * away + Math.sin(t / 9 + i) * 0.04)
        const homeY = h * (home.y + home.fromY * away * away + Math.cos(t / 11 + i) * 0.04)
        const dx = homeX - hole.x
        const dy = homeY - hole.y
        const turn = swallow * 2.4 * (i ? -1 : 1)
        const reach = 1 - swallow
        const x = hole.x + (dx * Math.cos(turn) - dy * Math.sin(turn)) * reach
        const y = hole.y + (dx * Math.sin(turn) + dy * Math.cos(turn)) * reach
        const size = Math.min(w, h) * home.size * (1 - 0.85 * swallow)
        const towards = Math.atan2(hole.y - y, hole.x - x)
        ctx.save()
        ctx.translate(x, y)
        ctx.rotate(towards)
        ctx.scale(1 + 1.6 * swallow, 1 - 0.5 * swallow)
        ctx.rotate(-towards + (reduced ? 0 : now * 0.00007 * (i ? -1 : 1)) + i + swallow * 6 * (i ? -1 : 1))
        ctx.globalAlpha = level.galaxy * 0.9 * (1 - swallow * swallow)
        ctx.drawImage(galaxy, -size / 2, -size / 2, size, size)
        ctx.restore()
      })
    }

    // New particles, by tier.
    if (calm) {
      emit('flame', level.fire * 14 + level.bigFire * 36, dt, (p) => {
        p.kind = 'flame'
        p.x = Math.random() * w
        p.y = h + 10 * unit
        p.vx = (Math.random() - 0.5) * 20
        p.vy = -(30 + Math.random() * 50 + level.bigFire * 110) * unit
        p.size = (18 + level.bigFire * 46) * (0.6 + Math.random() * 0.6) * unit
        p.life = 0.7 + Math.random() * 0.8 + level.bigFire * 0.4
        p.age = 0
        p.phase = Math.random() * TAU
      })
      emit('ember', level.bigFire * 28, dt, (p) => {
        p.kind = 'ember'
        p.x = Math.random() * w
        p.y = h
        p.vx = (Math.random() - 0.5) * 40
        p.vy = -(90 + Math.random() * 140) * unit
        p.size = (1 + Math.random() * 1.8) * Math.max(1, unit)
        p.life = 0.9 + Math.random() * 0.9
        p.age = 0
        p.phase = Math.random() * TAU
        p.colour = Math.random() < 0.5 ? '#ffd27a' : PALETTE.flame
      })
      emit('sparkle', level.hole * 6 + level.galaxy * 5, dt, (p) => {
        p.kind = 'sparkle'
        p.x = Math.random() * w
        p.y = Math.random() * h
        p.vx = 0
        p.vy = 0
        p.size = (3 + Math.random() * 7) * Math.max(1, unit)
        p.life = 0.9 + Math.random() * 0.8
        p.age = 0
        p.colour = Math.random() < 0.55 ? PALETTE.pink : PALETTE.gold
      })
      emit('dust', level.galaxy * 16, dt, (p) => {
        p.kind = 'dust'
        p.x = Math.random() * w
        p.y = Math.random() * h
        p.vx = (8 + Math.random() * 16) * unit
        p.vy = (-4 - Math.random() * 8) * unit
        p.size = (0.8 + Math.random() * 1.4) * Math.max(1, unit)
        p.life = 2 + Math.random() * 2
        p.age = 0
      })
      if (!reduced && level.galaxy > 0.4) {
        nextShooting -= dt
        if (nextShooting <= 0) {
          nextShooting = 1.2 + Math.random() * 2.2
          const p = spawn()
          if (p) {
            p.kind = 'shooting'
            p.x = Math.random() * w * 0.7
            p.y = Math.random() * h * 0.35
            p.vx = (380 + Math.random() * 260) * unit
            p.vy = (150 + Math.random() * 90) * unit
            p.size = 1.6 * Math.max(1, unit)
            p.life = 0.7
            p.age = 0
          }
        }
      }
    }

    // Move and draw the particles.
    for (const p of pool) {
      if (!p.alive) continue
      p.age += dt
      if (p.age >= p.life) {
        p.alive = false
        continue
      }
      const k = p.age / p.life
      p.x += p.vx * dt
      p.y += p.vy * dt
      if (p.kind === 'flame') {
        const wobble = reduced ? 0 : Math.sin(now * 0.008 + p.phase) * 6 * unit
        const size = p.size * (1 - k * 0.55)
        ctx.globalAlpha = (1 - k) * 0.9
        ctx.drawImage(flame, p.x - size / 2 + wobble, p.y - size * 0.7, size, size * 1.4)
      } else if (p.kind === 'ember') {
        ctx.globalAlpha = 1 - k
        ctx.fillStyle = p.colour
        ctx.beginPath()
        ctx.arc(p.x + (reduced ? 0 : Math.sin(now * 0.01 + p.phase) * 3), p.y, p.size, 0, TAU)
        ctx.fill()
      } else if (p.kind === 'sparkle') {
        const pulse = Math.sin(k * Math.PI)
        ctx.globalAlpha = pulse
        ctx.fillStyle = p.colour
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(reduced ? 0 : k * 0.8)
        fourPoint(ctx, p.size * (0.4 + pulse * 0.6))
        ctx.restore()
      } else if (p.kind === 'dust') {
        ctx.globalAlpha = Math.sin(k * Math.PI) * 0.8 * level.galaxy
        ctx.fillStyle = PALETTE.aqua
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, TAU)
        ctx.fill()
      } else if (p.kind === 'shooting') {
        const tail = ctx.createLinearGradient(p.x, p.y, p.x - p.vx * 0.12, p.y - p.vy * 0.12)
        tail.addColorStop(0, `rgba(220, 255, 255, ${1 - k})`)
        tail.addColorStop(1, 'rgba(62, 232, 255, 0)')
        ctx.globalAlpha = 1
        ctx.strokeStyle = tail
        ctx.lineWidth = p.size
        ctx.lineCap = 'round'
        ctx.beginPath()
        ctx.moveTo(p.x, p.y)
        ctx.lineTo(p.x - p.vx * 0.12, p.y - p.vy * 0.12)
        ctx.stroke()
      }
    }

    // The black hole (from 5x), last of all so nothing shows inside it,
    // like Forrest Bounce's Void: darkness round
    // it swallowing the stars, a purple glow, sparks of matter spiralling
    // in (purple, turning gold near the edge), the disk's far half behind
    // the hole and its light bent up over the top, the hole itself and its
    // thin bright edge, then the disk's near half in front. It starts tiny
    // and grows with the multiplier (holeR above), and glows brighter as it
    // eats the galaxies.
    if (level.hole > 0.01) {
      const k = holeR / 31
      ctx.save()
      ctx.globalCompositeOperation = 'source-over'
      ctx.globalAlpha = level.hole
      // The darkness hugs it closer as it grows, so the view never goes
      // all black.
      const darkR = holeR * (4 - 2 * grown)
      const dark = ctx.createRadialGradient(hole.x, hole.y, holeR, hole.x, hole.y, darkR)
      dark.addColorStop(0, 'rgba(0, 0, 0, 0.85)')
      dark.addColorStop(1, 'rgba(0, 0, 0, 0)')
      ctx.fillStyle = dark
      ctx.fillRect(hole.x - darkR, hole.y - darkR, darkR * 2, darkR * 2)
      softGlow(ctx, hole.x, hole.y, 170 * k * (1 + 0.4 * swallow), `rgba(120, 50, 230, ${0.28 + 0.22 * swallow})`)
      for (const p of infall) {
        const life = (t * p.sp * 0.22 + p.o) % 1
        const r = (34 + 150 * (1 - life)) * k
        const angle = p.a + life * 5
        ctx.globalAlpha = level.hole * (0.15 + 0.7 * life)
        ctx.fillStyle = life > 0.7 ? '#ffcf8a' : '#b38cff'
        ctx.beginPath()
        ctx.arc(hole.x + Math.cos(angle) * r, hole.y + Math.sin(angle) * r * 0.42, (1 + life * 1.4) * Math.min(2.5, Math.max(1, k)), 0, TAU)
        ctx.fill()
      }
      ctx.globalAlpha = level.hole
      ctx.translate(hole.x, hole.y)
      ctx.scale(k, k)
      ctx.save()
      ctx.scale(1, 0.3)
      diskHalf(ctx, t, Math.PI, TAU)
      ctx.restore()
      ctx.strokeStyle = 'rgba(255, 170, 100, 0.45)'
      ctx.lineWidth = 5
      ctx.beginPath()
      ctx.arc(0, 0, 40, Math.PI * 1.05, Math.PI * 1.95)
      ctx.stroke()
      ctx.fillStyle = '#000'
      ctx.beginPath()
      ctx.arc(0, 0, 31, 0, TAU)
      ctx.fill()
      ctx.strokeStyle = 'rgba(255, 215, 160, 0.9)'
      ctx.lineWidth = 1.6
      ctx.beginPath()
      ctx.arc(0, 0, 32.5, 0, TAU)
      ctx.stroke()
      ctx.save()
      ctx.scale(1, 0.3)
      diskHalf(ctx, t, 0, Math.PI)
      ctx.restore()
      ctx.restore()
      ctx.globalCompositeOperation = 'lighter'
    }

    // A feathered shadow in from the edges of the stage, round a clear
    // circle in the middle, softening out to it: the scene darkens towards
    // the edges, behind the chart (which has a canvas of its own, on top),
    // so the line stands apart from everything behind it.
    {
      const cx = w / 2
      const cy = h / 2
      const clear = Math.min(w, h) * (w > h * 1.6 ? 0.4 : 0.3)
      const edge = Math.hypot(w, h) / 2
      const shade = ctx.createRadialGradient(cx, cy, clear, cx, cy, edge)
      shade.addColorStop(0, 'rgba(0, 0, 0, 0)')
      shade.addColorStop(0.45, 'rgba(0, 0, 0, 0.32)')
      shade.addColorStop(1, 'rgba(0, 0, 0, 0.72)')
      ctx.globalCompositeOperation = 'source-over'
      ctx.globalAlpha = 1
      ctx.fillStyle = shade
      ctx.fillRect(0, 0, w, h)
    }

    // A crash: a flash, then the colour drains out.
    ctx.globalCompositeOperation = 'source-over'
    if (scene.crashed) {
      const flash = Math.max(0, 1 - scene.crashAge / 350)
      const grey = smooth(200, 1300, scene.crashAge)
      if (grey > 0) {
        ctx.globalCompositeOperation = 'saturation'
        ctx.globalAlpha = grey
        ctx.fillStyle = '#808080'
        ctx.fillRect(0, 0, w, h)
        ctx.globalCompositeOperation = 'source-over'
        ctx.globalAlpha = grey * 0.35
        ctx.fillStyle = '#000'
        ctx.fillRect(0, 0, w, h)
      }
      if (flash > 0 && !reduced) {
        ctx.globalAlpha = flash * 0.75
        ctx.fillStyle = '#fff'
        ctx.fillRect(0, 0, w, h)
      }
    }
    ctx.globalAlpha = 1

    // A little shake while it burns.
    if (reduced || !calm || level.bigFire < 0.05) return { x: 0, y: 0 }
    const amount = 3.5 * level.bigFire
    return { x: (Math.random() - 0.5) * 2 * amount, y: (Math.random() - 0.5) * 2 * amount }
  }

  return { frame }
}
