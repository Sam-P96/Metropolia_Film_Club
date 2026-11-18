import { useEffect, useState } from 'react'
import { io } from 'socket.io-client'
import { getCurrentUser } from '../utils/currentUser'

// Box Office Crash's open rooms, live, for the top of Notifications
// (components/crash/CrashLive.jsx). `initial` is what the page loaded with
// (backend: feedController.js `crash`); then the game's own connection
// (backend: games/crash/live.js "crash:watch") sends every change as it
// happens: a room opening or closing, someone joining, a round starting or
// ending. Watching doesn't put anyone in the game.
export default function useCrashLobby(initial) {
  const [rooms, setRooms] = useState(null)

  useEffect(() => {
    const socket = io({ auth: { token: getCurrentUser()?.token } })
    socket.on('connect', () => {
      socket.emit('crash:watch', {}, (answer) => {
        if (answer?.lobby) setRooms(answer.lobby)
      })
    })
    socket.on('crash:lobby', setRooms)
    return () => socket.disconnect()
  }, [])

  return rooms ?? initial ?? []
}
