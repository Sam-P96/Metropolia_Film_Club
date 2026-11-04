import { useCallback, useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import { getCurrentUser } from '../utils/currentUser'

// The Kino Poker table, live (backend/games/poker/live.js). While the page
// is open it watches the table: `state` is the table as this member sees
// it (their own cards only), updated after every change, and `onEvent`
// hears every animation, speech bubble and emoji as it happens. A dropped
// connection reconnects by itself and picks the table up again (the server
// waits a little before folding anyone).
//
// Returns { state, connected, offset, send }: `offset` is the server's
// clock minus this one (for timers), and send(event, payload) resolves to
// the server's answer, { ok, ... } or { error, code }.
export default function usePokerTable({ onEvent } = {}) {
  const [state, setState] = useState(null)
  const [connected, setConnected] = useState(false)
  const [offset, setOffset] = useState(0)
  const socketRef = useRef(null)
  const handlers = useRef({ onEvent })

  useEffect(() => {
    handlers.current = { onEvent }
  })

  useEffect(() => {
    const socket = io({ auth: { token: getCurrentUser()?.token } })
    socketRef.current = socket
    const take = (next) => {
      if (!next) return
      setOffset(next.serverNow - Date.now())
      setState(next)
    }
    socket.on('connect', () => {
      setConnected(true)
      socket.emit('poker:watch', {}, (reply) => take(reply?.state))
    })
    socket.on('disconnect', () => setConnected(false))
    socket.on('poker:state', take)
    socket.on('poker:event', (event) => handlers.current.onEvent?.(event))
    return () => {
      socket.emit('poker:unwatch')
      socket.disconnect()
    }
  }, [])

  const send = useCallback(
    (event, payload = {}) =>
      new Promise((resolve) => {
        const socket = socketRef.current
        if (!socket?.connected) return resolve({ error: "You're not connected. Trying again…", code: 'OFFLINE' })
        socket.timeout(8000).emit(event, payload, (error, reply) => resolve(error ? { error: 'The table didn\'t answer. Try again.', code: 'TIMEOUT' } : reply))
      }),
    []
  )

  return { state, connected, offset, send }
}
