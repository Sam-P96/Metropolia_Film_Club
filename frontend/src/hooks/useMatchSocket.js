import { useCallback, useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import { getCurrentUser } from '../utils/currentUser'

// Play Live (backend/games/farkle/live.js). While `enabled` (a game between
// members, being played), keeps this page in the game's live room, so:
//   - a change reaches it the moment it happens: onChanged(version)
//   - the other player's taps show as they make them: onSelect(selected, by)
//   - it knows whether the other player has the game open too
// A member can Play Live in one game at a time. Opening another game's
// page moves Play Live there, and this page drops back to notifications
// (`bumped`) until playLiveHere().
//
// Returns { live, opponentHere, bumped, playLiveHere, sendSelection }. If
// the connection can't be made at all, live stays false and the game page
// carries on checking for moves every few seconds instead.
export default function useMatchSocket(matchId, { enabled, opponentId, onChanged, onSelect }) {
  const [state, setState] = useState({ live: false, present: [], bumped: false })
  const socketRef = useRef(null)
  const bumpedRef = useRef(false)

  // The newest callbacks, without reconnecting every time they change.
  const handlers = useRef({ onChanged, onSelect })
  useEffect(() => {
    handlers.current = { onChanged, onSelect }
  })

  const join = useCallback(() => {
    socketRef.current?.emit('farkle:join', { matchId }, (reply) => {
      if (reply?.ok) {
        bumpedRef.current = false
        setState({ live: true, present: reply.present, bumped: false })
      } else {
        setState((previous) => ({ ...previous, live: false }))
      }
    })
  }, [matchId])

  useEffect(() => {
    if (!enabled) return

    const socket = io({ auth: { token: getCurrentUser()?.token } })
    socketRef.current = socket
    const forThisGame = (handler) => (event) => {
      if (event?.matchId === matchId) handler(event)
    }

    // On connecting, and again after any reconnect, unless another game
    // has taken Play Live in the meantime.
    socket.on('connect', () => {
      if (!bumpedRef.current) join()
    })
    socket.on('disconnect', () => setState((previous) => ({ ...previous, live: false })))
    socket.on('farkle:changed', forThisGame((event) => handlers.current.onChanged?.(event.version)))
    socket.on('farkle:select', forThisGame((event) => handlers.current.onSelect?.(event.selected, event.by)))
    socket.on('farkle:presence', forThisGame((event) => setState((previous) => ({ ...previous, present: event.present }))))
    socket.on(
      'farkle:bumped',
      forThisGame(() => {
        bumpedRef.current = true
        setState((previous) => ({ ...previous, live: false, bumped: true }))
      })
    )

    return () => {
      socket.emit('farkle:leave', { matchId })
      socket.disconnect()
      socketRef.current = null
    }
  }, [enabled, matchId, join])

  // The other player's taps can't be trusted to anything but showing them,
  // and the server only passes them on between the two players.
  const sendSelection = useCallback(
    (selected) => {
      if (state.live) socketRef.current?.emit('farkle:select', { matchId, selected })
    },
    [state.live, matchId]
  )

  const live = enabled && state.live

  return {
    live,
    opponentHere: live && state.present.includes(String(opponentId)),
    bumped: enabled && state.bumped,
    playLiveHere: join,
    sendSelection,
  }
}
