import { useEffect, useRef } from 'react'

// Repeats start after this long held down, then speed up the longer it's
// held, down to the fastest.
const FIRST_REPEAT_MS = 400
const START_MS = 150
const FASTEST_MS = 30
const SPEED_UP = 0.85

// A button that does `onStep` once when pressed, and keeps doing it, faster
// and faster, while it's held: the bet's − and +. Enter and Space step once.
export default function HoldButton({ onStep, disabled, label, className, children }) {
  const timer = useRef(null)
  const step = useRef(onStep)
  useEffect(() => {
    step.current = onStep
  })

  const stop = () => {
    clearTimeout(timer.current)
    timer.current = null
  }

  useEffect(() => {
    if (disabled) stop()
  }, [disabled])
  useEffect(() => stop, [])

  const start = (e) => {
    if (disabled || e.button > 0) return
    e.currentTarget.setPointerCapture?.(e.pointerId)
    step.current()
    let wait = START_MS
    const again = () => {
      step.current()
      wait = Math.max(FASTEST_MS, wait * SPEED_UP)
      timer.current = setTimeout(again, wait)
    }
    timer.current = setTimeout(again, FIRST_REPEAT_MS)
  }

  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onPointerDown={start}
      onPointerUp={stop}
      onPointerCancel={stop}
      onLostPointerCapture={stop}
      // A click from the keyboard (no pointer): one step.
      onClick={(e) => {
        if (e.detail === 0) step.current()
      }}
      onContextMenu={(e) => e.preventDefault()}
      className={className}
    >
      {children}
    </button>
  )
}
