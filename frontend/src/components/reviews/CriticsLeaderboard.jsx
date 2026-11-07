import { useState } from 'react'

import PillToggle from '../PillToggle'
import LeaderboardRow from '../leaderboard/LeaderboardRow'
import { edgeOf } from '../leaderboard/edges'
import useApi from '../../hooks/useApi'
import { getCritics } from '../../services/films'

// What each view ranks by, and what it shows on the right of each row.
const count = (total, one, many) => `${total} ${total === 1 ? one : many}`

const MODES = [
  {
    value: 'top',
    label: 'Top',
    show: (critic) => count(critic.likes, 'like', 'likes'),
    color: 'text-emerald-300',
    empty: "Nobody's reviews have been liked yet.",
  },
  {
    value: 'controversial',
    label: 'Controversial',
    show: (critic) => count(critic.dislikes, 'dislike', 'dislikes'),
    color: 'text-red-300',
    empty: "Nobody's reviews have been disliked yet.",
  },
  {
    value: 'level',
    label: 'Level',
    show: (critic) => `Level ${critic.user.level}`,
    color: 'text-brand-gold',
    empty: 'Nobody has reached level 1 yet.',
  },
]

const COLLAPSED = 4

// The members whose reviews have collected the most likes (Top) or dislikes
// (Controversial), or with the highest level (Level). Shows the top 4, and
// "Show top 10" lengthens it to 10. The server never sends more than that.
function CriticsLeaderboard() {
  const [mode, setMode] = useState('top')
  const [expanded, setExpanded] = useState(false)

  // Both load up front, so the toggle switches straight away.
  const lists = {
    top: useApi(() => getCritics('top'), []),
    controversial: useApi(() => getCritics('controversial'), []),
    level: useApi(() => getCritics('level'), []),
  }

  const current = MODES.find((option) => option.value === mode)
  const { data, loading } = lists[mode]
  const critics = data ?? []
  const shown = expanded ? critics : critics.slice(0, COLLAPSED)

  return (
    <section className="relative border-t border-white/10 py-16 text-white">
      <div className="pointer-events-none absolute inset-0 bg-black/50" />
      <div className="relative mx-auto max-w-6xl px-8">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <h2 className="text-sm font-semibold tracking-widest text-brand-gold uppercase">
            Critics Leaderboard
          </h2>

          <PillToggle options={MODES} value={mode} onChange={setMode} label="Rank critics by" />
        </div>

        {loading ? (
          <p className="mt-8 text-sm text-white/40">Loading…</p>
        ) : critics.length === 0 ? (
          <p className="mt-8 text-white/60">{current.empty}</p>
        ) : (
          <ol className="mt-8 divide-y divide-white/5 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm">
            {/* The top 3 always get their ring here, whatever their
                "Ranking" setting says about their review cards (unless
                they wear a border, which takes its place). */}
            {shown.map((critic, index) => (
              <LeaderboardRow
                key={critic.user._id}
                user={critic.user}
                position={index + 1}
                edge={edgeOf(index, shown.length)}
                subtitle={`${critic.user.memberTitle} · Level ${critic.user.level} · ${critic.reviews} ${critic.reviews === 1 ? 'review' : 'reviews'}`}
                score={<p className={`shrink-0 text-sm font-semibold tabular-nums ${current.color}`}>{current.show(critic)}</p>}
              />
            ))}
          </ol>
        )}

        {critics.length > COLLAPSED && (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            aria-expanded={expanded}
            className="mt-5 rounded-md border border-white/20 bg-white/5 px-4 py-2 text-sm font-medium text-white transition-colors hover:border-brand-gold/60 hover:bg-white/10"
          >
            {expanded ? 'Show Top 4' : 'Show Top 10'}
          </button>
        )}
      </div>
    </section>
  )
}

export default CriticsLeaderboard
