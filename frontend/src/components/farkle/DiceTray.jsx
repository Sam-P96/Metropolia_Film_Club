import Die from './Die'
import KeptDice from './KeptDice'
import { formatPoints } from '../../../../shared/farkle/rules.js'

const TONES = { good: 'text-green-300', bad: 'text-red-300' }

// Shown before the first roll and between turns: six faded dice, 1 to 6.
const RESTING = [1, 2, 3, 4, 5, 6]

// The table: what's happening, the dice set aside, the dice in play and
// this turn's points. Three dice to a row on a phone, six on a wider screen.
export default function DiceTray({ dice, kept, selected, rolling, canChoose, onToggle, message, tone, turnPoints, selectedPoints, badPick }) {
  return (
    <section
      aria-label="Dice table"
      className="flex flex-col items-center gap-4 rounded-3xl border border-white/10 bg-radial-[at_50%_20%] from-plum to-ink-light to-75% px-4 pb-6 pt-5 shadow-xl shadow-black/40"
    >
      <p aria-live="polite" className={`min-h-[3em] max-w-sm text-center text-lg text-balance ${TONES[tone] ?? 'text-white'}`}>
        {message}
      </p>

      <KeptDice dice={kept} />

      <div className="flex min-h-36 max-w-60 flex-wrap content-center justify-center gap-4 sm:min-h-22 sm:max-w-none">
        {dice.length === 0
          ? RESTING.map((value) => <Die key={value} value={value} ghost />)
          : dice.map((value, i) => (
              <Die
                key={i}
                value={value}
                rolling={rolling}
                selected={selected.includes(i)}
                disabled={!canChoose}
                delay={i * 45}
                onClick={() => onToggle(i)}
              />
            ))}
      </div>

      <div className="flex flex-wrap items-baseline justify-center gap-x-3 gap-y-1">
        <span className="text-xs uppercase tracking-widest text-white/60">This turn</span>
        <span className="text-3xl font-bold tabular-nums text-brand-gold">{formatPoints(turnPoints)}</span>
        {selectedPoints > 0 && <span className="tabular-nums text-green-300">+{formatPoints(selectedPoints)} selected</span>}
      </div>

      {badPick && (
        <p className="-mt-2 text-center text-sm text-red-300">Some of these dice don't score. Tap them again to put them back.</p>
      )}
    </section>
  )
}