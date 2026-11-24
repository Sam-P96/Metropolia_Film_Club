/* Ruin Run's engine: the run itself, with no drawing. The game's page plays
   it (forge.js draws it), and the server plays it again from what the page
   sends (backend/utils/catflix/ruinRun.js), so the speed that's paid is the
   server's own.

   For both to get exactly the same run:
   • it moves in fixed steps of 1/60 s (a "tick"), never by the frame time;
   • everything random comes from one generator started from the run's
     seed, which the server picks;
   • what the player does is recorded as numbers, tick × 8 + what: 0, 1, 2
     (go to that lane), 3 (jump pressed), 4 (jump let go). The server plays
     those at the same ticks.
   Anything only for show (dust, sparks, the lightning's zigzags) stays in
   the page, with its own randomness.

   One file for both sides: a plain script in the page (it sets
   window.RuinEngine; the page is a plain script so it works under the
   site's security rules, and can't load the ES modules in shared/) and a
   CommonJS module on the server. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory()
  else root.RuinEngine = factory()
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict'

  // The run's numbers, as the prototype had them. Sizes are art pixels on the
  // 216 × 216 screen; times are ms.
  const RUN = {
    S: 216, px: 46, // screen size, the player's feet x
    laneY: [150, 173, 196], // feet y: back, middle, front lane
    speed0: 88, tickMs: 1000, tickAdd: 0.02, maxMult: Infinity, // px/s; +2% of the starting speed every second running, no top speed
    pxPerM: 8, jumpMs: 600, jumpH: 20, laneMs: 140, grace: 2200,
    holdMs: 250, holdGrav: 0.5, // holding jump: lighter gravity for up to 250 ms → higher and longer
    maxHp: 3, heartChance: 0.05, enemyChance: 0.12, hurtMs: 1100,
    foodChance: 0.04, foodAdd: 0.5, enemyMax: 0.6, boltChance: 0.025, stormStrikeAt: 550, stormMs: 30000,
    bumpStopMs: 2000, pushPx: 14, pushMs: 260,
    bumpAdd: 0.25, koSadMs: 1000, // each enemy encounter: +25% of the starting speed
  }
  // A tap jump peaks at jumpH after jumpMs / 2 and lands after jumpMs.
  const JUMP_V0 = (4 * RUN.jumpH) / RUN.jumpMs
  const JUMP_G = (8 * RUN.jumpH) / (RUN.jumpMs * RUN.jumpMs)
  // What each kind of thing on the road does.
  const OB = {
    heart: { kind: 'pickup', w: 10 }, food: { kind: 'pickup', w: 10 }, bolt: { kind: 'pickup', w: 10 }, enemy: { kind: 'enemy', w: 16 },
    rubble: { kind: 'low', w: 16, h: 9 }, tires: { kind: 'low', w: 12, h: 8 },
    crack: { kind: 'hole', w: 12 }, gap: { kind: 'hole', w: 26 },
    car: { kind: 'tall', w: 34, h: 30 }, slab: { kind: 'tall', w: 12, h: 26 }, boulder: { kind: 'tall', w: 16, h: 18 },
  }

  const TICK_HZ = 60
  const TICK_MS = 1000 / TICK_HZ
  // A run lasts 30 minutes at most.
  const MAX_TICKS = 30 * 60 * TICK_HZ
  // Speed-ups come every RUN.tickMs of running, counted in whole ticks (60 of
  // them: adding up 1/60 s in decimals lands just short of a second).
  const SPEEDUP_TICKS = Math.round((RUN.tickMs * TICK_HZ) / 1000)
  const LANE = [0, 1, 2]
  const JUMP = 3
  const RELEASE = 4

  // The random numbers: mulberry32, 0 to 1, the same everywhere for a seed.
  function generator(seed) {
    let a = seed >>> 0
    return function () {
      a = (a + 0x6d2b79f5) >>> 0
      let t = a
      t = Math.imul(t ^ (t >>> 15), t | 1)
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
  }

  const speedOf = (s) => RUN.speed0 * s.mult // px per second
  const enemyOdds = (s) => Math.min(RUN.enemyMax, RUN.enemyChance * (1 + s.foodBags * RUN.foodAdd)) // each food bag: +50% of the base odds
  const pick = (s, list) => list[Math.floor(s.rng() * list.length)]

  // A new run from `seed`, on `s` (an object the page keeps its own things
  // on too; a fresh {} on the server). It starts running at once.
  function reset(s, seed) {
    Object.assign(s, {
      seed, rng: generator(seed), tick: 0, now: 0, ids: 0, events: [],
      state: 'running', dist: 0, mult: 1, level: 0, runT: 0,
      lane: 1, laneF: 1, laneFrom: 1, laneT0: 0,
      jumpT0: -1, jy: 0, vy: 0, air: false, holding: false,
      stopUntil: 0, ko: null, boostPending: false, hp: RUN.maxHp, hurtUntil: 0, petBack: 0, prevWx: null,
      foodBags: 0, storm: null, obs: [], lastSafe: [0, 1, 2], over: null,
    })
    s.nextRow = RUN.px + (speedOf(s) * RUN.grace) / 1000 + 120
    return s
  }

  // What the player did, at the start of a tick.
  function input(s, code, now) {
    if (s.state !== 'running' || s.ko) {
      if (code === RELEASE) s.holding = false
      return
    }
    if (code === JUMP) {
      if (s.air) return
      s.air = true
      s.vy = JUMP_V0
      s.jumpT0 = now
      s.holding = true
    } else if (code === RELEASE) s.holding = false
    else if (code >= 0 && code <= 2 && code !== s.lane) {
      s.laneFrom = s.laneF
      s.lane = code
      s.laneT0 = now
    }
  }

  // Simple jump physics: lighter gravity while the button's held early on.
  function jumpStep(s, dt, now) {
    if (!s.air) return
    const hold = s.holding && s.vy > 0 && now - s.jumpT0 < RUN.holdMs
    s.vy -= JUMP_G * (hold ? RUN.holdGrav : 1) * dt
    s.jy += s.vy * dt
    if (s.jy <= 0) {
      s.jy = 0
      s.vy = 0
      s.air = false
      s.jumpT0 = -1
    }
  }

  const emit = (s, event) => s.events.push(event)

  /* Obstacles come in rows, fairly:
     • each row leaves at least one lane free of tall obstacles;
     • the gap to the next row gives enough time to react at the speed
       (more when the free lane is two lanes away from the last one);
     • holes are never wider than a jump covers at the speed;
     • nothing lands where a jump from the row before comes down. */
  function spawnRow(s) {
    const v = speedOf(s), lvl = s.level, x = s.nextRow
    const pat = s.rng()
    let row = [null, null, null]
    const lowKinds = ['rubble', 'tires', 'crack', 'gap'], tallKinds = ['car', 'slab', 'car']
    // An enemy pet: alone in its row, running at you, so the other two lanes are open.
    if (x > RUN.px + v * 4 && s.rng() < enemyOdds(s)) {
      const lane = Math.floor(s.rng() * 3)
      const look = Math.floor(s.rng() * 1e6) // which pet it looks like: the page's choice
      s.obs.push({ id: ++s.ids, k: 'enemy', lane, x, w: OB.enemy.w, kind: 'enemy', look, ev: (34 + s.rng() * 22) * Math.sqrt(s.mult), active: false, hitAt: null })
      s.lastSafe = [0, 1, 2].filter((i) => i !== lane)
      s.nextRow = x + (v + 60) * (Math.max(0.75, 1.15 - lvl * 0.06) + s.rng() * 0.35) + 40
      return
    }
    if (pat < 0.3) row[Math.floor(s.rng() * 3)] = pick(s, lowKinds) // one low thing
    else if (pat < 0.48) {
      // wide low: jump it
      const k = pick(s, lowKinds)
      row = [k, k, k].map((z) => (s.rng() < 0.85 ? z : null))
      if (row.every((z) => !z)) row[1] = k
    } else if (pat < 0.72) row[Math.floor(s.rng() * 3)] = pick(s, tallKinds) // one tall: dodge
    else if (pat < 0.88 && lvl >= 1) {
      // two tall: one way through
      const free = Math.floor(s.rng() * 3)
      for (let i = 0; i < 3; i++) if (i !== free) row[i] = pick(s, tallKinds)
    } else {
      // tall + low
      const t = Math.floor(s.rng() * 3)
      row[t] = pick(s, tallKinds)
      const o = (t + 1 + Math.floor(s.rng() * 2)) % 3
      row[o] = pick(s, lowKinds)
    }
    // A tall thing must never hide a smaller one in the lane behind it: the tall one goes to the back.
    for (let pass = 0; pass < 3; pass++)
      for (let i = 2; i > 0; i--)
        if (row[i] && OB[row[i]].kind === 'tall') {
          const j = [0, 1].find((j) => j < i && row[j] && OB[row[j]].kind !== 'tall')
          if (j !== undefined) [row[i], row[j]] = [row[j], row[i]]
        }
    const free = [0, 1, 2].filter((i) => !row[i] || OB[row[i]].kind !== 'tall')
    // Can the player get from the last free lane(s) to these? Two-lane shifts need more room.
    const far = !free.some((f) => s.lastSafe.some((l) => Math.abs(l - f) <= 1))
    let jitter = 0
    // Small things are sometimes a pickup instead: heart 5%, pet food 4%, lightning 2.5% (only ever a hazard less).
    row = row.map((k) => {
      if (!k || OB[k].kind === 'tall') return k
      const r = s.rng()
      return r < RUN.heartChance ? 'heart' : r < RUN.heartChance + RUN.foodChance ? 'food' : r < RUN.heartChance + RUN.foodChance + RUN.boltChance && !s.storm ? 'bolt' : k
    })
    row.forEach((k, i) => {
      if (!k) return
      const o = OB[k]
      let w = o.w
      if (k === 'gap') w = Math.min(o.w + lvl * 3, Math.floor(((v * RUN.jumpMs) / 1000) * 0.55))
      s.obs.push({ id: ++s.ids, k, lane: i, x: x + jitter, w, kind: o.kind, h: o.h || 0 })
      jitter += Math.floor(s.rng() * 10)
    })
    s.lastSafe = free
    // Seconds of warning before the next row; sometimes debris drops into a free lane between rows.
    const react = Math.max(0.66, 1.1 - lvl * 0.07) + s.rng() * Math.max(0.2, 0.5 - lvl * 0.05)
    let next = x + v * react + (far ? v * 0.35 : 0) + 40
    if (lvl >= 1 && s.rng() < 0.22) {
      const fx = x + (next - x) / 2
      const lane = pick(s, free)
      s.obs.push({ id: ++s.ids, k: 'boulder', lane, x: fx, w: OB.boulder.w, kind: 'tall', h: OB.boulder.h, falling: true, fallAt: null })
      s.lastSafe = [0, 1, 2].filter((i) => i !== lane)
      next += v * 0.3
    }
    s.nextRow = next
  }

  function over(s, now, why) {
    s.state = 'over'
    s.over = { t: now, why }
    emit(s, { type: 'over', why })
  }

  // One tick: `dt` ms, ending at `now`.
  function update(s, dt, now) {
    const stopped = now < (s.stopUntil || 0)
    const u = Math.min(1, (now - s.laneT0) / RUN.laneMs)
    s.laneF = s.laneFrom + (s.lane - s.laneFrom) * (u * u * (3 - 2 * u)) // lane slide
    if (s.state !== 'running') return
    const v = speedOf(s)
    if (!stopped) s.dist += (v * dt) / 1000 // standing still while a bump plays out
    jumpStep(s, dt, now)
    // Speed-ups: +2% for every second spent running (time stopped in a bump doesn't count).
    if (!stopped) {
      s.runT += 1
      if (s.runT >= SPEEDUP_TICKS) {
        s.runT = 0
        s.mult = Math.min(RUN.maxMult, +(s.mult + RUN.tickAdd).toFixed(4))
      }
    }
    s.level = Math.max(0, Math.floor((s.mult - 1) / 0.1 + 1e-9)) // harder with every +10%
    while (s.nextRow < s.dist + RUN.S + 80) spawnRow(s)
    // Enemy pets start running once they're on screen; hit ones are shoved back, then vanish.
    for (const o of s.obs) {
      if (o.kind !== 'enemy') continue
      if (!o.active && o.x - s.dist < RUN.S + 8) o.active = true
      if (o.active && !o.hitAt && !o.zap) o.x -= (o.ev * dt) / 1000
      if (o.hitAt) {
        const p = Math.min(1, (now - o.hitAt) / RUN.pushMs)
        o.x = o.hitX + RUN.pushPx * (1 - (1 - p) * (1 - p))
      }
      if (o.hitAt && !o.won && now - o.hitAt >= RUN.bumpStopMs && !o.gone) {
        o.gone = true
        emit(s, { type: 'poof', x: o.x + o.w / 2, y: RUN.laneY[o.lane] - 14, colors: 'dust' })
      }
      if (o.zap && !o.gone && now - o.zap >= 420) {
        o.gone = true
        emit(s, { type: 'poof', x: o.x + o.w / 2, y: RUN.laneY[o.lane] - 12, colors: 'zap' })
      }
    }
    s.obs = s.obs.filter((o) => !o.gone && !o.taken && o.x + o.w > s.dist - 60)
    if (s.petBack && now >= s.petBack) s.petBack = 0
    if (s.boostPending && !stopped) {
      // An encounter over: +25% of the starting speed.
      s.boostPending = false
      if (s.mult < RUN.maxMult) {
        s.mult = Math.min(RUN.maxMult, +(s.mult + RUN.bumpAdd).toFixed(4))
        emit(s, { type: 'banner', text: '+25% SPEED' })
      }
    }
    // A lightning storm: for 30 s, bolts zap every enemy pet on screen, each
    // one an encounter (+25% speed) with no stop and no heart lost.
    if (s.storm) {
      const S = s.storm, t = now - S.t0
      if (t >= RUN.stormStrikeAt && t < RUN.stormMs - 700) {
        const hits = []
        for (const o of s.obs)
          if (o.kind === 'enemy' && !o.hitAt && !o.gone && !o.zap) {
            const sx = o.x - s.dist
            if (sx > -12 && sx < RUN.S - 10) {
              o.zap = now
              hits.push({ x: o.x + o.w / 2, y: RUN.laneY[o.lane] - 12 })
            }
          }
        if (hits.length) {
          S.hits += hits.length
          s.mult = Math.min(RUN.maxMult, +(s.mult + hits.length * RUN.bumpAdd).toFixed(4))
          emit(s, { type: 'strike', hits, text: `⚡ +${hits.length * 25}% SPEED` })
        } else if (!S.first) emit(s, { type: 'strike', hits, text: '⚡ STORM: 30 s' })
        S.first = true
      }
      if (t > RUN.stormMs) s.storm = null
    }
    if (s.ko) {
      // Knocked out: angry, then sad, then it's over.
      if (now >= s.ko.endAt) return over(s, now, 'brawl')
      return
    }
    // Falling debris starts falling about 1 s before it reaches you, and lands well before.
    for (const o of s.obs) if (o.falling && o.fallAt === null && o.x - s.dist - RUN.px < v * 1.1) o.fallAt = now
    // Collisions: wx0..wx is the ground covered this tick (nothing slips through at speed).
    const lane = Math.round(s.laneF), jy = s.jy, pw = 7
    const wx = s.dist + RUN.px, wx0 = Math.min(wx, s.prevWx ?? wx)
    s.prevWx = wx
    for (const o of s.obs) {
      if (o.lane !== lane) continue
      if (o.kind === 'pickup') {
        if (jy < 16 && wx + pw > o.x && wx0 - pw < o.x + o.w) {
          o.taken = true
          const x = o.x + o.w / 2, y = RUN.laneY[o.lane] - 8
          if (o.k === 'heart') {
            const full = s.hp >= RUN.maxHp
            s.hp = Math.min(RUN.maxHp, s.hp + 1)
            emit(s, { type: 'banner', text: full ? 'FULL HEALTH' : '+1 ♥' })
            emit(s, { type: 'poof', x, y, colors: 'heart' })
          } else if (o.k === 'food') {
            s.foodBags++
            emit(s, { type: 'banner', text: `MORE PETS! ${Math.round(enemyOdds(s) * 100)}%` })
            emit(s, { type: 'poof', x, y, colors: 'food' })
          } else if (o.k === 'bolt') {
            if (!s.storm) s.storm = { t0: now, first: false, hits: 0 }
            emit(s, { type: 'storm' })
            emit(s, { type: 'poof', x, y, colors: 'bolt' })
          }
        }
        continue
      }
      if (o.kind === 'enemy') {
        if (o.hitAt || o.zap || now < s.hurtUntil) continue
        if (wx + pw > o.x && wx - pw < o.x + o.w) {
          // Pets are too tall to jump over.
          o.hitAt = now
          o.hitX = o.x
          if (s.hp <= 0) {
            o.won = true
            s.ko = { sadAt: now + RUN.bumpStopMs, endAt: now + RUN.bumpStopMs + RUN.koSadMs }
            s.stopUntil = Infinity
            s.holding = false
            emit(s, { type: 'hit', ko: true })
            return
          }
          s.hp--
          s.boostPending = true
          s.stopUntil = now + RUN.bumpStopMs
          s.hurtUntil = now + RUN.bumpStopMs + RUN.hurtMs
          s.petBack = s.stopUntil
          emit(s, { type: 'hit', ko: false })
          emit(s, { type: 'banner', text: '-1 ♥' })
        }
        continue
      }
      if (o.kind === 'hole') {
        if (jy < 1 && wx > o.x + 3 && wx0 < o.x + o.w - 3) return over(s, now, 'fell')
        continue
      }
      if (o.falling && (o.fallAt === null || now - o.fallAt < 550)) continue // still in the air
      if (wx + pw > o.x && wx0 - pw < o.x + o.w) {
        if (o.falling) {
          // Landed debris can be jumped over.
          if (jy < o.h * 0.7) return over(s, now, 'crash')
          continue
        }
        if (o.kind === 'tall') return over(s, now, 'crash')
        if (jy < o.h * 0.7) return over(s, now, 'trip')
      }
    }
  }

  // One tick, with `codes` (what the player did at its start, in order).
  // Answers with what happened in it, for the page to show (`s.events`).
  function step(s, codes) {
    s.events = []
    const start = s.tick * TICK_MS
    if (codes) for (const code of codes) input(s, code, start)
    s.tick += 1
    s.now = s.tick * TICK_MS
    update(s, TICK_MS, s.now)
    return s.events
  }

  // The speed as a whole percent: ×1.54 is 154%.
  const speedPercent = (mult) => Math.floor(mult * 100 + 1e-6)
  const metres = (s) => Math.floor(s.dist / RUN.pxPerM)

  // Plays a run again from its seed and what the player did (`inputs`,
  // tick × 8 + code, in order) up to `endTick`, or until it's over.
  // Answers { ticks, over, endedBy, speed (%), metres }.
  function replay({ seed, inputs, endTick }) {
    const s = reset({}, seed)
    let next = 0
    while (s.state === 'running' && s.tick < endTick) {
      let codes = null
      while (next < inputs.length && Math.floor(inputs[next] / 8) === s.tick) {
        ;(codes ??= []).push(inputs[next] % 8)
        next++
      }
      step(s, codes)
    }
    return { ticks: s.tick, over: s.state === 'over', endedBy: s.over ? s.over.why : 'stopped', speed: speedPercent(s.mult), metres: metres(s) }
  }

  return { RUN, OB, TICK_HZ, TICK_MS, MAX_TICKS, LANE, JUMP, RELEASE, generator, reset, step, replay, speedOf, enemyOdds, speedPercent, metres }
})
