import { useId } from 'react'
import { CRASH_RULES } from '../../../../shared/crash/rules.js'

const chip = (on) =>
  `min-h-9 cursor-pointer rounded-lg border px-2.5 text-sm font-semibold tabular-nums transition-colors disabled:cursor-default disabled:opacity-40 ${
    on ? 'border-[#1FD18B] bg-[#1FD18B]/20 text-white' : 'border-white/15 bg-white/5 text-white/80 hover:bg-white/10'
  }`

// The bet (1 up to `maxBet`, with quick picks) and the optional
// auto-cash-out target. `value`: { bet, autoOn, autoText }.
export default function BetControls({ value, maxBet, onChange, disabled = false, compact = false }) {
  const betId = useId()
  const autoId = useId()
  const picks = [...new Set([CRASH_RULES.minBet, Math.max(1, Math.floor(maxBet / 4)), Math.max(1, Math.floor(maxBet / 2)), maxBet])]
  const set = (change) => onChange({ ...value, ...change })

  return (
    <div className={`flex flex-col gap-2 ${compact ? '' : 'sm:flex-row sm:items-end sm:gap-4'}`}>
      <div className="flex flex-col gap-1">
        <label htmlFor={betId} className="text-xs font-semibold tracking-widest text-white/60 uppercase">
          Bet <span className="font-normal tracking-normal normal-case">(1 to {maxBet})</span>
        </label>
        <div className="flex flex-wrap items-center gap-1.5">
          <input
            id={betId}
            type="number"
            inputMode="numeric"
            min={CRASH_RULES.minBet}
            max={maxBet}
            value={value.bet}
            disabled={disabled}
            onChange={(event) => set({ bet: Math.floor(Number(event.target.value.replace(/[^\d]/g, ''))) || '' })}
            className="h-9 w-20 rounded-lg border border-white/15 bg-black/40 px-2 text-center font-semibold text-white tabular-nums disabled:opacity-50"
          />
          {picks.map((pick) => (
            <button key={pick} type="button" disabled={disabled} onClick={() => set({ bet: pick })} className={chip(value.bet === pick)}>
              {pick === maxBet && pick > 1 ? `Max ${pick}` : pick}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-xs font-semibold tracking-widest text-white/60 uppercase">Auto cash-out</span>
        <div className="flex items-center gap-1.5">
          <button type="button" disabled={disabled} aria-pressed={value.autoOn} onClick={() => set({ autoOn: !value.autoOn })} className={chip(value.autoOn)}>
            {value.autoOn ? 'On' : 'Off'}
          </button>
          <label htmlFor={autoId} className="sr-only">
            Cash out automatically at
          </label>
          <input
            id={autoId}
            type="number"
            inputMode="decimal"
            step="0.1"
            min={CRASH_RULES.autoMin}
            max={CRASH_RULES.autoMax}
            value={value.autoText}
            disabled={disabled || !value.autoOn}
            onChange={(event) => set({ autoText: event.target.value })}
            className="h-9 w-20 rounded-lg border border-white/15 bg-black/40 px-2 text-center font-semibold text-white tabular-nums disabled:opacity-40"
          />
          <span className="text-sm text-white/60">x</span>
        </div>
      </div>
    </div>
  )
}
