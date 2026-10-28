import { useState } from 'react'
import { Link } from 'react-router-dom'

import PillToggle from '../PillToggle'
import MemberAvatar from '../profile/MemberAvatar'
import useApi from '../../hooks/useApi'
import { getCritics } from '../../services/films'
import BannerStrip from '../profile/BannerStrip'

const MODES = [
  {
    value: 'top',
    label: 'Top',
    total: 'likes',
    noun: ['like', 'likes'],
    color: 'text-emerald-300',
    empty: "Nobody's reviews have been liked yet.",
  },
  {
    value: 'controversial',
    label: 'Controversial',
    total: 'dislikes',
    noun: ['dislike', 'dislikes'],
    color: 'text-red-300',
    empty: "Nobody's reviews have been disliked yet.",
  },
]

const COLLAPSED = 4

// The members whose reviews have collected the most likes (Top) or dislikes
// (Controversial). Shows the top 4, and "Show top 10" lengthens it to 10.
// The server never sends more than that.
function CriticsLeaderboard() {
  const [mode, setMode] = useState('top')
  const [expanded, setExpanded] = useState(false)

  // Both load up front, so the toggle switches straight away.
  const lists = {
    top: useApi(() => getCritics('top'), []),
    controversial: useApi(() => getCritics('controversial'), []),
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
          <ol className="mt-8 divide-y divide-white/5 overflow-hidden rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm">
            {shown.map((critic, index) => {
              const total = critic[current.total]

              return (
                <li key={critic.user._id}>
                  <Link
                    to={`/users/${critic.user._id}`}
                    className="group relative isolate flex items-center gap-4 px-5 py-4 transition-colors hover:bg-white/5"
                  >
                    <BannerStrip banner={critic.user.reviewCardBanner} />

                    <span
                      className={`w-6 shrink-0 text-right text-lg font-bold tabular-nums ${
                        index < 3 ? 'text-brand-gold' : 'text-white/40'
                      }`}
                    >
                      {index + 1}
                    </span>

                    {/* The top 3 always get their ring here, whatever their
                        "Ranking" setting says about their review cards. */}
                    <MemberAvatar user={critic.user} rank={index + 1} />

                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium drop-shadow transition-colors group-hover:text-brand-gold">
                        {critic.user.username}
                      </p>
                      <p className="truncate text-xs text-white/60 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                        {critic.user.memberTitle} · Level {critic.user.level} · {critic.reviews}{' '}
                        {critic.reviews === 1 ? 'review' : 'reviews'}
                      </p>
                    </div>

                    <p className={`shrink-0 text-sm font-semibold tabular-nums ${current.color}`}>
                      {total} {current.noun[total === 1 ? 0 : 1]}
                    </p>
                  </Link>
                </li>
              )
            })}
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
