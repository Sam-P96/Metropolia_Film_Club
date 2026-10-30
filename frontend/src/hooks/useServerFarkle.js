import { useCallback, useEffect, useRef, useState } from 'react'
import { DICE_PER_TURN, formatPoints, scoreDice } from '../../../shared/farkle/rules.js'
import { getBotMatch, getMatch, sendMove, startBotMatch } from '../services/farkle'
import { walletChanged } from '../services/wallet'

// A game of Farkle played on the server, for points. The server rolls every
// die and checks every move; this hook only sends moves ("set aside the
// dice at 0 and 3, then roll") and shows what comes back. The bot's turn
// arrives already played, as a list of rolls, and is shown one roll at a
// time with the same pauses the bot used to take in the browser. So the
// page and the components see the same `game` as they did with the old
// browser-only hook.
//
// `game` is always from the member's side: index 0 is "you" (scores[0],
// current === 0, winner === 0), whichever seat they have on the server.

// How long the dice tumble before they land, at the least.
const ROLL_MS = 650

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const diceWord = (count) => (count === 1 ? 'die' : 'dice')

// Something for the dice to show while they tumble. Only for the
// animation: the real roll is the server's.
const tumblingDice = (count) => Array.from({ length: count }, () => 1 + Math.floor(Math.random() * 6))

// What you've tapped: the dice, the points they score (0 if any of them
// doesn't score) and how many dice that leaves to roll.
export function selectionOf(game) {
  const dice = game.selected.map((i) => game.dice[i])
  return { dice, points: scoreDice(dice), diceLeft: game.dice.length - game.selected.length }
}

// The line under the dice once everything has played out.
function messageFor(match, opponent) {
  const me = match.mySeat

  if (match.status === 'over') {
    const youWon = match.winner === me
    const prize = `${formatPoints(match.prize)} P-PP is yours.`

    if (match.endedBy === 'resign') {
      return youWon
        ? { tone: 'good', message: `${opponent} gave up. ${prize}` }
        : { tone: 'bad', message: `You gave up, so ${opponent} takes the game.` }
    }
    if (match.endedBy === 'forfeit') {
      return youWon
        ? { tone: 'good', message: `${opponent} ran out of time. ${prize}` }
        : { tone: 'bad', message: `Three days went by without a move, so ${opponent} takes the game.` }
    }

    const score = formatPoints(match.scores[match.winner])
    return youWon
      ? { tone: 'good', message: `You win with ${score}! ${prize}` }
      : { tone: 'bad', message: `${opponent} wins with ${score}.` }
  }

  if (match.current !== me) return { tone: '', message: `Waiting for ${opponent}.` }
  if (match.phase === 'ready') return { tone: '', message: 'Your turn. Roll all six dice.' }
  if (match.hotDice) return { tone: 'good', message: 'Hot dice! A fresh six. Pick your scoring dice.' }
  return { tone: '', message: 'Tap the scoring dice you want to set aside.' }
}

// The server's match, as the page shows it.
function gameFromMatch(match) {
  const me = match.mySeat
  const them = 1 - me
  const side = (seat) => (seat === null || seat === undefined ? null : seat === me ? 0 : 1)
  const opponent = match.players[them].username

  return {
    id: match._id,
    version: match.version,
    turn: match.turn,
    target: match.target,
    stake: match.stake,
    prize: match.prize,
    opponent,
    players: ['You', opponent],
    scores: [match.scores[me], match.scores[them]],
    current: side(match.current),
    dice: match.dice,
    kept: match.kept,
    selected: [],
    turnPoints: match.turnPoints,
    // 'waiting' is the other player's turn (in a game against a member;
    // the bot always finishes its turn before the server answers).
    phase: match.status === 'over' ? 'over' : match.current === me ? match.phase : 'waiting',
    hotDice: match.hotDice,
    winner: side(match.winner),
    endedBy: match.endedBy,
    forfeitAt: match.forfeitAt,
    log: match.log.map((entry) => ({ id: entry.number, who: entry.seat === me ? 'You' : opponent, text: entry.text })),
    ...messageFor(match, opponent),
  }
}

