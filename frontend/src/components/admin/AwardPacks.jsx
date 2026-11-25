import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import MemberAvatar from '../profile/MemberAvatar'
import { awardPack, getMembers } from '../../services/admin'
import { CATFLIX } from '../../../../shared/catflix/rules.js'

const GOLD = 'cursor-pointer rounded-lg bg-brand-gold px-3 py-1.5 text-sm font-bold text-ink transition hover:brightness-110 disabled:cursor-default disabled:opacity-50'
const QUIET = 'cursor-pointer rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-sm font-semibold text-white transition hover:border-brand-gold/60 hover:bg-white/10 disabled:opacity-50'
const FIELD = 'w-full rounded-lg border border-white/15 bg-ink/70 px-3 py-2 text-white placeholder:text-white/30 focus:border-brand-gold focus:outline-none'

// The packs, Black & Gold first: the one an event page awards.
const KINDS = ['blackGold', 'triple', 'single']
const packName = (kind) => CATFLIX.packs[kind].name.replace(/Pack$/, 'Spell Pack')

// One member's row: who, and Award, which asks first. Awarded ones say so
// (and how many this visit), and can be awarded again.
function MemberRow({ member, kind, given, onAwarded }) {
  const [asking, setAsking] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const award = async () => {
    setBusy(true)
    setError(null)
    try {
      await awardPack(member._id, kind)
      onAwarded(member._id)
      setAsking(false)
    } catch (failure) {
      setError(failure.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <li className="flex flex-wrap items-center gap-3 px-3 py-2.5">
      <Link to={`/users/${member._id}`} className="flex min-w-0 flex-1 items-center gap-3 hover:text-brand-gold">
        <MemberAvatar user={member} size="sm" />
        <span className="min-w-0">
          <span className="block truncate font-semibold">{member.username}</span>
          {member.memberTitle && <span className="block truncate text-xs text-white/45">{member.memberTitle}</span>}
        </span>
      </Link>
      {asking ? (
        <span className="flex flex-wrap items-center justify-end gap-2">
          <span className="text-sm text-white/75">
            A {packName(kind)} for {member.username}?
          </span>
          <button type="button" onClick={award} disabled={busy} className={GOLD}>
            {busy ? 'Awarding…' : 'Yes, award'}
          </button>
          <button type="button" onClick={() => setAsking(false)} disabled={busy} className={QUIET}>
            Cancel
          </button>
        </span>
      ) : (
        <button
          type="button"
          onClick={() => {
            setError(null)
            setAsking(true)
          }}
          className={given ? 'cursor-pointer rounded-lg border border-emerald-400/50 bg-emerald-500/15 px-3 py-1.5 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-500/25' : GOLD}
        >
          {given ? `Awarded${given > 1 ? ` ×${given}` : ''}` : 'Award'}
        </button>
      )}
      {error && <span className="w-full text-right text-sm text-red-300">{error}</span>}
    </li>
  )
}

// Award booster packs, in the admin panel: every member, A to Z (30 at a
// time, with Load more), narrowed by a search, each with an Award button for
// the pack picked above. They get it in Catflix No Chill and a notification
// to open it from (backend/utils/admin.js awardPackFromPanel).
export default function AwardPacks() {
  const [kind, setKind] = useState('blackGold')
  const [query, setQuery] = useState('')
  const [list, setList] = useState({ members: [], hasMore: false, loading: true, error: null })
  // Awards this visit, by member id.
  const [given, setGiven] = useState({})

  // The list for the search, a moment after typing stops.
  useEffect(() => {
    let stale = false
    const timer = setTimeout(() => {
      setList((now) => ({ ...now, loading: true, error: null }))
      getMembers(query.trim())
        .then((page) => !stale && setList({ ...page, loading: false, error: null }))
        .catch((failure) => !stale && setList({ members: [], hasMore: false, loading: false, error: failure.message }))
    }, 250)
    return () => {
      stale = true
      clearTimeout(timer)
    }
  }, [query])

  const more = () => {
    setList((now) => ({ ...now, loading: true }))
    getMembers(query.trim(), list.members.length)
      .then((page) => setList((now) => ({ members: [...now.members, ...page.members], hasMore: page.hasMore, loading: false, error: null })))
      .catch((failure) => setList((now) => ({ ...now, loading: false, error: failure.message })))
  }

  return (
    <div className="flex flex-col gap-4">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-xs tracking-widest text-white/60 uppercase">Which pack</legend>
        <div className="flex flex-wrap gap-2">
          {KINDS.map((key) => (
            <button
              key={key}
              type="button"
              aria-pressed={kind === key}
              onClick={() => setKind(key)}
              className={`cursor-pointer rounded-lg border px-3 py-1.5 text-sm ${kind === key ? 'border-brand-gold bg-brand-gold font-bold text-ink' : 'border-white/15 bg-white/5 text-white/80 hover:bg-white/10'}`}
            >
              {packName(key)} · {CATFLIX.packs[key].cards} {CATFLIX.packs[key].cards === 1 ? 'card' : 'cards'}
            </button>
          ))}
        </div>
      </fieldset>

      <label className="flex flex-col gap-1.5 text-sm font-medium text-white/80">
        Search members
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Any part of a username" className={FIELD} />
      </label>

      {list.error && <p className="text-sm text-red-300">{list.error}</p>}
      {!list.loading && !list.error && list.members.length === 0 && <p className="text-sm text-white/50">Nobody by that name.</p>}

      {list.members.length > 0 && (
        <ul className="max-h-[32rem] divide-y divide-white/5 overflow-y-auto rounded-xl border border-white/10 bg-black/20" aria-label="Members">
          {list.members.map((member) => (
            <MemberRow key={member._id} member={member} kind={kind} given={given[member._id] ?? 0} onAwarded={(id) => setGiven((now) => ({ ...now, [id]: (now[id] ?? 0) + 1 }))} />
          ))}
        </ul>
      )}

      {list.hasMore && (
        <button type="button" onClick={more} disabled={list.loading} className={`${QUIET} self-start`}>
          {list.loading ? 'Loading…' : 'Load more'}
        </button>
      )}
    </div>
  )
}
