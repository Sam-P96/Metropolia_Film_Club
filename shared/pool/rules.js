// 8 Ball Pool's rules as plain functions: no React, no database, no timers.
// The server (backend/games/pool/engine.js) and the pages (vs Clanker is
// played entirely in the browser) both use this file, so they always agree
// on what a shot did. How the balls move is physics.js.
//
// The rules, kept to what a friendly game needs:
//   - Seat 0 breaks, with the cue ball anywhere behind the head string.
//   - The table is "open" until someone pockets a ball on a shot after the
//     break with no foul: the first ball down decides their group (solids,
//     1 to 7, or stripes, 9 to 15), and the other player has the other.
//   - Pocket one of your own on a shot with no foul and you shoot again.
//   - A foul gives the other player the cue ball in hand, anywhere on the
//     table: pocketing the cue ball (a scratch), hitting nothing, or
//     hitting a ball that isn't yours first (the black only once your
//     group is all down; never first on an open table).
//   - The black, 8, wins the game once your group is down and the shot is
//     clean. Pocket it before that, or with a foul, and you lose. On the
//     break it just goes back on its spot.
// There are no called pockets and no "must reach a cushion" rule.

import { MAX_SPEED, MIN_POWER, TABLE, freeSpotNear, isFreeSpot, rackBalls, simulate } from './physics.js'

export { FUN, MIN_STAKE, MAX_STAKE, QUICK_STAKES, prizeFor, formatPoints, stakeProblem } from '../gomoku/rules.js'

export const GAME_NAME = '8 Ball Pool'

export const SOLIDS = 'solids'
export const STRIPES = 'stripes'

// Which group a ball is in: 'solids', 'stripes', or null for the cue ball
// and the black.
export const groupOfBall = (id) => (id >= 1 && id <= 7 ? SOLIDS : id >= 9 && id <= 15 ? STRIPES : null)

// The group `seat` is on in `game`, or null while the table is open.
// `game.solids` is the seat that has the solids.
export function groupOf(game, seat) {
  if (game.solids !== 0 && game.solids !== 1) return null
  return game.solids === seat ? SOLIDS : STRIPES
}

// How many of `group`'s balls are still on the table.
export const ballsLeft = (balls, group) => balls.filter((ball) => ball.on && groupOfBall(ball.id) === group).length

// Whether `seat` is shooting at the black: their group is all down.
export function onTheBlack(game, seat) {
  const group = groupOf(game, seat)
  return group !== null && ballsLeft(game.balls, group) === 0
}

// The balls `seat` may hit first (ids). On an open table: any but the black.
export function legalTargets(game, seat) {
  const group = groupOf(game, seat)
  const on = game.balls.filter((ball) => ball.on && ball.id !== 0)
  if (group === null) return on.filter((ball) => ball.id !== 8).map((ball) => ball.id)
  if (ballsLeft(game.balls, group) === 0) return on.filter((ball) => ball.id === 8).map((ball) => ball.id)
  return on.filter((ball) => groupOfBall(ball.id) === group).map((ball) => ball.id)
}

// A new game: racked, seat 0 to break, cue ball in hand behind the head
// string. `random` gives 0 to 1, for the rack.
export function newGame(random = Math.random) {
  return {
    balls: rackBalls(random),
    current: 0,
    solids: null,
    breakShot: true,
    // null, 'kitchen' (behind the head string, for the break) or 'table'
    // (anywhere, after a foul): whoever's turn it is may put the cue ball
    // down before shooting.
    hand: 'kitchen',
    status: 'active',
    winner: null,
    endedBy: null,
    shots: 0,
    lastShot: null,
  }
}

// A shot that isn't allowed, with the HTTP status to answer it with.
export class ShotError extends Error {
  constructor(message, status = 400) {
    super(message)
    this.status = status
  }
}

// What's wrong with putting the cue ball at (x, y) with `hand`, or ''.
export function cueSpotProblem(balls, x, y, hand) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return 'Put the cue ball on the table.'
  if (hand === 'kitchen' && x > TABLE.HEAD_X) return 'For the break, the cue ball goes behind the head string.'
  if (!isFreeSpot(balls, x, y, 0)) return "The cue ball doesn't fit there."
  return ''
}

function checkTurn(game, seat) {
  if (game.status !== 'active') throw new ShotError('This game is over.', 409)
  if (seat !== 0 && seat !== 1) throw new ShotError("You're not playing in this game.", 403)
  if (game.current !== seat) throw new ShotError("It's not your turn.", 409)
}

