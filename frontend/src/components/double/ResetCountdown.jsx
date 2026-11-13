import useCountdown from '../../hooks/useCountdown'
import { GLASS } from './glass'

// 2 days 3 hours 4 minutes -> "2d 3h 4m"; under a minute -> "under a minute".
function formatLong(ms) {
  const minutes = Math.floor(ms / 60000)
  if (minutes < 1) return 'under a minute'
  const days = Math.floor(minutes / 1440)
  const hours = Math.floor((minutes % 1440) / 60)
  return [days && `${days}d`, (days || hours) && `${hours}h`, `${minutes % 60}m`].filter(Boolean).join(' ')
}

// How long until the pot starts over, as a small chip beside the page's
// title. `offset` is the server's clock minus this one, so it counts down
// to the same moment the server resets.
export default function ResetCountdown({ nextResetAt, offset }) {
  const left = useCountdown(new Date(nextResetAt).getTime() - offset)

  return (
    <div className={`${GLASS} inline-flex flex-col rounded-xl px-3 py-1.5 leading-tight`} role="timer" aria-label="Next reset">
      <span className="flex items-baseline gap-1.5 whitespace-nowrap">
        <span className="text-[0.65rem] font-semibold tracking-widest text-white/50 uppercase">Next reset</span>
        <span className="text-sm font-bold text-white tabular-nums">{left === null ? '…' : formatLong(left)}</span>
      </span>
      <span className="text-[0.65rem] text-white/50">Mon 12:00 Helsinki</span>
    </div>
  )
}
