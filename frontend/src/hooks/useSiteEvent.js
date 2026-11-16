import { useEffect, useState } from 'react'

// Whether a calendar event is on (shared/events.js: blackFridaySale,
// doublePrizeWeekend), by this device's clock, checked again every minute
// so it starts and ends while the page is open. For showing it only: the
// server decides what things cost and pay. `check` must be the same
// function every render (one from shared/events.js).
export default function useSiteEvent(check) {
  const [on, setOn] = useState(() => check().on)

  useEffect(() => {
    const timer = setInterval(() => setOn(check().on), 60 * 1000)
    return () => clearInterval(timer)
  }, [check])

  return on
}
