import { useCallback, useEffect, useRef, useState } from 'react'
import { getDoubleStatus, startDouble, throwDouble } from '../services/double'
import { walletChanged } from '../services/wallet'

// How often the pot is checked while they're not mid-game: someone else may
// have played, moving the bet on.
const CHECK_EVERY_MS = 7000
// How long both throws stay up after a round, before the next one.
const REVEAL_MS = 1600

export const formatPoints = (n) => Number(n ?? 0).toLocaleString('en-US')

// The server's clock minus this one, from the time it sent.
const clockOffset = (serverNow) => new Date(serverNow).getTime() - Date.now()

// How a finished game went, for the result panel.
function resultOf(game) {
  return {
    outcome: game.outcome,
    bet: game.bet,
    payout: game.payout,
    bonusWon: game.bonusWon,
    newBet: game.newBet,
    results: game.rounds.map((round) => round.result),
    timedOut: game.rounds.some((round) => round.auto),
  }
}

// What a refused start says, in words.
function startRefusal(error) {
  const data = error.data ?? {}
  if (data.code === 'POT_CHANGED') return `Someone just played! The bet is now ${formatPoints(data.currentBet)}.`
  if (data.code === 'POT_IN_USE') return data.mine ? 'You already have a game going.' : `${data.playing} is playing…`
  return error.message
}

// Double or Nothing for the logged-in member, everything the page needs:
//   status   the last answer from /status (null while it loads)
//   game     their game in progress, or null
//   reveal   the round just played, shown for a moment: { round, number }
//   result   how their last game ended, until they dismiss it
//   notice   why a start didn't happen ("Someone just played!…")
//   busy     a start or a throw on its way
//   offset   the server's clock minus this one, in ms, so countdowns agree
// Nothing is retried by itself: a refused start is explained, and the
// member decides whether to press again.
export default function useDoubleOrNothing() {
  const [status, setStatus] = useState(null)
  const [loadError, setLoadError] = useState(false)
  const [game, setGame] = useState(null)
  const [reveal, setReveal] = useState(null)
  const [result, setResult] = useState(null)
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [offset, setOffset] = useState(0)

  // The game as it is now, for callbacks that run later.
  const gameRef = useRef(null)
  const showGame = useCallback((next) => {
    gameRef.current = next
    setGame(next)
  }, [])

  // Their game ended without them: show how, and the pot as it is now.
  const endWith = useCallback(
    (finished) => {
      setResult(resultOf(finished))
      showGame(null)
      walletChanged()
    },
    [showGame]
  )

  const load = useCallback(
    () =>
      getDoubleStatus().then(
        (next) => {
          setStatus(next)
          setLoadError(false)
          setOffset(clockOffset(next.serverNow))

          const mine = gameRef.current
          if (next.game) {
            // A game in progress (after a refresh, or from another tab): pick it up.
            if (mine?._id !== next.game._id || mine.rounds.length !== next.game.rounds.length) showGame(next.game)
          } else if (mine && mine.status === 'in_progress') {
            // Their time ran out and the server threw for them.
            const ended = next.recent.find((play) => play.type === 'game' && play._id === mine._id)
            if (ended) {
              setResult({ ...ended, timedOut: ended.auto })
              walletChanged()
            }
            showGame(null)
          }
        },
        () => setLoadError(true)
      ),
    [showGame]
  )

  // The first look, then every few seconds while they're not mid-game
  // (skipped while the tab is in the background).
  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (game) return
    const timer = setInterval(() => {
      if (!document.hidden) load()
    }, CHECK_EVERY_MS)
    return () => clearInterval(timer)
  }, [game, load])

  // When a round's time runs out, ask again: the server throws for them,
  // and the answer shows how the game ended.
  const deadline = game?.status === 'in_progress' ? new Date(game.roundDeadline).getTime() - offset : null
  useEffect(() => {
    if (deadline === null || busy || reveal) return
    const timer = setTimeout(load, Math.max(0, deadline - Date.now()) + 600)
    return () => clearTimeout(timer)
  }, [deadline, busy, reveal, load])

  // After a round's throws have been up a moment: on to the next round, or
  // once the game's decided, to how it ended.
  useEffect(() => {
    if (!reveal) return
    const timer = setTimeout(() => {
      setReveal(null)
      const current = gameRef.current
      if (current?.status === 'finished') {
        setResult(resultOf(current))
        showGame(null)
        load()
      }
    }, REVEAL_MS)
    return () => clearTimeout(timer)
  }, [reveal, load, showGame])

  const start = useCallback(async () => {
    if (!status || busy) return
    setBusy(true)
    setNotice('')
    setResult(null)
    try {
      const started = await startDouble(status.currentBet)
      setOffset(clockOffset(started.serverNow))
      showGame(started.game)
      walletChanged()
    } catch (error) {
      setNotice(startRefusal(error))
      load()
    } finally {
      setBusy(false)
    }
  }, [status, busy, showGame, load])

  const throwHand = useCallback(
    async (hand) => {
      const current = gameRef.current
      if (!current || current.status !== 'in_progress' || busy || reveal) return
      setBusy(true)
      setNotice('')
      try {
        const played = await throwDouble(current._id, hand, current.rounds.length + 1)
        setOffset(clockOffset(played.serverNow))
        showGame(played.game)
        setReveal({ round: played.round, number: played.rounds.length })
        if (played.outcome) walletChanged()
      } catch (error) {
        const finished = error.data?.game
        if (finished?.status === 'finished') endWith(finished)
        else if (finished) showGame(finished)
        else setNotice(error.message)
      } finally {
        setBusy(false)
      }
    },
    [busy, reveal, showGame, endWith]
  )

  const dismissResult = useCallback(() => setResult(null), [])

  return { status, loadError, game, reveal, result, notice, busy, offset, start, throwHand, dismissResult }
}
