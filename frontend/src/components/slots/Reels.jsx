import { useEffect, useImperativeHandle, useRef } from 'react'
import { SLOTS } from '../../../../shared/slots/config.js'
import { anySymbol, cellHtml } from './art'
import { SOUNDS } from './feedback'

const REELS = Array.from({ length: SLOTS.reels }, (_, reel) => reel)

// While waiting to land, each reel loops through this many symbols, at
// this many cells a second.
const LOOP_CELLS = 12
const CELLS_PER_SECOND = 30
// Landing: the symbols that blur past before the final ones, how long it
// takes, how long after the reel to its left each one starts landing, and
// the least time they spin first. Shorter with reduced motion.
const LAND_FILLERS = 10
const TIMING = {
  full: { minSpin: 350, land: 800, stagger: 260 },
  reduced: { minSpin: 100, land: 300, stagger: 120 },
}

const wait = (ms) => new Promise((done) => setTimeout(done, ms))

// The five reels in their marquee frame. `cell` is the size of one cell in
// pixels (the screen works out what fits). They're drawn straight into the
// DOM rather than by React, as the prototype did, since a spin moves them
// every frame. Through `ref`:
//   start()       sets every reel spinning, before the result is known
//   land(grid)    slows them down onto `grid` (grid[reel][row], from the
//                 server), left to right; resolves once they've all stopped
//   stop()        lands them back on what they showed (a spin that failed)
//   highlight(cells)  lights up the winning cells, [[reel, row], ...]
//   clear()       puts the lights out
// Each reel's strip at rest is [hidden, row 0, row 1, row 2, hidden],
// shifted up one cell.
export default function Reels({ ref, cell, spinning, reduce }) {
  const strips = useRef([])
  const tracks = useRef([])
  const loops = useRef([])
  const grid = useRef(REELS.map(() => Array.from({ length: SLOTS.rows }, anySymbol)))
  const busy = useRef(false)
  const startedAt = useRef(0)
  const size = useRef(cell)

  const rest = (reel) => {
    const strip = strips.current[reel]
    if (!strip) return
    strip.style.transition = 'none'
    strip.innerHTML = cellHtml(anySymbol()) + grid.current[reel].map(cellHtml).join('') + cellHtml(anySymbol())
    strip.style.transform = `translateY(${-size.current}px)`
  }

  // Redrawn at rest whenever the size changes (a resize, a rotated phone).
  useEffect(() => {
    size.current = cell
    if (!busy.current) REELS.forEach(rest)
  }, [cell])

  // On their way out, stop any loop still running.
  useEffect(() => () => loops.current.forEach((loop) => loop?.cancel()), [])

  // One reel looping: the same LOOP_CELLS symbols twice over, scrolled down
  // by one set and round again, so it never jumps. It starts on the symbols
  // showing now, so setting off doesn't jump either.
  const loopReel = (reel) => {
    const strip = strips.current[reel]
    const height = size.current
    const cycle = [...grid.current[reel], ...Array.from({ length: LOOP_CELLS - SLOTS.rows }, anySymbol)]

    strip.style.transition = 'none'
    strip.style.transform = 'translateY(0px)'
    strip.innerHTML = [...cycle, ...cycle].map(cellHtml).join('')
    strip.classList.add('is-blurred')
    loops.current[reel] = strip.animate(
      [{ transform: `translateY(${-LOOP_CELLS * height}px)` }, { transform: 'translateY(0px)' }],
      { duration: (LOOP_CELLS / CELLS_PER_SECOND) * 1000, iterations: Infinity, easing: 'linear' }
    )
  }

  // One reel slowing down onto `final`: the final rows at the top of a
  // fresh strip, slid down into view.
  const landReel = (reel, final, ms) =>
    new Promise((done) => {
      const strip = strips.current[reel]
      const track = tracks.current[reel]
      const height = size.current
      const sequence = [anySymbol(), ...final, ...Array.from({ length: LAND_FILLERS + SLOTS.rows + 1 }, anySymbol)]

      loops.current[reel]?.cancel()
      loops.current[reel] = null
      strip.innerHTML = sequence.map(cellHtml).join('')
      strip.classList.add('is-blurred')
      strip.style.transition = 'none'
      strip.style.transform = `translateY(${-(sequence.length - SLOTS.rows - 1) * height}px)`
      void strip.offsetHeight
      strip.style.transition = `transform ${ms}ms cubic-bezier(.25,.6,.3,1)`
      strip.style.transform = `translateY(${-height}px)`

      setTimeout(() => strip.classList.remove('is-blurred'), ms * 0.72)
      setTimeout(() => {
        grid.current[reel] = final
        rest(reel)
        track.classList.remove('is-settling')
        void track.offsetWidth
        track.classList.add('is-settling')
        SOUNDS.land()
        done()
      }, ms)
    })

  const land = async (final) => {
    const timing = reduce ? TIMING.reduced : TIMING.full
    await wait(Math.max(0, timing.minSpin - (performance.now() - startedAt.current)))
    try {
      await Promise.all(REELS.map((reel) => wait(reel * timing.stagger).then(() => landReel(reel, final[reel], timing.land))))
    } finally {
      busy.current = false
    }
  }

  useImperativeHandle(ref, () => ({
    start() {
      busy.current = true
      startedAt.current = performance.now()
      REELS.forEach(loopReel)
    },
    land,
    stop() {
      return land(grid.current.map((rows) => [...rows]))
    },
    highlight(cells) {
      for (const [reel, row] of cells) strips.current[reel]?.children[row + 1]?.classList.add('is-win')
    },
    clear() {
      for (const strip of strips.current) {
        for (const cellEl of strip?.children ?? []) cellEl.classList.remove('is-win')
      }
    },
  }))

  return (
    <div className={`slot-frame${spinning ? ' is-spinning' : ''}`}>
      <div className="slot-window" style={{ '--cell': `${cell}px` }} role="img" aria-label="The reels">
        {REELS.map((reel) => (
          <div key={reel} className="slot-reel">
            <div ref={(el) => (tracks.current[reel] = el)} className="slot-track">
              <div ref={(el) => (strips.current[reel] = el)} className="slot-strip" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
