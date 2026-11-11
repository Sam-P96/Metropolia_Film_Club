import { useCallback, useEffect, useRef } from 'react'

// How far one press moves the picture, in percent of how far it can go.
const STEP = 4
// Held down: how long before it repeats, then how often.
const HOLD_MS = 350
const REPEAT_MS = 70

// The four pieces of the ring, each a wedge from the middle to one side
// (clip-path), with a small gap between them, and the same arrow in each,
// turned to point its way. The ring's hole is the recentre button.
const WEDGES = [
  { key: 'up', label: 'Move the picture up', move: [0, STEP], clip: 'polygon(50% 50%, 6% 0, 94% 0)', turn: 0, at: 'top-[9%] left-1/2 -translate-x-1/2' },
  { key: 'right', label: 'Move the picture right', move: [-STEP, 0], clip: 'polygon(50% 50%, 100% 6%, 100% 94%)', turn: 90, at: 'right-[9%] top-1/2 -translate-y-1/2' },
  { key: 'down', label: 'Move the picture down', move: [0, -STEP], clip: 'polygon(50% 50%, 94% 100%, 6% 100%)', turn: 180, at: 'bottom-[9%] left-1/2 -translate-x-1/2' },
  { key: 'left', label: 'Move the picture left', move: [STEP, 0], clip: 'polygon(50% 50%, 0 94%, 0 6%)', turn: 270, at: 'left-[9%] top-1/2 -translate-y-1/2' },
]

// Moving a banner's picture by hand: a ring cut into four, up, right, down
// and left, with recentre in the middle. Each press moves the picture a
// little, and holding one down keeps it moving. `position` is { x, y },
// 0 to 100 (utils/bannerStyle.js); a direction stops at the picture's edge
// (0 or 100), since the picture always covers the whole banner.
// `onMove(dx, dy)` and `onCenter()` change it.
export default function BannerNudge({ position, onMove, onCenter }) {
  const latest = useRef(onMove)
  useEffect(() => {
    latest.current = onMove
  })
  const timers = useRef({ hold: null, repeat: null, moving: null })

  // The same function every time, so the window listeners come off again.
  const stop = useCallback(function stopMoving() {
    clearTimeout(timers.current.hold)
    clearInterval(timers.current.repeat)
    timers.current.moving = null
    window.removeEventListener('pointerup', stopMoving)
    window.removeEventListener('pointercancel', stopMoving)
  }, [])
  useEffect(() => stop, [stop])

  // Whether the picture can still go that way.
  const can = ([dx, dy]) => (dx > 0 ? position.x < 100 : dx < 0 ? position.x > 0 : dy > 0 ? position.y < 100 : position.y > 0)

  // Held down all the way to the picture's edge: that's as far as it goes.
  useEffect(() => {
    if (timers.current.moving && !can(timers.current.moving)) stop()
  })

  const start = (move) => {
    stop()
    timers.current.moving = move
    latest.current(...move)
    timers.current.hold = setTimeout(() => {
      timers.current.repeat = setInterval(() => latest.current(...move), REPEAT_MS)
    }, HOLD_MS)
    // Let go anywhere, even off the button, and it stops.
    window.addEventListener('pointerup', stop)
    window.addEventListener('pointercancel', stop)
  }

  return (
    <div className="relative mx-auto size-36 select-none" role="group" aria-label="Move the banner picture">
      {WEDGES.map((wedge) => (
        <button
          key={wedge.key}
          type="button"
          aria-label={wedge.label}
          disabled={!can(wedge.move)}
          // Pointer: press and hold. Keyboard: one step per Enter or Space.
          onPointerDown={(event) => {
            if (event.button !== 0) return
            start(wedge.move)
          }}
          onClick={(event) => {
            if (event.detail === 0) onMove(...wedge.move)
          }}
          style={{ clipPath: wedge.clip }}
          className="absolute inset-0 cursor-pointer touch-none rounded-full bg-white/10 text-white/80 transition-colors hover:bg-brand-gold/30 hover:text-white focus-visible:bg-brand-gold/40 focus-visible:outline-none active:bg-brand-gold/50 disabled:cursor-default disabled:opacity-30 disabled:hover:bg-white/10"
        >
          <span aria-hidden="true" className={`absolute flex text-sm leading-none ${wedge.at}`}>
            <span style={{ transform: `rotate(${wedge.turn}deg)` }}>▲</span>
          </span>
        </button>
      ))}
      {/* The hole in the ring: back to the middle. */}
      <button
        type="button"
        onClick={onCenter}
        aria-label="Recentre the picture"
        title="Recentre"
        className="absolute top-1/2 left-1/2 flex size-14 -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-white/15 bg-ink text-lg text-white/70 transition-colors hover:border-brand-gold/60 hover:text-white"
      >
        <span aria-hidden="true">⟲</span>
      </button>
    </div>
  )
}
