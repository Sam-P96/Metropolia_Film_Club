import { useCallback, useEffect, useRef, useState } from 'react'
import {
  DICE_PER_TURN,
  botPick,
  botShouldBank,
  formatPoints,
  hasScoringDice,
  rollDice,
  scoreDice,
} from '../../../shared/farkle/rules.js'

// A game of Farkle that lives in the browser: you against a bot, no server,
// no points at stake. It hands the page the game and four actions. In
// Phase 3 a hook that talks to the server replaces this one, and the page
// and its components stay the same.

export const BOT = 'The Projectionist'
export const PLAYERS = ['You', BOT]

// How long the dice tumble before they land.
const ROLL_MS = 650

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const diceWord = (count) => (count === 1 ? 'die' : 'dice')

// phase is where the turn is:
//   ready     your turn, nothing rolled yet
//   rolling   dice in the air
//   choosing  your roll landed, pick dice to set aside
//   farkle    your roll scored nothing, the bot is up next
//   banked    you banked, the bot is up next
//   bot       the bot is playing
//   over      someone won
function newGame(target) {
  return {
    target,
    scores: [0, 0],
    current: 0, // 0 = you, 1 = the bot
    dice: [], // the dice on the table
    kept: [], // dice set aside earlier this turn
    selected: [], // indexes into `dice` you've tapped
    turnPoints: 0, // points set aside this turn, not banked yet
    phase: 'ready',
    hotDice: false,
    winner: null,
    message: 'Your turn. Roll all six dice.',
    tone: '', // '', 'good' or 'bad': the colour of the message
    log: [],
    logCount: 0,
  }
}

// A new line at the top of the match log, keeping the newest 8.
function withLog(game, who, text) {
  const entry = { id: game.logCount, who, text }
  return { log: [entry, ...game.log].slice(0, 8), logCount: game.logCount + 1 }
}

// What you've tapped: the dice, the points they score (0 if any of them
// doesn't score) and how many dice that leaves to roll.
export function selectionOf(game) {
  const dice = game.selected.map((i) => game.dice[i])
  return { dice, points: scoreDice(dice), diceLeft: game.dice.length - game.selected.length }
}

