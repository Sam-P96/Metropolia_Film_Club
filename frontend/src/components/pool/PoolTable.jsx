import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { MIN_POWER, STEP, Shot, TABLE, isFreeSpot } from '../../../../shared/pool/physics.js'
import { ballSprite, newSpin, rollSpin } from './spin'
import { cueLook } from '../../../../shared/pool/cues.js'
import { ignitionLook } from '../../../../shared/pool/ignitions.js'
import { addSparks, dirToView, drawAimLine, drawBall, drawCue, drawSparks, drawTable, sparkColor, toTable, toView, viewSize } from './draw'

const { R } = TABLE

// How long you hold (ms) for a full-power shot.
const HOLD_MS = 2000
// Sparks: every time the cue ball hits a ball, and the first few hits
// between any two balls in a shot. How hard they spark goes with the speed
// of the hit, from a little to SPARK_FULL and up.
const SPARK_FIRST_HITS = 3
const SPARK_FULL = 2200
// A ball that moved further than this in a frame was put somewhere (back
// on a spot, a new rack), not rolled.
const JUMP = 170
// Steps of the shot played per second: real time.
const STEPS_PER_SECOND = 1 / STEP

// Where the cue ball, sent from `from` along (dx, dy), first touches
// something: another ball ({ x, y } its centre then, `ball` the one it
// hits) or a cushion (`ball` null). For the aim line.
function traceAim(balls, from, dx, dy) {
  let best = Infinity
  let hit = null
  for (const ball of balls) {
    if (!ball.on || ball.id === 0) continue
    // |from + t (dx, dy) - ball| = 2R, the nearest t ahead.
    const ox = from.x - ball.x
    const oy = from.y - ball.y
    const b = ox * dx + oy * dy
    const c = ox * ox + oy * oy - 4 * R * R
    const disc = b * b - c
    if (disc < 0) continue
    const t = -b - Math.sqrt(disc)
    if (t > 0.01 && t < best) {
      best = t
      hit = ball
    }
  }
  // The cushions.
  const walls = [dx > 0 ? (TABLE.W - R - from.x) / dx : dx < 0 ? (R - from.x) / dx : Infinity, dy > 0 ? (TABLE.H - R - from.y) / dy : dy < 0 ? (R - from.y) / dy : Infinity]
  const wall = Math.max(0, Math.min(...walls))
  if (!hit || wall < best) return { x: from.x + dx * wall, y: from.y + dy * wall, ball: null }
  return { x: from.x + dx * best, y: from.y + dy * best, ball: hit }
}

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

