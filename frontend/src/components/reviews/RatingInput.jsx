import { useState } from 'react'

const STARS = [1, 2, 3, 4, 5]

function RatingInput({ value, onChange }) {
  const [hover, setHover] = useState(null)

  // What the stars actually show: the hovered value while the mouse is
  // over them, otherwise the chosen value, otherwise nothing.
  const shown = hover ?? value ?? 0

  return (
    <div className="flex items-center gap-3">
      <div className="flex" onMouseLeave={() => setHover(null)}>
        {STARS.map((star) => {
          // How much of THIS star is filled, as 0 to 1.
          const fill = Math.max(0, Math.min(1, shown - star + 1))

          return (
            <div key={star} className="relative h-8 w-8">
              {/* the empty star underneath */}
              <span className="absolute inset-0 text-2xl leading-8 text-white/15">
                ★
              </span>

              {/* the gold star on top, clipped to a percentage width */}
              <div
                className="absolute top-0 left-0 h-8 overflow-hidden"
                style={{ width: `${fill * 100}%` }}
              >
                <span className="block w-8 text-2xl leading-8 text-brand-gold">
                  ★
                </span>
              </div>

              {/* two invisible halves on top, so half stars are clickable */}
              <button
                type="button"
                aria-label={`${star - 0.5} stars`}
                onMouseEnter={() => setHover(star - 0.5)}
                onClick={() => onChange(star - 0.5)}
                className="absolute inset-y-0 left-0 w-1/2 cursor-pointer"
              />
              <button
                type="button"
                aria-label={`${star} stars`}
                onMouseEnter={() => setHover(star)}
                onClick={() => onChange(star)}
                className="absolute inset-y-0 right-0 w-1/2 cursor-pointer"
              />
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