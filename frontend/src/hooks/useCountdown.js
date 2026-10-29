import { useEffect, useState } from 'react'

// Milliseconds left until `deadline` (a date, or an ISO string from the
// server), counting down every second and stopping at 0. null while there's
// no deadline.
function useCountdown(deadline) {
  const end = deadline ? new Date(deadline).getTime() : null
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (end === null) return

    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [end])

  return end === null ? null : Math.max(0, end - now)
}

// 1 205 000 -> "20:05"
export function formatCountdown(ms) {
  const seconds = Math.ceil(ms / 1000)
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

export default useCountdown
