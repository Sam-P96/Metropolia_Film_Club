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

// `ref` receives { jump(direction), hold(direction) } for the arrow buttons.
// direction is 1 (onwards, the way it drifts) or -1 (back). hold(0) lets go.
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
      const targetSpeed = hold ? hold * HOLD_SPEED : hovered ? 0 : cruiseSpeed
      const easing = hold ? EASE_HOLD : hovered ? EASE_STOP : EASE_START

      // Move a fraction of the way toward the target speed each frame.
      // Using exp() keeps the feel the same at 60Hz, 120Hz, 144Hz, etc.
      const blend = 1 - Math.exp(-easing * seconds)
      speed += (targetSpeed - speed) * blend

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

      position -= speed * seconds + jumpStep
      place()

      frameId = requestAnimationFrame(step)
    }

    frameId = requestAnimationFrame(step)

    return () => cancelAnimationFrame(frameId)
  }, [reviews])

  return (
    <div className="overflow-hidden py-14">
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

export default ReviewMarquee
