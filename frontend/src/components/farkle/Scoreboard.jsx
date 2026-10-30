import { formatPoints } from '../../../../shared/farkle/rules.js'

// One card per player: name, score, and a bar for how close they are to
// the winning score. Gold border for whoever's turn it is, green for the
// winner.
export default function Scoreboard({ players, scores, current, winner, target, over }) {
  return (
    <section aria-label="Scores" className="grid grid-cols-2 gap-3">
      {players.map((name, i) => {
        const active = !over && current === i
        const won = winner === i
        const border = won ? 'border-green-400' : active ? 'border-brand-gold' : 'border-white/10'

        return (
          <div key={name} className={`flex min-w-0 flex-col gap-1.5 rounded-2xl border bg-plum/40 px-4 py-3 shadow-xl shadow-black/40 backdrop-blur-md ${border}`}>
            <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-widest text-white/60">
              <span className="truncate">{name}</span>
              {active && <span className="rounded-full bg-brand-gold px-2 text-[11px] text-ink">to play</span>}
              {won && <span className="rounded-full bg-green-400 px-2 text-[11px] text-ink">winner</span>}
            </div>
            <div className="text-3xl font-bold tabular-nums text-white">{formatPoints(scores[i])}</div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full bg-brand-gold transition-[width] duration-500"
                style={{ width: `${Math.min(100, (scores[i] / target) * 100)}%` }}
              />
            </div>
          </div>
        )
      })}
    </section>
  )
}