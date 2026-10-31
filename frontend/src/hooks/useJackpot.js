import { useEffect, useState } from 'react'
import { io } from 'socket.io-client'
import { getJackpot } from '../services/scratch'
import { getCurrentUser } from '../utils/currentUser'
import { SCRATCH } from '../../../shared/scratch/config.js'

// While the socket isn't connected, how often to look at the pool instead.
const POLL_MS = 10000

// The Box Office Scratch jackpot, kept up to date: { amount, recent }, or
// null while it loads. It listens on the site's live connection (the one
// Play Live uses), so the pool ticks up the moment anyone buys a ticket;
// without one it looks every 10 seconds instead. When the pool goes back to
// the seed, someone has just won it, so the winners list loads again.
export default function useJackpot() {
  const [jackpot, setJackpot] = useState(null)

  useEffect(() => {
    let stopped = false
    const load = () =>
      getJackpot()
        .then((data) => {
          if (!stopped) setJackpot(data)
        })
        .catch(() => {})

    load()

    const token = getCurrentUser()?.token
    const socket = token ? io({ auth: { token } }) : null
    socket?.on('connect', () => socket.emit('scratch:watch'))
    socket?.on('scratch:jackpot', ({ amount }) => {
      if (amount === SCRATCH.jackpotSeed) load()
      else setJackpot((previous) => (previous ? { ...previous, amount } : previous))
    })

    const timer = setInterval(() => {
      if (!socket?.connected && !document.hidden) load()
    }, POLL_MS)

    return () => {
      stopped = true
      clearInterval(timer)
      socket?.disconnect()
    }
  }, [])

  return jackpot
}
