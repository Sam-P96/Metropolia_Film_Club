import { useEffect, useRef } from 'react'
import { drawBall, drawCue } from './draw'
import { cueLook } from '../../../../shared/pool/cues.js'

// The view this is drawn in: a strip of cloth with the cue lined up on the
// cue ball, at the right.
const VIEW_W = 440
const VIEW_H = 44

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

// A cue on a strip of cloth (the shop, PoolShop.jsx). A Glowing cue keeps
// glowing; the others are drawn once.
export default function CuePreview({ id, className = '' }) {
  const ref = useRef(null)

  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas.getContext('2d')
    const look = cueLook(id)
    let frame = null

    const draw = (now) => {
      const width = canvas.clientWidth
      const height = canvas.clientHeight
      const dpr = window.devicePixelRatio || 1
      if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
        canvas.width = Math.round(width * dpr)
        canvas.height = Math.round(height * dpr)
      }
      const scale = Math.min(width / VIEW_W, height / VIEW_H)
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.setTransform(scale * dpr, 0, 0, scale * dpr, ((width - VIEW_W * scale) / 2) * dpr, ((height - VIEW_H * scale) / 2) * dpr)
      drawCue(ctx, 420, VIEW_H / 2, 1, 0, 0.1, 1, look, now)
      drawBall(ctx, 0, 420, VIEW_H / 2)
      if (look.glow && !reducedMotion()) frame = requestAnimationFrame(draw)
    }
    frame = requestAnimationFrame(draw)
    const observer = new ResizeObserver(() => {
      if (!look.glow || reducedMotion()) frame = requestAnimationFrame(draw)
    })
    observer.observe(canvas)
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [id])

  return <canvas ref={ref} aria-hidden="true" className={`block w-full ${className}`} />
}
