import { useEffect, useRef } from 'react'
import { io } from 'socket.io-client'
import { getCurrentUser } from '../utils/currentUser'

// Steal and Defend's live news (backend/games/farkle/live.js announceSteal):
// while `enabled`, calls onEvent({ kind, attackId }) the moment an attack
// involving the logged-in member starts ("attacked", when they're the
// defender) or ends ("resolved"). If the connection can't be made, pages
// carry on checking every few seconds instead.
export default function useStealSocket(onEvent, enabled = true) {
  const handler = useRef(onEvent)
  useEffect(() => {
    handler.current = onEvent
  })

  useEffect(() => {
    const token = getCurrentUser()?.token
    if (!enabled || !token) return
    const socket = io({ auth: { token } })
    socket.on('steal:attack', (event) => handler.current?.(event))
    return () => {
      socket.disconnect()
    }
  }, [enabled])
}
