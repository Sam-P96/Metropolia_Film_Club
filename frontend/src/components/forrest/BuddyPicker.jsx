import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CARD, HEADING } from './ForrestChrome'

const SLOTS = ['Starts on the branch', 'Starts on the seesaw']

// Who bounces: two slots, and the buddies to fill them from (the frog and
// the rabbit, and any animal pieces bought in the Infinite Gomoku shop).
// Pick a slot, then a buddy; picking the other slot's buddy swaps them.
export default function BuddyPicker({ buddies, choices, onChange, disabled }) {
  const [slot, setSlot] = useState(0)
  const pick = (emoji) => {
    const next = [...buddies]
    const other = 1 - slot
    if (next[other] === emoji) next[other] = next[slot]
    next[slot] = emoji
    if (next[0] !== buddies[0] || next[1] !== buddies[1]) onChange(next)
  }

  return (
    <section aria-labelledby="forrest-buddies" className={`${CARD} flex flex-col gap-4`}>
      <h2 id="forrest-buddies" className={HEADING}>
        Your buddies
      </h2>
      <div className="grid grid-cols-2 gap-3">
        {SLOTS.map((label, index) => (
          <button
            key={label}
            type="button"
            onClick={() => setSlot(index)}
            aria-pressed={slot === index}
            className={`flex cursor-pointer flex-col items-center gap-1 rounded-xl border-2 px-3 py-3 transition ${
              slot === index ? 'border-[#9be564] bg-[#9be564]/10 shadow-[0_0_18px_rgba(155,229,100,0.3)]' : 'border-white/10 bg-white/5 hover:border-white/25'
            }`}
          >
            <span className="text-4xl leading-none">{buddies[index]}</span>
            <span className="text-xs text-white/65">{label}</span>
          </button>
        ))}
      </div>
      <ul className="flex flex-wrap justify-center gap-2" aria-label="Buddies to choose from">
        {choices.map((choice) => {
          const chosen = buddies.includes(choice.emoji)
          return (
            <li key={choice.emoji}>
              <button
                type="button"
                onClick={() => pick(choice.emoji)}
                disabled={disabled}
                title={choice.name}
                aria-label={`${choice.name}${chosen ? ' (bouncing)' : ''}`}
                className={`grid size-14 cursor-pointer place-items-center rounded-xl border text-3xl transition disabled:cursor-default disabled:opacity-50 ${
                  chosen ? 'border-[#9be564]/70 bg-[#9be564]/15' : 'border-white/10 bg-white/5 hover:border-white/30'
                }`}
              >
                {choice.emoji}
              </button>
            </li>
          )
        })}
      </ul>
      <p className="text-center text-xs text-white/55">
        Animals you buy as pieces in the{' '}
        <Link to="/games/gomoku/shop" className="text-[#b8e986] underline underline-offset-2 hover:text-white">
          Infinite Gomoku shop
        </Link>{' '}
        can bounce here too.
      </p>
    </section>
  )
}
