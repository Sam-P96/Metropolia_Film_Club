import { useEffect, useLayoutEffect, useRef } from 'react'
import MemberAvatar from '../profile/MemberAvatar'
import { createEffects } from './effects'
import { drawChart } from './chart'
import { formatMultiplier } from '../../../../shared/crash/rules.js'

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
const clamp01 = (x) => Math.min(1, Math.max(0, x))

// The readout's colour with the multiplier: red under 1x, white, then mint,
// pink and gold as it climbs.
function readoutColour(m, crashed) {
  if (crashed) return '#FF4D5E'
  if (m < 1) return '#FF8A8A'
  if (m < 2) return '#FFFFFF'
  if (m < 5) return '#B8FFE0'
  if (m < 10) return '#FF8FC6'
  return '#FFD76A'
}

// The game screen's picture (pages/Crash.jsx): the scene (effects.js), the
// chart (chart.js), the big multiplier, and everyone in the round as their
// profile pictures: riding along by the tip of the line, popping off where
// they cash out (and staying there with their multiplier), or knocked off,
// falling and greying, when it crashes. All drawn in one loop at the
// screen's rate from `live` (hooks/useCrash.js), smoothing the server's 10
// ticks a second. `displayRef` gets the multiplier as shown, for the
// cash-out button. The loop rests while the tab is hidden.
export default function CrashStage({ round, live, myId, displayRef, idle = 'Waiting for everyone to be ready' }) {
  const shakeRef = useRef(null)
  const fxRef = useRef(null)
  const chartRef = useRef(null)
  const valueRef = useRef(null)
  const labelRef = useRef(null)
  const avatars = useRef(new Map())
  const fallenAt = useRef(new Map())
  const playersRef = useRef([])
  const idleRef = useRef(idle)
  useLayoutEffect(() => {
    playersRef.current = round?.players ?? []
    idleRef.current = idle
  })

  useEffect(() => {
    const fx = fxRef.current
    const chart = chartRef.current
    const fxCtx = fx.getContext('2d')
    const chartCtx = chart.getContext('2d')
    const mobile = window.matchMedia('(max-width: 640px)').matches
    const reduced = reducedMotion()
    const effects = createEffects({ mobile, reduced })
    const view = { lo: 0.75, hi: 2.2, xMax: 80 }
    let size = { w: 0, h: 0, dpr: 1 }
    let frame = null
    let last = performance.now()
    let shownRound = null

    const fit = () => {
      const rect = shakeRef.current.getBoundingClientRect()
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      size = { w: rect.width, h: rect.height, dpr }
      for (const canvas of [fx, chart]) {
        canvas.width = Math.max(1, Math.round(rect.width * dpr))
        canvas.height = Math.max(1, Math.round(rect.height * dpr))
      }
    }
    fit()
    const observer = new ResizeObserver(fit)
    observer.observe(shakeRef.current)

    const draw = (now) => {
      frame = requestAnimationFrame(draw)
      if (document.hidden) {
        last = now
        return
      }
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const { w, h, dpr } = size
      if (!w || !h) return

      // Where the round is, smoothed between ticks.
      const state = live.current
      const path = state.path
      const tickMs = state.config?.tickMs ?? 100
      const crashed = state.endedBy === 'crash'
      const crashAge = crashed && state.crashedAt ? now - state.crashedAt : 0
      if (shownRound !== state.roundId) {
        shownRound = state.roundId
        fallenAt.current.clear()
      }

      let points = []
      let tip = { x: 0, m: 1 }
      if (path.length > 0) {
        const n = path.length - 1
        if (crashed) {
          points = path.slice(0, Math.max(1, n)).map((m, i) => ({ x: i, m }))
        } else if (state.status === 'playing' && n > 0) {
          const k = clamp01((now - state.lastTickAt) / tickMs)
          points = path.slice(0, n).map((m, i) => ({ x: i, m }))
          points.push({ x: n - 1 + k, m: path[n - 1] + (path[n] - path[n - 1]) * k })
        } else {
          points = path.map((m, i) => ({ x: i, m }))
        }
        tip = points[points.length - 1]
      }
      const shown = path.length ? tip.m : 1

      // The chart's scale, easing towards what fits the line.
      let low = 1
      let high = 1
      for (const point of points) {
        if (point.m > 0) low = Math.min(low, point.m)
        high = Math.max(high, point.m)
      }
      const target = {
        lo: Math.min(0.75, low * 0.9),
        hi: Math.max(2.2, high * 1.22),
        xMax: Math.max(80, tip.x * 1.12 + 6),
      }
      const ease = 1 - Math.exp(-dt * 5)
      view.lo = Math.exp(Math.log(view.lo) + (Math.log(target.lo) - Math.log(view.lo)) * ease)
      view.hi = Math.exp(Math.log(view.hi) + (Math.log(target.hi) - Math.log(view.hi)) * ease)
      view.xMax += (target.xMax - view.xMax) * ease

      // The scene, then the chart over it.
      fxCtx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const shake = effects.frame(fxCtx, w, h, { m: shown, crashed, crashAge }, dt, now)
      shakeRef.current.style.transform = shake.x || shake.y ? `translate(${shake.x}px, ${shake.y}px)` : ''
      chartCtx.setTransform(1, 0, 0, 1, 0, 0)
      chartCtx.clearRect(0, 0, chart.width, chart.height)
      chartCtx.setTransform(dpr, 0, 0, dpr, 0, 0)
      if (crashed) chartCtx.filter = `grayscale(${clamp01((crashAge - 200) / 1100)})`
      const glow = shown >= 1 && shown < 2 ? 1 : 0.45
      const to = drawChart(chartCtx, w, h, { points, scale: view, crashed, crashAge, glow })
      chartCtx.filter = 'none'

      // The big multiplier.
      if (valueRef.current) {
        valueRef.current.textContent = path.length ? formatMultiplier(shown) : formatMultiplier(1)
        valueRef.current.style.color = readoutColour(shown, crashed)
      }
      if (labelRef.current) {
        labelRef.current.textContent = crashed
          ? 'Crashed'
          : state.endedBy === 'cap'
            ? 'Max: 25x'
            : state.endedBy === 'time'
              ? 'Time'
              : state.status === 'starting'
                ? 'Get ready'
                : state.status === 'playing'
                  ? ''
                  : idleRef.current
      }
      if (displayRef) displayRef.current = { m: shown, crashed, status: state.status }

      // Everyone's pictures.
      const riders = playersRef.current.filter((player) => !state.cashouts.has(player.userId))
      for (const player of playersRef.current) {
        const element = avatars.current.get(player.userId)
        if (!element) continue
        const out = state.cashouts.get(player.userId)
        let x
        let y
        if (out) {
          x = to.x(out.tick)
          y = to.y(out.multiplier)
        } else if (crashed) {
          const at = fallenAt.current.get(player.userId)
          if (at) ({ x, y } = at)
          else {
            const i = riders.indexOf(player)
            x = to.x(tip.x) - 10 - i * 26
            y = to.y(tip.m) - 24
            fallenAt.current.set(player.userId, { x, y })
          }
        } else {
          const i = riders.indexOf(player)
          const bob = reducedMotion() ? 0 : Math.sin(now / 260 + i) * 2
          x = to.x(tip.x) - 10 - i * 26
          y = to.y(tip.m) - 24 + bob
        }
        element.style.transform = `translate(${Math.round(x - 16)}px, ${Math.round(y - 16)}px)`
      }
    }
    frame = requestAnimationFrame(draw)
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [live, displayRef])

  const crashed = round?.endedBy === 'crash'
  const players = round?.players ?? []

  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
      <div ref={shakeRef} className="absolute inset-0">
        <canvas ref={fxRef} aria-hidden="true" className="absolute inset-0 h-full w-full" />
        <canvas ref={chartRef} role="img" aria-label="The multiplier, live" className="absolute inset-0 h-full w-full" />

        <div className="pointer-events-none absolute inset-x-0 top-[9%] flex flex-col items-center text-center" aria-live="off">
          <p ref={valueRef} className="font-['Bebas_Neue'] text-6xl leading-none tracking-wide tabular-nums drop-shadow-[0_4px_18px_rgba(0,0,0,0.6)] sm:text-8xl">
            1.00x
          </p>
          <p ref={labelRef} className="mt-1 min-h-5 text-sm font-semibold tracking-widest text-white/80 uppercase drop-shadow" />
        </div>

        {players.map((player) => {
          const cashed = player.cashedAt !== null
          const fallen = crashed && !cashed
          const mine = player.userId === myId
          return (
            <div
              key={player.userId}
              ref={(element) => (element ? avatars.current.set(player.userId, element) : avatars.current.delete(player.userId))}
              className="pointer-events-none absolute top-0 left-0 will-change-transform"
            >
              <div className={fallen ? 'crash-fall' : cashed ? 'crash-pop' : ''}>
                <div className={`rounded-full ${mine ? 'ring-2 ring-[#FFD76A]' : 'ring-2 ring-white/70'} shadow-lg shadow-black/50`}>
                  <MemberAvatar user={player.user} size="sm" />
                </div>
                {cashed && (
                  <span className="absolute top-full left-1/2 mt-0.5 -translate-x-1/2 rounded-full bg-black/70 px-1.5 text-[11px] font-bold whitespace-nowrap text-[#B8FFE0] tabular-nums">
                    {formatMultiplier(player.cashedAt)}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
