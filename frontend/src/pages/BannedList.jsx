import { Link } from 'react-router-dom'

import BannerStrip from '../components/profile/BannerStrip'
import MemberAvatar from '../components/profile/MemberAvatar'
import usePagedList from '../hooks/usePagedList'
import { getBanned } from '../services/users'
import { lostRights } from '../utils/bans'

// Moderators and admins: every member with at least one ban, A to Z, in the
// Critics Leaderboard's style, with the rights each has lost. Their name
// opens their profile, where the Ban Hammer changes it.
function BannedList() {
  const list = usePagedList(getBanned, [], 'users')

  if (list.loading) {
    return <section className="px-8 py-24 text-center text-white/50">Loading…</section>
  }

  if (!list.data) {
    return (
      <section className="mx-auto max-w-3xl px-8 py-24 text-white">
        <h1 className="text-3xl font-bold">Banned list</h1>
        <p className="mt-3 text-white/60">
          {list.error?.status === 403
            ? 'Only moderators and admins can see the banned list.'
            : "Couldn't load the banned list. Try refreshing the page."}
        </p>
      </section>
    )
  }

  const { users, total, hasMore } = list.data

  return (
    <section className="text-white">
      <div className="mx-auto max-w-6xl px-8 py-20">
        <Link
          to="/account"
          className="text-sm font-medium text-brand-gold transition-colors hover:text-white"
        >
          ← Back to your profile
        </Link>

        <h1 className="mt-6 text-3xl font-bold">Banned list</h1>
        <p className="mt-2 text-sm text-white/50">
          {total} {total === 1 ? 'member has' : 'members have'} lost a right to the Ban Hammer.
          Open a profile to change it.
        </p>

        {users.length === 0 ? (
          <p className="mt-8 text-white/60">Nobody is banned from anything.</p>
        ) : (
          <ol className="mt-8 divide-y divide-white/5 overflow-hidden rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm">
            {users.map((user) => (
              <li key={user._id}>
                <Link
                  to={`/users/${user._id}`}
                  className="group relative isolate flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4 transition-colors hover:bg-white/5"
                >
                  <BannerStrip banner={user.reviewCardBanner} />

                  <MemberAvatar user={user} />

                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium drop-shadow transition-colors group-hover:text-brand-gold">
                      {user.username}
                    </p>
                    <p className="truncate text-xs text-white/60 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                      {user.memberTitle}
                    </p>
                  </div>

                  <ul className="flex flex-wrap justify-end gap-1.5" aria-label="Rights lost">
                    {lostRights(user.bans).map((right) => (
                      <li
                        key={right.key}
                        className="rounded-full border border-red-400/40 bg-red-500/15 px-2.5 py-0.5 text-xs text-red-200"
                      >
                        {right.label}
                      </li>
                    ))}
                  </ul>
                </Link>
              </li>
            ))}
          </ol>
        )}

        {hasMore && (
          <button
            type="button"
            onClick={list.loadMore}
            disabled={list.loadingMore}
            className="mt-5 rounded-md border border-white/20 bg-white/5 px-4 py-2 text-sm font-medium text-white transition-colors hover:border-brand-gold/60 hover:bg-white/10 disabled:cursor-wait disabled:opacity-60"
          >
            {list.loadingMore ? 'Loading…' : 'Load more'}
          </button>
        )}

        {list.moreError && <p className="mt-3 text-sm text-brand-red">{list.moreError}</p>}
      </div>
    </section>
  )
}

export default BannedList
