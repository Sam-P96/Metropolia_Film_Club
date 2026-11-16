import { useCallback, useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import { getCurrentUser } from '../utils/currentUser'

// The fewest milliseconds between two aims sent while a player lines up.
const AIM_EVERY_MS = 50

// Play Live for 8 Ball Pool (backend/games/pool/live.js). While `enabled`
// (a game being played), keeps this page in the game's live room: a shot
// reaches it the moment it's played (onChanged(version)), the crowd's bets
// as they're made (onBets()), and the shooter's cue as they line up
// (onAim({ by, angle, power, on, cue })). Players send their own aim with
// sendAim. If the connection can't be made, `live` stays false and the page
// checks every few seconds instead. { live, present, opponentHere, sendAim }.
export default function usePoolSocket(gameId, { enabled, opponentId, onChanged, onBets, onAim }) {
  const [state, setState] = useState({ live: false, present: [] })
  const socketRef = useRef(null)
  const lastSent = useRef(0)

  // The newest callbacks, without reconnecting every time they change.
  const handlers = useRef({ onChanged, onBets, onAim })
  useEffect(() => {
    handlers.current = { onChanged, onBets, onAim }
  })

  useEffect(() => {
    if (!enabled) return

    const socket = io({ auth: { token: getCurrentUser()?.token } })
    socketRef.current = socket
    const forThisGame = (handler) => (event) => {
      if (event?.gameId === gameId) handler(event)
    }

    socket.on('connect', () => {
      socket.emit('pool:join', { gameId }, (reply) => {
        setState((previous) => (reply?.ok ? { live: true, present: reply.present } : { ...previous, live: false }))
      })
    })
    socket.on('disconnect', () => setState((previous) => ({ ...previous, live: false })))
    socket.on('pool:changed', forThisGame((event) => handlers.current.onChanged?.(event.version)))
    socket.on('pool:bets', forThisGame(() => handlers.current.onBets?.()))
    socket.on('pool:aim', forThisGame((event) => handlers.current.onAim?.(event)))
    socket.on('pool:presence', forThisGame((event) => setState((previous) => ({ ...previous, present: event.present }))))

    return () => {
      socket.emit('pool:leave', { gameId })
      socket.disconnect()
      socketRef.current = null
    }
  }, [enabled, gameId])

  // Your cue as you line up, a few times a second at most. `force`: always
  // send this one (the cue put down, or let go).
  const sendAim = useCallback(
    (aim, force = false) => {
      const socket = socketRef.current
      if (!socket?.connected) return
      const now = Date.now()
      if (!force && now - lastSent.current < AIM_EVERY_MS) return
      lastSent.current = now
      socket.emit('pool:aim', { gameId, ...aim })
    },
    [gameId]
  )

  const live = enabled && state.live
  return { live, present: live ? state.present : [], opponentHere: live && state.present.includes(String(opponentId)), sendAim }
}
