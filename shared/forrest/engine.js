// Forrest Bounce, played: two buddies take turns, one dropping from a branch
// onto the seesaw and launching the other up to the far tree, through the
// fruit, past the shurikens. The page plays a run here as you tap; the
// server plays it again from the same seed and taps
// (backend/utils/forrest.js) and pays from what it gets, so a score can't
// be made up.
//
// For the two to agree it has to come out exactly the same everywhere:
//   - a fixed step (DT, 120 a second), never the frame time
//   - the run's own random numbers, from its seed (mulberry32), never
//     Math.random
//   - only + - * / and Math.sqrt, which every browser and Node work out
//     the same, so sine and cosine are this file's own (dsin, dcos) and
//     distances are compared squared
// The drawing (frontend/src/components/forrest/draw.js) is free to use
// anything: it never changes the run.

import { TIERS, TIER_COLORS, threshold, setFor } from './rules.js'

export const W = 400
export const H = 640
export const GROUND = 427 // the ground sits at 2/3 of the screen
export const TICK_HZ = 120
export const DT = 1 / TICK_HZ
// A run ends after 20 minutes, however it's going.
export const MAX_TICKS = TICK_HZ * 60 * 20
export const MAX_HEARTS = 3
export const FADE_TIME = 1.6 // seconds for one stage to fade into the next
export const PERCH_Y = 160 // where buddies sit on the branches

const GRAV = 900
const HALF = 80
const TILT = 0.22
const PIVOT_Y = GROUND - 24 // the seesaw's pivot, in the middle
const PERCH_X = [62, W - 62]
const FRUIT_ON_SCREEN = 3
const HEART_CHANCE = 0.05 // a shuriken is sometimes a heart
const FLIP_TIME = 0.45
const DOUBLE_JUMP_HEIGHT = 70
// Shuriken heights: never the resting ones (a branch perch about 160, the
// seesaw seats 370 to 405).
const SHURIKEN_BANDS = [
  [96, 126],
  [194, 360],
]

// ---------- Maths that comes out the same everywhere ----------

const PI = 3.141592653589793
const TAU = 6.283185307179586
const HALF_PI = 1.5707963267948966

// sin(x) from a Taylor series on [-pi/2, pi/2] (within 6e-8).
export function dsin(x) {
  let r = x - Math.round(x / TAU) * TAU
  if (r > HALF_PI) r = PI - r
  else if (r < -HALF_PI) r = -PI - r
  const r2 = r * r
  return r * (1 - (r2 / 6) * (1 - (r2 / 20) * (1 - (r2 / 42) * (1 - (r2 / 72) * (1 - r2 / 110)))))
}
export const dcos = (x) => dsin(x + HALF_PI)

