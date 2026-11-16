// Clanker, the computer, at 8 Ball Pool (vs Clanker is played entirely in
// the browser). It tries shots on a copy of the table (physics.js, the same
// table everyone plays on) and picks the one that comes out best for it.
//
//   easy  tries a handful of straight shots at its own balls, aims them
//         loosely and hits them with whatever power comes to mind
//   hard  tries every one of its balls into every pocket, and a range of
//         powers, thinks about where the cue ball ends up, and aims finely
//
// Returns { dx, dy, power, cue }: `cue` is where it puts the cue ball when
// it's in hand. `random` gives 0 to 1.

import { POCKETS, TABLE, freeSpotNear, isFreeSpot, simulate, speedOf } from './physics.js'
import { groupOf, groupOfBall, legalTargets } from './rules.js'

const { R, W, H } = TABLE

const LEVELS = {
  easy: { aimError: 0.06, powers: [0.35, 0.6], tries: 6, think: false },
  hard: { aimError: 0.006, powers: [0.22, 0.32, 0.45, 0.6, 0.8], tries: Infinity, think: true },
}

function unit(dx, dy) {
  const d = Math.sqrt(dx * dx + dy * dy)
  return d === 0 ? { dx: 1, dy: 0 } : { dx: dx / d, dy: dy / d }
}

// Turns (dx, dy) by `angle` radians.
function turn({ dx, dy }, angle) {
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  return { dx: dx * c - dy * s, dy: dx * s + dy * c }
}

// The cue ball's aim to send `ball` into `pocket`: at the "ghost ball",
// where the cue ball has to be when it touches, one ball's width behind it
// on the line from the pocket.
function ghostAim(cue, ball, pocket) {
  const [px, py] = pocket.aim
  const line = unit(px - ball.x, py - ball.y)
  const gx = ball.x - line.dx * 2 * R
  const gy = ball.y - line.dy * 2 * R
  const aim = unit(gx - cue.x, gy - cue.y)
  // How much the ball is cut: straight on is 1, a thin cut near 0. Past
  // 90 degrees it can't be made.
  const cut = aim.dx * line.dx + aim.dy * line.dy
  return { ...aim, cut }
}

// How good a shot's outcome is for `seat`: a ball of theirs down without a
// foul is what it's all about; the black down too early, or a scratch, is
// a disaster.
function score(game, seat, result, mine) {
  const pocketed = result.pocketed
  const scratch = pocketed.includes(0)
  const eight = pocketed.includes(8)
  const legal = legalTargets(game, seat)
  const firstOk = result.firstHit !== null && legal.includes(result.firstHit)
  const onBlack = legal.length === 1 && legal[0] === 8

  if (eight) return onBlack && firstOk && !scratch ? 10000 : -10000
  if (scratch) return -500
  if (!firstOk) return -300

  const own = pocketed.filter((id) => (mine === null ? groupOfBall(id) !== null : groupOfBall(id) === mine)).length
  const theirs = pocketed.filter((id) => mine !== null && groupOfBall(id) !== null && groupOfBall(id) !== mine).length
  return own * 100 - theirs * 40
}

// Where to put the cue ball when it's in hand: straight behind one of its
// balls, lined up with a pocket, if there's room; else wherever fits.
function placeCue(game, seat, random) {
  const balls = game.balls
  const kitchen = game.hand === 'kitchen'
  if (kitchen) {
    const y = H / 2 + (random() - 0.5) * 60
    return freeSpotNear(balls, TABLE.HEAD_X - 20 - random() * 60, y, { ignore: 0, maxX: TABLE.HEAD_X })
  }
  const targets = legalTargets(game, seat).map((id) => balls.find((ball) => ball.id === id))
  for (const ball of targets) {
    for (const pocket of POCKETS) {
      const [px, py] = pocket.aim
      const line = unit(px - ball.x, py - ball.y)
      const x = ball.x - line.dx * 6 * R
      const y = ball.y - line.dy * 6 * R
      if (isFreeSpot(balls, x, y, 0)) return { x, y }
    }
  }
  return freeSpotNear(balls, W / 4, H / 2, { ignore: 0 })
}

// Clanker's shot in `game`, as `seat`, at `level` ('easy' or 'hard').
export function clankerShot(game, seat, level = 'easy', random = Math.random) {
  const settings = LEVELS[level] ?? LEVELS.easy
  const mine = groupOf(game, seat)

  // The break: hard and straight at the rack, from somewhere behind the line.
  if (game.breakShot) {
    const cue = placeCue(game, seat, random)
    const apex = game.balls.reduce((front, ball) => (ball.on && ball.id && ball.x < front.x ? ball : front), { x: Infinity, y: H / 2 })
    const aim = turn(unit(apex.x - cue.x, apex.y - cue.y), (random() - 0.5) * 0.01)
    return { ...aim, power: level === 'hard' ? 1 : 0.85, cue }
  }

  const cue = game.hand ? placeCue(game, seat, random) : game.balls.find((ball) => ball.id === 0)
  const table = game.balls.map((ball) => (ball.id === 0 ? { ...ball, x: cue.x, y: cue.y, on: true } : ball))
  const targets = legalTargets(game, seat)
    .map((id) => table.find((ball) => ball.id === id))
    .filter(Boolean)

  // The shots worth trying: each of its balls into each pocket.
  let options = []
  for (const ball of targets) {
    for (const pocket of POCKETS) {
      const aim = ghostAim(cue, ball, pocket)
      if (aim.cut > 0.25) options.push(aim)
    }
  }
  // Nothing makeable: straight at one of its balls, to at least hit it.
  if (options.length === 0) options = targets.map((ball) => ({ ...unit(ball.x - cue.x, ball.y - cue.y), cut: 1 }))
  if (options.length === 0) options = [{ dx: 1, dy: 0, cut: 1 }]

  // Easy only looks at a few, picked at random.
  if (options.length > settings.tries) {
    options = options
      .map((option) => ({ option, sort: random() }))
      .sort((a, b) => a.sort - b.sort)
      .slice(0, settings.tries)
      .map(({ option }) => option)
  }

  let best = null
  for (const option of options) {
    for (const power of settings.powers) {
      const result = simulate(table, { dx: option.dx, dy: option.dy, speed: speedOf(power) })
      let value = score(game, seat, result, mine) + option.cut * 20
      // Hard thinks about the cue ball: not frozen on a cushion, and with
      // one of its balls still in reach.
      if (settings.think && value > 0) {
        const cueAfter = result.balls.find((ball) => ball.id === 0)
        const nearRail = Math.min(cueAfter.x, W - cueAfter.x, cueAfter.y, H - cueAfter.y) < 2 * R
        value -= nearRail ? 15 : 0
        value -= power * 10
      }
      if (!best || value > best.value) best = { value, dx: option.dx, dy: option.dy, power }
    }
  }

  // Then it misses a little, as everyone does.
  const aim = turn(best, (random() - 0.5) * 2 * settings.aimError)
  const power = Math.min(1, Math.max(0.05, best.power * (1 + (random() - 0.5) * (level === 'hard' ? 0.06 : 0.4))))
  return { ...aim, power, cue: game.hand ? cue : null }
}
