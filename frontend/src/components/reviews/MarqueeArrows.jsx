import { useEffect, useRef } from 'react'

// How long a press has to last to count as holding rather than a click.
const HOLD_DELAY_MS = 250

// The round ← and → buttons under the review marquee. A click skips a few
// cards; pressing and holding speeds it up that way until let go.
function MarqueeArrows({ onJump, onHold }) {
  return (
    <div className="flex gap-3">
      <ArrowButton direction={-1} label="Previous reviews" onJump={onJump} onHold={onHold} />
      <ArrowButton direction={1} label="Next reviews" onJump={onJump} onHold={onHold} />
    </div>
  )
}

function ArrowButton({ direction, label, onJump, onHold }) {
  const timerRef = useRef(null)
  const heldRef = useRef(false)

  // Leaving the page mid-press mustn't leave the timer running.
  useEffect(() => () => clearTimeout(timerRef.current), [])

  const press = (event) => {
    if (event.button !== 0) return

    heldRef.current = false
    timerRef.current = setTimeout(() => {
      heldRef.current = true
      onHold(direction)
    }, HOLD_DELAY_MS)
  }

  // Released, slid off the button, or the browser took the touch over.
  const letGo = () => {
    clearTimeout(timerRef.current)
    if (heldRef.current) onHold(0)
  }

  const handleClick = (event) => {
    // A press that became a hold has done its moving. A keyboard click
    // (detail 0) never had a press.
    if (heldRef.current && event.detail !== 0) {
      heldRef.current = false
      return
    }

    onJump(direction)
  }

  return (
    <button
      type="button"
      aria-label={label}
      onPointerDown={press}
      onPointerUp={letGo}
      onPointerLeave={letGo}
      onPointerCancel={letGo}
      onClick={handleClick}
      // Holding Enter down would otherwise click over and over.
      onKeyDown={(event) => { if (event.repeat) event.preventDefault() }}
      // A long press on a phone would open the "copy / share" menu.
      onContextMenu={(event) => event.preventDefault()}
      className="flex h-10 w-10 touch-none items-center justify-center rounded-full border border-white/20 bg-ink/60 text-white shadow-lg shadow-black/40 backdrop-blur-md transition select-none [-webkit-touch-callout:none] hover:border-brand-gold/60 hover:text-brand-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-gold active:scale-95"
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className={direction < 0 ? 'rotate-180' : undefined}
      >
        <path d="M5 12h14" />
        <path d="m12 5 7 7-7 7" />
      </svg>
    </button>
  )
}

export default MarqueeArrows
