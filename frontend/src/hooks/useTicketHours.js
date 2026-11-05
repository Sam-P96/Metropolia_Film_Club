import { useCallback, useEffect, useRef, useState } from 'react'
import { getTicketHours } from '../services/scratch'

// How long after an opening or closing to ask again, so the server's clock
// has certainly passed it; the longest to go without asking anyway (a
// computer asleep stops the timer too); and how soon to try again after a
// failed request.
const SETTLE_MS = 1000
const LONGEST_WAIT_MS = 10 * 60 * 1000
const RETRY_MS = 30 * 1000

// Which Box Office Scratch ticket types are on sale right now, by the
// server's clock: { hours, refresh }. `hours` is { standard: { open, ... },
// vip: { open, ... }, ... } (backend/utils/scratch.js hoursView), or null
// while it loads. The server says how long until each type opens or closes,
// and a timer asks again just after, so the VIP button switches on at 16:00
// without a reload, and the member's own clock never comes into it. It also
// asks whenever the page comes back into view (a phone woken from sleep).
// `refresh` asks now: after a purchase is refused, say.
export default function useTicketHours() {
  const [hours, setHours] = useState(null)
  const load = useRef(() => {})

  useEffect(() => {
    let stopped = false
    let timer = null

    const again = (ms) => {
      clearTimeout(timer)
      timer = setTimeout(load.current, Math.min(Math.max(ms, SETTLE_MS), LONGEST_WAIT_MS))
    }

    load.current = () =>
      getTicketHours()
        .then((data) => {
          if (stopped) return
          setHours(data)
          const changes = Object.values(data)
            .map((type) => type.changesIn)
            .filter((ms) => ms !== null)
          again(changes.length ? Math.min(...changes) + SETTLE_MS : LONGEST_WAIT_MS)
        })
        .catch(() => {
          if (!stopped) again(RETRY_MS)
        })

    const onVisible = () => {
      if (!document.hidden) load.current()
    }

    load.current()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      stopped = true
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  const refresh = useCallback(() => load.current(), [])
  return { hours, refresh }
}
