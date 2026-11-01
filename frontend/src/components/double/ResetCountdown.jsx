import useCountdown from '../../hooks/useCountdown'
import { GLASS } from './glass'

const CARD = `${GLASS} p-5`

// 2 days 3 hours 4 minutes -> "2d 3h 4m"; under a minute -> "under a minute".
function formatLong(ms) {
  const minutes = Math.floor(ms / 60000)
  if (minutes < 1) return 'under a minute'
  const days = Math.floor(minutes / 1440)
  const hours = Math.floor((minutes % 1440) / 60)
  return [days && `${days}d`, (days || hours) && `${hours}h`, `${minutes % 60}m`].filter(Boolean).join(' ')
}

// How long until the pot starts over. `offset` is the server's clock minus
// this one, so it counts down to the same moment the server resets.
export default function ResetCountdown({ nextResetAt, offset }) {
  const left = useCountdown(new Date(nextResetAt).getTime() - offset)

  return (
    <section className={CARD} aria-label="Next reset">
      <p className="text-xs tracking-widest text-white/50 uppercase">Next reset</p>
      <p className="mt-1 text-2xl font-bold text-white tabular-nums">{left === null ? '…' : formatLong(left)}</p>
      <p className="mt-1 text-sm text-white/60">Monday 12:00 Helsinki time</p>
    </section>
  )
}
