import { useEffect, useRef } from 'react'
import ReviewCard from './ReviewCard'

const SPEED = 42        // normal scrolling speed, in pixels per second
const EASE_STOP = 3.5   // how quickly it slows down on hover (lower = longer, softer stop)
const EASE_START = 2.5  // how quickly it speeds back up after hover (lower = gentler restart)

function ReviewMarquee({ reviews }) {
  const looped = [...reviews, ...reviews]
  const trackRef = useRef(null)
  const hoveredRef = useRef(false)

  useEffect(() => {
    const track = trackRef.current
    if (!track) return

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion) return

    const halfWidth = track.scrollWidth / 2

    let position = 0
    let speed = SPEED
    let lastTime = performance.now()
    let frameId

    function step(now) {
      const seconds = Math.min((now - lastTime) / 1000, 0.1)
      lastTime = now

      const hovered = hoveredRef.current
      const targetSpeed = hovered ? 0 : SPEED
      const easing = hovered ? EASE_STOP : EASE_START

      // Move a fraction of the way toward the target speed each frame.
      // Using exp() keeps the feel the same at 60Hz, 120Hz, 144Hz, etc.
      const blend = 1 - Math.exp(-easing * seconds)
      speed += (targetSpeed - speed) * blend

      // Snap to a full stop once it's imperceptibly slow
      if (hovered && speed < 0.05) speed = 0

      position -= speed * seconds
      if (-position >= halfWidth) position += halfWidth

      track.style.transform = `translateX(${position}px)`
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
              <ReviewCard review={review} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default ReviewMarquee