import { useState } from 'react'
import MemberAvatar from '../profile/MemberAvatar'
import TermsPicker from './TermsPicker'
import useApi from '../../hooks/useApi'
import { getUsers } from '../../services/users'
import { getStakeLimit, sendChallenge } from '../../services/farkle'
import { getCurrentUserId } from '../../utils/currentUser'
import { stakeHint } from '../../utils/farkle'

// How many members the search lists at once.
const SHOWN = 6

// Challenging another member: find them by name, then pick the winning
// score and the stake (up to what the poorer of the two has). Any member
// can be challenged, whatever their PvP setting. `onSent(match)` gets the
// new challenge.
export default function ChallengeForm({ onSent }) {
  const me = getCurrentUserId()
  const { data: members = [] } = useApi(getUsers, [])
  const [query, setQuery] = useState('')
  const [opponent, setOpponent] = useState(null)
  const [max, setMax] = useState(null)
  const [target, setTarget] = useState(4000)
  const [stakeText, setStakeText] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  const search = query.trim().toLowerCase()
  const found = search
    ? members.filter((member) => member._id !== me && member.username.toLowerCase().includes(search)).slice(0, SHOWN)
    : []

  const pick = (member) => {
    setOpponent(member)
    setQuery('')
    setMax(null)
    setError('')
    getStakeLimit(member._id)
      .then((limit) => {
        setMax(limit.max)
        setStakeText(String(Math.min(100, limit.max)))
      })
      .catch((limitError) => setError(limitError.message))
  }

  const send = async () => {
    setSending(true)
    setError('')
    try {
      const match = await sendChallenge({ opponent: opponent._id, target, stake: Number(stakeText) })
      setOpponent(null)
      setMax(null)
      onSent?.(match)
    } catch (sendError) {
      setError(sendError.message)
    } finally {
      setSending(false)
    }
  }

  if (!opponent) {
    return (
      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-2">
          <span className="text-xs uppercase tracking-widest text-white/60">Who do you want to play?</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Type a member's name"
            className="rounded-xl border border-white/20 bg-ink/60 px-3 py-2 text-white placeholder:text-white/40 focus-visible:outline-2 focus-visible:outline-brand-gold"
          />
        </label>

        {search && found.length === 0 && <p className="text-sm text-white/50">Nobody by that name.</p>}

        {found.length > 0 && (
          <ul className="flex flex-col gap-1">
            {found.map((member) => (
              <li key={member._id}>
                <button
                  type="button"
                  onClick={() => pick(member)}
                  className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-2 py-2 text-left text-white transition-colors hover:bg-white/10"
                >
                  <MemberAvatar user={member} size="sm" />
                  <span className="min-w-0 truncate">{member.username}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <MemberAvatar user={opponent} size="sm" />
        <span className="min-w-0 truncate text-lg font-semibold text-white">{opponent.username}</span>
        <button type="button" onClick={() => setOpponent(null)} className="cursor-pointer text-sm text-brand-gold underline underline-offset-4">
          Someone else
        </button>
      </div>

      {max === null ? (
        !error && <p className="text-sm text-white/50">Checking what you can play for…</p>
      ) : (
        <>
          <TermsPicker target={target} onTarget={setTarget} stakeText={stakeText} onStakeText={setStakeText} max={max} />
          <button
            type="button"
            onClick={send}
            disabled={sending || Boolean(stakeHint(stakeText, max))}
            className="min-h-12 cursor-pointer rounded-xl bg-brand-gold px-4 font-bold text-ink transition hover:brightness-110 disabled:cursor-default disabled:opacity-40"
          >
            {sending ? 'Sending…' : `Challenge ${opponent.username}`}
          </button>
          <p className="text-sm text-white/50">
            Nothing is taken until they accept. They have three days to accept, decline or send new terms back, and whoever
            accepts rolls first.
          </p>
        </>
      )}

      {error && (
        <p role="alert" className="text-sm text-red-300">
          {error}
        </p>
      )}
    </div>
  )
}
