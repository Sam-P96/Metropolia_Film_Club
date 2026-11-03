import { useId, useState } from 'react'
import { Link } from 'react-router-dom'
import CoinIcon from '../wallet/CoinIcon'
import MemberAvatar from '../profile/MemberAvatar'
import usePagedList from '../../hooks/usePagedList'
import { getFriends } from '../../services/farkle'
import { formatPoints } from '../../../../shared/farkle/rules.js'
import ResonanceIcon from '../resonance/ResonanceIcon'

const SMALL_BUTTON = 'inline-flex min-h-10 shrink-0 items-center justify-center rounded-lg px-3 text-sm font-bold transition'

// What one friend's button says: Challenge, or where to find the challenge
// or game the two of them already have going (only one at a time), or why
// they can't be challenged.
function FriendAction({ friend, onChallenge }) {
  if (friend.match?.status === 'challenge') {
    return (
      <Link to={`/games/farkle/${friend.match._id}`} className={`${SMALL_BUTTON} border border-white/20 bg-white/5 text-white hover:border-brand-gold/60`}>
        Challenge open
      </Link>
    )
  }
  if (friend.match) {
    return (
      <Link to={`/games/farkle/${friend.match._id}`} className={`${SMALL_BUTTON} border border-white/20 bg-white/5 text-white hover:border-brand-gold/60`}>
        Your game
      </Link>
    )
  }
  if (friend.points === 0) {
    return (
      <button type="button" disabled className={`${SMALL_BUTTON} cursor-default border border-white/10 text-white/40`}>
        No points
      </button>
    )
  }
  return (
    <button
      type="button"
      onClick={() => onChallenge(friend)}
      className={`${SMALL_BUTTON} cursor-pointer bg-brand-gold text-ink hover:brightness-110`}
      aria-label={`Challenge ${friend.username}`}
    >
      Challenge
    </button>
  )
}

// "Challenge a friend", under "Challenge a member" in the lobby: a button
// that opens their friends (members they follow who follow them back), the
// most points first, five at a time, with Load more. Each with their
// picture and points (PP and P-PP together, shown as PP like the PP
// Leaderboard), and a Challenge button, which opens the challenge form on
// them (`onChallenge(friend)`). Loads again when `reloads` changes (after a
// challenge is sent, say), so their row says so.
export default function FriendList({ className, onChallenge, reloads }) {
  const [open, setOpen] = useState(false)
  const listId = useId()
  const friends = usePagedList(getFriends, [reloads], 'friends', { enabled: open })
  const rows = friends.data?.friends ?? []

  return (
    <section className={className}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls={listId}
        className="flex w-full cursor-pointer items-center justify-between gap-3 text-left"
      >
        <span className="font-['Cinzel'] text-xl text-brand-gold">Challenge a friend</span>
        <span aria-hidden="true" className={`text-white/60 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}>
          ▾
        </span>
      </button>

      {open && (
        <div id={listId} className="mt-4 animate-slide-in motion-reduce:animate-none">
          {friends.loading ? (
            <p className="text-sm text-white/50">Finding your friends…</p>
          ) : friends.error ? (
            <p role="alert" className="text-sm text-red-300">
              Couldn&apos;t load your friends: {friends.error.message}
            </p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-white/60">
              No friends yet. Friends are members you follow who follow you back.
            </p>
          ) : (
            <ul className="divide-y divide-white/10" aria-label="Your friends, the most points first">
              {rows.map((friend) => (
                <li key={friend._id} className="flex animate-slide-in items-center gap-3 py-3 motion-reduce:animate-none">
                  <Link to={`/users/${friend._id}`} className="shrink-0" aria-hidden="true" tabIndex={-1}>
                    <MemberAvatar user={friend} size="sm" />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <p className="flex min-w-0 items-center gap-1.5">
                      <Link to={`/users/${friend._id}`} className="truncate font-semibold text-white hover:text-brand-gold">
                        {friend.username}
                      </Link>
                      <ResonanceIcon userId={friend._id} />
                    </p>
                    <p className="flex items-center gap-1.5 text-sm font-semibold text-emerald-300 tabular-nums">
                      <CoinIcon kind="pp" size={14} /> {formatPoints(friend.points)} PP
                    </p>
                  </div>
                  <FriendAction friend={friend} onChallenge={onChallenge} />
                </li>
              ))}
            </ul>
          )}

          {friends.data?.hasMore && (
            <button
              type="button"
              onClick={friends.loadMore}
              disabled={friends.loadingMore}
              className="mt-3 rounded-md border border-white/20 bg-white/5 px-4 py-2 text-sm font-medium text-white transition-colors hover:border-brand-gold/60 hover:bg-white/10 disabled:cursor-wait disabled:opacity-60"
            >
              {friends.loadingMore ? 'Loading…' : 'Load more'}
            </button>
          )}
          {friends.moreError && <p className="mt-2 text-sm text-red-300">{friends.moreError}</p>}
        </div>
      )}
    </section>
  )
}