// The pictures, with a pause after each, that lead from what's on screen
// (`start`) to `match`: how your turn ended, then each of the other side's
// turns roll by roll, like watching across the table. Only turns from
// `fromTurn` on, which are the ones the page hasn't shown yet.
function framesFor(match, fromTurn, start) {
  const me = match.mySeat
  const opponent = match.players[1 - me].username
  const scores = [...start.scores]
  const frames = []
  const show = (change, ms) => frames.push({ change, ms })

  for (const turn of match.lastTurns.filter((t) => t.number >= fromTurn)) {
    if (turn.seat === me) {
      if (turn.result === 'farkle') {
        show(
          {
            dice: turn.steps[turn.steps.length - 1].dice,
            kept: start.kept,
            turnPoints: start.turnPoints,
            selected: [],
            phase: 'farkle',
            tone: 'bad',
            message: start.turnPoints
              ? `Farkle! Nothing scores. You lose ${formatPoints(start.turnPoints)} points.`
              : 'Farkle! Nothing scores this roll.',
          },
          1800
        )
      } else if (turn.result === 'bank') {
        scores[0] += turn.points
        show(
          { scores: [...scores], dice: [], kept: [], selected: [], turnPoints: 0, phase: 'banked', tone: 'good', message: `You bank ${formatPoints(turn.points)}.` },
          1000
        )
      }
      // A winning bank needs no picture of its own: the game's end shows it.
      continue
    }

    show({ current: 1, dice: [], kept: [], selected: [], turnPoints: 0, phase: 'bot', tone: '', message: `${opponent} steps up to the table.` }, 900)

    let kept = []
    let points = 0

    for (const step of turn.steps) {
      const count = step.dice.length
      show({ dice: step.dice, kept, selected: [], turnPoints: points, phase: 'rolling', tone: '', message: `${opponent} rolls ${count} ${diceWord(count)}…` }, ROLL_MS)

      if (step.then === 'farkle') {
        show(
          {
            phase: 'bot',
            tone: 'bad',
            message: points ? `Farkle! ${opponent} loses ${formatPoints(points)} points.` : `Farkle! Nothing scores for ${opponent}.`,
          },
          1800
        )
        break
      }

      show({ phase: 'bot' }, 500)
      show({ selected: step.keep, message: `${opponent} sets aside ${step.keep.length} ${diceWord(step.keep.length)} for ${formatPoints(step.points)}.` }, 1000)
      points += step.points

      if (step.then === 'bank') {
        if (turn.result === 'win') break
        scores[1] += points
        show({ scores: [...scores], dice: [], kept: [], selected: [], turnPoints: 0, phase: 'banked', tone: '', message: `${opponent} banks ${formatPoints(points)}.` }, 1300)
      } else if (step.keep.length === count) {
        kept = []
        show({ dice: [], kept: [], selected: [], turnPoints: points, tone: 'good', message: `Hot dice! ${opponent} rolls all six again.` }, 900)
      } else {
        kept = kept.concat(step.keep.map((i) => step.dice[i]))
        const rest = step.dice.filter((_, i) => !step.keep.includes(i))
        show({ dice: rest, kept, selected: [], turnPoints: points, message: `${opponent} risks it with ${rest.length} ${diceWord(rest.length)}.` }, 900)
      }
    }
  }

  return frames
}

