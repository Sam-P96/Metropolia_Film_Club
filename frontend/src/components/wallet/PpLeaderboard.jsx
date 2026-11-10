import { useState } from 'react'

import CoinIcon from './CoinIcon'
import LeaderboardRow from '../leaderboard/LeaderboardRow'
import { edgeOf } from '../leaderboard/edges'
import usePagedList from '../../hooks/usePagedList'
import { getPpLeaderboard } from '../../services/wallet'

const COLLAPSED = 4

const BUTTON =
  'rounded-md border border-white/20 bg-white/5 px-4 py-2 text-sm font-medium text-white transition-colors hover:border-brand-gold/60 hover:bg-white/10 disabled:cursor-wait disabled:opacity-60'

// The members with the most points, at the bottom of the Games page, laid
// out like the Critics Leaderboard on Movie Reviews. PP and P-PP count
// together and show as one PP total; a member in debt shows it below 0, in
// red, like "-525 PP". Shows the top 4, "Show Top 10" lengthens it to 10,
// and "Load more" adds 10 at a time, down to the top 100 (the most the
// server sends).
export default function PpLeaderboard() {
  const [expanded, setExpanded] = useState(false)
  const board = usePagedList(getPpLeaderboard, [], 'leaders')
  const leaders = board.data?.leaders ?? []
  const shown = expanded ? leaders : leaders.slice(0, COLLAPSED)

  return (
    <section className="relative border-t border-white/10 py-16 text-white">
      <div className="pointer-events-none absolute inset-0 bg-black/50" />
      <div className="relative mx-auto max-w-6xl px-8">
        <h2 className="text-sm font-semibold tracking-widest text-brand-gold uppercase">PP Leaderboard</h2>

        {board.loading ? (
          <p className="mt-8 text-sm text-white/40">Loading…</p>
        ) : leaders.length === 0 ? (
          <p className="mt-8 text-white/60">Nobody has any PP yet.</p>
        ) : (
          <ol className="mt-8 divide-y divide-white/5 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm">
            {shown.map((leader, index) => (
              <LeaderboardRow
                key={leader.user._id}
                user={leader.user}
                position={index + 1}
                edge={edgeOf(index, shown.length)}
                score={
                  <p
                    className={`flex shrink-0 items-center gap-1.5 text-sm font-semibold tabular-nums ${leader.pp < 0 ? 'text-red-300' : 'text-emerald-300'}`}
                  >
                    <CoinIcon kind="pp" size={16} />
                    {leader.pp.toLocaleString('en-US')} PP
                  </p>
                }
              />
            ))}
          </ol>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-3">
          {leaders.length > COLLAPSED && (
            <button type="button" onClick={() => setExpanded(!expanded)} aria-expanded={expanded} className={BUTTON}>
              {expanded ? 'Show Top 4' : 'Show Top 10'}
            </button>
          )}
          {expanded && board.data?.hasMore && (
            <button type="button" onClick={board.loadMore} disabled={board.loadingMore} className={BUTTON}>
              {board.loadingMore ? 'Loading…' : 'Load more'}
            </button>
          )}
          {board.moreError && <p className="text-sm text-red-300">{board.moreError}</p>}
        </div>
      </div>
    </section>
  )
}
