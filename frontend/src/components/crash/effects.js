// Crash's scene, behind the chart (CrashStage.jsx), driven by the live
// multiplier. Every tier fades in and out smoothly as the multiplier moves
// both ways, so nothing pops:
//   below 0.8x   big flames, embers, a red glow, the screen shaking a little
//   0.8x to 1x   small flames licking the bottom edge
//   1x to 2x     calm deep green (the chart's line glows)
//   2x to 5x     the green darkens into space; mint and white stars
//   5x to 10x    emerald and violet nebulae drift in; pink and gold sparkles
//   10x to 25x   spiral galaxies (green cores, pink arms), aqua dust,
//                shooting stars
//   a crash      a flash, then everything fades to grey
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

// A cloud of nebula: a few soft blobs of one colour.
const makeCloud = (colour, seed) =>
  sprite(256, (c, s) => {
    let a = seed
    const rand = () => ((a = (a * 16807) % 2147483647) / 2147483647)
    // Each blob fades out inside the square, so the cloud has no edges.
    for (let i = 0; i < 5; i++) {
      const r = s * (0.22 + rand() * 0.12)
      const x = s / 2 + (rand() - 0.5) * s * 0.2
      const y = s / 2 + (rand() - 0.5) * s * 0.2
      const g = c.createRadialGradient(x, y, 0, x, y, r)
      g.addColorStop(0, rgba(colour, 0.34))
      g.addColorStop(1, rgba(colour, 0))
      c.fillStyle = g
      c.fillRect(0, 0, s, s)
    }
  })

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

  const starCount = reduced ? (mobile ? 30 : 50) : mobile ? 55 : 110
  const stars = Array.from({ length: starCount }, () => ({
    x: Math.random(),
    y: Math.random(),
    r: 0.4 + Math.random() * 1.3,
    phase: Math.random() * TAU,
    speed: 0.6 + Math.random() * 1.8,
    colour: Math.random() < 0.6 ? PALETTE.mint : '#ffffff',
  }))
  const flame = makeFlame()
  const clouds = [makeCloud(PALETTE.emerald, 7), makeCloud(PALETTE.violet, 19), makeCloud(PALETTE.emerald, 31)]
  const galaxies = [makeGalaxy(11), makeGalaxy(23)]

  // How strong each tier is now, eased towards where the multiplier says.
  const level = { fire: 0, bigFire: 0, green: 0.6, space: 0, stars: 0, nebula: 0, galaxy: 0 }
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
      nebula: smooth(4.6, 6.2, m),
      galaxy: smooth(9.2, 11.5, m),
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

    // Stars.
    if (level.stars > 0.01) {
      for (const star of stars) {
        const twinkle = reduced ? 0.8 : 0.55 + 0.45 * Math.sin(now * 0.001 * star.speed + star.phase)
        ctx.globalAlpha = level.stars * twinkle
        ctx.fillStyle = star.colour
        ctx.beginPath()
        ctx.arc(star.x * w, star.y * h, star.r * Math.max(0.8, unit), 0, TAU)
        ctx.fill()
      }
    }

    // Nebulae, drifting.
    if (level.nebula > 0.01) {
      clouds.forEach((cloud, i) => {
        const drift = reduced ? 0 : Math.sin(now / (9000 + i * 2300) + i * 2) * w * 0.06
        const size = Math.max(w, h) * (0.75 + i * 0.12)
        const x = [0.2, 0.75, 0.5][i] * w - size / 2 + drift
        const y = [0.3, 0.45, 0.8][i] * h - size / 2
        ctx.globalAlpha = level.nebula * 0.85
        ctx.drawImage(cloud, x, y, size, size)
      })
    }

    // Galaxies, turning slowly.
    if (level.galaxy > 0.01) {
      galaxies.forEach((galaxy, i) => {
        const size = Math.min(w, h) * (i ? 0.55 : 0.8)
        ctx.save()
        ctx.translate(w * (i ? 0.78 : 0.3), h * (i ? 0.3 : 0.6))
        ctx.rotate((reduced ? 0 : now * 0.00004 * (i ? -1 : 1)) + i)
        ctx.globalAlpha = level.galaxy * 0.9
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
      emit('sparkle', level.nebula * 6 + level.galaxy * 5, dt, (p) => {
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
