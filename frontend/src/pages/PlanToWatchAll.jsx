import { useState } from 'react'
import { Link } from 'react-router-dom'

import MostWantedList from '../components/films/MostWantedList'
import { getMostWanted } from '../services/films'
import useApi from '../hooks/useApi'

const PAGE_SIZE = 20

// The whole plan-to-watch leaderboard, PAGE_SIZE at a time.
function PlanToWatchAll() {
  // The first page. "Load more" appends the next page onto this same data,
  // so the list keeps growing in place.
  const { data, loading, error, setData } = useApi(() => getMostWanted(PAGE_SIZE), [])

  const [loadingMore, setLoadingMore] = useState(false)
  const [moreError, setMoreError] = useState(null)

  const films = data?.films ?? []
  const total = data?.total ?? 0
  const remaining = total - films.length

  const handleLoadMore = async () => {
    setLoadingMore(true)
    setMoreError(null)

    try {
      // Start where the list ends. The server sorts the same way every time,
      // but if someone changed their list since the last page, the ranking
      // may have shifted — so drop anything already showing.
      const next = await getMostWanted(PAGE_SIZE, films.length)
      setData((previous) => {
        const shown = new Set(previous.films.map((film) => film.tmdbId))
        return {
          films: [...previous.films, ...next.films.filter((film) => !shown.has(film.tmdbId))],
          total: next.total,
        }
      })
    } catch (err) {
      setMoreError(err.message)
    } finally {
      setLoadingMore(false)
    }
  }

  return (
    <section className="text-white">
      <div className="mx-auto max-w-4xl px-5 py-14 sm:px-8 sm:py-20">

        <Link
          to="/club_events"
          className="text-sm text-white/50 transition-colors hover:text-white"
        >
          ← Back to club events
        </Link>

        <h1 className="mt-6 text-4xl font-bold sm:text-5xl">
          Plan to watch <span className="text-brand-gold">leaderboard</span>
        </h1>

        <div className="mt-4 mb-3 h-1 w-10 rounded-full bg-brand-gold" />

        <p className="mb-8 text-white/50">
          Every film on someone's list, most wanted first.
          {total > 0 && ` ${total} ${total === 1 ? 'film' : 'films'} in all.`}
        </p>

        {films.length === 0 ? (
          <p className="text-white/50">
            {loading
              ? 'Loading…'
              : error
                ? "Couldn't load the leaderboard. Try refreshing the page."
                : 'Nobody has planned anything yet. Add something to your list.'}
          </p>
        ) : (
          <>
            <MostWantedList films={films} />

            {remaining > 0 && (
              <button
                type="button"
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="mt-8 rounded-md border border-white/10 bg-white/5 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/10 disabled:cursor-wait disabled:opacity-60"
              >
                {loadingMore
                  ? 'Loading…'
                  : `Load ${Math.min(remaining, PAGE_SIZE)} more`}
                {!loadingMore && remaining > PAGE_SIZE && ` of ${remaining}`}
              </button>
            )}

            {moreError && (
              <p className="mt-3 text-sm text-brand-red">{moreError}</p>
            )}
          </>
        )}
      </div>
    </section>
  )
}

export default PlanToWatchAll
