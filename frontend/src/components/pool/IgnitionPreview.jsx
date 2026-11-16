import { useEffect, useRef } from 'react'
import { addSparks, drawBall, drawSparks, sparkColor } from './draw'
import { ignitionLook } from '../../../../shared/pool/ignitions.js'

// The view this is drawn in: two balls touching in the middle.
const VIEW_W = 160
const VIEW_H = 80
// A burst this often, off a different ball each time.
const EVERY_MS = 1300
const BALLS = [3, 11, 8, 6, 14, 1]

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

// An Ignition going off, over and over, where the cue ball meets a ball
// (the shop, PoolShop.jsx). Classic Sparks too, for comparing.
export default function IgnitionPreview({ id, className = '' }) {
  const ref = useRef(null)

  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas.getContext('2d')
    const look = ignitionLook(id)
    const calm = reducedMotion()
    let sparks = []
    let frame = null
    let last = performance.now()
    let next = last + 250
    let turn = 0

    const draw = (now) => {
      const width = canvas.clientWidth
      const height = canvas.clientHeight
      const dpr = window.devicePixelRatio || 1
      if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
        canvas.width = Math.round(width * dpr)
        canvas.height = Math.round(height * dpr)
      }
      const scale = Math.min(width / VIEW_W, height / VIEW_H)
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const ball = BALLS[turn % BALLS.length]
      if (now >= next) {
        addSparks(sparks, VIEW_W / 2, VIEW_H / 2, sparkColor(ball), 0.8, now, look)
        turn += 1
        next = now + EVERY_MS
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.setTransform(scale * dpr, 0, 0, scale * dpr, ((width - VIEW_W * scale) / 2) * dpr, ((height - VIEW_H * scale) / 2) * dpr)
      drawBall(ctx, 0, VIEW_W / 2 - 13, VIEW_H / 2)
      drawBall(ctx, BALLS[(turn + BALLS.length - 1) % BALLS.length], VIEW_W / 2 + 13, VIEW_H / 2)
      sparks = drawSparks(ctx, sparks, now, dt)
      if (!calm) frame = requestAnimationFrame(draw)
    }
    frame = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(frame)
  }, [id])

  return <canvas ref={ref} aria-hidden="true" className={`block w-full ${className}`} />
}
