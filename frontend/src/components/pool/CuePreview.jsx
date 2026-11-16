import { useEffect, useRef } from 'react'
import { drawBall, drawCue } from './draw'
import { cueLook } from '../../../../shared/pool/cues.js'

// The view this is drawn in: a strip of cloth with the cue lined up on the
// cue ball, at the right.
const VIEW_W = 440
const VIEW_H = 44
// The moment a Glowing cue is shown at: its glow near its brightest.
const STILL_AT = 600

// A cue on a strip of cloth (the shop, PoolShop.jsx), as a still picture:
// drawn once (and again if its size changes), a Glowing cue or a Saber
// caught mid-glow. It moves on the table, and on the shop's Test table.
export default function CuePreview({ id, className = '' }) {
  const ref = useRef(null)

  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas.getContext('2d')
    const look = cueLook(id)

    const draw = () => {
      const width = canvas.clientWidth
      const height = canvas.clientHeight
      if (!width || !height) return
      const dpr = window.devicePixelRatio || 1
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      const scale = Math.min(width / VIEW_W, height / VIEW_H)
      ctx.setTransform(scale * dpr, 0, 0, scale * dpr, ((width - VIEW_W * scale) / 2) * dpr, ((height - VIEW_H * scale) / 2) * dpr)
      drawCue(ctx, 420, VIEW_H / 2, 1, 0, 0.1, 1, look, STILL_AT)
      drawBall(ctx, 0, 420, VIEW_H / 2)
    }
    draw()
    const observer = new ResizeObserver(draw)
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [id])

  return <canvas ref={ref} aria-hidden="true" className={`block w-full ${className}`} />
}
