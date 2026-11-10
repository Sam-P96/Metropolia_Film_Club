import { useId } from 'react'
import CoinIcon from '../wallet/CoinIcon'
import { termsHint } from '../../utils/gomoku'
import { MIN_STAKE, QUICK_STAKES, formatPoints, prizeFor } from '../../../../shared/gomoku/rules.js'

const choice = (on) =>
  `cursor-pointer rounded-xl border px-3 py-2 text-center text-sm tabular-nums transition-colors disabled:cursor-default disabled:opacity-40 ${
    on ? 'border-brand-gold bg-brand-gold font-bold text-ink' : 'border-white/15 bg-white/5 text-white/80 hover:bg-white/10'
  }`
const LEGEND = 'mb-2 w-full text-center text-xs uppercase tracking-widest text-white/60'

// The terms of a game between members: For Fun, or a stake each (2 at the
// least: 2, 10, 50, 100, 500, 1,000, or any amount typed in, up to what the
// poorer of the two has), with what the winner takes. Every game is on the
// 15 x 15 board. With `canSwitch` (a counter), For Fun and For PP can be
// swapped too. The parent keeps the values and checks them with termsHint
// (utils/gomoku.js).
export default function TermsPicker({ forFun, onForFun, canSwitch = false, stakeText, onStakeText, max }) {
  const hintId = useId()
  const hint = termsHint(forFun, stakeText, max)
  const stake = Number(stakeText)
  const custom = stakeText !== '' && !QUICK_STAKES.includes(stake)

  return (
    <div className="flex flex-col gap-4 text-center">
      {canSwitch && (
        <fieldset>
          <legend className={LEGEND}>Play</legend>
          <div className="flex flex-wrap justify-center gap-2">
            <button type="button" aria-pressed={forFun} onClick={() => onForFun(true)} className={choice(forFun)}>
              For Fun
            </button>
            <button type="button" aria-pressed={!forFun} onClick={() => onForFun(false)} disabled={max < MIN_STAKE} className={choice(!forFun)}>
              For PP
            </button>
          </div>
        </fieldset>
      )}

      {!forFun && (
        <fieldset>
          <legend className={LEGEND}>Stake, each</legend>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {QUICK_STAKES.map((amount) => (
              <button
                key={amount}
                type="button"
                disabled={max !== null && amount > max}
                aria-pressed={stakeText !== '' && stake === amount}
                onClick={() => onStakeText(String(amount))}
                className={choice(stakeText !== '' && stake === amount)}
              >
                {formatPoints(amount)}
              </button>
            ))}
            <label className={`flex items-center gap-2 rounded-xl border px-3 py-1 text-sm ${custom ? 'border-brand-gold' : 'border-white/15'}`}>
              <span className="text-white/60">Custom</span>
              <input
                type="number"
                inputMode="numeric"
                min={MIN_STAKE}
                max={max ?? undefined}
                step={1}
                value={custom ? stakeText : ''}
                onChange={(event) => onStakeText(event.target.value)}
                placeholder="—"
                aria-label="A stake of your own, in points, each"
                aria-describedby={hintId}
                className="w-24 rounded-lg bg-ink/60 px-2 py-1 text-center text-base font-bold tabular-nums text-white focus-visible:outline-2 focus-visible:outline-brand-gold"
              />
            </label>
          </div>
          <p id={hintId} className={`mt-2 min-h-5 text-center text-sm ${hint ? 'text-red-300' : 'text-white/70'}`}>
            {hint || (
              <span className="flex flex-wrap items-center justify-center gap-1.5">
                Winner takes <CoinIcon kind="ppp" size={15} />
                <span className="font-bold text-brand-gold">{formatPoints(prizeFor(stake))} P-PP</span>
                {max !== null && <span className="text-white/50">(up to {formatPoints(max)} each)</span>}
              </span>
            )}
          </p>
        </fieldset>
      )}
    </div>
  )
}