export default function useServerFarkle() {
  // undefined while the page loads, null when there's no game (time to
  // pick a stake), otherwise the game.
  const [game, setGame] = useState(undefined)

  // Timers need the game as it is when they fire, not as it was when they
  // started, so the latest game is also kept here.
  const gameRef = useRef(undefined)

  // Goes up whenever something new starts (a game, leaving the page). A
  // replay checks it after every pause and stops if it has changed.
  const runRef = useRef(0)

  const show = useCallback((next) => {
    gameRef.current = next
    setGame(next)
  }, [])

  const update = useCallback((change) => show({ ...gameRef.current, ...change }), [show])

  // Shows `frames` one by one, then settles on `final`.
  const play = useCallback(
    async (frames, final) => {
      const run = runRef.current
      for (const { change, ms } of frames) {
        update(change)
        await wait(ms)
        if (run !== runRef.current) return
      }
      show(final)
    },
    [show, update]
  )

  // Their open game, if they have one. Leaving the page stops any replay.
  useEffect(() => {
    const run = runRef
    const started = run.current

    getBotMatch()
      .then(({ match }) => {
        if (started === run.current) show(match ? gameFromMatch(match) : null)
      })
      .catch(() => {
        if (started === run.current) show(null)
      })

    return () => {
      run.current += 1
    }
  }, [show])

  // Sends a move and plays out what the server says happened. `before` is
  // the game as it was, `start` as it will be once the move is made (the
  // points you just set aside, say), and `since` when the dice started
  // tumbling, so they tumble for at least ROLL_MS however fast the reply.
  const send = useCallback(
    async (move, before, start, since = 0) => {
      const run = runRef.current

      try {
        const match = await sendMove(before.id, { version: before.version, ...move })
        if (run !== runRef.current) return

        const left = since + ROLL_MS - Date.now()
        if (since && left > 0) await wait(left)
        if (run !== runRef.current) return

        if (match.status === 'over') walletChanged()
        await play(framesFor(match, before.turn, start), gameFromMatch(match))
      } catch (error) {
        if (run !== runRef.current) return

        // Catch up with the game as the server has it, and say why the
        // move didn't go through.
        const match = await getMatch(before.id).catch(() => null)
        if (run !== runRef.current) return
        show({ ...(match ? gameFromMatch(match) : before), tone: 'bad', message: error.message })
      }
    },
    [play, show]
  )

  // The Roll button: the first roll of your turn, or set aside what you
  // tapped and roll the rest (all six again on hot dice).
  const roll = useCallback(() => {
    const g = gameRef.current
    if (!g || g.current !== 0) return

    let keep = []
    let count = DICE_PER_TURN
    let change = {}

    if (g.phase === 'choosing') {
      const pick = selectionOf(g)
      if (!pick.points) return

      const hot = pick.diceLeft === 0
      keep = [...g.selected].sort((a, b) => a - b)
      count = hot ? DICE_PER_TURN : pick.diceLeft
      change = { turnPoints: g.turnPoints + pick.points, kept: hot ? [] : g.kept.concat(pick.dice) }
    } else if (g.phase !== 'ready') {
      return
    }

    const start = { ...g, ...change }
    show({ ...start, dice: tumblingDice(count), selected: [], phase: 'rolling', tone: '', message: 'Rolling…' })
    send({ type: 'roll', keep }, g, start, Date.now())
  }, [show, send])

  // The Bank button: add this turn's points, including what you tapped, to
  // your score and pass the dice.
  const bank = useCallback(() => {
    const g = gameRef.current
    if (!g || g.current !== 0 || g.phase !== 'choosing') return

    const pick = selectionOf(g)
    if (!pick.points) return

    const start = { ...g, turnPoints: g.turnPoints + pick.points, kept: g.kept.concat(pick.dice) }
    show({ ...g, phase: 'banked', tone: '', message: 'Banking…' })
    send({ type: 'bank', keep: [...g.selected].sort((a, b) => a - b) }, g, start)
  }, [show, send])

  // Tapping a die picks it, tapping it again puts it back. Only on this
  // screen: the server hears about it with the Roll or Bank that follows.
  const toggleDie = useCallback(
    (index) => {
      const g = gameRef.current
      if (!g || g.current !== 0 || g.phase !== 'choosing') return

      update({ selected: g.selected.includes(index) ? g.selected.filter((i) => i !== index) : [...g.selected, index] })
    },
    [update]
  )

  // Giving up: the other side wins and the stake is gone. Only between
  // moves, so it never crosses a roll that's still on its way.
  const resign = useCallback(() => {
    const g = gameRef.current
    if (!g || g.current !== 0 || (g.phase !== 'ready' && g.phase !== 'choosing')) return

    show({ ...g, phase: 'waiting', tone: '', message: 'Giving up…' })
    send({ type: 'resign' }, g, g)
  }, [show, send])

  // A new game against the bot, for `stake` points, to `target`. The bot
  // rolls first, so its first turn plays out before yours. Rejects with
  // the server's reason (not enough points, say) if it can't start.
  const start = useCallback(
    async ({ target, stake }) => {
      const match = await startBotMatch({ target, stake })
      walletChanged()
      runRef.current += 1

      const final = gameFromMatch(match)
      const fresh = { ...final, scores: [0, 0], current: 1, dice: [], kept: [], selected: [], turnPoints: 0, phase: 'bot', winner: null, log: [], tone: '', message: '' }
      show(fresh)
      await play(framesFor(match, 0, fresh), final)
    },
    [show, play]
  )

  // "Play again": back to picking a stake.
  const playAgain = useCallback(() => {
    runRef.current += 1
    show(null)
  }, [show])

  return { game: game ?? null, loading: game === undefined, roll, bank, toggleDie, resign, start, playAgain }
}
