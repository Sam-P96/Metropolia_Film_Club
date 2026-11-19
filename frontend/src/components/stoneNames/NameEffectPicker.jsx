import { useState } from 'react'
import { refreshFirstPlace, setNameEffectChoice, useNameEffect } from '../firstPlace/firstPlaceStore'
import { saveNameEffect } from '../../services/firstPlace'
import { FIRST_PLACE_EFFECT, STONE_NAMES, STONE_NAME_IDS } from '../../../../shared/stoneNames/config.js'
import './stoneNames.css'

const label = (effect) => (effect === FIRST_PLACE_EFFECT ? 'First Place' : STONE_NAMES[effect].short)

// On a member's own profile, under their name, when they have more than one
// name effect to show (two or more Infinity Stones, or a stone and a First
// Place title): which one their name wears. A pick shows straight away and
// saves in the background; if it can't be saved (the stone or title just
// went), it goes back and says why.
export default function NameEffectPicker({ userId }) {
  const effects = useNameEffect(userId)
  const [error, setError] = useState(null)
  if (!effects || effects.options.length < 2) return null

  const { effect: shown, options, stones, firstPlace } = effects

  const pick = async (effect) => {
    if (effect === shown) return
    setError(null)
    setNameEffectChoice(userId, effect)
    try {
      await saveNameEffect(effect)
    } catch (failure) {
      setNameEffectChoice(userId, shown)
      setError(failure.message)
      if (failure.status === 403) refreshFirstPlace({ force: true })
    }
  }

  return (
    <div className="mt-3 flex flex-col gap-2">
      <div role="radiogroup" aria-label="Name effect" className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-xs font-semibold tracking-widest text-white/50 uppercase">Name effect</span>
        {options.map((effect) => {
          const on = effect === shown
          const colour = effect === FIRST_PLACE_EFFECT ? '#d4a017' : STONE_NAMES[effect].color
          return (
            <button
              key={effect}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => pick(effect)}
              style={
                on
                  ? { borderColor: colour, background: `color-mix(in srgb, ${colour} 16%, transparent)`, boxShadow: `0 0 14px color-mix(in srgb, ${colour} 35%, transparent)` }
                  : undefined
              }
              className={`flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-gold motion-reduce:transition-none ${
                on ? 'text-white' : 'border-white/15 bg-white/5 text-white/70 hover:border-white/35 hover:text-white'
              }`}
            >
              {effect === FIRST_PLACE_EFFECT ? (
                <span className="fp-infinity font-bold" aria-hidden="true">
                  ∞
                </span>
              ) : (
                <span className={`isn-gem${on ? '' : ' opacity-60 saturate-50'}`} style={{ '--c': STONE_NAMES[effect].color }} aria-hidden="true" />
              )}
              {label(effect)}
            </button>
          )
        })}
      </div>
      <p className="text-xs text-white/50">
        {stones.length > 0 && `${stones.length} of ${STONE_NAME_IDS.length} Infinity Stones. `}
        Showing {label(shown)} everywhere your name is styled.
        {firstPlace && !firstPlace.settings.enabled && ' First Place is off: turn it on with the ∞ to pick it.'}
      </p>
      {error && (
        <p role="alert" className="text-sm text-red-300">
          {error}
        </p>
      )}
    </div>
  )
}
