import { useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import { getCurrentUser } from '../utils/currentUser'

// Play Live for Infinite Gomoku (backend/games/gomoku/live.js). While
// `enabled` (a game being played), keeps this page in the game's live room,
// so a stone the other player puts down reaches it the moment it happens
// (onChanged(version)), and it knows whether they have the game open too.
// If the connection can't be made, `live` stays false and the page checks
// for moves every few seconds instead. { live, opponentHere }.
export default function useGomokuSocket(gameId, { enabled, opponentId, onChanged }) {
  const [state, setState] = useState({ live: false, present: [] })

  // The newest callback, without reconnecting every time it changes.
  const handlers = useRef({ onChanged })
  useEffect(() => {
    handlers.current = { onChanged }
  })

  useEffect(() => {
    if (!enabled) return

    const socket = io({ auth: { token: getCurrentUser()?.token } })
    const forThisGame = (handler) => (event) => {
      if (event?.gameId === gameId) handler(event)
    }

    socket.on('connect', () => {
      socket.emit('gomoku:join', { gameId }, (reply) => {
        setState((previous) => (reply?.ok ? { live: true, present: reply.present } : { ...previous, live: false }))
      })
    })
    socket.on('disconnect', () => setState((previous) => ({ ...previous, live: false })))
    socket.on('gomoku:changed', forThisGame((event) => handlers.current.onChanged?.(event.version)))
    socket.on('gomoku:presence', forThisGame((event) => setState((previous) => ({ ...previous, present: event.present }))))

    return () => {
      socket.emit('gomoku:leave', { gameId })
      socket.disconnect()
    }
  }, [enabled, gameId])

  const live = enabled && state.live
  return { live, opponentHere: live && state.present.includes(String(opponentId)) }
}
