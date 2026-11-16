// 8 Ball Pool's table and how the balls move on it: no React, no database,
// no timers. The server plays every shot between members with this file
// (backend/games/pool/engine.js), and the pages play the very same shot
// again to show it (frontend/src/components/pool/), so both always end up
// with the same table.
//
// That only works if a shot comes out the same everywhere, to the last
// digit. So everything in here is done with +, -, *, / and Math.sqrt only
// (which every JavaScript engine rounds the same way), in a fixed order,
// with a fixed time step. A shot's direction comes in as a unit vector
// (dx, dy): whoever turns an angle into one (Math.cos and Math.sin aren't
// the same everywhere) does it once, and everyone else uses their numbers.
//
// The table is 1000 x 500 (the playing surface, cushion nose to cushion
// nose), x along its length. Balls are { id, x, y, on }: id 0 is the cue
// ball, 1 to 7 the solids, 8 the black, 9 to 15 the stripes; `on` is false
// once it's pocketed.

export const TABLE = {
  W: 1000,
  H: 500,
  // A ball's radius.
  R: 12,
  // Where the cushions stop either side of a pocket, for a ball's centre:
  // within this far of a corner (along either rail), or of the middle of a
  // long rail, there's no cushion.
  CORNER_GAP: 30,
  SIDE_GAP: 16,
  // The head spot (where the cue ball starts) and the foot spot (the
  // rack's front ball). The head string runs through the head spot: for
  // the break, the cue ball goes anywhere behind it.
  HEAD_X: 250,
  FOOT_X: 750,
}

const { W, H, R } = TABLE

// The six pockets: a ball is down once its centre is within `r` of the
// pocket's (x, y), or past the edge of the playing surface. `aim` is where
// to send a ball to pocket it (the middle of the mouth).
export const POCKETS = [
  { id: 0, x: -4, y: -4, r: 26, aim: [9, 9] },
  { id: 1, x: W / 2, y: -8, r: 18, aim: [W / 2, 2] },
  { id: 2, x: W + 4, y: -4, r: 26, aim: [W - 9, 9] },
  { id: 3, x: -4, y: H + 4, r: 26, aim: [9, H - 9] },
  { id: 4, x: W / 2, y: H + 8, r: 18, aim: [W / 2, H - 2] },
  { id: 5, x: W + 4, y: H + 4, r: 26, aim: [W - 9, H - 9] },
]

// The fastest a cue ball leaves the cue (power 1), in table units a second.
export const MAX_SPEED = 3000
// The softest shot there is.
export const MIN_POWER = 0.03

// One step of time, in seconds, and how many of them a shot can last.
export const STEP = 1 / 400
const MAX_STEPS = 400 * 25

// The cloth slows a ball by this much a second, plus this share of its
// speed; under STOP it's at rest.
const DRAG = 85
const DRAG_PER_SPEED = 0.42
const STOP = 4
// How much speed is kept: ball on ball (along the line between them), and
// off a cushion.
const BALL_BOUNCE = 0.95
const RAIL_BOUNCE = 0.72

// 1 for the cue ball's speed at `power` (MIN_POWER to 1).
export const speedOf = (power) => MAX_SPEED * power

// ---------- the rack ----------

// The 15 balls racked at the foot spot and the cue ball on the head spot.
// As in a real rack: the black in the middle, a solid in one back corner
// and a stripe in the other, everything else shuffled. `random` gives 0 to
// 1 (the server passes one that can't be predicted).
export function rackBalls(random = Math.random) {
  const shuffle = (list) => {
    const out = [...list]
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1))
      ;[out[i], out[j]] = [out[j], out[i]]
    }
    return out
  }

  const solids = shuffle([1, 2, 3, 4, 5, 6, 7])
  const stripes = shuffle([9, 10, 11, 12, 13, 14, 15])
  const corners = random() < 0.5 ? [solids.pop(), stripes.pop()] : [stripes.pop(), solids.pop()]
  const rest = shuffle([...solids, ...stripes])

  // Row by row from the front: 1, 2, 3, 4 and 5 balls. Place 4 is the
  // middle of the third row; 10 and 14 are the back corners.
  const spacing = 2 * R + 0.6
  const rowStep = (spacing * Math.sqrt(3)) / 2
  const balls = [{ id: 0, x: TABLE.HEAD_X, y: H / 2, on: true }]
  let place = 0
  for (let row = 0; row < 5; row++) {
    for (let k = 0; k <= row; k++) {
      const id = place === 4 ? 8 : place === 10 ? corners[0] : place === 14 ? corners[1] : rest.pop()
      balls.push({ id, x: TABLE.FOOT_X + row * rowStep, y: H / 2 + (k - row / 2) * spacing, on: true })
      place += 1
    }
  }
  return balls.sort((a, b) => a.id - b.id)
}

