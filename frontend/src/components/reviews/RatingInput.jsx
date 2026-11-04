import { useState } from 'react'

const STARS = [1, 2, 3, 4, 5]

// Half stars from 0.5 to 5. Clicking the rating that's already chosen
// takes it off again (0, "No rating"), the same as "clear".
function RatingInput({ value, onChange }) {
  const [hover, setHover] = useState(null)

  // What the stars actually show: the hovered value while the mouse is
  // over them, otherwise the chosen value, otherwise nothing.
  const shown = hover ?? value ?? 0

  const pick = (stars) => {
    if (stars === value) {
      onChange(0)
      // Still under the mouse, it would go on showing the rating that's
      // just been taken off, until the mouse moves to another half.
      setHover(null)
    } else {
      onChange(stars)
    }
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex" onMouseLeave={() => setHover(null)}>
        {STARS.map((star) => {
          // How much of THIS star is filled, as 0 to 1.
          const fill = Math.max(0, Math.min(1, shown - star + 1))

          return (
            <div key={star} className="relative h-8 w-8">
              {/* Both glyphs are centred in the box. The ★ is narrower than
                  the box, so left-aligned it would sit in the left part and a
                  50% clip of the box would show most of it — 3.5 looked like 4.
                  Centred, the box's halfway line is the star's halfway line. */}

              {/* the empty star underneath */}
              <span className="absolute inset-0 text-center text-2xl leading-8 text-white/15">
                ★
              </span>

              {/* the gold star on top, clipped to a percentage width */}
              <div
                className="absolute top-0 left-0 h-8 overflow-hidden"
                style={{ width: `${fill * 100}%` }}
              >
                <span className="block w-8 text-center text-2xl leading-8 text-brand-gold">
                  ★
                </span>
              </div>

              {/* two invisible halves on top, so half stars are clickable */}
              {[star - 0.5, star].map((stars, half) => (
                <button
                  key={stars}
                  type="button"
                  aria-label={`${stars} stars`}
                  aria-pressed={stars === value}
                  title={stars === value ? 'Click again to remove your rating' : undefined}
                  onMouseEnter={() => setHover(stars)}
                  onClick={() => pick(stars)}
                  className={`absolute inset-y-0 w-1/2 cursor-pointer ${half === 0 ? 'left-0' : 'right-0'}`}
                />
              ))}
            </div>
          )
        })}
      </div>

      <span className="text-sm text-white/60">
        {shown > 0 ? `${shown} / 5` : 'No rating'}
      </span>

      {value > 0 && (
        <button
          type="button"
          onClick={() => onChange(0)}
          className="text-xs text-white/40 underline transition-colors hover:text-white"
        >
          clear
        </button>
      )}
    </div>
  )
}

export default RatingInput