// `seat` plays a shot: { dx, dy, power, cue }. (dx, dy) is the direction as
// a unit vector (see physics.js for why not an angle), `power` from
// MIN_POWER to 1, and `cue` ({ x, y }) where they put the cue ball first,
// when it's in hand. Returns the game after it, with `lastShot` saying what
// happened:
//   { seat, dx, dy, speed, before, firstHit, pocketed, foul, respotted,
//     assigned, keeps }
// `before` is the table as the shot started (so anyone can play it again),
// `foul` null or 'scratch', 'miss' (nothing hit) or 'wrongBall';
// `respotted` whether the black went back on its spot (a break);
// `assigned` the group the shooter got on this shot, if any; `keeps`
// whether they shoot again.
export function playShot(game, seat, shot) {
  checkTurn(game, seat)
  const { dx, dy, power } = shot ?? {}
  if (!Number.isFinite(dx) || !Number.isFinite(dy) || !Number.isFinite(power)) throw new ShotError('That shot is missing its direction or power.')
  const length = dx * dx + dy * dy
  if (length < 0.98 || length > 1.02) throw new ShotError('That shot is missing its direction.')
  if (power < MIN_POWER || power > 1) throw new ShotError('That shot is too soft or too hard.')

  // The cue ball, put down first if it's in hand.
  let before = game.balls.map(({ id, x, y, on }) => ({ id, x, y, on }))
  const cueBall = before.find((ball) => ball.id === 0)
  if (game.hand && shot.cue) {
    const problem = cueSpotProblem(before, shot.cue.x, shot.cue.y, game.hand)
    if (problem) throw new ShotError(problem)
    cueBall.x = shot.cue.x
    cueBall.y = shot.cue.y
  }
  cueBall.on = true

  const group = groupOf(game, seat)
  const black = onTheBlack(game, seat)
  const speed = MAX_SPEED * power
  const played = simulate(before, { dx, dy, speed })
  let balls = played.balls
  const pocketed = played.pocketed
  const scratch = pocketed.includes(0)
  const eightDown = pocketed.includes(8)

  // Fouls.
  let foul = null
  if (scratch) foul = 'scratch'
  else if (played.firstHit === null) foul = 'miss'
  else if (group === null ? played.firstHit === 8 : black ? played.firstHit !== 8 : groupOfBall(played.firstHit) !== group) foul = 'wrongBall'

  const lastShot = { seat, dx, dy, speed, before, firstHit: played.firstHit, pocketed, foul, respotted: false, assigned: null, keeps: false }
  const next = { ...game, shots: game.shots + 1, breakShot: false, hand: null }

  // The black went down.
  if (eightDown && !game.breakShot) {
    const won = black && !foul
    return { ...next, balls, status: 'over', winner: won ? seat : 1 - seat, endedBy: won ? 'eight' : 'eightFoul', lastShot }
  }
  if (eightDown) {
    // On the break: back on the foot spot (or as near as it fits).
    const eight = balls.find((ball) => ball.id === 8)
    const spot = freeSpotNear(balls, TABLE.FOOT_X, TABLE.H / 2, { ignore: 8 })
    balls = balls.map((ball) => (ball.id === 8 ? { ...eight, x: spot.x, y: spot.y, on: true } : ball))
    lastShot.respotted = true
  }

  // The cue ball went down: back on the head spot until it's put somewhere.
  if (scratch) {
    const spot = freeSpotNear(balls, TABLE.HEAD_X, TABLE.H / 2, { ignore: 0 })
    balls = balls.map((ball) => (ball.id === 0 ? { ...ball, x: spot.x, y: spot.y, on: true } : ball))
  }

  // An open table closes on the first ball down after the break, clean.
  let solids = game.solids
  const potted = pocketed.filter((id) => groupOfBall(id) !== null)
  if (group === null && !game.breakShot && !foul && potted.length > 0) {
    const first = groupOfBall(potted[0])
    solids = first === SOLIDS ? seat : 1 - seat
    lastShot.assigned = first
  }

  // Shoot again: a clean shot that pocketed one of their own (any ball, on
  // the break or while the table was open).
  const mine = solids === null ? null : solids === seat ? SOLIDS : STRIPES
  const keeps = !foul && potted.some((id) => mine === null || groupOfBall(id) === mine)
  lastShot.keeps = keeps

  return {
    ...next,
    balls,
    solids,
    current: keeps ? seat : 1 - seat,
    hand: foul ? 'table' : null,
    lastShot,
  }
}

// `seat` gives up: the other player wins. Allowed whenever the game is on,
// whoever's turn it is.
export function resign(game, seat, endedBy = 'resign') {
  if (game.status !== 'active') throw new ShotError('This game is over.', 409)
  if (seat !== 0 && seat !== 1) throw new ShotError("You're not playing in this game.", 403)
  return { ...game, status: 'over', winner: 1 - seat, endedBy }
}

// Three days went by without a shot: whoever's turn it was loses.
export function forfeit(game) {
  return resign(game, game.current, 'forfeit')
}

// A foul in a few words, for whoever made it (`you`) or watched it.
export function foulText(foul, you) {
  const who = you ? 'You' : 'They'
  if (foul === 'scratch') return `${who} pocketed the cue ball`
  if (foul === 'miss') return `${who} didn't hit a ball`
  if (foul === 'wrongBall') return `${who} hit the wrong ball first`
  return ''
}
