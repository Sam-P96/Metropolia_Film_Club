import { useEffect, useState } from 'react'
import { getWeekendLimits } from '../services/scratch'

// In Box Office Scratch's Double Prize Weekend, the cards of each ticket
// they can still buy today (backend/utils/scratch.js weekendLimits): { on,
// perDay, left: { standard, premium, vip } }, { on: false } outside one, or
// null while it loads. Asked again whenever `key` changes (a new card
// bought, or the weekend starting or ending).
export default function useWeekendLimits(key) {
  const [limits, setLimits] = useState(null)

  useEffect(() => {
    let stopped = false
    getWeekendLimits()
      .then((data) => {
        if (!stopped) setLimits(data)
      })
      .catch(() => {})
    return () => {
      stopped = true
    }
  }, [key])

  return limits
}
