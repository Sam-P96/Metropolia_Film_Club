import { STEAL } from '../../../../shared/steal/config.js'
import { LIFT } from './style'

// Warrior, Mage or Rogue: three buttons, one picked.
export default function ClassPicker({ value, onChange, disabled = false }) {
  return (
    <div role="radiogroup" aria-label="Class" className="grid gap-2 sm:grid-cols-3">
      {Object.entries(STEAL.classes).map(([key, playerClass]) => {
        const active = value === key
        return (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => onChange(key)}
            className={`cursor-pointer rounded-xl border px-3 py-2.5 text-left ${LIFT} hover:shadow-md hover:shadow-black/30 disabled:cursor-not-allowed disabled:opacity-60 ${
              active ? 'border-brand-gold/70 bg-white/10' : 'border-white/10 bg-white/5 hover:border-white/30'
            }`}
          >
            <span className={`block text-sm font-bold ${active ? 'text-brand-gold' : 'text-white'}`}>{playerClass.label}</span>
            <span className="mt-0.5 block text-xs text-white/50">{playerClass.summary}</span>
          </button>
        )
      })}
    </div>
  )
}
