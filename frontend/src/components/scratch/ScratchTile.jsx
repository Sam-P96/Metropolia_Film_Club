import { useCallback, useEffect, useRef, useState } from 'react'
import { animate, motion, useReducedMotion } from 'motion/react'
import TileFace from './TileFace'

// How much of the foil has to be rubbed off before the rest fades away.
const CLEAR_AT = 0.5

// How often, in pointer moves, to measure how much foil is left.
const MEASURE_EVERY = 5

// Paints the foil onto `canvas` at its size on the page (sharp on
// high-density screens): brushed silver, a little glitter, and a faint star
// to say there's something underneath. Its size on the page, not on screen:
// the ticket flips in as it appears, and mid-flip a tile looks about a
// quarter as wide as it is. Measured then, the foil came out a thin strip
// stretched over the tile, and rubbing mostly missed it.
function paintFoil(canvas) {
  const width = canvas.clientWidth
  const height = canvas.clientHeight
  if (!width || !height) return
  const ratio = window.devicePixelRatio || 1
  canvas.width = Math.round(width * ratio)
  canvas.height = Math.round(height * ratio)

  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.scale(ratio, ratio)

  const silver = ctx.createLinearGradient(0, 0, width, height)
  silver.addColorStop(0, '#d8dae4')
  silver.addColorStop(0.42, '#9da2b6')
  silver.addColorStop(0.55, '#eff1f7')
  silver.addColorStop(1, '#868b9f')
  ctx.fillStyle = silver
  ctx.fillRect(0, 0, width, height)

  for (let i = 0; i < 160; i++) {
    ctx.fillStyle = `rgba(255,255,255,${(Math.random() * 0.35).toFixed(2)})`
    ctx.fillRect(Math.random() * width, Math.random() * height, 1.2, 1.2)
  }

  ctx.fillStyle = 'rgba(36,34,92,0.32)'
  ctx.font = `${Math.round(width * 0.36)}px serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('★', width / 2, height / 2 + 1)
}

// How much of `canvas`'s foil is gone, from 0 to 1, by sampling every
// eighth pixel's transparency.
function clearedShare(canvas) {
  const { data } = canvas.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, canvas.width, canvas.height)
  let clear = 0
  let total = 0
  for (let i = 3; i < data.length; i += 32) {
    total += 1
    if (data[i] < 40) clear += 1
  }
  return total ? clear / total : 0
}

// One tile on the card. Covered, it has a canvas of foil on top that the
// player rubs off with a finger or the mouse (Pointer Events). The first
// touch asks the server what's under it (`onPress`); a light shimmers across
// the tile while it waits (`waiting`), then the answer (`content`) is drawn
// under the foil. Once about half the foil is rubbed off, or they let go,
// the rest fades away and `onUncovered` hears about it. So a single tap or
// click uncovers a tile too, and Enter or Space does the same. `active` is whether it can be scratched right now;
// `autoClear` fades the foil without rubbing (Reveal card), after
// `delay` seconds.
export default function ScratchTile({
  index,
  label,
  content,
  covered,
  active,
  waiting,
  autoClear = false,
  delay = 0,
  dim = false,
  missed = false,
  onPress,
  onUncovered,
}) {
  const reduce = useReducedMotion()
  const canvasRef = useRef(null)
  const [gone, setGone] = useState(!covered)

  // Pointer state, which doesn't need to redraw anything.
  const drawing = useRef(false)
  const last = useRef(null)
  const moves = useRef(0)
  const pressed = useRef(false)
  const wantsClear = useRef(false)
  const fading = useRef(false)

  // The foil fades away (and swells a touch), then it's gone for good.
  const fadeFoil = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || fading.current) return
    fading.current = true
    animate(canvas, reduce ? { opacity: 0 } : { opacity: 0, scale: 1.08 }, { duration: 0.35, delay, ease: 'easeOut' }).then(() => {
      setGone(true)
      onUncovered?.(index)
    })
  }, [delay, index, onUncovered, reduce])

  // Paint the foil, and again if the tile changes size (turning a phone).
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    paintFoil(canvas)
    const observer = new ResizeObserver(() => {
      if (!fading.current) paintFoil(canvas)
    })
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [])

  // Once the answer is in, fade the foil if it's been rubbed enough (or
  // pressed with the keyboard, or Reveal card wants it gone).
  useEffect(() => {
    if (content && (wantsClear.current || autoClear)) fadeFoil()
  }, [content, autoClear, fadeFoil])

  // The server said no (or didn't answer) and there's still nothing under
  // the foil: the next touch can ask again.
  useEffect(() => {
    if (!waiting && !content) pressed.current = false
  }, [waiting, content])

  // Where the pointer is on the foil, in the foil's own measurements. Scaled
  // from its size on screen to its size on the page, so a touch while the
  // ticket is still flipping in lands where the finger is.
  const pointAt = (event) => {
    const canvas = canvasRef.current
    const box = canvas.getBoundingClientRect()
    return {
      x: ((event.clientX - box.left) * canvas.clientWidth) / (box.width || 1),
      y: ((event.clientY - box.top) * canvas.clientHeight) / (box.height || 1),
    }
  }

  // Rubs a line of foil away, as wide as a fingertip on this tile.
  const rub = (from, to) => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    ctx.globalCompositeOperation = 'destination-out'
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.lineWidth = canvas.clientWidth * 0.32
    ctx.beginPath()
    ctx.moveTo(from.x, from.y)
    ctx.lineTo(to.x + 0.01, to.y)
    ctx.stroke()
  }

  const measure = () => {
    if (wantsClear.current || !canvasRef.current) return
    if (clearedShare(canvasRef.current) >= CLEAR_AT) {
      wantsClear.current = true
      if (content) fadeFoil()
    }
  }

  const start = () => {
    if (pressed.current) return
    pressed.current = true
    onPress(index)
  }

  const handlePointerDown = (event) => {
    if (!active || gone || fading.current) return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    drawing.current = true
    last.current = pointAt(event)
    start()
    rub(last.current, last.current)
  }

  const handlePointerMove = (event) => {
    if (!drawing.current) return
    const point = pointAt(event)
    rub(last.current, point)
    last.current = point
    moves.current += 1
    if (moves.current % MEASURE_EVERY === 0) measure()
  }

  // Letting go finishes the scratch, however little was rubbed: the server
  // used it up at the first touch, so a tap or a click uncovers the tile as
  // surely as rubbing it all off. Otherwise the tile stayed covered, and the
  // rest of the card locked, until the page was refreshed.
  const handlePointerUp = () => {
    if (!drawing.current) return
    drawing.current = false
    wantsClear.current = true
    if (content) fadeFoil()
  }

  const handleKeyDown = (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    if (!active || gone) return
    event.preventDefault()
    wantsClear.current = true
    start()
    if (content) fadeFoil()
  }

  return (
    <div
      role="button"
      tabIndex={active && !gone ? 0 : -1}
      aria-label={label}
      aria-disabled={!active || gone}
      onKeyDown={handleKeyDown}
      className="relative aspect-square min-h-11 overflow-hidden rounded-xl border border-white/10 bg-ticket-deep shadow-[inset_0_2px_6px_rgba(0,0,0,0.6)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-gold"
    >
      {content && <TileFace content={content} uncovered={gone} dim={dim} missed={missed} />}

      {!gone && (
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className={`absolute inset-0 size-full touch-none rounded-xl transition-[filter] duration-300 ${
            active ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'
          } ${!active && !waiting && covered ? 'brightness-75' : ''}`}
        />
      )}

      {/* While the server answers: a soft light passing over the foil. */}
      {waiting && !gone && (
        <motion.span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-linear-to-r from-transparent via-white/60 to-transparent"
          initial={{ x: '-110%', opacity: 0 }}
          animate={reduce ? { opacity: [0.2, 0.5, 0.2] } : { x: '110%', opacity: 1 }}
          transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}
    </div>
  )
}
