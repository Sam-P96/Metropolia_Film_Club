import { useCallback, useEffect, useRef, useState } from 'react'
import useMatchSocket from './useMatchSocket'
import { DICE_PER_TURN, formatPoints, scoreDice } from '../../../shared/farkle/rules.js'
import { getBotMatch, getMatch, sendMove, startBotMatch } from '../services/farkle'
import { walletChanged } from '../services/wallet'

// A game of Farkle played on the server, for points. The server rolls every
// die and checks every move; this hook only sends moves ("set aside the
// dice at 0 and 3, then roll") and shows what comes back. The other side's
// turns (the bot's, or another member's) are shown one roll at a time, with
// pauses, like watching across the table. So the page and the components
// see the same `game` as they did with the old browser-only hook.
//
// Against a member, with both pages open, Play Live (useMatchSocket) shows
// each of their rolls and taps as they happen. Otherwise the page checks
// for their move every few seconds, and they get notifications.
//
// `game` is always from the member's side: index 0 is "you" (scores[0],
// current === 0, winner === 0), whichever seat they have on the server.

// How long the dice tumble before they land, at the least.
const ROLL_MS = 650

// While it's the other member's turn and Play Live isn't on, how often to
// look for their move.
const POLL_MS = 15000

// Matches in these states are games to show; the rest are challenges.
const PLAYABLE = ['active', 'over']

// What a picture of the table is made of, as opposed to the score and such.
const VISUALS = ['dice', 'kept', 'selected', 'turnPoints', 'message', 'tone']

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

// Whether the other player is in the middle of a turn, with dice rolled.
const theirTurnGoing = (match) => match.status === 'active' && match.current !== match.mySeat && match.steps?.length > 0

