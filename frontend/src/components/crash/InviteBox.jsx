import { useState } from 'react'
import { Link } from 'react-router-dom'
import GlassBox from './GlassBox'
import CoinIcon from '../wallet/CoinIcon'
import MemberAvatar from '../profile/MemberAvatar'
import MemberPicker from '../profile/MemberPicker'
import ResonanceIcon from '../resonance/ResonanceIcon'
import usePagedList from '../../hooks/usePagedList'
import { getCrashFriends } from '../../services/crash'
import { formatPoints } from '../../../../shared/farkle/rules.js'

const SMALL_BUTTON = 'inline-flex min-h-10 shrink-0 items-center justify-center rounded-lg px-3 text-sm font-bold transition'

// Invite, over the game screen (pages/Crash.jsx): find any member by name,
// or pick from your friends (members you follow who follow you back), the
// most points first, five at a time, like Farkle's "Challenge a friend".
// Each one invited gets a notification with Play and Spectate (backend:
// games/crash/rooms.js invite). `onInvite(userId)` sends it (useCrash's
// invite), and `onClose` closes the box.
export default function InviteBox({ onInvite, onClose }) {
  const friends = usePagedList(getCrashFriends, [], 'friends')
  const rows = friends.data?.friends ?? []
  // Who's been invited while the box was open, and what came back.
  const [invited, setInvited] = useState(() => new Set())
  const [sending, setSending] = useState(null)
  const [said, setSaid] = useState(null)

  const invite = async (member) => {
    setSending(member._id)
    setSaid(null)
    try {
      await onInvite(member._id)
      setInvited((previous) => new Set(previous).add(member._id))
      setSaid({ ok: true, text: `Invited ${member.username}. They'll get a notification to play or spectate.` })
    } catch (problem) {
      setSaid({ ok: false, text: problem.message })
    } finally {
      setSending(null)
    }
  }

  return (
    <GlassBox title="Invite to this room" onClose={onClose}>
      <MemberPicker label="Find a member" onPick={invite} />

      {said && (
        <p role="status" className={`animate-slide-in rounded-xl px-3 py-2 text-sm motion-reduce:animate-none ${said.ok ? 'bg-[#1FD18B]/15 text-[#B8FFE0]' : 'bg-red-500/15 text-red-200'}`}>
          {said.text}
        </p>
      )}

      <section aria-labelledby="crash-invite-friends" className="flex flex-col gap-1">
        <h3 id="crash-invite-friends" className="text-xs tracking-widest text-white/60 uppercase">
          Your friends
        </h3>
        {friends.loading ? (
          <p className="text-sm text-white/50">Finding your friends…</p>
        ) : friends.error ? (
          <p role="alert" className="text-sm text-red-300">
            Couldn&apos;t load your friends: {friends.error.message}
          </p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-white/60">No friends yet. Friends are members you follow who follow you back.</p>
        ) : (
          <ul className="divide-y divide-white/10" aria-label="Your friends, the most points first">
            {rows.map((friend) => {
              const done = friend.invited || invited.has(friend._id)
              return (
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
                  {friend.here ? (
                    <span className={`${SMALL_BUTTON} border border-white/15 text-white/60`}>In the room</span>
                  ) : done ? (
                    <span className={`${SMALL_BUTTON} border border-[#1FD18B]/40 text-[#B8FFE0]`}>Invited ✓</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => invite(friend)}
                      disabled={sending !== null}
                      aria-label={`Invite ${friend.username}`}
                      className={`${SMALL_BUTTON} cursor-pointer bg-brand-gold text-ink hover:brightness-110 disabled:cursor-wait disabled:opacity-60`}
                    >
                      {sending === friend._id ? 'Inviting…' : 'Invite'}
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        )}
        {friends.data?.hasMore && (
          <button
            type="button"
            onClick={friends.loadMore}
            disabled={friends.loadingMore}
            className="mt-1 self-start rounded-md border border-white/20 bg-white/5 px-4 py-2 text-sm font-medium text-white transition-colors hover:border-brand-gold/60 hover:bg-white/10 disabled:cursor-wait disabled:opacity-60"
          >
            {friends.loadingMore ? 'Loading…' : 'Load more'}
          </button>
        )}
        {friends.moreError && <p className="text-sm text-red-300">{friends.moreError}</p>}
      </section>
    </GlassBox>
  )
}
