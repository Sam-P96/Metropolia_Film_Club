import BannerStrip from '../profile/BannerStrip'
import MemberAvatar from '../profile/MemberAvatar'
import { formatPoints } from '../../../../shared/farkle/rules.js'

// One card per player: name, score, and a bar for how close they are to
// the winning score. Gold border for whoever's turn it is, green for the
// winner. With `people` (each player's { username, avatarUrl,
// reviewCardBanner }, in the same order as `players`), each card also shows
// their avatar, with their review card banner behind it, as on the
// leaderboards.
export default function Scoreboard({ players, scores, current, winner, target, over, people }) {
  return (
    <section aria-label="Scores" className="grid grid-cols-2 gap-3">
      {players.map((name, i) => {
        const active = !over && current === i
        const won = winner === i
        const border = won ? 'border-green-400' : active ? 'border-brand-gold' : 'border-white/10'
        const person = people?.[i]

        return (
          <div
            key={name}
            className={`relative isolate flex min-w-0 flex-col gap-1.5 overflow-hidden rounded-2xl border bg-plum/40 px-4 py-3 shadow-xl shadow-black/40 backdrop-blur-md ${border}`}
          >
            {person?.reviewCardBanner && (
              <>
                <BannerStrip banner={person.reviewCardBanner} />
                {/* A little darker, so the score reads on any banner. */}
                <div className="pointer-events-none absolute inset-0 -z-10 bg-ink/35" />
              </>
            )}
            <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-widest text-white/70">
              {person && <MemberAvatar user={person} size="sm" />}
              <span className="truncate drop-shadow">{name}</span>
              {active && <span className="rounded-full bg-brand-gold px-2 text-[11px] text-ink">to play</span>}
              {won && <span className="rounded-full bg-green-400 px-2 text-[11px] text-ink">winner</span>}
            </div>
            <div className="text-3xl font-bold tabular-nums text-white drop-shadow">{formatPoints(scores[i])}</div>
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
