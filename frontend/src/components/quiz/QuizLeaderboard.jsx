import LeaderboardRow from '../leaderboard/LeaderboardRow'
import { edgeOf } from '../leaderboard/edges'
import { wheelColour } from './wheelColours'

const percent = (share) => `${(share * 100).toFixed(share < 0.1 ? 1 : 0)}%`

// The Quiz Leaderboard: this week's quiz points, most first, each member
// as every leaderboard shows them (banner, picture, border, name style),
// with their points and their chance in the draw. The chip beside each is
// their colour on the Quiz Wheel. With `limit` (the home page's slide),
// only the top that many, and the viewer's own row (`myId`) after them if
// they're further down, at their real place.
export default function QuizLeaderboard({ entries, limit = null, myId = null }) {
  if (entries.length === 0) return <p className="text-center text-white/60">Nobody has played this week yet.</p>

  const ranked = entries.map((entry, rank) => ({ ...entry, rank }))
  const shown = limit === null ? ranked : ranked.filter((entry) => entry.rank < limit || entry.user._id === myId)

  return (
    <ol className="divide-y divide-white/10 rounded-xl border border-white/10 bg-black/30 shadow-md shadow-black/20">
      {shown.map((entry, index) => (
        <LeaderboardRow
          key={entry.user._id}
          user={entry.user}
          position={entry.rank + 1}
          edge={edgeOf(index, shown.length)}
          score={
            <span className="flex shrink-0 items-center gap-2 text-right">
              <span aria-hidden="true" className="size-3 shrink-0 rounded-full" style={{ background: wheelColour(entry.rank) }} />
              <span className="flex flex-col items-end leading-tight">
                <span className="text-sm font-semibold tabular-nums text-white">
                  {entry.points} pt{entry.points === 1 ? '' : 's'}
                </span>
                <span className="text-xs tabular-nums text-white/60">{percent(entry.share)}</span>
              </span>
            </span>
          }
        />
      ))}
    </ol>
  )
}