// ---------- where the cue ball can go ----------

// Whether a ball could sit at (x, y): on the cloth, clear of the cushions
// and of every other ball on the table (`ignore`: a ball id to leave out).
export function isFreeSpot(balls, x, y, ignore = 0) {
  if (!(x >= R && x <= W - R && y >= R && y <= H - R)) return false
  for (const ball of balls) {
    if (!ball.on || ball.id === ignore) continue
    const dx = ball.x - x
    const dy = ball.y - y
    if (dx * dx + dy * dy < (2 * R + 0.5) * (2 * R + 0.5)) return false
  }
  return true
}

// The free spot nearest (x, y), looking further out in rings (for putting a
// ball back: the cue ball after a scratch, the black after a break).
// `maxX` keeps it behind a line (the head string).
export function freeSpotNear(balls, x, y, { ignore = 0, maxX = W - R } = {}) {
  const clampX = (value) => Math.min(maxX, Math.max(R, value))
  const clampY = (value) => Math.min(H - R, Math.max(R, value))
  const startX = clampX(x)
  const startY = clampY(y)
  if (isFreeSpot(balls, startX, startY, ignore)) return { x: startX, y: startY }

  // Eight directions, fixed (no Math.cos here: see the top of the file).
  const d = 0.7071067811865476
  const ring = [[1, 0], [-1, 0], [0, 1], [0, -1], [d, d], [-d, d], [d, -d], [-d, -d]]
  for (let radius = R; radius < W; radius += R) {
    for (const [ux, uy] of ring) {
      const px = clampX(startX + ux * radius)
      const py = clampY(startY + uy * radius)
      if (isFreeSpot(balls, px, py, ignore)) return { x: px, y: py }
    }
  }
  return { x: startX, y: startY }
}

// ---------- a shot ----------

// The pocket a ball that left the playing surface went down: the nearest.
function nearestPocket(x, y) {
  let best = 0
  let bestD = Infinity
  for (const pocket of POCKETS) {
    const dx = pocket.x - x
    const dy = pocket.y - y
    const d2 = dx * dx + dy * dy
    if (d2 < bestD) {
      bestD = d2
      best = pocket.id
    }
  }
  return best
}

// One shot, played a step at a time: the cue ball sent off along (dx, dy)
// (a unit vector) at `speed`, until every ball is at rest.
//
//   const shot = new Shot(balls, { dx, dy, speed })
//   while (!shot.done) shot.step(events)   // `events` optional: what happened
//   shot.balls      the table as it is now: [{ id, x, y, on, vx, vy }]
//   shot.firstHit   the first ball the cue ball touched (an id), or null
//   shot.pocketed   the balls pocketed, in order (ids; 0 is the cue ball)
//   shot.steps      how many steps so far (each STEP seconds)
//
// `events` collects { type: 'hit', a, b, x, y, speed } (two balls, where
// they touched and how hard), { type: 'rail', ball, x, y, speed } and
// { type: 'pocket', ball, pocket }, for the page's sparks and sounds.
export class Shot {
  constructor(balls, { dx, dy, speed }) {
    this.balls = balls.map((ball) => ({ id: ball.id, x: ball.x, y: ball.y, on: ball.on, vx: 0, vy: 0 }))
    const cue = this.balls.find((ball) => ball.id === 0)
    if (cue?.on) {
      cue.vx = dx * speed
      cue.vy = dy * speed
    }
    this.firstHit = null
    this.pocketed = []
    this.steps = 0
    this.done = !cue?.on || !(speed > 0)
  }

