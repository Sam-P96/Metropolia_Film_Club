import { useCallback, useEffect, useRef, useState } from 'react'
import usePoolSocket from './usePoolSocket'
import { getPoolMatch, markPoolSeen, sendPoolShot } from '../services/pool'
import { walletChanged } from '../services/wallet'

// While it's the other player's turn and Play Live isn't on, how often to
// look for their shot.
const POLL_MS = 8000

// The table as it stood before `match.lastShot`, for the score bar and the
// line under the table while that shot plays out (so it doesn't give away
// how it ends).
export function beforeShot(match) {
  const shot = match.lastShot
  if (!shot) return match
  return {
    ...match,
    balls: shot.before,
    current: shot.seat,
    status: 'active',
    winner: null,
    endedBy: null,
    solids: shot.assigned ? null : match.solids,
    hand: null,
    // What the shot did isn't told until it's done.
    lastShot: null,
  }
}

// One game of 8 Ball Pool between members, played on the server, for its
// players and for anyone watching: this loads it, keeps it up to date
// (Play Live, or a check every few seconds), and sends your shots. Every
// shot, yours included, is played out on the table from what the server
// sends back (lastShot), so everyone sees the very same thing. The other
// player's newest shot plays the first time you see it, live or later
// (the server remembers what you've seen).
export default function usePoolGame(matchId) {
  const [match, setMatch] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [shot, setShot] = useState(null)
  const [ghost, setGhost] = useState(null)
  const [betsChanged, setBetsChanged] = useState(0)

  const versionRef = useRef(-1)
  const shownRef = useRef(null)
  const overRef = useRef(null)

  // A view of the game from the server. One older than what's showing is
  // ignored (two answers can arrive out of order).
  const adopt = useCallback((view) => {
    if (!view || view.version < versionRef.current) return
    versionRef.current = view.version
    setMatch(view)

    // A shot nobody's shown this page yet: play it.
    if (shownRef.current === null) shownRef.current = view.mySeat >= 0 ? (view.seen ?? view.shots) : view.shots
    if (view.lastShot && view.shots > shownRef.current) {
      setShot({
        key: view.shots,
        before: view.lastShot.before,
        dx: view.lastShot.dx,
        dy: view.lastShot.dy,
        speed: view.lastShot.speed,
        // The shooter's Ignition: what flies off when the balls collide.
        ignition: view.players[view.lastShot.seat]?.look?.ignition ?? null,
      })
      setGhost(null)
      if (view.mySeat >= 0 && view.lastShot.seat !== view.mySeat) markPoolSeen(view._id, view.shots).catch(() => {})
    }
    shownRef.current = Math.max(shownRef.current, view.shots ?? 0)

    // It just ended: a win shows in the wallet.
    if (overRef.current === false && view.status === 'over') walletChanged()
    overRef.current = view.status === 'over'
  }, [])

  const load = useCallback(
    () =>
      getPoolMatch(matchId)
        .then(adopt)
        .catch((loadError) => setError(loadError.message))
        .finally(() => setLoading(false)),
    [matchId, adopt]
  )

  useEffect(() => {
    load()
  }, [load])

  const shotDone = useCallback((key) => setShot((now) => (now?.key === key ? null : now)), [])

  const active = match?.status === 'active'
  const playing = Boolean(shot)
  const mine = match ? match.mySeat >= 0 : false
  const myTurn = active && mine && match.current === match.mySeat
  const opponentId = match && mine ? match.players[1 - match.mySeat]?._id : null

  const live = usePoolSocket(matchId, {
    enabled: active,
    opponentId,
    onChanged: (version) => {
      if (version > versionRef.current) load()
    },
    onBets: () => setBetsChanged((count) => count + 1),
    onAim: (aim) => setGhost(aim),
  })

  // Not live and waiting on someone else: look every few seconds while the
  // page is showing, and straight away when it comes back into view.
  useEffect(() => {
    if (!active || myTurn || live.live) return
    const look = () => {
      if (document.visibilityState === 'visible') load()
    }
    const timer = setInterval(look, POLL_MS)
    document.addEventListener('visibilitychange', look)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', look)
    }
  }, [active, myTurn, live.live, load])

  const send = async (body) => {
    setBusy(true)
    setError('')
    try {
      adopt(await sendPoolShot(match._id, { version: match.version, ...body }))
    } catch (sendError) {
      setError(sendError.message)
      if (sendError.data?.match) adopt(sendError.data.match)
    } finally {
      setBusy(false)
    }
  }

  const shoot = ({ angle, power, cue }) => {
    if (!myTurn || busy || playing) return
    live.sendAim({ angle, power, on: false }, true)
    return send({ type: 'shot', angle, power, ...(cue && { cue }) })
  }

  const resign = () => {
    if (!active || !mine || busy) return
    return send({ type: 'resign' })
  }

  return {
    match,
    // The game as the table shows it: before the shot that's playing out.
    shown: match && playing ? beforeShot(match) : match,
    loading,
    error,
    busy,
    shot,
    shotDone,
    playing,
    myTurn,
    canAim: myTurn && !busy && !playing,
    ghost: ghost && opponentId && ghost.by === String(opponentId) ? ghost : !mine ? ghost : null,
    live,
    betsChanged,
    shoot,
    resign,
    adopt,
    reload: load,
  }
}
