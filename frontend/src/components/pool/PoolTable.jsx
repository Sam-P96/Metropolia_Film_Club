import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { MIN_POWER, STEP, Shot, TABLE, isFreeSpot } from '../../../../shared/pool/physics.js'
import { addSparks, dirToView, drawBall, drawCue, drawSparks, drawTable, sparkColor, toTable, toView, viewSize } from './draw'

const { R } = TABLE

// How far back you drag (in table units) for a full-power shot.
const FULL_PULL = 260
// The cue ball has to hit a ball at least this fast for it to spark.
const SPARK_SPEED = 650
// Steps of the shot played per second: real time.
const STEPS_PER_SECOND = 1 / STEP

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

// The 8 Ball Pool table (pages/PoolMatch.jsx, PoolClanker.jsx): drawn on a
// canvas, upright on a narrow screen. It plays shots, sparks and all, and
// takes the player's aim.
//
//   balls       the table at rest: [{ id, x, y, on }]
//   shot        a shot to play out: { key, before, dx, dy, speed }. A new
//               key plays it; onShotDone(key) once every ball is still.
//   canAim      it's this player's turn, and nothing is moving
//   hand        null, 'kitchen' or 'table': the cue ball can be dragged
//               to where it goes (behind the head string, or anywhere)
//   mode        'drag': press and drag back to shoot, the cue pointing
//               away from the pointer. 'dial': the angle and power come
//               from `dial` ({ angle, power }), set outside the table.
//   onShoot({ angle, power, cue })   a shot let go (drag mode)
//   onAim({ angle, power, on, cue })  the aim as it moves, for others to see
//   onCue({ x, y })   the cue ball moved, while it's in hand
//   ghost       the other player's aim, shown faint: { angle, power, cue }
//   onLayout(vertical)   whether it's standing upright, for the dial
export default function PoolTable({ balls, shot, onShotDone, canAim, hand, mode = 'drag', dial, onShoot, onAim, onCue, ghost, onLayout }) {
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
  })
  const props = useRef({})
  useLayoutEffect(() => {
    props.current = { canAim, hand, mode, dial, onShoot, onAim, onCue, ghost, onShotDone }
  })

  useEffect(() => {
    onLayout?.(layout.vertical)
  }, [layout.vertical, onLayout])

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
    state.current.playing = { key: shot.key, shot: played, debt: 0 }
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
      setLayout({ vertical, scale: Math.min(width / size.w, maxHeight / size.h) })
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
          if (event.type === 'hit' && (event.a === 0 || event.b === 0) && event.speed >= SPARK_SPEED) {
            const at = toView(vertical, event.x, event.y)
            addSparks(s.sparks, at.x, at.y, sparkColor(event.a === 0 ? event.b : event.a), Math.min(1, (event.speed - SPARK_SPEED) / 2000), now)
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

      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(back, 0, 0)
      ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0)

      // Balls dropping into pockets.
      s.sinking = s.sinking.filter((ball) => now - ball.born < 260)
      for (const ball of s.sinking) {
        const k = (now - ball.born) / 260
        const at = toView(vertical, ball.x, ball.y)
        drawBall(ctx, ball.id, at.x, at.y, 1 - k * 0.6, 1 - k)
      }

      // The balls. The cue ball, while it's in hand, where it's held.
      const holding = !s.playing && p.hand && s.cue
      const ghostCue = !s.playing && p.ghost?.cue && !p.canAim ? p.ghost.cue : null
      for (const ball of shown) {
        if (!ball.on) continue
        let { x, y } = ball
        if (ball.id === 0 && holding) ({ x, y } = s.cue)
        else if (ball.id === 0 && ghostCue) ({ x, y } = ghostCue)
        const at = toView(vertical, x, y)
        drawBall(ctx, ball.id, at.x, at.y)
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
        if (p.canAim && p.mode === 'dial' && p.dial) aim = { dx: Math.cos(p.dial.angle), dy: Math.sin(p.dial.angle), power: p.dial.power }
        else if (p.canAim && s.aim) aim = s.aim
        else if (!p.canAim && p.ghost && Number.isFinite(p.ghost.angle)) {
          aim = { dx: Math.cos(p.ghost.angle), dy: Math.sin(p.ghost.angle), power: p.ghost.power ?? 0 }
          alpha = 0.55
        }
        if (aim) {
          const dir = dirToView(vertical, aim.dx, aim.dy)
          drawCue(ctx, at.x, at.y, dir.x, dir.y, aim.power, alpha)
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

  // The shot points away from the pointer, from the cue ball.
  const aimFrom = (point, power) => {
    const cue = cueSpot()
    if (!cue) return null
    const dx = cue.x - point.x
    const dy = cue.y - point.y
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
    if (mode !== 'drag') return
    s.press = point
    s.aim = aimFrom(point, 0)
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
        props.current.onCue?.(s.cue)
        report(false)
      }
      return
    }
    if (mode !== 'drag') return
    if (s.press) {
      const pulled = Math.sqrt((point.x - s.press.x) ** 2 + (point.y - s.press.y) ** 2)
      s.aim = aimFrom(point, Math.min(1, pulled / FULL_PULL))
      report(true)
    } else if (event.pointerType === 'mouse') {
      // Just looking: the cue follows the mouse, not pulled back.
      s.aim = aimFrom(point, 0)
      report(false)
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
      // Let go without pulling back: nothing happens.
      s.aim = { ...aim, power: 0 }
      report(false)
    }
  }

  // Esc while pulling back puts the cue down.
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
    ? mode === 'drag'
      ? 'The pool table. Press and drag back from the cue ball to shoot: the further you pull, the harder the shot.'
      : 'The pool table. Set the angle and power below the table.'
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

