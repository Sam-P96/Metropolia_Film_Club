import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import MemberAvatar from '../profile/MemberAvatar'
import useSearchResults, { filmsStatusText } from '../../hooks/useSearchResults'
import { formatEventTime, formatShortDate } from '../../utils/eventDates'
import {
  eventsPageUrl,
  filmsPageUrl,
  membersPageUrl,
  searchPageUrl,
} from '../../utils/search'

// Each section shows this many, then a "show all" link to the full page.
const PER_SECTION = 3

// Wait for a pause in typing before hitting TMDB, instead of once per key.
const DEBOUNCE_MS = 300

// inline: the mobile menu, where results push the links below them down
// instead of floating over the page.
function GlobalSearch({ inline = false }) {
  const navigate = useNavigate()
  const containerRef = useRef(null)

  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)

  const { query: trimmed, upcoming, past, members, films } = useSearchResults(
    query,
    DEBOUNCE_MS
  )

  // Clicking anywhere else on the page closes the dropdown. pointerdown
  // rather than blur, because Safari doesn't focus links on click — closing
  // on blur would remove the link before its click lands.
  useEffect(() => {
    if (!open) return

    const onPointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) setOpen(false)
    }

    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!trimmed) return

    setOpen(false)
    navigate(searchPageUrl(trimmed))
  }

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') setOpen(false)
  }

  // Tabbing out of the results closes them too.
  const handleBlur = (event) => {
    if (event.relatedTarget && !containerRef.current?.contains(event.relatedTarget)) {
      setOpen(false)
    }
  }

  // Any result or "show all" link navigates away, so close behind it.
  const handleResultsClick = (event) => {
    if (event.target.closest('a')) setOpen(false)
  }

  const showResults = open && trimmed.length > 0

  return (
    <div
      ref={containerRef}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      className="relative"
    >
      <form onSubmit={handleSubmit} role="search" className="flex gap-3">
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search films, events, members..."
          aria-label="Search films, events and members"
          className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition-colors placeholder:text-white/40 focus:border-brand-gold/60 focus:bg-white/10"
        />
        <button
          type="submit"
          className="shrink-0 rounded-md bg-brand-red px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-orange"
        >
          Search
        </button>
      </form>

      {showResults && (
        <div
          onClick={handleResultsClick}
          aria-label="Search results"
          role="region"
          className={
            inline
              ? 'mt-3 max-h-[55vh] divide-y divide-white/10 overflow-y-auto rounded-xl border border-white/10 bg-white/5 scheme-dark'
              : 'absolute top-full right-0 left-0 z-10 mt-2 max-h-[75vh] min-w-88 divide-y divide-white/10 overflow-y-auto rounded-xl border border-white/10 bg-ink shadow-2xl shadow-black/60 scheme-dark'
          }
        >
          <Section
            title="Upcoming events"
            total={upcoming.length}
            showAllTo={eventsPageUrl(trimmed)}
            emptyText="No upcoming events match."
          >
            {upcoming.slice(0, PER_SECTION).map((event) => (
              <EventResult key={event._id} event={event} />
            ))}
          </Section>

          <Section
            title="Movies"
            total={films.total}
            showAllTo={filmsPageUrl(trimmed)}
            emptyText={filmsStatusText(films)}
          >
            {films.list.slice(0, PER_SECTION).map((film) => (
              <FilmResult key={film.tmdbId} film={film} />
            ))}
          </Section>

          <Section
            title="Users"
            total={members.length}
            showAllTo={membersPageUrl(trimmed)}
            emptyText="No members match."
          >
            {members.slice(0, PER_SECTION).map((user) => (
              <UserResult key={user._id} user={user} />
            ))}
          </Section>

          <Section
            title="Past events"
            muted
            total={past.length}
            showAllTo={eventsPageUrl(trimmed, '#past')}
            emptyText="No past events match."
          >
            {past.slice(0, PER_SECTION).map((event) => (
              <EventResult key={event._id} event={event} past />
            ))}
          </Section>

          <Link
            to={searchPageUrl(trimmed)}
            className="block px-5 py-3 text-center text-sm font-medium text-white/70 transition-colors hover:bg-white/5 hover:text-white"
          >
            See all results for “{trimmed}” <span className="text-white/40">(Enter)</span>
          </Link>
        </div>
      )}
    </div>
  )
}

function Section({ title, total, showAllTo, emptyText, muted = false, children }) {
  return (
    <section className="px-2 py-3">
      <h3
        className={`px-3 pb-2 text-xs font-semibold tracking-widest uppercase ${
          muted ? 'text-white/40' : 'text-brand-gold'
        }`}
      >
        {title}
      </h3>

      {total === 0 ? (
        <p className="px-3 py-1 text-sm text-white/40">{emptyText}</p>
      ) : (
        <>
          <ul>{children}</ul>
          <Link
            to={showAllTo}
            className="mt-1 block rounded-md px-3 py-2 text-sm font-medium text-brand-gold transition-colors hover:bg-white/5 hover:text-white"
          >
            Show all results in {title} ({total.toLocaleString('en-GB')}) →
          </Link>
        </>
      )}
    </section>
  )
}

const resultLinkClasses =
  'group flex items-center gap-3 rounded-md px-3 py-2 transition-colors hover:bg-white/5'

function EventResult({ event, past = false }) {
  return (
    <li>
      <Link to={`/club_events/${event._id}`} className={resultLinkClasses}>
        <div className="min-w-0">
          <p
            className={`truncate text-sm font-medium transition-colors group-hover:text-brand-gold ${
              past ? 'text-white/60' : 'text-white'
            }`}
          >
            {event.title}
          </p>
          <p className="truncate text-xs text-white/40">
            {formatShortDate(event.startsAt)} · {formatEventTime(event.startsAt)}
          </p>
        </div>
      </Link>
    </li>
  )
}

function FilmResult({ film }) {
  return (
    <li>
      <Link to={`/films/${film.tmdbId}`} className={resultLinkClasses}>
        {film.posterPath ? (
          <img
            src={`https://image.tmdb.org/t/p/w92${film.posterPath}`}
            alt=""
            className="h-12 w-8 shrink-0 rounded object-cover"
          />
        ) : (
          <div className="h-12 w-8 shrink-0 rounded bg-white/10" />
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-white transition-colors group-hover:text-brand-gold">
            {film.title}
          </p>
          {film.year && <p className="text-xs text-white/40">{film.year}</p>}
        </div>
      </Link>
    </li>
  )
}

function UserResult({ user }) {
  return (
    <li>
      <Link to={`/users/${user._id}`} className={resultLinkClasses}>
        <MemberAvatar user={user} size="sm" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-white transition-colors group-hover:text-brand-gold">
            {user.username}
          </p>
          <p className="truncate text-xs text-white/40">{user.memberTitle}</p>
        </div>
      </Link>
    </li>
  )
}

export default GlobalSearch
