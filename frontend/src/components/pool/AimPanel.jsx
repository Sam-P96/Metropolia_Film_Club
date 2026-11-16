import { useRef } from 'react'
import { MODES, setControls, usePoolControls } from './controls'
import { tableAngle, viewAngle } from './draw'
import { MIN_POWER } from '../../../../shared/pool/physics.js'

const TAU = Math.PI * 2
const DEG = Math.PI / 180

// The three ways to shoot (controls.js), as a switch.
export function ControlsToggle() {
  const mode = usePoolControls()
  const choice = (on) =>
    `cursor-pointer rounded-full px-3 py-1 text-sm font-semibold transition-colors ${on ? 'bg-brand-gold text-ink' : 'text-white/70 hover:text-white'}`
  const names = { hold: 'Hold to power', drag: 'Drag back', dial: 'Angle, then power' }
  return (
    <div role="group" aria-label="How to shoot" className="inline-flex flex-wrap justify-center rounded-3xl border border-white/15 bg-white/5 p-1">
      {MODES.map((id) => (
        <button key={id} type="button" aria-pressed={mode === id} onClick={() => setControls(id)} className={choice(mode === id)}>
          {names[id]}
        </button>
      ))}
    </div>
  )
}

// The dial: drag round it to point the cue. It's drawn the way the table
// is on screen (`vertical`: upright), so the arrow points where the shot goes.
function Dial({ angle, vertical, onAngle, disabled }) {
  const ref = useRef(null)
  const screen = viewAngle(vertical, angle)

  const set = (event) => {
    const rect = ref.current.getBoundingClientRect()
    const x = event.clientX - rect.left - rect.width / 2
    const y = event.clientY - rect.top - rect.height / 2
    if (x * x + y * y < 64) return
    onAngle(tableAngle(vertical, Math.atan2(y, x)))
  }

  const tip = { x: 70 + Math.cos(screen) * 52, y: 70 + Math.sin(screen) * 52 }
  const tail = { x: 70 - Math.cos(screen) * 30, y: 70 - Math.sin(screen) * 30 }
  return (
    <svg
      ref={ref}
      viewBox="0 0 140 140"
      className={`size-36 shrink-0 touch-none select-none ${disabled ? 'opacity-40' : 'cursor-grab active:cursor-grabbing'}`}
      role="slider"
      aria-label="Angle of the shot"
      aria-valuemin={0}
      aria-valuemax={359}
      aria-valuenow={Math.round((((angle / DEG) % 360) + 360) % 360)}
      tabIndex={disabled ? -1 : 0}
      onPointerDown={(event) => {
        if (disabled) return
        event.currentTarget.setPointerCapture(event.pointerId)
        set(event)
      }}
      onPointerMove={(event) => !disabled && event.buttons && set(event)}
      onKeyDown={(event) => {
        if (disabled) return
        const step = event.shiftKey ? 5 * DEG : 0.5 * DEG
        if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') onAngle(angle - step)
        else if (event.key === 'ArrowRight' || event.key === 'ArrowUp') onAngle(angle + step)
        else return
        event.preventDefault()
      }}
    >
      <defs>
        <radialGradient id="dial-face" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#1d7a52" />
          <stop offset="100%" stopColor="#063d27" />
        </radialGradient>
      </defs>
      <circle cx="70" cy="70" r="66" fill="url(#dial-face)" stroke="#c9982f" strokeWidth="3" />
      {Array.from({ length: 24 }, (_, i) => {
        const a = (i / 24) * TAU
        const long = i % 6 === 0
        return (
          <line
            key={i}
            x1={70 + Math.cos(a) * (long ? 52 : 57)}
            y1={70 + Math.sin(a) * (long ? 52 : 57)}
            x2={70 + Math.cos(a) * 62}
            y2={70 + Math.sin(a) * 62}
            stroke="rgba(255,230,160,0.5)"
            strokeWidth={long ? 2 : 1}
          />
        )
      })}
      <line x1={tail.x} y1={tail.y} x2={tip.x} y2={tip.y} stroke="#f1dfb5" strokeWidth="4" strokeLinecap="round" />
      <circle cx={tip.x} cy={tip.y} r="7" fill="#fabc3f" stroke="#fff" strokeWidth="1.5" />
      <circle cx="70" cy="70" r="9" fill="#f8f4ea" />
    </svg>
  )
}

// "Angle, then power": the dial (and fine steps) for the angle, a slider for
// the power, and Shoot. Separate from the table, which shows the cue where
// it's set.
export default function AimPanel({ angle, power, vertical, onAngle, onPower, onShoot, disabled, busy }) {
  const nudge = (degrees) => onAngle(angle + degrees * DEG)
  const fine = 'flex min-h-10 min-w-10 cursor-pointer items-center justify-center rounded-lg border border-white/15 bg-white/5 text-white/80 hover:bg-white/10 disabled:cursor-default disabled:opacity-40'
  const percent = Math.round(power * 100)

  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-white/10 bg-[#140a14]/80 p-4 shadow-xl shadow-black/40 sm:flex-row sm:justify-center sm:gap-8">
      <div className="flex flex-col items-center gap-2">
        <p className="text-xs font-semibold tracking-widest text-white/60 uppercase">1. Angle</p>
        <Dial angle={angle} vertical={vertical} onAngle={onAngle} disabled={disabled} />
        <div className="flex gap-1.5">
          <button type="button" className={fine} disabled={disabled} onClick={() => nudge(-2)} aria-label="Turn 2 degrees one way">
            «
          </button>
          <button type="button" className={fine} disabled={disabled} onClick={() => nudge(-0.2)} aria-label="Turn a little one way">
            ‹
          </button>
          <button type="button" className={fine} disabled={disabled} onClick={() => nudge(0.2)} aria-label="Turn a little the other way">
            ›
          </button>
          <button type="button" className={fine} disabled={disabled} onClick={() => nudge(2)} aria-label="Turn 2 degrees the other way">
            »
          </button>
        </div>
      </div>

      <div className="flex w-full max-w-xs flex-col items-center gap-3">
        <p className="text-xs font-semibold tracking-widest text-white/60 uppercase">2. Power</p>
        <p className="font-['Bebas_Neue'] text-4xl leading-none tracking-wide text-white tabular-nums">{percent}%</p>
        <input
          type="range"
          min={Math.round(MIN_POWER * 100)}
          max={100}
          value={Math.max(Math.round(MIN_POWER * 100), percent)}
          disabled={disabled}
          onChange={(event) => onPower(Number(event.target.value) / 100)}
          aria-label="Power of the shot"
          className="pool-power w-full"
          style={{ '--power': `${percent}%` }}
        />
        <button
          type="button"
          onClick={onShoot}
          disabled={disabled || busy}
          className="min-h-12 w-full cursor-pointer rounded-xl bg-gradient-to-r from-[#c2185b] to-[#7b2ff7] px-6 text-lg font-bold text-white shadow-[0_0_24px_rgba(194,24,91,0.45)] transition hover:brightness-110 disabled:cursor-default disabled:opacity-40"
        >
          {busy ? 'Shooting…' : 'Shoot'}
        </button>
      </div>
    </div>
  )
}
