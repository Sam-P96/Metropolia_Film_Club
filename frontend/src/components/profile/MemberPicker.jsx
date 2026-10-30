import { useState } from 'react'
import MemberAvatar from './MemberAvatar'
import useApi from '../../hooks/useApi'
import { getUsers } from '../../services/users'
import { getCurrentUserId } from '../../utils/currentUser'

// How many members the search lists at once.
const SHOWN = 6

// Finding another member by name: type part of it, then pick from the list.
// Never lists the logged-in member. `onPick(member)` gets the one picked.
export default function MemberPicker({ label, onPick }) {
  const me = getCurrentUserId()
  const { data: members = [] } = useApi(getUsers, [])
  const [query, setQuery] = useState('')

  const search = query.trim().toLowerCase()
  const found = search
    ? members.filter((member) => member._id !== me && member.username.toLowerCase().includes(search)).slice(0, SHOWN)
    : []

  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-2">
        <span className="text-xs uppercase tracking-widest text-white/60">{label}</span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Type a member's name"
          className="rounded-xl border border-white/20 bg-ink/60 px-3 py-2 text-white placeholder:text-white/40 focus-visible:outline-2 focus-visible:outline-brand-gold"
        />
      </label>

      {search && found.length === 0 && <p className="animate-slide-in text-sm text-white/50 motion-reduce:animate-none">Nobody by that name.</p>}

      {/* Each name slides in a moment after the one above. A name already
          showing stays put as you keep typing; only new ones slide in. */}
      {found.length > 0 && (
        <ul className="flex flex-col gap-1">
          {found.map((member, index) => (
            <li key={member._id} className="animate-slide-in motion-reduce:animate-none" style={{ animationDelay: `${index * 35}ms` }}>
              <button
                type="button"
                onClick={() => {
                  setQuery('')
                  onPick(member)
                }}
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
