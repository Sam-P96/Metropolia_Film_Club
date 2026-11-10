import { QUIET_BUTTON } from '../steal/style'

const ROUND = `${QUIET_BUTTON} min-h-11 min-w-11 px-3 text-center text-lg`
const SPEEDS = [1, 2, 4]

const choice = (on) =>
  `cursor-pointer rounded-lg border px-2.5 py-1 text-center text-sm font-semibold tabular-nums transition-colors ${
    on ? 'border-brand-gold bg-brand-gold text-ink' : 'border-white/15 bg-white/5 text-white/70 hover:bg-white/10'
  }`

// Under the board while watching a replay (hooks/useGomokuReplay.js): which
// move it's on and whose, a slider through the whole game, the start, back,
// play or pause, forward and end buttons, the speed, and Close.
export default function ReplayControls({ replay, names, onClose }) {
  const { step, total, playing } = replay
  const mover = step > 0 ? names[replay.shown[step - 1].seat] : null

  return (
    <section className="flex flex-col items-center gap-3 rounded-2xl border border-brand-gold/40 bg-ink/50 p-4 text-center" aria-label="Replay">
      <p className="text-lg font-semibold text-white" aria-live="polite">
        {step === 0 ? 'The empty board' : `Move ${step} of ${total}: ${mover}`}
      </p>
      <input
        type="range"
        min={0}
        max={total}
        value={step}
        onChange={(event) => replay.goTo(Number(event.target.value))}
        aria-label="Move"
        className="w-full max-w-md accent-brand-gold"
      />
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button type="button" onClick={() => replay.goTo(0)} disabled={step === 0} className={ROUND} aria-label="To the start">
          ⏮
        </button>
        <button type="button" onClick={replay.back} disabled={step === 0} className={ROUND} aria-label="Back one move">
          ◀
        </button>
        <button type="button" onClick={playing ? replay.pause : replay.play} className={`${ROUND} min-w-24`}>
          {playing ? 'Pause' : step >= total ? 'Again' : 'Play'}
        </button>
        <button type="button" onClick={replay.forward} disabled={step >= total} className={ROUND} aria-label="Forward one move">
          ▶
        </button>
        <button type="button" onClick={() => replay.goTo(total)} disabled={step >= total} className={ROUND} aria-label="To the end">
          ⏭
        </button>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <span className="text-xs uppercase tracking-widest text-white/50">Speed</span>
        {SPEEDS.map((speed) => (
          <button key={speed} type="button" aria-pressed={replay.speed === speed} onClick={() => replay.setSpeed(speed)} className={choice(replay.speed === speed)}>
            {speed}×
          </button>
        ))}
      </div>
      <button type="button" onClick={onClose} className="cursor-pointer text-sm text-white/60 underline underline-offset-4 hover:text-white">
        Close the replay
      </button>
    </section>
  )
}