// The line under the dice once everything has played out.
function messageFor(match, opponent) {
  const me = match.mySeat

  if (match.status === 'over') {
    const youWon = match.winner === me
    const prize = `${formatPoints(match.prize)} P-PP is yours.`

    if (match.endedBy === 'resign') {
      return youWon
        ? { tone: 'good', message: `${opponent} folded. ${prize}` }
        : { tone: 'bad', message: `You folded, so ${opponent} takes the game.` }
    }
    if (match.endedBy === 'forfeit') {
      return youWon
        ? { tone: 'good', message: `${opponent} ran out of time. ${prize}` }
        : { tone: 'bad', message: `Three days went by without a move, so ${opponent} takes the game.` }
    }
    if (match.endedBy === 'left') {
      return { tone: 'good', message: `${opponent} left the club. ${prize}` }
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
    // Both players, you first, with their avatars and banners.
    people: [match.players[me], match.players[them]],
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

// The pictures for one of the other side's turns, roll by roll, as far as
// it has got: an unfinished turn's last roll just lands, while they pick.
// A turn's pictures only ever grow at the end as it goes on, so a page that
// has shown some of them can carry on from where it got to. `scores` (the
// page's order) is updated when they bank.
function opponentTurnFrames(steps, result, opponent, scores) {
  const frames = []
  const show = (change, ms) => frames.push({ change, ms })
  if (steps.length === 0) return frames

  show({ current: 1, dice: [], kept: [], selected: [], turnPoints: 0, phase: 'bot', tone: '', message: `${opponent} steps up to the table.` }, 900)

  let kept = []
  let points = 0

  for (const step of steps) {
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

    // Still their roll to pick from: that's as far as this turn has got.
    if (!step.then) {
      show({ phase: 'bot', message: `${opponent} is picking dice…` }, 0)
      break
    }

    show({ phase: 'bot' }, 500)
    show({ selected: step.keep, message: `${opponent} sets aside ${step.keep.length} ${diceWord(step.keep.length)} for ${formatPoints(step.points)}.` }, 1000)
    points += step.points

    if (step.then === 'bank') {
      if (result === 'win') break
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

  return frames
}

// The pictures, with a pause after each, that lead from what's on screen
// (`start`) to `match`: how your turn ended, then the other side's turns
// roll by roll. Only turns from `fromTurn` on, which are the ones the page
// hasn't finished showing, skipping the first `shown` pictures of that
// turn (shown already, live). Returns { frames, live }: `live` is how far
// into the other side's unfinished turn this gets, or null.
function framesFor(match, fromTurn, start, shown = 0) {
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

    const turnFrames = opponentTurnFrames(turn.steps, turn.result, opponent, scores)
    frames.push(...turnFrames.slice(turn.number === fromTurn ? shown : 0))
  }

  let live = null
  if (theirTurnGoing(match)) {
    const turnFrames = opponentTurnFrames(match.steps, null, opponent, scores)
    frames.push(...turnFrames.slice(match.turn === fromTurn ? shown : 0))
    live = { turn: match.turn, shown: turnFrames.length }
  }

  return { frames, live }
}

// Where a replay comes to rest: the game as the server has it, except while
// the other player's turn is still going, when the table stays as the last
// picture left it (that's where their turn has got to).
function settle(match, frames, current) {
  const game = gameFromMatch(match)
  if (!theirTurnGoing(match)) return game

  const table = Object.assign({}, current, ...frames.map((frame) => frame.change))
  return { ...game, ...Object.fromEntries(VISUALS.map((key) => [key, table[key]])), phase: 'waiting' }
}

// `matchId` is a game between members (or a challenge); without one, it's
// the member's game against the bot.
export default function useServerFarkle(matchId = null) {
  // undefined while the page loads, null when there's no game (time to
  // pick a stake, or still a challenge), otherwise the game.
  const [game, setGame] = useState(undefined)

  // The match as the server last sent it, for a challenge's card.
  const [match, setMatch] = useState(null)

  // Timers need the game as it is when they fire, not as it was when they
  // started, so the latest game is also kept here.
  const gameRef = useRef(undefined)

  // Goes up whenever something new starts (a game, leaving the page). A
  // replay checks it after every pause and stops if it has changed.
  const runRef = useRef(0)

  // How far into the other player's unfinished turn the page has got:
  // { turn, shown } pictures. Each new roll carries on from there.
  const seenRef = useRef({ turn: null, shown: 0 })

  // A change that came in while something was still playing out, to look
  // at once it's done.
  const missedRef = useRef(false)
  const refreshRef = useRef(null)

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
        if (ms) await wait(ms)
        if (run !== runRef.current) return
      }
      show(final)
    },
    [show, update]
  )

  // Plays `frames` and settles on `next`, remembering how far into the
  // other player's turn that got. Then looks at anything that came in
  // meanwhile.
  const playOut = useCallback(
    async (next, frames, live) => {
      const run = runRef.current
      seenRef.current = live ?? { turn: null, shown: 0 }
      await play(frames, settle(next, frames, gameRef.current))
      if (run === runRef.current && missedRef.current) refreshRef.current?.()
    },
    [play]
  )

  // Shows a match as it is, with no replay: a game, or (game null) a
  // challenge for the page to draw from `match`.
  const adopt = useCallback(
    (next) => {
      setMatch(next)
      seenRef.current =
        next && theirTurnGoing(next)
          ? { turn: next.turn, shown: opponentTurnFrames(next.steps, null, '', [0, 0]).length }
          : { turn: null, shown: 0 }
      show(next && PLAYABLE.includes(next.status) ? gameFromMatch(next) : null)
    },
    [show]
  )

  // The match, or their open game against the bot. Leaving the page stops
  // any replay.
  useEffect(() => {
    const run = runRef
    const started = run.current
    const load = matchId ? getMatch(matchId) : getBotMatch().then((reply) => reply.match)

    load
      .then((loaded) => {
        if (started === run.current) adopt(loaded)
      })
      .catch(() => {
        if (started === run.current) adopt(null)
      })

    return () => {
      run.current += 1
    }
  }, [matchId, adopt])

  // Has the game changed? Called by Play Live the moment something happens,
  // or every few seconds without it. While it's their turn, their new rolls
  // play out. During your own move, only the game ending matters (they gave
  // up, say). While a replay or your own roll is still going, it waits and
  // looks once that's done.
  const refresh = useCallback(async () => {
    const g = gameRef.current
    if (!g || g.phase === 'over') return

    const yourMove = g.current === 0 && (g.phase === 'ready' || g.phase === 'choosing')
    if (g.phase !== 'waiting' && !yourMove) {
      missedRef.current = true
      return
    }
    missedRef.current = false

    const run = runRef.current
    const next = await getMatch(g.id).catch(() => null)
    const now = gameRef.current
    if (!next || next.version === g.version || run !== runRef.current || now.phase !== g.phase || now.version !== g.version) return

    setMatch(next)
    if (next.status === 'over') walletChanged()

    if (yourMove) {
      if (next.status === 'over') show(gameFromMatch(next))
      return
    }

    const seen = seenRef.current.turn === g.turn ? seenRef.current.shown : 0
    const { frames, live } = framesFor(next, g.turn, g, seen)
    await playOut(next, frames, live)
  }, [playOut, show])

  useEffect(() => {
    refreshRef.current = refresh
  })

  // Play Live, in a game between members that's being played.
  const opponentId = match && match.mySeat >= 0 ? match.players[1 - match.mySeat]?._id : null
  const socket = useMatchSocket(matchId, {
    enabled: Boolean(matchId) && match?.mode === 'pvp' && match?.status === 'active',
    opponentId,
    onChanged: (version) => {
      if (version !== gameRef.current?.version) refresh()
    },
    // Their taps, shown on their dice while it's their turn.
    onSelect: (selected, by) => {
      const g = gameRef.current
      if (g?.phase === 'waiting' && String(by) === String(opponentId)) update({ selected: selected.filter((i) => i < g.dice.length) })
    },
  })

  // Without Play Live, look for their move every few seconds while it's
  // their turn, and whenever the member comes back to the tab.
  const waiting = game?.phase === 'waiting'

  useEffect(() => {
    if (!waiting || socket.live) return

    const check = () => {
      if (!document.hidden) refresh()
    }
    const timer = setInterval(check, POLL_MS)
    window.addEventListener('focus', check)

    return () => {
      clearInterval(timer)
      window.removeEventListener('focus', check)
    }
  }, [waiting, socket.live, refresh])

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
        setMatch(match)

        const left = since + ROLL_MS - Date.now()
        if (since && left > 0) await wait(left)
        if (run !== runRef.current) return

        if (match.status === 'over') walletChanged()
        const { frames, live } = framesFor(match, before.turn, start)
        await playOut(match, frames, live)
      } catch (error) {
        if (run !== runRef.current) return

        // Catch up with the game as the server has it, and say why the
        // move didn't go through.
        const match = await getMatch(before.id).catch(() => null)
        if (run !== runRef.current) return
        if (match) setMatch(match)
        show({ ...(match ? gameFromMatch(match) : before), tone: 'bad', message: error.message })
      }
    },
    [playOut, show]
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

  // Tapping a die picks it, tapping it again puts it back. The server only
  // hears about it with the Roll or Bank that follows, but with Play Live
  // the other player sees the dice picked as you go.
  const { sendSelection } = socket
  const toggleDie = useCallback(
    (index) => {
      const g = gameRef.current
      if (!g || g.current !== 0 || g.phase !== 'choosing') return

      const selected = g.selected.includes(index) ? g.selected.filter((i) => i !== index) : [...g.selected, index]
      update({ selected })
      sendSelection(selected)
    },
    [update, sendSelection]
  )

  // Folding: the other side wins and the stake is gone. Only between
  // moves (yours, or while you wait for theirs), so it never crosses a
  // roll that's still on its way.
  const resign = useCallback(() => {
    const g = gameRef.current
    const yourMove = g?.current === 0 && (g.phase === 'ready' || g.phase === 'choosing')
    if (!g || !(yourMove || g.phase === 'waiting')) return

    show({ ...g, phase: 'waiting', tone: '', message: 'Folding…' })
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
      setMatch(match)

      const final = gameFromMatch(match)
      const fresh = { ...final, scores: [0, 0], current: 1, dice: [], kept: [], selected: [], turnPoints: 0, phase: 'bot', winner: null, log: [], tone: '', message: '' }
      show(fresh)
      await playOut(match, framesFor(match, 0, fresh).frames, null)
    },
    [show, playOut]
  )

  // "Play again": back to picking a stake.
  const playAgain = useCallback(() => {
    runRef.current += 1
    setMatch(null)
    show(null)
  }, [show])

  return {
    game: game ?? null,
    match,
    loading: game === undefined,
    live: { on: socket.live, opponentHere: socket.opponentHere, bumped: socket.bumped, playLiveHere: socket.playLiveHere },
    roll,
    bank,
    toggleDie,
    resign,
    start,
    playAgain,
    adopt,
  }
}
