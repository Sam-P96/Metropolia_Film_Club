import { Link } from 'react-router-dom'
import useApi from '../../hooks/useApi'
import useCountdown, { formatCountdown } from '../../hooks/useCountdown'
import { getOrcaSummary } from '../../services/orca'
import { SPEAKERS } from './speakers'

// Lord Gang Orca's card on the Games page, beside King Loan Shark's: open or
// closed, begs left today, the cooldown, and favours, for members logged in.
export default function OrcaCard({ className, loggedIn }) {
  const summary = useApi(() => getOrcaSummary(), [loggedIn], { enabled: loggedIn })
  const data = summary.data
  const cooldown = useCountdown(data?.cooldownUntil)
  const chip = 'rounded-full border px-2.5 py-0.5 text-xs font-semibold'

  return (
    <Link to="/games/lord-gang-orca" className={className}>
      <img
        src={SPEAKERS.orca.src}
        alt=""
        aria-hidden="true"
        style={{ objectPosition: SPEAKERS.orca.position }}
        className="size-14 self-start rounded-full border-2 border-brand-gold bg-ink object-cover shadow-[0_0_18px_rgb(250_188_63/0.3)]"
      />
      <h2 className="font-['Bebas_Neue'] text-3xl leading-none tracking-wide text-white">
        Lord Gang <span className="text-brand-gold">Orca</span>
      </h2>
      <p className="text-white/70">King Loan Shark&apos;s rival gives PP away, no interest. Ask nicely. One day, he&apos;ll want a favour back.</p>
      {data && (
        <div className="flex flex-wrap gap-1.5">
          <span className={`${chip} ${data.open ? 'border-emerald-400/50 bg-emerald-500/15 text-emerald-200' : 'border-white/15 bg-white/5 text-white/65'}`}>
            {data.open ? 'Open' : 'Closed'}
          </span>
          <span className={`${chip} border-white/15 bg-white/5 text-white/80`}>
            Begs {data.begs.perDay - data.begs.used}/{data.begs.perDay}
          </span>
          {cooldown > 0 && <span className={`${chip} border-white/15 bg-white/5 text-white/80 tabular-nums`}>Next in {formatCountdown(cooldown)}</span>}
          {data.favour.on && (
            <span className={`${chip} border-brand-gold/50 bg-brand-gold/10 text-brand-gold`}>
              Favours {data.favour.done}/{data.favour.needed} jobs
            </span>
          )}
        </div>
      )}
      <span className="mt-auto font-semibold text-brand-gold transition-colors group-hover:text-white">Visit Lord Gang Orca →</span>
    </Link>
  )
}
