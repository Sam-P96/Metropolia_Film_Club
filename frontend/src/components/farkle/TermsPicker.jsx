import { useId } from 'react'
import CoinIcon from '../wallet/CoinIcon'
import { stakeHint } from '../../utils/farkle'
import { WINNING_SCORES, formatPoints, pvpPrize } from '../../../../shared/farkle/rules.js'

const QUICK_STAKES = [10, 50, 100, 250, 500]

const choiceClasses = (on) =>
  `cursor-pointer rounded-xl border px-3 py-2 text-sm tabular-nums transition-colors disabled:cursor-default disabled:opacity-40 ${
    on ? 'border-brand-gold bg-brand-gold font-bold text-ink' : 'border-white/15 bg-white/5 text-white/80 hover:bg-white/10'
  }`

// The winning score and the stake for a challenge or a counter between
// members, and what the winner would take. `max` is the most the stake can
// be: what the poorer of the two has. The parent keeps the values, and
// checks them with stakeHint (utils/farkle.js).
export default function TermsPicker({ target, onTarget, stakeText, onStakeText, max }) {
  const hintId = useId()
  const hint = stakeHint(stakeText, max)
  const stake = Number(stakeText)

  return (
    <div className="flex flex-col gap-4">
      <fieldset>
        <legend className="mb-2 text-xs uppercase tracking-widest text-white/60">Play to</legend>
        <div className="flex flex-wrap gap-2">
          {WINNING_SCORES.map((score) => (
            <button key={score} type="button" aria-pressed={target === score} onClick={() => onTarget(score)} className={choiceClasses(target === score)}>
              {formatPoints(score)}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-xs uppercase tracking-widest text-white/60">Stake, each</legend>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="number"
            inputMode="numeric"
            min={2}
            max={max}
            step={1}
            value={stakeText}
            onChange={(event) => onStakeText(event.target.value)}
            aria-label="Stake in points, each"
            aria-describedby={hintId}
            className="w-24 rounded-xl border border-white/20 bg-ink/60 px-3 py-2 text-lg font-bold tabular-nums text-white focus-visible:outline-2 focus-visible:outline-brand-gold"
          />
          {QUICK_STAKES.map((amount) => (
            <button
              key={amount}
              type="button"
              disabled={amount > max}
              aria-pressed={stake === amount}
              onClick={() => onStakeText(String(amount))}
              className={choiceClasses(stake === amount)}
            >
              {amount}
            </button>
          ))}
        </div>
        <p id={hintId} className={`mt-2 min-h-5 text-sm ${hint ? 'text-red-300' : 'text-white/70'}`}>
          {hint || (
            <span className="flex flex-wrap items-center gap-1.5">
              Winner takes <CoinIcon kind="ppp" size={15} />
              <span className="font-bold text-brand-gold">{formatPoints(pvpPrize(stake))} P-PP</span>
              <span className="text-white/50">(up to {formatPoints(max)} each)</span>
            </span>
          )}
        </p>
      </fieldset>
    </div>
  )
}
