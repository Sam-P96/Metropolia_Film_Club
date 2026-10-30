import { useState } from 'react'
import { Link } from 'react-router-dom'

import CoinIcon from './CoinIcon'
import BannerStrip from '../profile/BannerStrip'
import MemberAvatar from '../profile/MemberAvatar'
import useApi from '../../hooks/useApi'
import { getPpLeaderboard } from '../../services/wallet'

const COLLAPSED = 4

// The members with the most points, at the bottom of the Games page, laid
// out like the Critics Leaderboard on Movie Reviews. PP and P-PP count
// together and show as one PP total. Shows the top 4, and "Show Top 10"
// lengthens it to 10. The server never sends more than that.
export default function PpLeaderboard() {
  const [expanded, setExpanded] = useState(false)
  const { data, loading } = useApi(getPpLeaderboard, [])
  const leaders = data ?? []
  const shown = expanded ? leaders : leaders.slice(0, COLLAPSED)

  return (
    <section className="relative border-t border-white/10 py-16 text-white">
      <div className="pointer-events-none absolute inset-0 bg-black/50" />
      <div className="relative mx-auto max-w-6xl px-8">
        <h2 className="text-sm font-semibold tracking-widest text-brand-gold uppercase">PP Leaderboard</h2>

        {loading ? (
          <p className="mt-8 text-sm text-white/40">Loading…</p>
        ) : leaders.length === 0 ? (
          <p className="mt-8 text-white/60">Nobody has any PP yet.</p>
        ) : (
          <ol className="mt-8 divide-y divide-white/5 overflow-hidden rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm">
            {shown.map((leader, index) => (
              <li key={leader.user._id}>
                <Link
                  to={`/users/${leader.user._id}`}
                  className="group relative isolate flex items-center gap-4 px-5 py-4 transition-colors hover:bg-white/5"
                >
                  <BannerStrip banner={leader.user.reviewCardBanner} />

                  <span className={`w-6 shrink-0 text-right text-lg font-bold tabular-nums ${index < 3 ? 'text-brand-gold' : 'text-white/40'}`}>
                    {index + 1}
                  </span>

                  <MemberAvatar user={leader.user} rank={index + 1} />

                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium drop-shadow transition-colors group-hover:text-brand-gold">{leader.user.username}</p>
                    <p className="truncate text-xs text-white/60 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">{leader.user.memberTitle}</p>
                  </div>

                  <p className="flex shrink-0 items-center gap-1.5 text-sm font-semibold tabular-nums text-emerald-300">
                    <CoinIcon kind="pp" size={16} />
                    {leader.pp.toLocaleString('en-US')} PP
                  </p>
                </Link>
              </li>
            ))}
          </ol>
        )}

        {leaders.length > COLLAPSED && (
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
