import { Link, useParams } from 'react-router-dom'

import BannerStrip from '../components/profile/BannerStrip'
import MemberAvatar from '../components/profile/MemberAvatar'
import usePagedList from '../hooks/usePagedList'
import { getFollowList } from '../services/users'

// A member's followers ('followers') or the members they follow
// ('following'), newest first, in the Critics Leaderboard's style, 10 at a
// time. Their "Who can see your followers" setting decides who gets in.
function FollowList({ kind }) {
  const { userId } = useParams()
  const list = usePagedList((skip) => getFollowList(userId, kind, skip), [userId, kind], 'users')

  if (list.loading) {
    return <section className="px-8 py-24 text-center text-white/50">Loading…</section>
  }

  if (!list.data) {
    return (
      <section className="mx-auto max-w-3xl px-8 py-24 text-white">
        <h1 className="text-3xl font-bold">
          {list.error?.status === 403 ? 'This list is private' : "Couldn't load this list"}
        </h1>
        <p className="mt-3 text-white/60">
          {list.error?.status === 403
            ? list.error.message
            : list.error?.status === 404
              ? 'There is no member with that id.'
              : 'Something went wrong on our end. Try refreshing the page.'}
        </p>
        <Link
          to={`/users/${userId}`}
          className="mt-6 inline-block text-sm font-medium text-brand-gold transition-colors hover:text-white"
        >
          ← Back to their profile
        </Link>
      </section>
    )
  }

  const { owner, access, users, total, hasMore } = list.data
  const title = kind === 'followers' ? `${owner.username}'s followers` : `Who ${owner.username} follows`

  return (
    <section className="text-white">
      <div className="mx-auto max-w-6xl px-8 py-20">
        <Link
          to={`/users/${owner._id}`}
          className="text-sm font-medium text-brand-gold transition-colors hover:text-white"
        >
          ← Back to {owner.username}
        </Link>

        <h1 className="mt-6 text-3xl font-bold">{title}</h1>
        <p className="mt-2 text-sm text-white/50">
          {access === 'self'
            ? `${owner.username} keeps this list private. As friends, you can see yourself on it.`
            : `${total} ${total === 1 ? 'member' : 'members'}`}
        </p>

        {users.length === 0 ? (
          <p className="mt-8 text-white/60">
            {kind === 'followers' ? 'No followers yet.' : "Not following anyone yet."}
          </p>
        ) : (
          <ol className="mt-8 divide-y divide-white/5 overflow-hidden rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm">
            {users.map((user) => (
              <li key={user._id}>
                <Link
                  to={`/users/${user._id}`}
                  className="group relative isolate flex items-center gap-4 px-5 py-4 transition-colors hover:bg-white/5"
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

export default FollowList
