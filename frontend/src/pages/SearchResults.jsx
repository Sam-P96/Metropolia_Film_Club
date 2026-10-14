import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import EventListItem from '../components/events/EventListItem'
import FilmCard from '../components/films/FilmCard'
import MemberCard from '../components/profile/MemberCard'
import useSearchResults, { filmsStatusText } from '../hooks/useSearchResults'
import { eventsPageUrl, filmsPageUrl, membersPageUrl } from '../utils/search'

// Twice what the nav dropdown shows. The "show all" links cover the rest.
const PER_SECTION = 6

// Where pressing Enter in the nav search lands: the same four groups as the
// dropdown, with room for more of each.
function SearchResults() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { query, upcoming, past, members, films, eventsLoading, usersLoading } = useSearchResults(
    searchParams.get('q') ?? ''
  )

  const handleSearch = (next) => {
    setSearchParams(next ? { q: next } : {})
  }

  return (
    <section className="text-white">
      <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-20">

        <p className="text-sm font-semibold tracking-widest text-brand-gold uppercase">
          Search
        </p>

        <h1 className="mt-3 text-4xl font-bold break-words sm:text-5xl">
          {query ? (
            <>
              Results for <span className="text-brand-gold">“{query}”</span>
            </>
          ) : (
            'Search the club'
          )}
        </h1>

        <div className="mt-4 mb-8 h-1 w-10 rounded-full bg-brand-gold" />

        {/* Keyed by the query so it refills when the nav search changes the
            URL while this page is already open. */}
        <SearchForm key={query} initial={query} onSearch={handleSearch} />

        {!query ? (
          <p className="mt-10 text-white/50">
            Type something to search films, events and members.
          </p>
        ) : (
          <div className="mt-12 space-y-14">
            <ResultSection
              title="Upcoming events"
              total={eventsLoading ? null : upcoming.length}
              showAllTo={eventsPageUrl(query)}
              emptyText={eventsLoading ? 'Searching...' : 'No upcoming events match.'}
            >
              <ul className="grid gap-5 sm:grid-cols-2">
                {upcoming.slice(0, PER_SECTION).map((event) => (
                  <EventListItem key={event._id} event={event} />
                ))}
              </ul>
            </ResultSection>

            <ResultSection
              title="Movies"
              total={films.loading || films.tooShort ? null : films.total}
              showAllTo={filmsPageUrl(query)}
              emptyText={filmsStatusText(films)}
            >
              <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-6">
                {films.list.slice(0, PER_SECTION).map((film) => (
                  <FilmCard key={film.tmdbId} film={film} />
                ))}
              </div>
            </ResultSection>

            <ResultSection
              title="Users"
              total={usersLoading ? null : members.length}
              showAllTo={membersPageUrl(query)}
              emptyText={usersLoading ? 'Searching...' : 'No members match.'}
            >
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {members.slice(0, PER_SECTION).map((user) => (
                  <li key={user._id}>
                    <MemberCard user={user} />
                  </li>
                ))}
              </ul>
            </ResultSection>

            <ResultSection
              title="Past events"
              muted
              total={eventsLoading ? null : past.length}
              showAllTo={eventsPageUrl(query, '#past')}
              emptyText={eventsLoading ? 'Searching...' : 'No past events match.'}
            >
              <ul className="grid gap-5 sm:grid-cols-2">
                {past.slice(0, PER_SECTION).map((event) => (
                  <EventListItem key={event._id} event={event} past />
                ))}
              </ul>
            </ResultSection>
          </div>
        )}

      </div>
    </section>
  )
}

function SearchForm({ initial, onSearch }) {
  const [value, setValue] = useState(initial)

  const handleSubmit = (e) => {
    e.preventDefault()
    onSearch(value.trim())
  }

  return (
    <form onSubmit={handleSubmit} role="search" className="flex max-w-xl gap-3">
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search films, events, members..."
        aria-label="Search films, events and members"
        className="w-full rounded-md border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition-colors placeholder:text-white/30 focus:border-brand-gold/60 focus:bg-white/10"
      />
      <button
        type="submit"
        className="shrink-0 rounded-md bg-brand-red px-6 py-3 font-medium text-white transition-colors hover:bg-brand-orange"
      >
        Search
      </button>
    </form>
  )
}

// total is null while the count isn't known yet (films still loading).
function ResultSection({ title, total, showAllTo, emptyText, muted = false, children }) {
  return (
    <section>
      <div className="mb-6 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-b border-white/10 pb-3">
        <h2
          className={`text-sm font-semibold tracking-widest uppercase ${
            muted ? 'text-white/40' : 'text-brand-gold'
          }`}
        >
          {title}
          {total != null && ` (${total.toLocaleString('en-GB')})`}
        </h2>

        {total > 0 && (
          <Link
            to={showAllTo}
            className="text-sm font-medium text-brand-gold transition-colors hover:text-white"
          >
            Show all results in {title} →
          </Link>
        )}
      </div>

      {total ? children : <p className="text-white/50">{emptyText}</p>}
    </section>
  )
}

export default SearchResults
