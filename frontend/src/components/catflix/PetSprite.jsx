import { useEffect, useRef } from 'react'
import { GifReader } from './omggif'
import { getCatflixForms } from '../../services/catflix'

// A Catflix No Chill pet, alive: its base form's idle animation (uploaded in
// Pet Forge) recoloured with its registered form's colour changes, looping on
// a canvas, pixel-crisp, as big as fits `size` (px, square). For the Games
// page card, profiles, the leaderboard and notifications. `skinId`: the
// registered form. `state`: which of its animations (idle; love is its happy
// one), idle if it hasn't that one. `flip` mirrors it. Nothing at all while
// it loads, or if the form is gone.

// Each animation file, decoded once a visit: { w, h, frames, delays, box }.
const decoded = new Map()

// A GIF's frames, as the prototype reads them (Pet Forge's forge.js
// decodeGif): each frame drawn over the last, cleared or put back as the
// GIF says.
function readGif(bytes) {
  const reader = new GifReader(bytes)
  const W = reader.width
  const H = reader.height
  let buffer = new Uint8ClampedArray(W * H * 4)
  const frames = []
  const delays = []
  for (let i = 0; i < reader.numFrames(); i++) {
    const info = reader.frameInfo(i)
    const previous = info.disposal === 3 ? buffer.slice() : null
    reader.decodeAndBlitFrameRGBA(i, buffer)
    frames.push(buffer.slice())
    delays.push(Math.max(20, (info.delay || 10) * 10))
    if (info.disposal === 2) {
      for (let y = info.y; y < info.y + info.height; y++) for (let x = info.x; x < info.x + info.width; x++) buffer.fill(0, (y * W + x) * 4, (y * W + x) * 4 + 4)
    } else if (info.disposal === 3) buffer = previous
  }
  return { w: W, h: H, frames, delays }
}

// A PNG strip's frames: `n` side by side (or as many squares as fit).
async function readPng(bytes, n) {
  const bitmap = await createImageBitmap(new Blob([bytes], { type: 'image/png' }))
  const count = n || (bitmap.width % bitmap.height === 0 ? bitmap.width / bitmap.height : 1)
  const w = Math.floor(bitmap.width / count)
  const canvas = Object.assign(document.createElement('canvas'), { width: bitmap.width, height: bitmap.height })
  const g = canvas.getContext('2d')
  g.drawImage(bitmap, 0, 0)
  const frames = Array.from({ length: count }, (_, i) => g.getImageData(i * w, 0, w, bitmap.height).data)
  return { w, h: bitmap.height, frames, delays: frames.map(() => 120) }
}

// Where anything is drawn, across every frame: the box to crop to.
function boxOf({ w, h, frames }) {
  let x0 = w
  let y0 = h
  let x1 = -1
  let y1 = -1
  for (const frame of frames) {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (frame[(y * w + x) * 4 + 3] < 8) continue
        if (x < x0) x0 = x
        if (y < y0) y0 = y
        if (x > x1) x1 = x
        if (y > y1) y1 = y
      }
    }
  }
  return x1 < 0 ? { x: 0, y: 0, w, h } : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 }
}

function decode(anim) {
  if (!decoded.has(anim.url)) {
    decoded.set(
      anim.url,
      fetch(anim.url)
        .then((response) => {
          if (!response.ok) throw new Error(`The animation file said ${response.status}`)
          return response.arrayBuffer()
        })
        .then(async (buffer) => {
          const bytes = new Uint8Array(buffer)
          const art = anim.kind === 'png' ? await readPng(bytes, anim.n) : readGif(bytes)
          return { ...art, box: boxOf(art) }
        })
        .catch((error) => {
          decoded.delete(anim.url)
          throw error
        })
    )
  }
  return decoded.get(anim.url)
}

const hexOf = (r, g, b) => `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`
const rgbOf = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))

// The frames, recoloured with the form's changes ({ "#from": "#to" }) and
// cropped to their box, as canvases ready to draw.
function bake(art, changes) {
  const swap = new Map(Object.entries(changes ?? {}).map(([from, to]) => [from.toLowerCase(), rgbOf(to)]))
  const { x, y, w, h } = art.box
  return art.frames.map((frame) => {
    const canvas = Object.assign(document.createElement('canvas'), { width: w, height: h })
    const g = canvas.getContext('2d')
    const image = g.createImageData(w, h)
    for (let row = 0; row < h; row++) {
      for (let col = 0; col < w; col++) {
        const from = ((y + row) * art.w + (x + col)) * 4
        const to = (row * w + col) * 4
        const alpha = frame[from + 3]
        if (alpha < 8) continue
        const rgb = swap.get(hexOf(frame[from], frame[from + 1], frame[from + 2])) ?? [frame[from], frame[from + 1], frame[from + 2]]
        image.data.set([...rgb, alpha], to)
      }
    }
    g.putImageData(image, 0, 0)
    return canvas
  })
}

export default function PetSprite({ skinId, state = 'idle', size = 96, flip = false, className = '', label }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    let frame = null
    let stopped = false
    // The last pet off, while this one loads (a blank canvas is see-through).
    canvasRef.current?.getContext('2d').clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
    ;(async () => {
      const { baseForms, registeredForms } = await getCatflixForms()
      const form = registeredForms[skinId]
      const base = form && baseForms[form.baseFormId]
      const anim = base?.anims?.[state] ?? base?.anims?.idle ?? Object.values(base?.anims ?? {})[0]
      if (!anim || stopped) return
      const art = await decode(anim)
      if (stopped) return
      const frames = bake(art, form.changes)
      const canvas = canvasRef.current
      if (!canvas) return
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      canvas.width = Math.round(size * dpr)
      canvas.height = Math.round(size * dpr)
      const g = canvas.getContext('2d')
      g.imageSmoothingEnabled = false
      // Its size from Pet Forge's Studio: only the shape matters here (it's fitted to `size`), so a stretch shows.
      const stretchX = anim.resize?.x ?? 1
      const stretchY = anim.resize?.y ?? 1
      const scale = Math.min(canvas.width / (art.box.w * stretchX), canvas.height / (art.box.h * stretchY))
      const dw = Math.round(art.box.w * stretchX * scale)
      const dh = Math.round(art.box.h * stretchY * scale)
      // Feet at the bottom, in the middle. (Not the game's left/right offset:
      // that lines a pet up on the room's floor; here the crop already
      // centres it, and the offset would push it off the edge.)
      const dx = Math.round((canvas.width - dw) / 2)
      const dy = canvas.height - dh
      let index = 0
      let next = 0
      const draw = (now) => {
        if (stopped) return
        if (now >= next) {
          g.clearRect(0, 0, canvas.width, canvas.height)
          g.save()
          if (flip) {
            g.translate(canvas.width, 0)
            g.scale(-1, 1)
          }
          g.drawImage(frames[index], dx, dy, dw, dh)
          g.restore()
          next = now + art.delays[index]
          index = (index + 1) % frames.length
        }
        frame = requestAnimationFrame(draw)
      }
      frame = requestAnimationFrame(draw)
    })().catch(() => {})
    return () => {
      stopped = true
      cancelAnimationFrame(frame)
    }
  }, [skinId, state, size, flip])

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label={label ?? 'A pet'}
      className={className}
      style={{ width: size, height: size, imageRendering: 'pixelated' }}
    />
  )
}
