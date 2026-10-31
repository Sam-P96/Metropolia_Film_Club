import { useEffect, useState } from 'react'
import { NOTIFICATIONS_SEEN_EVENT, getUnread } from '../services/feed'

// How often the nav asks whether anything new has come in. Each ask is
// tiny (the server only checks whether there's at least one), and it's
// skipped while the tab is in the background.
const CHECK_EVERY_MS = 60 * 1000
const NOTHING = { unread: false, games: false }

// Whether the logged-in member has unread notifications, for the bell in
// the nav: { unread, games } (services/feed.js getUnread). Asked again
// every minute, on every page change, when they come back to the tab, and
// straight after they open Notifications. Always "nothing" when `enabled`
// is false, for logged-out visitors.
export default function useUnread(enabled, page) {
  const [state, setState] = useState(NOTHING)

  useEffect(() => {
    if (!enabled) return

    let stopped = false
    const check = () => {
      if (document.hidden) return
      getUnread()
        .then((data) => {
          if (!stopped) setState({ unread: Boolean(data.unread), games: Boolean(data.games) })
        })
        .catch(() => {})
    }

    check()
    const timer = setInterval(check, CHECK_EVERY_MS)
    window.addEventListener(NOTIFICATIONS_SEEN_EVENT, check)
    window.addEventListener('focus', check)
    document.addEventListener('visibilitychange', check)

    return () => {
      stopped = true
      clearInterval(timer)
      window.removeEventListener(NOTIFICATIONS_SEEN_EVENT, check)
      window.removeEventListener('focus', check)
      document.removeEventListener('visibilitychange', check)
    }
  }, [enabled, page])

  return enabled ? state : NOTHING
}
