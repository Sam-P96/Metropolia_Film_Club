import { useCallback, useEffect, useRef, useState } from 'react'
import useGomokuSocket from './useGomokuSocket'
import { getGomokuMatch, markGomokuSeen, sendGomokuMove } from '../services/gomoku'
import { walletChanged } from '../services/wallet'
import { pieceAgainst } from '../../../shared/gomoku/catalogue.js'

// While it's the other player's turn and Play Live isn't on, how often to
// look for their move.
const POLL_MS = 10000

// How each seat's stones look to the viewer: their own piece for theirs,
// and the other player's piece for the other's, unless it's the same as
// theirs (then the opposite: catalogue.js pieceAgainst).
export function piecesOf(match) {
  const me = match.mySeat
  const mine = { id: match.myLook.piece, invert: false }
  const theirs = pieceAgainst(match.myLook.piece, match.players[1 - me].look.piece)
  return (seat) => (seat === me ? mine : theirs)
}

// One game of Infinite Gomoku between members, played on the server: this
// loads it, keeps it up to date (Play Live, or a check every few seconds
// while it's their turn), and sends your moves. Picking a point only shows
// a ghost of your piece; `place()` (the button under the board) puts it
// down, with your shockwave, straight away, and the server has the last
// word. The other player's newest stone lands with their shockwave the
// first time you see it, whether you were watching live or come back
// later (the server remembers what you've seen).
export default function useGomokuGame(matchId) {
  const [match, setMatch] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(null)
  const [busy, setBusy] = useState(false)
  const [impact, setImpact] = useState(null)

  const versionRef = useRef(-1)
  const landedRef = useRef(0)
  const movesRef = useRef(-1)
  const overRef = useRef(null)
  const impacts = useRef(0)

  // `confirmed`: you just placed it, so the buzz starts with a click.
  const land = useCallback((x, y, wave, confirmed = false) => {
    impacts.current += 1
    setImpact({ x, y, wave, key: impacts.current, confirmed })
  }, [])

  // A view of the game from the server. One older than what's showing is
  // ignored (two answers can arrive out of order).
  const adopt = useCallback(
    (view) => {
      if (!view || view.version < versionRef.current) return
      versionRef.current = view.version
      setMatch(view)

      if (view.moveCount !== movesRef.current) {
        movesRef.current = view.moveCount
        setSelected(null)
      }

      const last = view.lastMove
      if (last && last.seat !== view.mySeat && view.moveCount > view.seen && view.moveCount > landedRef.current) {
        landedRef.current = view.moveCount
        land(last.x, last.y, view.players[last.seat].look.shockwave)
        markGomokuSeen(view._id, view.moveCount).catch(() => {})
      }

      // It just ended: a win (or a draw's stakes) shows in the wallet.
      if (overRef.current === false && view.status === 'over') walletChanged()
      overRef.current = view.status === 'over'
    },
    [land]
  )

  const load = useCallback(
    () =>
      getGomokuMatch(matchId)
        .then(adopt)
        .catch((loadError) => setError(loadError.message))
        .finally(() => setLoading(false)),
    [matchId, adopt]
  )

  useEffect(() => {
    load()
  }, [load])

  const active = match?.status === 'active'
  const myTurn = active && match.current === match.mySeat
  const opponentId = match ? match.players[1 - match.mySeat]?._id : null

  const live = useGomokuSocket(matchId, {
    enabled: active,
    opponentId,
    onChanged: (version) => {
      if (version > versionRef.current) load()
    },
  })

  // Not live and waiting on them: look every few seconds while the page is
  // showing, and straight away when it comes back into view.
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

  const select = useCallback(
    (x, y) => {
      if (myTurn && !busy) setSelected({ x, y })
    },
    [myTurn, busy]
  )

  const place = async () => {
    if (!selected || !myTurn || busy) return
    const { x, y } = selected
    const before = match
    setBusy(true)
    setError('')

    // It lands now, with your shockwave.
    setMatch({
      ...match,
      moves: [...match.moves, { x, y, seat: match.mySeat }],
      moveCount: match.moveCount + 1,
      lastMove: { x, y, seat: match.mySeat },
      current: 1 - match.mySeat,
    })
    setSelected(null)
    land(x, y, match.myLook.shockwave, true)

    try {
      adopt(await sendGomokuMove(match._id, { version: match.version, type: 'place', x, y }))
    } catch (placeError) {
      setError(placeError.message)
      if (placeError.data?.match) adopt(placeError.data.match)
      else setMatch(before)
    } finally {
      setBusy(false)
    }
  }

  const resign = async () => {
    if (!active || busy) return
    setBusy(true)
    setError('')
    try {
      adopt(await sendGomokuMove(match._id, { version: match.version, type: 'resign' }))
    } catch (resignError) {
      setError(resignError.message)
      if (resignError.data?.match) adopt(resignError.data.match)
    } finally {
      setBusy(false)
    }
  }

  return {
    match,
    loading,
    error,
    busy,
    selected,
    select,
    place,
    resign,
    impact,
    myTurn,
    live,
    adopt,
    reload: load,
    pieceFor: match?.myLook ? piecesOf(match) : null,
  }
}