// The run's random numbers, from 0 up to 1 (mulberry32 on `s.rng`).
function random(s) {
  s.rng = (s.rng + 0x6d2b79f5) | 0
  let t = Math.imul(s.rng ^ (s.rng >>> 15), 1 | s.rng)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
const rand = (s, a, b) => a + random(s) * (b - a)
const near = (a, b, r) => (a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y) < r * r
export const ease = (t) => t * t * (3 - 2 * t)
const sideIdx = (side) => (side > 0 ? 1 : 0)

// ---------- A run ----------

// A new run from `seed` (a whole number) at multiplier `mult`. `visual`:
// keep the floating texts and puffs for drawing (the server doesn't need
// them).
// phase 'ready':  one buddy perched on a branch, one on the low end of the seesaw
// phase 'jump':   the perched buddy is dropping onto the raised end
// phase 'launch': the other buddy is flying up to the branch on the far side
export function newRun({ seed, mult, visual = true, idle = false }) {
  const s = {
    rng: seed | 0,
    mult,
    visual,
    idle,
    tick: 0,
    t: 0,
    score: 0,
    basic: 0, // fruit points, before the multiplier
    level: 1,
    taps: 0,
    inv: 0,
    shake: 0,
    over: false,
    endedBy: null,
    chars: [
      { x: 0, y: 0, rot: 0 },
      { x: 0, y: 0, rot: 0 },
    ],
    phase: 'ready',
    perch: { who: 0, side: -1 },
    seat: { who: 1, side: -1 },
    flight: null,
    tilt: -TILT,
    buffer: 0,
    fruits: [],
    shurikens: [],
    fx: [],
    nextShur: 4,
    hp: 0,
    fadeFrom: 1,
    fadeT: 1,
    banner: { text: 'Level 1 · Orchard', t: 2.2 },
  }
  for (let i = 0; i < FRUIT_ON_SCREEN; i++) spawnFruit(s, true)
  placeChars(s)
  return s
}

function spawnFruit(s, initial) {
  const has100 = s.fruits.some((f) => f.tier === 4)
  const ws = TIERS.map((tier, i) => (i === 4 && has100 ? 0 : tier.w))
  let r = random(s) * ws.reduce((a, b) => a + b, 0)
  let tier = 0
  for (let i = 0; i < ws.length; i++) {
    if (r < ws[i]) {
      tier = i
      break
    }
    r -= ws[i]
  }
  const T = TIERS[tier]
  const dir = random(s) < 0.5 ? 1 : -1
  const sp = rand(s, 70, 120) * (1 + 0.1 * (s.level - 1)) * (tier === 4 ? 1.4 : 1)
  s.fruits.push({
    tier,
    x: initial ? rand(s, 20, W - 20) : dir > 0 ? -22 : W + 22,
    y: rand(s, T.y[0], T.y[1]),
    vx: dir * sp,
    ph: rand(s, 0, 6.28),
    life: tier === 4 ? 9 : null,
  })
}

// Where a fruit is drawn and caught: bobbing on its line.
export const fruitY = (s, fruit) => fruit.y + dsin(s.t * 2 + fruit.ph) * 4

const grav = (s) => GRAV * Math.min(1 + 0.07 * (s.level - 1), 1.5)

// The ends of the seesaw (tilt > 0: the right end is down).
export function endPos(s, side, tilt = s.tilt) {
  return { x: W / 2 + side * HALF * dcos(tilt), y: PIVOT_Y + side * HALF * dsin(tilt) }
}
export const PIVOT = { x: W / 2, y: PIVOT_Y }
function seatPos(s, side, tilt) {
  const e = endPos(s, side, tilt)
  return { x: e.x - side * 14, y: e.y - 17 }
}
const perchPos = (side) => ({ x: PERCH_X[sideIdx(side)], y: PERCH_Y })

function placeChars(s) {
  Object.assign(s.chars[s.seat.who], seatPos(s, s.seat.side))
  if (s.perch) Object.assign(s.chars[s.perch.who], perchPos(s.perch.side))
}

// A flight from (x0, y0) to (x1, y1) that peaks at apexY.
function makeFlight(s, who, x0, y0, x1, y1, apexY) {
  const G = grav(s)
  const vy0 = -Math.sqrt(2 * G * (y0 - apexY))
  const T = (-vy0 + Math.sqrt(vy0 * vy0 + 2 * G * (y1 - y0))) / G
  return { who, x0, y0, x1, y1, vx: (x1 - x0) / T, vy0, G, T, t: 0 }
}

function text(s, x, y, words, color, size = 18, max = 0.9) {
  if (s.visual) s.fx.push({ x, y, text: words, color, size, t: max, max })
}

// A tap (or Space): the perched buddy jumps; mid-flight, a double jump; just
// before landing, remembered for the next jump.
function tap(s) {
  if (s.phase === 'ready') return doJump(s)
  const fl = s.flight
  if (fl && !fl.doubled && fl.T - fl.t > 0.12) return doubleJump(s, fl)
  s.buffer = 0.18
}

// Mid-air: up again with a flip, then on to the same landing spot.
function doubleJump(s, fl) {
  const c = s.chars[fl.who]
  const apex = Math.max(40, Math.min(c.y, fl.y1) - DOUBLE_JUMP_HEIGHT)
  const nf = makeFlight(s, fl.who, c.x, c.y, fl.x1, fl.y1, apex)
  nf.kind = fl.kind
  nf.doubled = true
  nf.spinT = 0
  nf.spinDir = nf.vx >= 0 ? 1 : -1
  s.flight = nf
  if (s.visual) s.fx.push({ x: c.x, y: c.y + 20, emoji: '💨', t: 0.4, max: 0.4 })
}

function doJump(s) {
  const jumper = s.perch.who
  const from = perchPos(s.perch.side)
  const raised = -s.seat.side
  const to = seatPos(s, raised, -raised * TILT) // the raised end, before it tips down
  s.flight = makeFlight(s, jumper, from.x, from.y, to.x, to.y, PERCH_Y - 38)
  s.flight.kind = 'jump'
  s.perch = null
  s.phase = 'jump'
  s.buffer = 0
}

function onFlightLanded(s, fl) {
  if (fl.kind === 'jump') {
    const launcher = s.seat.who
    const raised = -s.seat.side
    const c = s.chars[launcher]
    s.seat = { who: fl.who, side: raised } // the seesaw tips toward the jumper
    const dest = perchPos(raised) // and the other flies to the far tree
    s.flight = makeFlight(s, launcher, c.x, c.y, dest.x, dest.y, rand(s, 108, 140))
    s.flight.kind = 'launch'
    s.phase = 'launch'
  } else {
    s.perch = { who: fl.who, side: s.seat.side }
    s.flight = null
    s.phase = 'ready'
  }
}

function gainHeart(s, x, y) {
  if (s.hp < MAX_HEARTS) {
    s.hp += 1
    text(s, x, y - 24, '+1 💗', '#ff7ac8', 20)
  } else text(s, x, y - 24, 'Hearts full', '#ff7ac8', 15)
}

// One shuriken ends the run, unless a heart saves it.
function loseLife(s) {
  if (s.over || s.inv > 0) return
  if (s.hp > 0) {
    s.hp -= 1
    s.inv = 1.5
    s.shake = 0.3
    text(s, W / 2, 250, 'Saved by a heart! 💗', '#ff7ac8', 22, 1.3)
    return
  }
  s.shake = 0.45
  text(s, W / 2, 250, 'Shuriken!', '#ef476f', 26, 1.2)
  s.over = true
  s.endedBy = 'hit'
}

function shurikenY(s) {
  const total = SHURIKEN_BANDS.reduce((a, [lo, hi]) => a + hi - lo, 0)
  let r = random(s) * total
  for (const [lo, hi] of SHURIKEN_BANDS) {
    if (r < hi - lo) return lo + r
    r -= hi - lo
  }
  return SHURIKEN_BANDS[0][0]
}

function update(s, dt) {
  s.t += dt
  if (s.inv > 0) s.inv -= dt
  if (s.shake > 0) s.shake -= dt
  if (s.banner.t > 0) s.banner.t -= dt
  if (s.buffer > 0) s.buffer -= dt
  if (s.fadeT < 1) s.fadeT = Math.min(1, s.fadeT + dt / FADE_TIME)
  if (s.phase === 'ready' && s.buffer > 0) doJump(s)

  // The seesaw tips smoothly toward the seated side.
  s.tilt += (s.seat.side * TILT - s.tilt) * Math.min(1, dt * 16)

  placeChars(s)
  const fl = s.flight
  if (fl) {
    fl.t += dt
    const c = s.chars[fl.who]
    if (fl.t >= fl.T) {
      c.x = fl.x1
      c.y = fl.y1
      c.rot = 0
      onFlightLanded(s, fl)
    } else {
      c.x = fl.x0 + fl.vx * fl.t
      c.y = fl.y0 + fl.vy0 * fl.t + 0.5 * fl.G * fl.t * fl.t
      if (fl.spinT !== undefined) {
        fl.spinT += dt
        c.rot = fl.spinDir * TAU * ease(Math.min(1, fl.spinT / FLIP_TIME))
      } else c.rot = 0
    }
  }

  // Fruit.
  while (s.fruits.length < FRUIT_ON_SCREEN) spawnFruit(s, false)
  const flyer = s.flight ? s.chars[s.flight.who] : null
  for (const fr of s.fruits) {
    fr.x += fr.vx * dt
    if (fr.x < -24) fr.x = W + 24
    if (fr.x > W + 24) fr.x = -24
    if (fr.life !== null) fr.life -= dt
    const fy = fruitY(s, fr)
    if (flyer && near(flyer, { x: fr.x, y: fy }, 28)) {
      fr.dead = true
      const m = TIERS[fr.tier].m
      const pts = m * s.mult
      s.score += pts
      s.basic += m
      text(s, fr.x, fy, '+' + pts, TIER_COLORS[fr.tier], fr.tier === 4 ? 30 : 18)
      if (fr.tier === 4) s.banner = { text: 'JACKPOT FRUIT! ×100', t: 1.8 }
    }
  }
  s.fruits = s.fruits.filter((fr) => !fr.dead && !(fr.life !== null && fr.life <= 0))
  while (s.basic >= threshold(s.level + 1)) {
    if (s.fadeT >= 1) s.fadeFrom = s.level
    s.fadeT = 0
    s.level += 1
    s.banner = { text: `Level ${s.level} · ${setFor(s.level).name}`, t: 2.2 }
  }

  // Shurikens: straight across, hitting anyone.
  const diff = 1 + 0.3 * (s.level - 1)
  s.nextShur -= dt
  if (s.nextShur <= 0) {
    // Level 1: one at a time; every 2 levels, one more a wave (at most 4).
    const wave = Math.min(1 + Math.floor((s.level - 1) / 2), 4)
    const lanes = []
    for (let i = 0; i < wave; i++) {
      let y
      let tries = 0
      do {
        y = shurikenY(s)
        tries += 1
      } while (tries < 20 && lanes.some((lane) => Math.abs(lane - y) < 45))
      lanes.push(y)
      const dir = random(s) < 0.5 ? 1 : -1
      const heart = random(s) < HEART_CHANCE
      s.shurikens.push({ x: dir > 0 ? -20 : W + 20, y, vx: dir * (rand(s, 150, 210) + 14 * s.level), r: 0, warn: 0.9 + i * 0.35, heart })
    }
    s.nextShur = Math.max(1.2, rand(s, 4, 6.5) / diff)
  }
  for (const sh of s.shurikens) {
    if (sh.warn > 0) {
      sh.warn -= dt
      continue
    }
    sh.x += sh.vx * dt
    sh.r += 14 * dt
    for (const c of s.chars) {
      if (near(sh, c, sh.heart ? 26 : 20)) {
        sh.dead = true
        if (sh.heart) gainHeart(s, sh.x, sh.y)
        else loseLife(s)
        break
      }
    }
    if (sh.x < -40 || sh.x > W + 40) sh.dead = true
  }
  s.shurikens = s.shurikens.filter((sh) => !sh.dead)

  // Floating texts and puffs.
  for (const p of s.fx) {
    p.t -= dt
    if (!p.emoji) p.y -= 35 * dt
  }
  s.fx = s.fx.filter((p) => p.t > 0)
}

// One step of a run: the tap first, if there was one this step.
export function step(s, tapped = false) {
  if (s.over) return
  if (tapped) {
    s.taps += 1
    tap(s)
  }
  update(s, DT)
  s.tick += 1
  if (!s.over && s.tick >= MAX_TICKS) {
    s.over = true
    s.endedBy = 'time'
  }
}

// The menu's scene: fruit drifting by, nobody moving (any clock is fine).
export function idleStep(s, dt) {
  s.t += dt
  for (const fr of s.fruits) {
    fr.x += fr.vx * dt
    if (fr.x < -24) fr.x = W + 24
    if (fr.x > W + 24) fr.x = -24
  }
}

// A whole run again from its seed and taps (the steps they came on,
// ascending), up to `endTick` steps: how the server scores a run.
export function replay({ seed, mult, taps, endTick }) {
  const s = newRun({ seed, mult, visual: false })
  const end = Math.min(endTick, MAX_TICKS)
  let next = 0
  while (!s.over && s.tick < end) {
    let tapped = false
    while (next < taps.length && taps[next] <= s.tick) {
      if (taps[next] === s.tick) tapped = true
      next += 1
    }
    step(s, tapped)
  }
  return { score: s.score, fruit: s.basic, level: s.level, ticks: s.tick, over: s.over, endedBy: s.endedBy }
}
