import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import StarRating from '../components/reviews/StarRating'
import { getUser, getUserFilms } from '../services/users'
import useApi from '../hooks/useApi'
import { isWanted } from '../utils/watchlist'

const TABS = [
  { id: 'all', label: 'All Films' },
  { id: 'completed', label: 'Completed' },
  { id: 'watchlist', label: 'Plan to Watch / Rewatch' },
]

// The direction a column starts in when you first click it.
// A–Z reads naturally for titles; for scores and dates you almost always
// want the biggest or newest first.
const DEFAULT_DIRECTION = {
  title: 'asc',
  rating: 'desc',
  updatedAt: 'desc',
}

// The watchlist isn't a single status: it's films they haven't seen, plus
// films they have seen and want to see again.
function matchesTab(entry, tab) {
  if (tab === 'all') return true
  if (tab === 'completed') return entry.status === 'completed'
  return isWanted(entry)
}

function formatDate(isoString) {
  return new Date(isoString).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Europe/Helsinki',
  })
}

function sortEntries(entries, sortBy, sortDir) {
  return [...entries].sort((a, b) => {
    if (sortBy === 'rating') {
      const aUnrated = a.rating == null
      const bUnrated = b.rating == null

      // Unrated films always sink to the bottom, whichever way we're sorting
      if (aUnrated && bUnrated) return a.title.localeCompare(b.title)
      if (aUnrated) return 1
      if (bUnrated) return -1

      const diff = a.rating - b.rating
      return sortDir === 'asc' ? diff : -diff
    }

    const diff =
      sortBy === 'title'
        ? a.title.localeCompare(b.title)
        : new Date(a.updatedAt) - new Date(b.updatedAt)

    return sortDir === 'asc' ? diff : -diff
  })
}

