import { useEffect, useRef } from 'react'
import { DT, idleStep, newRun, step } from '../../../../shared/forrest/engine.js'
import { createRenderer } from './draw'

// The game's canvas and what's laid over it (the menu, the result). `live`
// is a ref to the run being played ({ s, taps, pending }) or null, for the
// menu's idle scene. The run moves in fixed steps (shared/forrest/engine.js
// DT), however fast the screen draws, and a tap is noted against the step
// it lands on: those steps are what the server plays the run again from. A
// hidden tab stops the clock (no step runs while it's away).
//
// Tap, click or Space to jump while `playing` (`onTap`); then the stage
// takes the touch for itself (touch-action: none), and the rest of the time
// a finger on it scrolls the page.
export default function ForrestStage({ live, buddies, playing, onTap, onOver, children }) {
  const canvasRef = useRef(null)
  const buddiesRef = useRef(buddies)
  const onOverRef = useRef(onOver)
  const onTapRef = useRef(onTap)
  useEffect(() => {
    buddiesRef.current = buddies
    onOverRef.current = onOver
    onTapRef.current = onTap
  })

  useEffect(() => {
    const renderer = createRenderer(canvasRef.current)
    const idle = newRun({ seed: Math.floor(Math.random() * 2 ** 31), mult: 1, idle: true })
    let frame = null
    let last = performance.now()
    let owed = 0
    const loop = (now) => {
      frame = requestAnimationFrame(loop)
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now
      const run = live.current
      if (run && !run.s.over) {
        owed += dt
        while (owed >= DT && !run.s.over) {
          const tapped = run.pending
          run.pending = false
          if (tapped) run.taps.push(run.s.tick)
          step(run.s, tapped)
          owed -= DT
        }
        if (run.s.over && !run.told) {
          run.told = true
          owed = 0
          onOverRef.current?.(run)
        }
      } else {
        owed = 0
        idleStep(idle, dt)
      }
      renderer.draw(run ? run.s : idle, { buddies: buddiesRef.current })
    }
    frame = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(frame)
  }, [live])

  // Space jumps too, unless they're typing somewhere.
  useEffect(() => {
    if (!playing) return undefined
    const onKey = (event) => {
      if (event.code !== 'Space' && event.key !== ' ') return
      if (/INPUT|TEXTAREA|SELECT/.test(event.target.tagName) || event.target.isContentEditable) return
      event.preventDefault()
      onTapRef.current?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [playing])

  const onPointerDown = (event) => {
    if (!playing) return
    event.preventDefault()
    onTap?.()
  }

  return (
    <div
      onPointerDown={onPointerDown}
      className={`relative aspect-[400/640] w-full max-w-[430px] self-center overflow-hidden rounded-[18px] border border-[#6b8f3a]/40 shadow-[0_10px_40px_rgba(0,0,0,0.5),0_0_50px_rgba(76,190,96,0.25)] select-none [-webkit-tap-highlight-color:transparent] ${
        playing ? 'touch-none' : 'touch-pan-y'
      }`}
    >
      <canvas ref={canvasRef} role="img" aria-label="Forrest Bounce" className="block size-full" />
      {children}
    </div>
  )
}

