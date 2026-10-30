// Farkle's rules as plain functions: no React, no database, no timers.
// The game page and the server (backend/games/farkle/engine.js) both use
// this file, so the browser and the server always agree on what scores.

export const DICE_PER_TURN = 6

// The winning scores a game can be played to.
export const WINNING_SCORES = [2000, 4000, 8000]

// The bot's name at the table. It always rolls first.
export const BOT_NAME = 'The Projectionist'

// What a game against the bot can be played for, in points.
export const BOT_STAKE = { min: 2, max: 500 }

// What beating the bot pays, all in P-PP: the stake back plus half of it,
// rounded down. 100 -> 150, 25 -> 37. The minimum stake is 2 because a
// stake of 1 would win nothing extra.
export function botPrize(stake) {
  return stake + Math.floor(stake / 2)
}

// Against a member, each puts up the stake: at least this much, and at
// most what the poorer of the two has.
export const PVP_MIN_STAKE = 2

// What beating a member pays, all in P-PP: the whole pot, both stakes.
// 100 each -> 200.
export function pvpPrize(stake) {
  return stake * 2
}

// 4000 -> "4,000"
export function formatPoints(points) {
  return points.toLocaleString('en-US')
}

// How many of each face there are in `dice`. counts[1] is the number of 1s,
// counts[6] the number of 6s. counts[0] is never used.
export function countFaces(dice) {
  const counts = [0, 0, 0, 0, 0, 0, 0]
  for (const face of dice) counts[face] += 1
  return counts
}

// Three of a kind: three 1s are 1,000, any other face is face x 100.
// Each extra matching die doubles it: four 4s = 800, five 4s = 1,600.
function ofAKindPoints(face, howMany) {
  const three = face === 1 ? 1000 : face * 100
  return three * 2 ** (howMany - 3)
}

// The straights, as the faces each one uses.
const STRAIGHTS = [
  { points: 1500, faces: [1, 2, 3, 4, 5, 6] },
  { points: 500, faces: [1, 2, 3, 4, 5] },
  { points: 750, faces: [2, 3, 4, 5, 6] },
]

// Answers already worked out, so the same counts are never worked out twice.
const known = new Map()

// The most points `counts` can score when EVERY die has to be part of a
// scoring combo. -1 means it can't be done: at least one die scores nothing.
// It tries each combo that fits, takes those dice away, and asks the same
// question about what's left.
function bestScore(counts) {
  const key = counts.join('')
  if (known.has(key)) return known.get(key)

  const diceLeft = counts.reduce((sum, n) => sum + n, 0)
  if (diceLeft === 0) return 0

  let best = -1

  const tryCombo = (points, faces) => {
    const rest = [...counts]
    for (const face of faces) {
      if (rest[face] === 0) return
      rest[face] -= 1
    }
    const restScore = bestScore(rest)
    if (restScore >= 0) best = Math.max(best, points + restScore)
  }

  for (const straight of STRAIGHTS) tryCombo(straight.points, straight.faces)

  for (let face = 1; face <= 6; face++) {
    for (let howMany = 3; howMany <= counts[face]; howMany++) {
      tryCombo(ofAKindPoints(face, howMany), Array(howMany).fill(face))
    }
  }

  tryCombo(100, [1])
  tryCombo(50, [5])

  known.set(key, best)
  return best
}

// The points a set of picked dice is worth, or 0 if any die in it doesn't
// score (or nothing is picked). [1, 5] -> 150, [1, 3] -> 0.
export function scoreDice(dice) {
  if (dice.length === 0) return 0
  return Math.max(0, bestScore(countFaces(dice)))
}

// Can anything in this roll score? If not, it's a Farkle. Every straight
// has a 1 or a 5 in it, so 1s, 5s and three of a kind cover everything.
export function hasScoringDice(dice) {
  const counts = countFaces(dice)
  return counts[1] > 0 || counts[5] > 0 || counts.some((n, face) => face > 0 && n >= 3)
}

// `count` dice. `face` picks one face from 1 to 6: the server passes one
// that uses crypto.randomInt, which, unlike Math.random, can't be predicted.
export function rollDice(count, face = () => 1 + Math.floor(Math.random() * 6)) {
  return Array.from({ length: count }, () => face())
}

// The bot's choice for a roll: which dice to set aside. It tries every
// possible pick and likes points, but also likes keeping dice to roll, so
// with [1, 5, 2, 3, 4, 6] on the table it takes the 1,500 straight, and with
// [1, 5, 2, 2, 3, 6] it takes just the 1 and keeps five dice to roll.
// Returns { indexes, points, diceLeft }.
export function botPick(dice) {
  let best = null
  let bestValue = -Infinity

  for (let mask = 1; mask < 2 ** dice.length; mask++) {
    const indexes = dice.map((_, i) => i).filter((i) => mask & (1 << i))
    const points = scoreDice(indexes.map((i) => dice[i]))
    if (!points) continue

    const left = dice.length - indexes.length
    const diceLeft = left === 0 ? DICE_PER_TURN : left
    const value = points + (diceLeft >= 3 ? diceLeft * 70 : diceLeft * 25)

    if (value > bestValue) {
      bestValue = value
      best = { indexes, points, diceLeft }
    }
  }

  return best
}

// Should the bot stop and bank? Always if it wins, never with hot dice,
// and sooner the fewer dice it would have to roll.
export function botShouldBank({ turnPoints, diceLeft, score, target }) {
  if (score + turnPoints >= target) return true
  if (diceLeft === DICE_PER_TURN) return false
  if (turnPoints >= 1000) return true
  if (diceLeft === 1 && turnPoints >= 250) return true
  if (diceLeft === 2 && turnPoints >= 300) return true
  if (diceLeft === 3 && turnPoints >= 500) return true
  return false
}