function SortHeader({ label, column, sortBy, sortDir, onSort, className }) {
  const active = sortBy === column

  return (
    <th
      className={className}
      aria-sort={active ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <button
        type="button"
        onClick={() => onSort(column)}
        className={
          active
            ? 'flex items-center gap-1.5 text-xs font-semibold tracking-widest text-brand-gold uppercase'
            : 'flex items-center gap-1.5 text-xs font-semibold tracking-widest text-white/40 uppercase transition-colors hover:text-white'
        }
      >
        {label}
        <span className={active ? 'text-brand-gold' : 'text-white/20'}>
          {active ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}
        </span>
      </button>
    </th>
  )
}

function UserFilmList() {
  const { userId } = useParams()
  const [tab, setTab] = useState('all')
  const [sortBy, setSortBy] = useState('title')
  const [sortDir, setSortDir] = useState('asc')

  const profile = useApi(() => getUser(userId), [userId])
  const films = useApi(() => getUserFilms(userId), [userId])

  const profileUser = profile.data

  if (profile.loading) {
    return (
      <section className="px-8 py-24 text-center text-white/50">
        Loading…
      </section>
    )
  }

  if (!profileUser) {
    return (
      <section className="mx-auto max-w-3xl px-8 py-24 text-white">
        <h1 className="text-3xl font-bold">
          {profile.error?.status === 404 ? 'Member not found' : "Couldn't load this member"}
        </h1>
        <p className="mt-3 text-white/60">
          {profile.error?.status === 404
            ? 'There is no member with that id.'
            : 'Something went wrong on our end. Try refreshing the page.'}
        </p>
      </section>
    )
  }

  // The server leaves the details out of someone else's private profile,
  // and refuses their film list.
  if (profileUser.restricted) {
    return (
      <section className="mx-auto max-w-3xl px-8 py-24 text-white">
        <h1 className="text-3xl font-bold">{profileUser.username}</h1>
        <p className="mt-3 text-white/60">This profile is private.</p>
      </section>
    )
  }

  const handleSort = (column) => {
    if (column === sortBy) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(column)
      setSortDir(DEFAULT_DIRECTION[column])
    }
  }

  const userEntries = films.data ?? []

  const visible = userEntries.filter((entry) => matchesTab(entry, tab))

  const entries = sortEntries(visible, sortBy, sortDir)

  const counts = {}
  TABS.forEach((item) => {
    counts[item.id] = userEntries.filter((entry) => matchesTab(entry, item.id)).length
  })

  return (
    <section className="text-white">
      <div className="mx-auto max-w-5xl px-8 py-20">

        <div className="mb-8">
          <Link
            to={`/users/${profileUser._id}`}
            className="text-sm font-medium text-brand-gold transition-colors hover:text-white"
          >
            ← Back to profile
          </Link>

          <h1 className="mt-3 text-3xl font-bold">
            {profileUser.username}
            <span className="font-normal text-white/40">’s films</span>
          </h1>
        </div>

        <div className="mb-6 flex flex-wrap gap-2 border-b border-white/10 pb-4">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={
                tab === item.id
                  ? 'rounded-md border border-brand-gold/60 bg-white/10 px-4 py-2 text-sm font-medium text-brand-gold transition-colors'
                  : 'rounded-md border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/60 transition-colors hover:border-white/25 hover:text-white'
              }
            >
              {item.label}
              <span className="ml-2 text-xs text-white/40">{counts[item.id]}</span>
            </button>
          ))}
        </div>

        {entries.length === 0 ? (
          <p className="text-sm text-white/40">
            {films.loading
              ? 'Loading…'
              : films.error
                ? "Couldn't load this list. Try refreshing the page."
                : 'Nothing in this list yet.'}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm">
            <table className="w-full min-w-xl border-collapse text-left">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="w-12 px-4 py-3 text-xs font-semibold tracking-widest text-white/40 uppercase">
                    #
                  </th>
                  <th className="w-20 px-4 py-3 text-xs font-semibold tracking-widest text-white/40 uppercase">
                    Image
                  </th>

                  <SortHeader
                    label="Title"
                    column="title"
                    sortBy={sortBy}
                    sortDir={sortDir}
                    onSort={handleSort}
                    className="px-4 py-3"
                  />
                  <SortHeader
                    label="Score"
                    column="rating"
                    sortBy={sortBy}
                    sortDir={sortDir}
                    onSort={handleSort}
                    className="w-36 px-4 py-3"
                  />
                  <SortHeader
                    label="Updated"
                    column="updatedAt"
                    sortBy={sortBy}
                    sortDir={sortDir}
                    onSort={handleSort}
                    className="w-36 px-4 py-3"
                  />
                </tr>
              </thead>

              <tbody>
                {entries.map((entry, index) => {
                  const posterUrl = entry.posterPath
                    ? `https://image.tmdb.org/t/p/w92${entry.posterPath}`
                    : null

                  return (
                    <tr
                      key={entry._id}
                      className="border-b border-white/5 transition-colors last:border-0 hover:bg-white/5"
                    >
                      <td className="px-4 py-3 text-sm text-white/40">{index + 1}</td>

                      <td className="px-4 py-3">
                        {/* Out of the tab order: the title link next to it goes to the same place. */}
                        <Link
                          to={`/films/${entry.tmdbId}`}
                          tabIndex={-1}
                          aria-hidden="true"
                          className="block h-16 w-11 overflow-hidden rounded bg-ink/60 transition-opacity hover:opacity-80"
                        >
                          {posterUrl && (
                            <img
                              src={posterUrl}
                              alt=""
                              loading="lazy"
                              className="h-full w-full object-cover"
                            />
                          )}
                        </Link>
                      </td>

                      <td className="px-4 py-3">
                        <p className="font-medium text-white">
                          <Link
                            to={`/films/${entry.tmdbId}`}
                            className="transition-colors hover:text-brand-gold"
                          >
                            {entry.title}
                          </Link>{' '}
                          {entry.year && <span className="font-normal text-white/40">({entry.year})</span>}
                          {entry.wantsRewatch && (
                            <span className="ml-2 rounded border border-brand-gold/40 px-1.5 py-0.5 align-middle text-[10px] tracking-wide text-brand-gold uppercase">
                              Rewatch
                            </span>
                          )}
                        </p>

                        {entry.reviewId ? (
                          <Link
                            to={`/reviews/${entry.reviewId}`}
                            className="text-xs text-brand-gold transition-colors hover:text-white"
                          >
                            Read review
                          </Link>
                        ) : (
                          <span className="text-xs text-white/30">No review</span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <StarRating rating={entry.rating} size="sm" />
                      </td>

                      <td className="px-4 py-3 text-sm text-white/40">
                        {formatDate(entry.updatedAt)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </section>
  )
}

export default UserFilmList