export default function useLocalFarkle(startingTarget = 4000) {
  const [game, setGame] = useState(() => newGame(startingTarget))

  // The bot plays on timers. A timer that fires later needs the game as it
  // is then, not as it was when the timer started, so the latest game is
  // also kept here.
  const gameRef = useRef(game)

  // Goes up on every new game. Each timer remembers the number it started
  // with and does nothing if it has changed, so an old game's bot can't
  // keep playing in a new one.
  const runRef = useRef(0)

  // Change some fields of the game: `change` gets the current game and
  // returns just the fields that change.
  const update = useCallback((change) => {
    const next = { ...gameRef.current, ...change(gameRef.current) }
    gameRef.current = next
    setGame(next)
  }, [])

  // Leaving the page stops the bot.
  useEffect(() => {
    const run = runRef
    return () => {
      run.current += 1
    }
  }, [])

  const startYourTurn = useCallback(() => {
    update(() => ({
      current: 0,
      dice: [],
      kept: [],
      selected: [],
      turnPoints: 0,
      hotDice: false,
      phase: 'ready',
      tone: '',
      message: 'Your turn. Roll all six dice.',
    }))
  }, [update])

  // The bot's whole turn: roll, pick, then bank or roll again, with pauses
  // so you can follow along.
  const playBot = useCallback(async () => {
    const run = runRef.current
    const stillThisGame = () => run === runRef.current

    let turnPoints = 0
    let kept = []
    let count = DICE_PER_TURN

    update(() => ({
      current: 1,
      dice: [],
      kept: [],
      selected: [],
      turnPoints: 0,
      phase: 'bot',
      tone: '',
      message: `${BOT} steps up to the table.`,
    }))
    await wait(900)

    while (stillThisGame()) {
      const dice = rollDice(count)
      update(() => ({
        dice,
        kept,
        selected: [],
        turnPoints,
        phase: 'rolling',
        tone: '',
        message: `${BOT} rolls ${count} ${diceWord(count)}…`,
      }))
      await wait(ROLL_MS)
      if (!stillThisGame()) return
      update(() => ({ phase: 'bot' }))

      if (!hasScoringDice(dice)) {
        update((g) => ({
          tone: 'bad',
          message: turnPoints
            ? `Farkle! ${BOT} loses ${formatPoints(turnPoints)} points.`
            : `Farkle! Nothing scores for ${BOT}.`,
          ...withLog(g, BOT, turnPoints ? `Farkled, lost ${formatPoints(turnPoints)}` : 'Farkled on the first roll'),
        }))
        await wait(1800)
        if (stillThisGame()) startYourTurn()
        return
      }

      await wait(500)
      if (!stillThisGame()) return

      const pick = botPick(dice)
      update(() => ({
        selected: pick.indexes,
        message: `${BOT} sets aside ${pick.indexes.length} ${diceWord(pick.indexes.length)} for ${formatPoints(pick.points)}.`,
      }))
      await wait(1000)
      if (!stillThisGame()) return

      turnPoints += pick.points
      const pickedDice = pick.indexes.map((i) => dice[i])
      const rest = dice.filter((_, i) => !pick.indexes.includes(i))
      const { scores, target } = gameRef.current

      if (botShouldBank({ turnPoints, diceLeft: pick.diceLeft, score: scores[1], target })) {
        const total = scores[1] + turnPoints
        const won = total >= target

        update((g) => ({
          scores: [g.scores[0], total],
          dice: won ? rest : [],
          kept: won ? kept.concat(pickedDice) : [],
          selected: [],
          turnPoints: won ? turnPoints : 0,
          phase: won ? 'over' : 'banked',
          winner: won ? 1 : null,
          tone: won ? 'bad' : '',
          message: won
            ? `${BOT} banks ${formatPoints(turnPoints)} and wins with ${formatPoints(total)}.`
            : `${BOT} banks ${formatPoints(turnPoints)}.`,
          ...withLog(g, BOT, won ? `Banked ${formatPoints(turnPoints)} and won` : `Banked ${formatPoints(turnPoints)}`),
        }))
        if (won) return

        await wait(1300)
        if (stillThisGame()) startYourTurn()
        return
      }

      if (rest.length === 0) {
        kept = []
        count = DICE_PER_TURN
        update((g) => ({
          dice: [],
          kept: [],
          selected: [],
          turnPoints,
          tone: 'good',
          message: `Hot dice! ${BOT} rolls all six again.`,
          ...withLog(g, BOT, 'Hot dice'),
        }))
      } else {
        kept = kept.concat(pickedDice)
        count = rest.length
        update(() => ({
          dice: rest,
          kept,
          selected: [],
          turnPoints,
          message: `${BOT} risks it with ${count} ${diceWord(count)}.`,
        }))
      }
      await wait(900)
    }
  }, [update, startYourTurn])

  // Rolls `count` dice for you. `change` is anything else to update at the
  // same time, like the points you just set aside.
  const rollForYou = useCallback(
    (count, change) => {
      const run = runRef.current
      const dice = rollDice(count)

      update(() => ({ ...change, dice, selected: [], phase: 'rolling', tone: '', message: 'Rolling…' }))

      setTimeout(() => {
        if (run !== runRef.current) return

        if (hasScoringDice(dice)) {
          update((g) => ({
            phase: 'choosing',
            hotDice: false,
            tone: g.hotDice ? 'good' : '',
            message: g.hotDice
              ? 'Hot dice! A fresh six. Pick your scoring dice.'
              : 'Tap the scoring dice you want to set aside.',
          }))
          return
        }

        update((g) => ({
          phase: 'farkle',
          tone: 'bad',
          message: g.turnPoints
            ? `Farkle! Nothing scores. You lose ${formatPoints(g.turnPoints)} points.`
            : 'Farkle! Nothing scores this roll.',
          ...withLog(g, 'You', g.turnPoints ? `Farkled, lost ${formatPoints(g.turnPoints)}` : 'Farkled on the first roll'),
        }))
        setTimeout(() => {
          if (run === runRef.current) playBot()
        }, 1800)
      }, ROLL_MS)
    },
    [update, playBot]
  )

  // The Roll button: the first roll of your turn, or set aside what you
  // tapped and roll the rest (all six again on hot dice).
  const roll = useCallback(() => {
    const g = gameRef.current
    if (g.current !== 0) return

    if (g.phase === 'ready') {
      rollForYou(DICE_PER_TURN, { turnPoints: 0, kept: [] })
      return
    }
    if (g.phase !== 'choosing') return

    const pick = selectionOf(g)
    if (!pick.points) return

    const hot = pick.diceLeft === 0
    rollForYou(hot ? DICE_PER_TURN : pick.diceLeft, {
      turnPoints: g.turnPoints + pick.points,
      kept: hot ? [] : g.kept.concat(pick.dice),
      hotDice: hot,
      ...(hot ? withLog(g, 'You', 'Hot dice') : {}),
    })
  }, [rollForYou])

  // The Bank button: add this turn's points, including what you tapped, to
  // your score and pass the dice.
  const bank = useCallback(() => {
    const g = gameRef.current
    if (g.current !== 0 || g.phase !== 'choosing') return

    const pick = selectionOf(g)
    if (!pick.points) return

    const points = g.turnPoints + pick.points
    const total = g.scores[0] + points

    if (total >= g.target) {
      update((x) => ({
        scores: [total, x.scores[1]],
        turnPoints: points,
        kept: x.kept.concat(pick.dice),
        dice: x.dice.filter((_, i) => !x.selected.includes(i)),
        selected: [],
        phase: 'over',
        winner: 0,
        tone: 'good',
        message: `You bank ${formatPoints(points)} and win with ${formatPoints(total)}!`,
        ...withLog(x, 'You', `Banked ${formatPoints(points)} and won`),
      }))
      return
    }

    update((x) => ({
      scores: [total, x.scores[1]],
      dice: [],
      kept: [],
      selected: [],
      turnPoints: 0,
      phase: 'banked',
      tone: 'good',
      message: `You bank ${formatPoints(points)}.`,
      ...withLog(x, 'You', `Banked ${formatPoints(points)}`),
    }))

    const run = runRef.current
    setTimeout(() => {
      if (run === runRef.current) playBot()
    }, 1000)
  }, [update, playBot])

  // Tapping a die picks it, tapping it again puts it back.
  const toggleDie = useCallback(
    (index) => {
      const g = gameRef.current
      if (g.current !== 0 || g.phase !== 'choosing') return

      update((x) => ({
        selected: x.selected.includes(index) ? x.selected.filter((i) => i !== index) : [...x.selected, index],
      }))
    },
    [update]
  )

  // A new game, to `target` or to the same score as before.
  const restart = useCallback(
    (target) => {
      runRef.current += 1
      update((x) => newGame(target ?? x.target))
    },
    [update]
  )

  return { game, roll, bank, toggleDie, restart }
}