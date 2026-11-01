import CoinIcon from '../wallet/CoinIcon'
import { formatPoints } from '../../hooks/useDoubleOrNothing'
import { GLASS } from './glass'

const CARD = `${GLASS} p-5`

// The bonus pot: how full it is (it stops at its cap), and whether a win
// right now would take it.
export default function BonusCard({ bonusPot, bonusCap, eligible, unlocksAt }) {
  const share = Math.min(100, Math.round((bonusPot / bonusCap) * 100))

  return (
    <section className={CARD} aria-label="Bonus pot">
      <p className="text-xs tracking-widest text-white/50 uppercase">Bonus pot</p>
      <p className="mt-1 flex items-center gap-2 text-3xl font-bold text-brand-gold">
        <CoinIcon kind="ppp" size={24} /> {formatPoints(bonusPot)}
      </p>
      <div
        role="progressbar"
        aria-label="Bonus pot, out of its cap"
        aria-valuemin={0}
        aria-valuemax={bonusCap}
        aria-valuenow={bonusPot}
        className="mt-3 h-2.5 overflow-hidden rounded-full bg-white/10"
      >
        <div className="h-full rounded-full bg-brand-gold transition-[width] duration-700" style={{ width: `${share}%` }} />
      </div>
      <p className="mt-1 text-right text-xs text-white/40">of {formatPoints(bonusCap)} max</p>
      <p className={`mt-3 text-sm ${eligible ? 'font-semibold text-brand-gold' : 'text-white/70'}`}>
        {eligible
          ? 'This pot qualifies. Win it to claim the bonus.'
          : `Unlocks when the bet reaches ${formatPoints(unlocksAt)}.`}
      </p>
    </section>
  )
}
