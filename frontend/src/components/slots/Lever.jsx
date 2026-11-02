import { useEffect, useImperativeHandle, useRef, useState } from 'react'
import { HAPTIC, SOUNDS, haptic } from './feedback'

const KNOB = 48
// How far down it has to go, as a share of its travel, to spin.
const FAR_ENOUGH = 0.72

// The lever, with the prototype's physics. With a mouse, a click plays a
// full pull. On a touch screen, drag the knob down: let go and it flicks
// back up on a spring, bouncing off the top stop, and the reels spin only
// if it went at least FAR_ENOUGH of the way. Enter or Space pulls it too.
// Locked while the reels spin. `onPull` starts the spin as it's let go;
// `onTop` says the knob has just hit the top stop on its way back (the
// first time, before it bounces), which is when the reels set off;
// `onShortPull` says it wasn't far enough. Through `ref`, autoPull() plays
// a full pull (MAX uses it).
export default function Lever({ ref, locked, onPull, onTop, onShortPull }) {
  const lever = useRef(null)
  const knob = useRef(null)
  const rod = useRef(null)
  const state = useRef({ p: 0, v: 0, raf: 0, dragging: false, startY: 0, startP: 0, moved: 0, notch: 0, pointer: 'mouse', atBottom: false })
  // The latest props, for the pointer handlers and animation frames.
  const lockedRef = useRef(locked)
  const pull = useRef(onPull)
  const short = useRef(onShortPull)
  const top = useRef(onTop)
  useEffect(() => {
    lockedRef.current = locked
    pull.current = onPull
    short.current = onShortPull
    top.current = onTop
  })
  const [held, setHeld] = useState(false)
  const [hint] = useState(() => (window.matchMedia('(hover: hover) and (pointer: fine)').matches ? 'Click' : 'Pull'))

  const travel = () => (lever.current?.clientHeight ?? 0) - KNOB

  // The knob at `p` pixels down, growing as it passes the pivot (nearest to
  // you), with the rod from the pivot to it.
  const render = () => {
    const el = lever.current
    if (!el) return
    const { p } = state.current
    const length = el.clientHeight
    const pivot = length / 2
    const centre = KNOB / 2 + p
    const near = 1 - Math.min(1, Math.abs(centre - pivot) / (length / 2 - KNOB / 2))
    knob.current.style.transform = `translate(-50%, ${p}px) scale(${1 + 0.22 * near})`
    knob.current.style.zIndex = centre > pivot ? 3 : 2
    rod.current.style.top = `${Math.min(centre, pivot)}px`
    rod.current.style.height = `${Math.abs(centre - pivot)}px`
  }

  useEffect(() => {
    render()
    window.addEventListener('resize', render)
    const s = state.current
    return () => {
      window.removeEventListener('resize', render)
      cancelAnimationFrame(s.raf)
    }
  }, [])

  const springBack = () => {
    const s = state.current
    cancelAnimationFrame(s.raf)
    let last = performance.now()
    let tapped = false
    let reachedTop = false
    const k = 420
    const c = 15
    const step = (t) => {
      const dt = Math.min(0.032, (t - last) / 1000)
      last = t
      s.v += (-k * s.p - c * s.v) * dt
      s.p += s.v * dt
      if (s.p < 0) {
        // The top stop: bounce off it.
        s.p = 0
        if (!reachedTop) {
          reachedTop = true
          top.current?.()
        }
        if (Math.abs(s.v) > 80) {
          if (!tapped) {
            tapped = true
            haptic(HAPTIC.snapUp)
          }
          s.v = -s.v * 0.28
          SOUNDS.stop()
        } else {
          s.v = 0
        }
      }
      render()
      if (s.p > 0.3 || Math.abs(s.v) > 3) s.raf = requestAnimationFrame(step)
      else {
        s.p = 0
        s.v = 0
        render()
      }
    }
    s.raf = requestAnimationFrame(step)
  }

  const release = () => {
    const s = state.current
    const far = s.p > travel() * FAR_ENOUGH
    setHeld(false)
    if (far) SOUNDS.pull()
    s.v = 0
    springBack()
    if (far) pull.current()
    else if (s.p > 12) short.current?.()
  }

  const autoPull = () => {
    const s = state.current
    if (lockedRef.current) return
    cancelAnimationFrame(s.raf)
    const from = s.p
    const to = travel()
    const start = performance.now()
    const step = (t) => {
      const k = Math.min(1, (t - start) / 240)
      s.p = from + (to - from) * k * k
      const notch = Math.floor(s.p / 16)
      if (notch !== s.notch) {
        s.notch = notch
        SOUNDS.notch()
      }
      render()
      if (k < 1) s.raf = requestAnimationFrame(step)
      else {
        haptic(HAPTIC.bottom)
        s.atBottom = false
        release()
      }
    }
    s.raf = requestAnimationFrame(step)
  }

  useImperativeHandle(ref, () => ({ autoPull }))

  const onPointerDown = (e) => {
    const s = state.current
    if (lockedRef.current) return
    cancelAnimationFrame(s.raf)
    Object.assign(s, { dragging: true, pointer: e.pointerType, startY: e.clientY, startP: s.p, moved: 0, notch: Math.floor(s.p / 16) })
    lever.current.setPointerCapture(e.pointerId)
    setHeld(true)
    if (e.pointerType !== 'mouse') haptic(HAPTIC.grab)
  }

  const onPointerMove = (e) => {
    const s = state.current
    if (!s.dragging) return
    const dy = e.clientY - s.startY
    s.moved = Math.max(s.moved, Math.abs(dy))
    s.p = Math.max(0, Math.min(travel(), s.startP + dy))
    const notch = Math.floor(s.p / 16)
    if (notch !== s.notch) {
      s.notch = notch
      SOUNDS.notch()
    }
    // The bottom of its travel: one solid thud, ready again once it leaves.
    if (s.p >= travel() - 0.5) {
      if (!s.atBottom) {
        s.atBottom = true
        haptic(HAPTIC.bottom)
        SOUNDS.thud()
      }
    } else if (s.p < travel() - 8) {
      s.atBottom = false
    }
    render()
  }

  const onPointerEnd = () => {
    const s = state.current
    if (!s.dragging) return
    s.dragging = false
    // A click with a mouse pulls it all the way.
    if (s.pointer === 'mouse' && s.moved < 6) {
      setHeld(false)
      autoPull()
    } else {
      release()
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col items-center gap-1.5">
      <div
        ref={lever}
        role="button"
        tabIndex={0}
        aria-label="Pull the lever to spin"
        aria-disabled={locked}
        className={`slot-lever${held ? ' is-held' : ''}${locked ? ' is-locked' : ''}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            autoPull()
          }
        }}
      >
        <div className="slot-lever-slot" />
        <div ref={rod} className="slot-lever-rod" />
        <div className="slot-lever-pivot" />
        <div ref={knob} className="slot-lever-knob" />
      </div>
      <span className="text-[0.66rem] font-bold tracking-[0.14em] text-(--slot-muted) uppercase">{hint}</span>
    </div>
  )
}
