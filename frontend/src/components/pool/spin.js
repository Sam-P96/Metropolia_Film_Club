import { TABLE } from '../../../../shared/pool/physics.js'
import { ballColor } from './draw'

const { R } = TABLE

// The balls as real spheres that roll (PoolTable.jsx). Each ball keeps
// which way up it is, a rotation (3 x 3, row by row) from the ball's own
// axes to the view's: x across, y down the screen, z out of the table
// towards you. As it moves along the cloth it turns about the line
// across its path, by as far as it went over its radius, so the stripe
// and the number roll round it. The light doesn't move with it: the
// shading and the glint stay where the lamps are.
//
// On the ball: the number sits on a white disc at each end of its z axis,
// a stripe ball's band goes round its middle (white caps at either end of
// its y axis), and the cue ball has a small red dot at each end of z, so
// you can see it roll too.

const hexToRgb = (hex) => {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
const WHITE = [246, 241, 228]
const DISC = [251, 248, 240]
const DOT = [200, 30, 40]

// A ball's rotation to start with: number up, turned round a little,
// differently for each ball.
export function newSpin(id) {
  const a = id * 0.9 + 0.4
  const c = Math.cos(a)
  const s = Math.sin(a)
  return { m: [c, -s, 0, s, c, 0, 0, 0, 1], last: null, sprite: null, px: 0, dirty: true }
}

// Keeps a rotation a rotation: rows of length 1, square to each other.
function tidy(m) {
  let [ax, ay, az] = [m[0], m[1], m[2]]
  let l = Math.hypot(ax, ay, az)
  ax /= l
  ay /= l
  az /= l
  let [bx, by, bz] = [m[3], m[4], m[5]]
  const d = ax * bx + ay * by + az * bz
  bx -= d * ax
  by -= d * ay
  bz -= d * az
  l = Math.hypot(bx, by, bz)
  bx /= l
  by /= l
  bz /= l
  m[0] = ax
  m[1] = ay
  m[2] = az
  m[3] = bx
  m[4] = by
  m[5] = bz
  m[6] = ay * bz - az * by
  m[7] = az * bx - ax * bz
  m[8] = ax * by - ay * bx
}

// Rolls the ball (dx, dy) across the view. The point of it facing you
// goes the way it's going.
export function rollSpin(spin, dx, dy) {
  const d = Math.sqrt(dx * dx + dy * dy)
  if (d < 1e-6) return
  const kx = -dy / d
  const ky = dx / d
  const angle = d / R
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  const t = 1 - c
  // Turning about (kx, ky, 0) by `angle`.
  const r = [c + t * kx * kx, t * kx * ky, s * ky, t * kx * ky, c + t * ky * ky, -s * kx, -s * ky, s * kx, c]
  const m = spin.m
  const out = new Array(9)
  for (let i = 0; i < 3; i += 1) {
    for (let j = 0; j < 3; j += 1) out[i * 3 + j] = r[i * 3] * m[j] + r[i * 3 + 1] * m[3 + j] + r[i * 3 + 2] * m[6 + j]
  }
  tidy(out)
  spin.m = out
  spin.dirty = true
}

// The light and the glint, the same for every ball at a size, drawn once.
const lights = new Map()
function lightFor(size) {
  if (lights.has(size)) return lights.get(size)
  const shade = document.createElement('canvas')
  shade.width = shade.height = size
  const c = shade.getContext('2d')
  const h = size / 2
  const g = c.createRadialGradient(h * 0.62, h * 0.55, h * 0.05, h, h, h * 1.04)
  g.addColorStop(0, '#ffffff')
  g.addColorStop(0.45, '#e6e6e6')
  g.addColorStop(0.85, '#7a7a7a')
  g.addColorStop(1, '#3a3a3a')
  c.fillStyle = g
  c.fillRect(0, 0, size, size)

  const glint = document.createElement('canvas')
  glint.width = glint.height = size
  const k = glint.getContext('2d')
  const gg = k.createRadialGradient(h * 0.6, h * 0.52, 0, h * 0.6, h * 0.52, h * 0.36)
  gg.addColorStop(0, 'rgba(255,255,255,0.95)')
  gg.addColorStop(0.35, 'rgba(255,255,255,0.45)')
  gg.addColorStop(1, 'rgba(255,255,255,0)')
  k.fillStyle = gg
  k.fillRect(0, 0, size, size)
  // A soft rim of light off the cloth, low on the far side.
  const rim = k.createRadialGradient(h * 1.25, h * 1.35, h * 0.2, h * 1.25, h * 1.35, h * 0.75)
  rim.addColorStop(0, 'rgba(160,255,210,0.18)')
  rim.addColorStop(1, 'rgba(160,255,210,0)')
  k.fillStyle = rim
  k.fillRect(0, 0, size, size)

  const made = { shade, glint }
  lights.set(size, made)
  return made
}

// The ball, drawn as it now sits, `px` canvas pixels to a table unit. Only
// drawn again once it's rolled (or the size changed).
export function ballSprite(spin, id, px) {
  const size = Math.max(8, Math.ceil(2 * R * px))
  if (spin.sprite && !spin.dirty && spin.px === size) return spin.sprite

  const canvas = spin.sprite?.width === size ? spin.sprite : document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')
  const image = ctx.createImageData(size, size)
  const data = image.data
  const m = spin.m
  const color = id === 0 ? WHITE : hexToRgb(ballColor(id))
  const stripe = id > 8
  const half = size / 2

  for (let j = 0; j < size; j += 1) {
    const v = (j + 0.5 - half) / half
    for (let i = 0; i < size; i += 1) {
      const u = (i + 0.5 - half) / half
      const r2 = u * u + v * v
      if (r2 > 1.08) continue
      const w = Math.sqrt(Math.max(0, 1 - r2))
      // The point of the ball here, on the ball's own axes.
      const by = m[1] * u + m[4] * v + m[7] * w
      const bz = m[2] * u + m[5] * v + m[8] * w
      let rgb
      if (id === 0) rgb = Math.abs(bz) > 0.985 ? DOT : WHITE
      else if (Math.abs(bz) > 0.87) rgb = DISC
      else if (stripe) rgb = Math.abs(by) < 0.5 ? color : WHITE
      else rgb = color
      const o = (j * size + i) * 4
      data[o] = rgb[0]
      data[o + 1] = rgb[1]
      data[o + 2] = rgb[2]
      data[o + 3] = 255
    }
  }
  ctx.putImageData(image, 0, 0)

  // The numbers, on the discs that face you, turned and foreshortened as
  // the ball has them.
  if (id > 0) {
    ctx.save()
    ctx.fillStyle = '#111'
    ctx.font = `bold ${Math.round(half * 0.62)}px system-ui, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    for (const sign of [1, -1]) {
      // The disc's middle, and the ball's x and y axes, as you see them.
      const cz = sign * m[8]
      if (cz < 0.12) continue
      const cx = sign * m[2]
      const cy = sign * m[5]
      const ex = [sign * m[0], sign * m[3]]
      const ey = [m[1], m[4]]
      ctx.setTransform(ex[0], ex[1], ey[0], ey[1], half + cx * half, half + cy * half)
      ctx.fillText(String(id), 0, half * 0.04)
    }
    ctx.restore()
  }

  // Lit from the top left: darker round the edge, a bright glint.
  const light = lightFor(size)
  ctx.globalCompositeOperation = 'multiply'
  ctx.drawImage(light.shade, 0, 0)
  ctx.globalCompositeOperation = 'lighter'
  ctx.drawImage(light.glint, 0, 0)
  // Round, with a smooth edge.
  ctx.globalCompositeOperation = 'destination-in'
  ctx.beginPath()
  ctx.arc(half, half, half, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalCompositeOperation = 'source-over'

  spin.sprite = canvas
  spin.px = size
  spin.dirty = false
  return canvas
}
