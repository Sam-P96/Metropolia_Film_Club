import { useImperativeHandle, useLayoutEffect, useRef, useState } from 'react'
import ReviewCard from './ReviewCard'

const SPEED = 42        // normal scrolling speed, in pixels per second
const EASE_STOP = 3.5   // how quickly it slows down on hover (lower = longer, softer stop)
const EASE_START = 2.5  // how quickly it speeds back up after hover (lower = gentler restart)

// The arrow buttons under it (MarqueeArrows)
const CARDS_PER_JUMP = 1        // how far one click moves it
const EASE_JUMP = 5             // how quickly a click's move plays out (lower = longer glide)
const HOLD_SPEED = SPEED * 5  // while an arrow is held down
const EASE_HOLD = 2             // how quickly it gets up to that speed

// A finger on it (phones and tablets)
const TAP_SLOP = 10               // pixels a finger can move and still be tapping a card
const FLING_WINDOW_MS = 80        // a finger held still this long before lifting throws nothing
const MAX_FLING = SPEED * 60      // the fastest a flick can throw it, in pixels per second
const EASE_FLING = 3              // how quickly a flick slows down (lower = glides further)
const REST_AFTER_TOUCH_MS = 2500  // how long it rests once the finger's gone, before drifting again

// `ref` receives { jump(direction), hold(direction) } for the arrow buttons.
// direction is 1 (onwards, the way it drifts) or -1 (back). hold(0) lets go.
//
// On a touch screen the cards can be dragged: a finger on them stops the
// drift and they follow it sideways; a flick throws them on, gliding to a
// stop; then they rest a moment and drift again. Swiping up or down still
// scrolls the page (touch-action: pan-y), and a drag never counts as a tap
// on a card. A mouse doesn't drag: it has the hover stop and the arrows.
function ReviewMarquee({ reviews, ref }) {
  const looped = [...reviews, ...reviews]
  // { [reviewId]: { likeCount, dislikeCount, myVote } } after a vote. Every review is on
  // the track twice, and both copies should show it.
  const [votes, setVotes] = useState({})
  const trackRef = useRef(null)
  const hoveredRef = useRef(false)
  const holdRef = useRef(0)   // -1, 0 or 1
  const jumpsRef = useRef(0)  // cards clicked through that the animation hasn't picked up yet

  useImperativeHandle(ref, () => ({
    jump: (direction) => { jumpsRef.current += direction * CARDS_PER_JUMP },
    hold: (direction) => { holdRef.current = direction },
  }), [])

  // A layout effect, so the starting position is set before the browser
  // paints the new list, not a frame later.
  useLayoutEffect(() => {
    const track = trackRef.current
    if (!track) return

    const halfWidth = track.scrollWidth / 2
    if (halfWidth === 0) return
    const cardWidth = halfWidth / reviews.length

    // No drifting on its own, and clicks move it in one go. Holding an arrow
    // still moves it: that's the visitor asking for motion.
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const cruiseSpeed = reduceMotion ? 0 : SPEED

    // Start with the first review (the newest, or the most liked) in the
    // middle of the screen. place() wraps it round so the end of the list
    // fills the space to its left.
    const firstCard = track.firstElementChild.firstElementChild
    let position = track.parentElement.clientWidth / 2 - firstCard.offsetWidth / 2
    let speed = cruiseSpeed
    let jumpLeft = 0  // pixels still to travel from clicks
    let lastTime = performance.now()
    let frameId

    // A finger on it: { id, x, time, velocity (pixels per second), distance }
    // while it's down. `dragged` is how far it's moved the cards since the
    // last frame. After it lifts, the cards rest until `restUntil`, and a
    // click that a drag set off is ignored until `ignoreClicksUntil`.
    let drag = null
    let dragged = 0
    let restUntil = 0
    let ignoreClicksUntil = 0

    function place() {
      // The track is the list twice over, so half its width either way looks the same
      while (-position >= halfWidth) position += halfWidth
      while (position > 0) position -= halfWidth

      track.style.transform = `translateX(${position}px)`
    }

    place()

    function step(now) {
      const seconds = Math.min((now - lastTime) / 1000, 0.1)
      lastTime = now

      const hold = holdRef.current
      const hovered = hoveredRef.current
      const resting = now < restUntil
      const targetSpeed = hold ? hold * HOLD_SPEED : hovered || drag || resting ? 0 : cruiseSpeed
      const easing = hold ? EASE_HOLD : resting ? EASE_FLING : hovered ? EASE_STOP : EASE_START

      // Move a fraction of the way toward the target speed each frame.
      // Using exp() keeps the feel the same at 60Hz, 120Hz, 144Hz, etc.
      // A finger on it holds it exactly where the finger puts it.
      const blend = 1 - Math.exp(-easing * seconds)
      speed = drag ? 0 : speed + (targetSpeed - speed) * blend

      // Snap to a full stop once it's imperceptibly slow
      if (targetSpeed === 0 && Math.abs(speed) < 0.05) speed = 0

      // A click glides the same way: a fraction of the distance left each
      // frame, fast at first and settling gently. On top of the drift, so
      // the drift carries on unchanged once it's done.
      jumpLeft += jumpsRef.current * cardWidth
      jumpsRef.current = 0
      const jumpBlend = reduceMotion ? 1 : 1 - Math.exp(-EASE_JUMP * seconds)
      let jumpStep = jumpLeft * jumpBlend
      if (Math.abs(jumpLeft - jumpStep) < 0.5) jumpStep = jumpLeft
      jumpLeft -= jumpStep

      position += dragged - speed * seconds - jumpStep
      dragged = 0
      place()

      frameId = requestAnimationFrame(step)
    }

    frameId = requestAnimationFrame(step)

    // Fingers (and pens) drag it; a mouse doesn't. One finger at a time. The
    // browser keeps sending a finger's moves here once it's down, wherever it
    // goes, until it lifts, or the page scrolls instead (pointercancel).
    const strip = track.parentElement

    const onDown = (event) => {
      if (event.pointerType === 'mouse' || drag) return
      drag = { id: event.pointerId, x: event.clientX, time: event.timeStamp, velocity: 0, distance: 0 }
      jumpLeft = 0
    }

    const onMove = (event) => {
      if (event.pointerId !== drag?.id) return
      const dx = event.clientX - drag.x
      const ms = event.timeStamp - drag.time
      dragged += dx
      drag.distance += Math.abs(dx)
      // Smoothed, so one jittery sample doesn't decide the flick.
      if (ms > 0) drag.velocity = 0.6 * ((dx / ms) * 1000) + 0.4 * drag.velocity
      drag.x = event.clientX
      drag.time = event.timeStamp
    }

    const onUp = (event) => {
      if (event.pointerId !== drag?.id) return
      // A flick throws it on; lifting a finger that had stopped throws
      // nothing, and nor does the page taking over to scroll.
      const flicked = event.type === 'pointerup' && event.timeStamp - drag.time < FLING_WINDOW_MS && !reduceMotion
      const fling = flicked ? Math.max(-MAX_FLING, Math.min(MAX_FLING, drag.velocity)) : 0
      speed = -fling
      restUntil = performance.now() + REST_AFTER_TOUCH_MS
      if (drag.distance > TAP_SLOP) ignoreClicksUntil = performance.now() + 400
      drag = null
    }

    // Before the click reaches a card's links or buttons.
    const onClick = (event) => {
      if (performance.now() > ignoreClicksUntil) return
      ignoreClicksUntil = 0
      event.preventDefault()
      event.stopPropagation()
    }

    strip.addEventListener('pointerdown', onDown)
    strip.addEventListener('pointermove', onMove)
    strip.addEventListener('pointerup', onUp)
    strip.addEventListener('pointercancel', onUp)
    strip.addEventListener('click', onClick, true)

    return () => {
      cancelAnimationFrame(frameId)
      strip.removeEventListener('pointerdown', onDown)
      strip.removeEventListener('pointermove', onMove)
      strip.removeEventListener('pointerup', onUp)
      strip.removeEventListener('pointercancel', onUp)
      strip.removeEventListener('click', onClick, true)
    }
  }, [reviews])

  return (
    // Swiping up and down scrolls the page as usual (and pinching zooms);
    // swiping sideways is left to the drag above.
    <div className="touch-pan-y touch-pinch-zoom overflow-hidden py-14">
      <div ref={trackRef} className="flex w-max">
        {looped.map((review, index) => (
          <div key={`${review._id}-${index}`} className="shrink-0 pr-6">
            <div
              onMouseEnter={() => { hoveredRef.current = true }}
              onMouseLeave={() => { hoveredRef.current = false }}
              className="relative w-120 transition-transform duration-200 ease-out hover:z-10 hover:scale-105 hover:duration-1000 hover:ease-[cubic-bezier(0.33,1,0.68,1)]"
            >
              <ReviewCard
                review={{ ...review, ...votes[review._id] }}
                onVoteChange={(change) =>
                  setVotes((prev) => ({ ...prev, [review._id]: change }))
                }
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Where the marquee will be while its first reviews load: still, faintly
// pulsing cards built like ReviewCard's (the same poster box, which sets a
// card's height, and the same banner row under it), in the same strip, so
// nothing moves when the real ones arrive.
export function ReviewMarqueeSkeleton({ count = 4 }) {
  return (
    <div aria-hidden="true" className="flex justify-center overflow-hidden py-14">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="shrink-0 pr-6">
          <div className="w-120 overflow-hidden rounded-2xl border border-white/10 bg-plum/40 shadow-xl shadow-black/40 backdrop-blur-md">
            <div className="flex">
              <div className="aspect-2/3 w-40 shrink-0 bg-ink/60 sm:w-44" />
              <div className="flex-1 space-y-3 p-5 motion-safe:animate-pulse">
                <div className="h-5 w-3/4 rounded bg-white/10" />
                <div className="h-3 w-1/3 rounded bg-white/10" />
                <div className="h-3 w-full rounded bg-white/5" />
                <div className="h-3 w-5/6 rounded bg-white/5" />
                <div className="h-3 w-2/3 rounded bg-white/5" />
              </div>
            </div>
            <div className="flex items-center justify-end gap-4 border-t border-white/10 px-5 py-4 motion-safe:animate-pulse">
              <div className="space-y-2">
                <div className="ml-auto h-4 w-24 rounded bg-white/10" />
                <div className="ml-auto h-3 w-16 rounded bg-white/5" />
              </div>
              <div className="h-12 w-12 rounded-full bg-white/10" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default ReviewMarquee