// The 8 Ball Pool table (pages/PoolMatch.jsx, PoolClanker.jsx): drawn on a
// canvas, upright on a narrow screen. It plays shots, sparks and all, and
// takes the player's aim.
//
//   balls       the table at rest: [{ id, x, y, on }]
//   shot        a shot to play out: { key, before, dx, dy, speed, ignition }.
//               A new key plays it; onShotDone(key) once every ball is
//               still. `ignition`: the shooter's (shared/pool/ignitions.js
//               id), what flies off when balls collide.
//   canAim      it's this player's turn, and nothing is moving
//   hand        null, 'kitchen' or 'table': the cue ball can be dragged
//               to where it goes (behind the head string, or anywhere)
//   onShoot({ angle, power, cue })   a shot let go
//   onAim({ angle, power, on, cue })  the aim as it moves, for others to see
//   ghost       the other player's aim, shown faint: { angle, power, cue }
//   myCue, ghostCue   the cues (shared/pool/cues.js ids) yours and theirs
//               are drawn with
//
// To shoot, press and hold towards where the shot goes: the power builds
// the longer you hold (it never drops), turning keeps it, and letting go
// shoots. A line shows where the cue ball goes, up to the first ball it
// hits (marked, with the way that ball will go) or the cushion.
export default function PoolTable({ balls, shot, onShotDone, canAim, hand, onShoot, onAim, ghost, myCue = null, ghostCue: theirCue = null }) {
  const wrapRef = useRef(null)
  const canvasRef = useRef(null)
  const [layout, setLayout] = useState({ vertical: false, scale: 1 })

  // Everything the drawing loop reads, kept in one place so it never has to
  // wait for React.
  const state = useRef({
    balls,
    playing: null,
    sparks: [],
    sinking: [],
    aim: null,
    press: null,
    dragging: null,
    cue: null,
    // Which way up each ball is, as it rolls (spin.js), by id.
    spins: new Map(),
  })
  const props = useRef({})
  useLayoutEffect(() => {
    props.current = { canAim, hand, onShoot, onAim, ghost, onShotDone, myCue: cueLook(myCue), theirCue: cueLook(theirCue) }
  })

  // The table at rest, unless a shot is still playing out.
  useEffect(() => {
    state.current.balls = balls
    const cueBall = balls.find((ball) => ball.id === 0)
    if (!hand) state.current.cue = null
    else if (!state.current.cue && cueBall) state.current.cue = { x: cueBall.x, y: cueBall.y }
  }, [balls, hand])

  // A new shot to play.
  useEffect(() => {
    if (!shot) return
    const played = new Shot(shot.before, { dx: shot.dx, dy: shot.dy, speed: shot.speed })
    if (reducedMotion()) {
      while (!played.done) played.step()
      state.current.playing = null
      props.current.onShotDone?.(shot.key)
      return
    }
    state.current.playing = { key: shot.key, shot: played, debt: 0, hits: 0, ignition: ignitionLook(shot.ignition) }
    state.current.aim = null
    state.current.press = null
  }, [shot])

  // Fits the table to its box: upright when the box is narrow, and never
  // taller than most of the screen.
  useLayoutEffect(() => {
    const wrap = wrapRef.current
    const fit = () => {
      const width = wrap.clientWidth
      const vertical = width < 640
      const size = viewSize(vertical)
      const maxHeight = vertical ? window.innerHeight * 0.82 : Infinity
      // Lying down (a computer), it takes 90% of the width. Either way the
      // same scale both ways, so the table keeps its shape.
      const share = vertical ? 1 : 0.9
      setLayout({ vertical, scale: Math.min((width * share) / size.w, maxHeight / size.h) })
    }
    fit()
    const observer = new ResizeObserver(fit)
    observer.observe(wrap)
    window.addEventListener('resize', fit)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', fit)
    }
  }, [])

  // The drawing loop.
  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const { vertical, scale } = layout
    const size = viewSize(vertical)
    const dpr = window.devicePixelRatio || 1
    canvas.width = Math.round(size.w * scale * dpr)
    canvas.height = Math.round(size.h * scale * dpr)
    canvas.style.width = `${size.w * scale}px`
    canvas.style.height = `${size.h * scale}px`

    // The table, drawn once at this size.
    const back = document.createElement('canvas')
    back.width = canvas.width
    back.height = canvas.height
    const backCtx = back.getContext('2d')
    backCtx.scale(scale * dpr, scale * dpr)
    drawTable(backCtx, vertical)

    let frame
    // A new size or way round: the balls start rolling from where they are.
    for (const spin of state.current.spins.values()) spin.last = null
    const px = scale * dpr
    const spinOf = (id) => {
      const spins = state.current.spins
      if (!spins.has(id)) spins.set(id, newSpin(id))
      return spins.get(id)
    }
    // Rolls a ball to where it's drawn now, and its picture.
    const rolled = (id, at) => {
      const spin = spinOf(id)
      if (spin.last) {
        const dx = at.x - spin.last.x
        const dy = at.y - spin.last.y
        if (dx * dx + dy * dy < JUMP * JUMP) rollSpin(spin, dx, dy)
      }
      spin.last = at
      return ballSprite(spin, id, px)
    }

    let last = performance.now()
    const tick = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const s = state.current
      const p = props.current

      // Play the shot on.
      let shown = s.balls
      if (s.playing) {
        const { shot: played } = s.playing
        s.playing.debt += dt * STEPS_PER_SECOND
        const events = []
        while (s.playing.debt >= 1 && !played.done) {
          played.step(events)
          s.playing.debt -= 1
        }
        for (const event of events) {
          if (event.type === 'hit') {
            s.playing.hits += 1
            const cueHit = event.a === 0 || event.b === 0
            if (cueHit || s.playing.hits <= SPARK_FIRST_HITS) {
              const at = toView(vertical, event.x, event.y)
              const strength = Math.min(1, 0.12 + event.speed / SPARK_FULL)
              if (cueHit) addSparks(s.sparks, at.x, at.y, sparkColor(event.a === 0 ? event.b : event.a), strength, now, s.playing.ignition)
              else {
                // Two coloured balls: sparks in both their colours.
                addSparks(s.sparks, at.x, at.y, sparkColor(event.a), strength * 0.75, now, s.playing.ignition)
                addSparks(s.sparks, at.x, at.y, sparkColor(event.b), strength * 0.75, now, s.playing.ignition)
              }
            }
          } else if (event.type === 'pocket') {
            s.sinking.push({ id: event.ball, x: event.x, y: event.y, born: now })
          }
        }
        shown = played.balls
        if (played.done) {
          const key = s.playing.key
          s.playing = null
          p.onShotDone?.(key)
        }
      }

      // Holding to shoot: the power only ever builds.
      if (s.press && s.aim && p.canAim && !s.playing) {
        const power = Math.min(1, (now - s.press.start) / HOLD_MS)
        if (power > s.aim.power) {
          s.aim = { ...s.aim, power }
          p.onAim?.({ angle: Math.atan2(s.aim.dy, s.aim.dx), power, on: true, cue: p.hand ? s.cue : null })
        }
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(back, 0, 0)
      ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0)

      // Balls dropping into pockets.
      s.sinking = s.sinking.filter((ball) => now - ball.born < 260)
      for (const ball of s.sinking) {
        const k = (now - ball.born) / 260
        const at = toView(vertical, ball.x, ball.y)
        drawBall(ctx, ball.id, at.x, at.y, 1 - k * 0.6, 1 - k, ballSprite(spinOf(ball.id), ball.id, px))
      }

      // The balls. The cue ball, while it's in hand, where it's held.
      // Yours, while it's your shot. Someone else's (the other player,
      // Clanker): where they've put it, so their shot starts from there.
      const holding = !s.playing && p.canAim && p.hand && s.cue
      const ghostCue = !s.playing && p.ghost?.cue && !p.canAim ? p.ghost.cue : null
      for (const ball of shown) {
        if (!ball.on) {
          if (state.current.spins.has(ball.id) && !s.sinking.some((sinking) => sinking.id === ball.id)) spinOf(ball.id).last = null
          continue
        }
        let { x, y } = ball
        if (ball.id === 0 && holding) ({ x, y } = s.cue)
        else if (ball.id === 0 && ghostCue) ({ x, y } = ghostCue)
        const at = toView(vertical, x, y)
        drawBall(ctx, ball.id, at.x, at.y, 1, 1, rolled(ball.id, at))
      }

      // The cue ball can be picked up: a ring round it.
      if (holding && p.canAim) {
        const at = toView(vertical, s.cue.x, s.cue.y)
        ctx.strokeStyle = s.dragging ? 'rgba(250, 188, 63, 0.95)' : 'rgba(250, 188, 63, 0.55)'
        ctx.lineWidth = 2
        ctx.setLineDash([4, 4])
        ctx.beginPath()
        ctx.arc(at.x, at.y, R + 8 + Math.sin(now / 250) * 1.5, 0, Math.PI * 2)
        ctx.stroke()
        ctx.setLineDash([])
      }

      // The cue: yours, or the other player's, faint.
      const cueBall = shown.find((ball) => ball.id === 0)
      if (!s.playing && cueBall?.on) {
        const from = holding ? s.cue : ghostCue ?? cueBall
        const at = toView(vertical, from.x, from.y)
        let aim = null
        let alpha = 1
        let look = p.myCue
        if (p.canAim && s.aim) aim = s.aim
        else if (!p.canAim && p.ghost && Number.isFinite(p.ghost.angle)) {
          aim = { dx: Math.cos(p.ghost.angle), dy: Math.sin(p.ghost.angle), power: p.ghost.power ?? 0 }
          alpha = 0.55
          look = p.theirCue
        }
        if (aim) {
          const dir = dirToView(vertical, aim.dx, aim.dy)
          // Where it goes: to the first ball it hits, or the cushion.
          const end = traceAim(shown, from, aim.dx, aim.dy)
          const contact = toView(vertical, end.x, end.y)
          const target = end.ball && toView(vertical, end.ball.x, end.ball.y)
          drawAimLine(ctx, at, contact, target, end.ball?.id ?? null, alpha, now)
          drawCue(ctx, at.x, at.y, dir.x, dir.y, aim.power, alpha, look, now)
          // Holding: a ring round the cue ball fills, red into purple, as
          // the power builds, and pulses once it's full.
          if (p.canAim && s.press && aim.power > 0) {
            ctx.save()
            ctx.lineCap = 'round'
            ctx.lineWidth = 4
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)'
            ctx.beginPath()
            ctx.arc(at.x, at.y, R + 9, 0, Math.PI * 2)
            ctx.stroke()
            const ring = ctx.createLinearGradient(at.x - R - 9, at.y, at.x + R + 9, at.y)
            ring.addColorStop(0, '#ff3c5f')
            ring.addColorStop(1, '#a35bff')
            ctx.strokeStyle = ring
            ctx.shadowColor = aim.power >= 1 ? '#ff4d8d' : 'rgba(163, 91, 255, 0.8)'
            ctx.shadowBlur = aim.power >= 1 ? 14 + Math.sin(now / 80) * 4 : 8
            ctx.beginPath()
            ctx.arc(at.x, at.y, R + 9, -Math.PI / 2, -Math.PI / 2 + aim.power * Math.PI * 2)
            ctx.stroke()
            ctx.restore()
          }
        }
      }

      s.sparks = drawSparks(ctx, s.sparks, now, dt)
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [layout])

  // ---------- the pointer ----------

  // Where the pointer is, on the table.
  const pointAt = (event) => {
    const rect = canvasRef.current.getBoundingClientRect()
    const vx = (event.clientX - rect.left) / layout.scale
    const vy = (event.clientY - rect.top) / layout.scale
    return toTable(layout.vertical, vx, vy)
  }
  const cueSpot = () => {
    const s = state.current
    if (props.current.hand && s.cue) return s.cue
    return s.balls.find((ball) => ball.id === 0)
  }
  const report = (on) => {
    const s = state.current
    const aim = s.aim
    if (!aim) return
    props.current.onAim?.({ angle: Math.atan2(aim.dy, aim.dx), power: aim.power, on, cue: props.current.hand ? s.cue : null })
  }

  // The shot points at the pointer, from the cue ball.
  const aimToward = (point, power) => {
    const cue = cueSpot()
    if (!cue) return null
    const dx = point.x - cue.x
    const dy = point.y - cue.y
    const d = Math.sqrt(dx * dx + dy * dy)
    if (d < 1) return state.current.aim
    return { dx: dx / d, dy: dy / d, power }
  }

  const onPointerDown = (event) => {
    if (!canAim || state.current.playing) return
    const point = pointAt(event)
    const s = state.current
    const cue = cueSpot()
    event.currentTarget.setPointerCapture?.(event.pointerId)

    // Picking up the cue ball.
    if (hand && cue && (point.x - cue.x) ** 2 + (point.y - cue.y) ** 2 <= (R * 2.4) ** 2) {
      s.dragging = true
      return
    }
    s.press = { start: performance.now() }
    s.aim = aimToward(point, 0)
    report(true)
  }

  const onPointerMove = (event) => {
    if (!canAim || state.current.playing) return
    const point = pointAt(event)
    const s = state.current
    if (s.dragging) {
      const limitX = hand === 'kitchen' ? TABLE.HEAD_X : TABLE.W - R
      const x = Math.min(limitX, Math.max(R, point.x))
      const y = Math.min(TABLE.H - R, Math.max(R, point.y))
      if (isFreeSpot(s.balls, x, y, 0)) {
        s.cue = { x, y }
        report(false)
      }
      return
    }
    // Turning while you hold keeps the power you've built. With a mouse,
    // the cue follows it before you press, too.
    const power = s.press ? (s.aim?.power ?? 0) : 0
    if (s.press || event.pointerType === 'mouse') {
      s.aim = aimToward(point, power)
      report(Boolean(s.press))
    }
  }

  const onPointerUp = () => {
    const s = state.current
    if (s.dragging) {
      s.dragging = false
      return
    }
    if (!s.press) return
    const aim = s.aim
    s.press = null
    if (aim && aim.power >= MIN_POWER && canAim) {
      s.aim = null
      onShoot?.({ angle: Math.atan2(aim.dy, aim.dx), power: aim.power, cue: hand ? s.cue : null })
    } else if (aim) {
      // Let go straight away: nothing happens.
      s.aim = { ...aim, power: 0 }
      report(false)
    }
  }

  // Esc while holding puts the cue down.
  useEffect(() => {
    const cancel = (event) => {
      if (event.key !== 'Escape' || !state.current.press) return
      state.current.press = null
      if (state.current.aim) state.current.aim = { ...state.current.aim, power: 0 }
    }
    window.addEventListener('keydown', cancel)
    return () => window.removeEventListener('keydown', cancel)
  }, [])

  const label = canAim
    ? 'The pool table. Press and hold towards where you want to shoot: the longer you hold, the harder the shot. Let go to shoot.'
    : 'The pool table.'

  return (
    <div ref={wrapRef} className="flex w-full justify-center">
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={label}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className={`touch-none select-none rounded-[22px] shadow-[0_30px_80px_rgba(0,0,0,0.6),0_0_60px_rgba(180,40,90,0.25)] ${canAim ? 'cursor-crosshair' : ''}`}
      />
    </div>
  )
}

