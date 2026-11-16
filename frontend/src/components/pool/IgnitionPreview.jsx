import { useEffect, useRef } from 'react'
import { addSparks, drawBall, drawSparks, sparkColor } from './draw'
import { ignitionLook } from '../../../../shared/pool/ignitions.js'

// The view this is drawn in: the cue ball meeting the 3 in the middle.
const VIEW_W = 160
const VIEW_H = 80
const BALL = 3
// The burst is shown this long after it went off: spread out, still bright.
const STILL_MS = 260
const FRAME_MS = 1000 / 60

// An Ignition (the shop, PoolShop.jsx), as a still picture: one burst where
// the cue ball meets a ball, caught a moment after it went off. Drawn once
// (and again if its size changes). It moves on the table, and on the
// shop's Test table. Classic Sparks too, for comparing.
export default function IgnitionPreview({ id, className = '' }) {
  const ref = useRef(null)

  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas.getContext('2d')
    const look = ignitionLook(id)

    const draw = () => {
      const width = canvas.clientWidth
      const height = canvas.clientHeight
      if (!width || !height) return
      const dpr = window.devicePixelRatio || 1
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      const scale = Math.min(width / VIEW_W, height / VIEW_H)
      ctx.setTransform(scale * dpr, 0, 0, scale * dpr, ((width - VIEW_W * scale) / 2) * dpr, ((height - VIEW_H * scale) / 2) * dpr)

      drawBall(ctx, 0, VIEW_W / 2 - 13, VIEW_H / 2)
      drawBall(ctx, BALL, VIEW_W / 2 + 13, VIEW_H / 2)

      // Let the burst fly for a moment off screen, then draw it where it got to.
      let sparks = []
      addSparks(sparks, VIEW_W / 2, VIEW_H / 2, sparkColor(BALL), 0.8, 0, look)
      const scratch = document.createElement('canvas').getContext('2d')
      for (let t = FRAME_MS; t < STILL_MS; t += FRAME_MS) sparks = drawSparks(scratch, sparks, t, FRAME_MS / 1000)
      drawSparks(ctx, sparks, STILL_MS, FRAME_MS / 1000)
    }
    draw()
    const observer = new ResizeObserver(draw)
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [id])

  return <canvas ref={ref} aria-hidden="true" className={`block w-full ${className}`} />
}
