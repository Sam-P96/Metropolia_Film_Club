import { useEffect, useState } from 'react'
import { io } from 'socket.io-client'
import { getJackpot } from '../services/scratch'
import { getCurrentUser } from '../utils/currentUser'

// While the socket isn't connected, how often to look at the pools instead.
const POLL_MS = 10000

// The Box Office Scratch jackpots, kept up to date: { amounts: { standard,
// premium, vip }, recent }, or null while they load. It listens on the
// site's live connection (the one Play Live uses), so a pool ticks up the
// moment anyone buys a ticket of its type; without one it looks every 10
// seconds instead. When someone wins a pool, the winners list loads again.
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
    socket?.on('scratch:jackpot', ({ type, amount, won }) => {
      if (won) load()
      else {
        setJackpot((previous) =>
          previous && type in previous.amounts ? { ...previous, amounts: { ...previous.amounts, [type]: amount } } : previous
        )
      }
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
