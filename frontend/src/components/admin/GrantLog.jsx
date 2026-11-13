import { useState } from 'react'
import { Link } from 'react-router-dom'
import MemberAvatar from '../profile/MemberAvatar'
import CoinIcon from '../wallet/CoinIcon'
import useApi from '../../hooks/useApi'
import { getGrants } from '../../services/admin'
import { timeAgo } from '../../utils/timeAgo'

const format = (points) => Number(points).toLocaleString('en-US')

function Name({ user, fallback }) {
  if (!user) return <span className="font-semibold text-white/60">{fallback}</span>
  return (
    <Link to={`/users/${user._id}`} className="font-semibold text-white hover:text-brand-gold">
      {user.username}
    </Link>
  )
}

// Every P-PP send by every admin with the Send P-PP tool, newest first:
// who to, who by, how much and their note. 20 at a time, with Show more.
// It loads again from the top when `version` goes up (after a send).
export default function GrantLog({ version = 0 }) {
  const first = useApi(() => getGrants(), [version], { keepPrevious: true })
  // Pages past the first, for this `version` only: a new version starts
  // the list again from the top.
  const [extra, setExtra] = useState({ version, grants: [], hasMore: null })
  const [loadingMore, setLoadingMore] = useState(false)
  const [moreError, setMoreError] = useState('')

  const shown = extra.version === version ? extra : { grants: [], hasMore: null }
  const grants = [...(first.data?.grants ?? []), ...shown.grants]
  const hasMore = shown.hasMore ?? first.data?.hasMore ?? false

  const showMore = async () => {
    setLoadingMore(true)
    setMoreError('')
    try {
      const next = await getGrants(grants.at(-1)._id)
      setExtra({ version, grants: [...shown.grants, ...next.grants], hasMore: next.hasMore })
    } catch (failure) {
      setMoreError(failure.message)
    } finally {
      setLoadingMore(false)
    }
  }

  if (first.error) {
    return <p className="text-sm text-white/50">{first.error.status === 403 ? 'Only admins can see this.' : "The list of sends won't load."}</p>
  }
  if (!first.data) return <p className="text-sm text-white/50">Loading…</p>
  if (grants.length === 0) return <p className="text-sm text-white/50">Nothing sent yet.</p>

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col divide-y divide-white/10">
        {grants.map((grant) => {
          const self = grant.to && grant.by && grant.to._id === grant.by._id
          return (
            <li key={grant._id} className="flex items-start gap-3 py-2.5 text-sm">
              {grant.to ? <MemberAvatar user={grant.to} size="sm" /> : null}
              <div className="min-w-0 flex-1">
                <p className="text-white/80">
                  <Name user={grant.to} fallback="A former member" />
                  {self ? (
                    <span className="text-white/50"> · sent it to themselves</span>
                  ) : (
                    <span className="text-white/50">
                      {' '}
                      · by <Name user={grant.by} fallback="a former admin" />
                    </span>
                  )}
                </p>
                {grant.note && <p className="mt-0.5 break-words text-white/70 italic">&ldquo;{grant.note}&rdquo;</p>}
                <p className="text-xs text-white/40">{timeAgo(grant.at)}</p>
              </div>
              <span className="flex shrink-0 items-center gap-1 font-bold text-brand-gold tabular-nums">
                <CoinIcon kind="ppp" size={14} /> {format(grant.amount)}
              </span>
            </li>
          )
        })}
      </ul>
      {hasMore && (
        <button
          type="button"
          onClick={showMore}
          disabled={loadingMore}
          className="cursor-pointer self-start rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:border-brand-gold/60 hover:bg-white/10 disabled:opacity-50"
        >
          {loadingMore ? 'Loading…' : 'Show more'}
        </button>
      )}
      {moreError && <p className="text-sm text-red-300">{moreError}</p>}
    </div>
  )
}