  step(events = null) {
    if (this.done) return
    const balls = this.balls
    const count = balls.length
    this.steps += 1

    // 1. Everything moves.
    for (let i = 0; i < count; i++) {
      const ball = balls[i]
      if (!ball.on || (ball.vx === 0 && ball.vy === 0)) continue
      ball.x += ball.vx * STEP
      ball.y += ball.vy * STEP
    }

    // 2. Balls meet balls.
    const reach = 4 * R * R
    for (let i = 0; i < count; i++) {
      const a = balls[i]
      if (!a.on) continue
      for (let j = i + 1; j < count; j++) {
        const b = balls[j]
        if (!b.on) continue
        if (a.vx === 0 && a.vy === 0 && b.vx === 0 && b.vy === 0) continue
        const dx = b.x - a.x
        const dy = b.y - a.y
        const d2 = dx * dx + dy * dy
        if (d2 >= reach || d2 === 0) continue

        const d = Math.sqrt(d2)
        const nx = dx / d
        const ny = dy / d
        // Apart again, half each.
        const overlap = (2 * R - d) / 2
        a.x -= nx * overlap
        a.y -= ny * overlap
        b.x += nx * overlap
        b.y += ny * overlap

        const closing = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny
        if (closing <= 0) continue
        const push = ((1 + BALL_BOUNCE) / 2) * closing
        a.vx -= nx * push
        a.vy -= ny * push
        b.vx += nx * push
        b.vy += ny * push

        if (this.firstHit === null && (a.id === 0 || b.id === 0)) this.firstHit = a.id === 0 ? b.id : a.id
        if (events) events.push({ type: 'hit', a: a.id, b: b.id, x: a.x + nx * R, y: a.y + ny * R, speed: closing })
      }
    }

    // 3. Pockets and cushions, then the cloth.
    let moving = false
    for (let i = 0; i < count; i++) {
      const ball = balls[i]
      if (!ball.on) continue

      let down = -1
      if (ball.x < 0 || ball.x > W || ball.y < 0 || ball.y > H) {
        down = nearestPocket(ball.x, ball.y)
      } else {
        for (const pocket of POCKETS) {
          const px = pocket.x - ball.x
          const py = pocket.y - ball.y
          if (px * px + py * py < pocket.r * pocket.r) {
            down = pocket.id
            break
          }
        }
      }
      if (down >= 0) {
        ball.on = false
        ball.vx = 0
        ball.vy = 0
        this.pocketed.push(ball.id)
        if (events) events.push({ type: 'pocket', ball: ball.id, pocket: down, x: ball.x, y: ball.y })
        continue
      }

      // The long rails have a gap in the middle (the side pockets) as well
      // as at the corners; the short rails only at the corners.
      const alongLong = ball.x >= TABLE.CORNER_GAP && ball.x <= W - TABLE.CORNER_GAP && (ball.x < W / 2 - TABLE.SIDE_GAP || ball.x > W / 2 + TABLE.SIDE_GAP)
      const alongShort = ball.y >= TABLE.CORNER_GAP && ball.y <= H - TABLE.CORNER_GAP
      let bounced = 0
      if (alongShort) {
        if (ball.x < R) {
          ball.x = R
          if (ball.vx < 0) {
            bounced = 0 - ball.vx
            ball.vx = bounced * RAIL_BOUNCE
          }
        } else if (ball.x > W - R) {
          ball.x = W - R
          if (ball.vx > 0) {
            bounced = ball.vx
            ball.vx = 0 - bounced * RAIL_BOUNCE
          }
        }
      }
      if (alongLong) {
        if (ball.y < R) {
          ball.y = R
          if (ball.vy < 0) {
            bounced = 0 - ball.vy
            ball.vy = bounced * RAIL_BOUNCE
          }
        } else if (ball.y > H - R) {
          ball.y = H - R
          if (ball.vy > 0) {
            bounced = ball.vy
            ball.vy = 0 - bounced * RAIL_BOUNCE
          }
        }
      }
      if (bounced > 0 && events) events.push({ type: 'rail', ball: ball.id, x: ball.x, y: ball.y, speed: bounced })

      if (ball.vx === 0 && ball.vy === 0) continue
      const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy)
      const slower = speed - (DRAG + DRAG_PER_SPEED * speed) * STEP
      if (speed < STOP || slower <= 0) {
        ball.vx = 0
        ball.vy = 0
        continue
      }
      const keep = slower / speed
      ball.vx *= keep
      ball.vy *= keep
      moving = true
    }

    if (!moving || this.steps >= MAX_STEPS) {
      for (const ball of balls) {
        ball.vx = 0
        ball.vy = 0
      }
      this.done = true
    }
  }

  // The table as it is, without the speeds: what a game keeps.
  table() {
    return this.balls.map(({ id, x, y, on }) => ({ id, x, y, on }))
  }
}

// A whole shot at once: { balls, firstHit, pocketed, steps }.
export function simulate(balls, shot) {
  const played = new Shot(balls, shot)
  while (!played.done) played.step()
  return { balls: played.table(), firstHit: played.firstHit, pocketed: played.pocketed, steps: played.steps }
}
