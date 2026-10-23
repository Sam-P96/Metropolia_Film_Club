import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import FilmFilters from '../components/films/FilmFilters'
import FilmGrid from '../components/films/FilmGrid'
import { searchFilms, discoverFilms, getGenres } from '../services/tmdb'
import { getReviewedFilms } from '../services/films'

const DEFAULT_FILTERS = {
  studio: '420',
  sort: 'release_date.desc',
}

const FILTER_KEYS = [
  'reviewed',
  'byClubRating',
  'studio',
  'genres',
  'excludeGenres',
  'yearFrom',
  'yearTo',
  'certification',
  'minRating',
  'minVotes',
  'runtimeMin',
  'runtimeMax',
  'language',
  'sort',
]

function FilmBrowser() {
  const [searchParams, setSearchParams] = useSearchParams()

  const [genres, setGenres] = useState([])
  const [films, setFilms] = useState([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [totalResults, setTotalResults] = useState(0)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(null)

  const mode = searchParams.get('mode') === 'search' ? 'search' : 'browse'
  const query = searchParams.get('q') || ''

  const [searchInput, setSearchInput] = useState(query)

  const filters = {}
  FILTER_KEYS.forEach((key) => {
    filters[key] = searchParams.get(key) || ''
  })
  if (!filters.sort) filters.sort = 'popularity.desc'

  // "Movies with club reviews only" asks our server, which filters the
  // club's reviewed films itself. Everything else asks TMDB.
  const fetchPage = (pageNumber) => {
    if (mode === 'search') return searchFilms(query, pageNumber)
    if (filters.reviewed) return getReviewedFilms(filters, pageNumber)
    return discoverFilms(filters, pageNumber)
  }

  // A bare /films lands on the default browse view, written into the URL so it
  // is shareable and the controls match what is on screen.
  // Arriving from a search bar (/films?q=...) starts in search mode instead.
  useEffect(() => {
    if (searchParams.get('mode')) return

    if (searchParams.get('q')) {
      setSearchParams({ mode: 'search', q: searchParams.get('q') }, { replace: true })
    } else {
      setSearchParams({ mode: 'browse', ...DEFAULT_FILTERS }, { replace: true })
    }
  }, [])

  useEffect(() => {
    getGenres()
      .then(setGenres)
      .catch(() => setGenres([]))
  }, [])

  useEffect(() => {
    setSearchInput(query)
  }, [query])

  // Refetch from page 1 whenever the mode, the search or any filter changes
  useEffect(() => {
    if (mode === 'search' && query.trim().length < 2) {
      setFilms([])
      setTotalResults(0)
      setTotalPages(0)
      setLoading(false)
      return
    }

    let cancelled = false

    setLoading(true)
    setError(null)

    fetchPage(1)
      .then((data) => {
        if (cancelled) return
        setFilms(data.films)
        setPage(data.page)
        setTotalPages(data.totalPages)
        setTotalResults(data.totalResults)
      })
      .catch(() => {
        if (!cancelled) setError('Could not load films. Is the backend running?')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [mode, query, ...FILTER_KEYS.map((key) => filters[key])])

  const switchMode = (nextMode) => {
    if (nextMode === mode) return

    // Switching throws the other mode's state away entirely
    if (nextMode === 'search') {
      setSearchInput('')
      setSearchParams({ mode: 'search' })
    } else {
      setSearchParams({ mode: 'browse', ...DEFAULT_FILTERS })
    }
  }

  const updateFilter = (key, value) => {
    const next = new URLSearchParams(searchParams)

    if (value) {
      next.set(key, value)
    } else {
      next.delete(key)
    }

    // Sorting by club rating goes with "Movies with club reviews only".
    if (key === 'reviewed' && !value) next.delete('byClubRating')

    setSearchParams(next)
  }

  const toggleGenre = (key, id) => {
    const current = (searchParams.get(key) || '').split(',').filter(Boolean)

    const next = current.includes(id)
      ? current.filter((genreId) => genreId !== id)
      : [...current, id]

    updateFilter(key, next.join(','))
  }

  const clearFilters = () => {
    setSearchParams({ mode: 'browse', sort: filters.sort })
  }

  const handleSearchSubmit = (event) => {
    event.preventDefault()

    const trimmed = searchInput.trim()
    if (!trimmed) return

    setSearchParams({ mode: 'search', q: trimmed })
  }

  const loadMore = () => {
    const nextPage = page + 1

    setLoadingMore(true)

    fetchPage(nextPage)
      .then((data) => {
        setFilms((previous) => [...previous, ...data.films])
        setPage(data.page)
      })
      .catch(() => setError('Could not load more films.'))
      .finally(() => setLoadingMore(false))
  }

  const tabClasses = (active) =>
    active
      ? 'rounded-md border border-brand-gold/60 bg-white/10 px-5 py-2.5 text-sm font-medium text-brand-gold transition-colors'
      : 'rounded-md border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium text-white/60 transition-colors hover:border-white/25 hover:text-white'

  return (
    <section className="text-white">
      <div className="mx-auto max-w-6xl px-8 py-20">

        <h1 className="text-3xl font-bold">
          {mode === 'search' ? (
            <>Search <span className="text-brand-gold">films</span></>
          ) : (
            <>Browse <span className="text-brand-gold">films</span></>
          )}
        </h1>

        <div className="mt-4 mb-8 h-1 w-10 rounded-full bg-brand-gold" />

        <div className="mb-8 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => switchMode('search')}
            className={tabClasses(mode === 'search')}
          >
            Search by title
          </button>
          <button
            type="button"
            onClick={() => switchMode('browse')}
            className={tabClasses(mode === 'browse')}
          >
            Browse by filter
          </button>
        </div>

        {mode === 'search' ? (
          <form onSubmit={handleSearchSubmit} className="flex gap-3">
            <input
              type="search"
              placeholder="Search for a film..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full rounded-md border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-white/30 focus:border-brand-gold/60 focus:bg-white/10"
            />
            <button
              type="submit"
              className="shrink-0 rounded-md bg-brand-red px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-orange"
            >
              Search
            </button>
          </form>
        ) : (
          <FilmFilters
            filters={filters}
            genres={genres}
            onChange={updateFilter}
            onToggleGenre={toggleGenre}
            onClear={clearFilters}
          />
        )}

        <div className="mt-6 mb-5 text-sm text-white/40">
          {loading
            ? 'Loading…'
            : mode === 'search'
              ? query.trim().length < 2
                ? 'Type a film title above.'
                : `${totalResults} results for “${query}”`
              : `${totalResults} films match these filters`}
        </div>

        {error && (
          <p className="rounded-md border border-brand-red/40 bg-brand-red/10 px-4 py-3 text-sm text-white">
            {error}
          </p>
        )}

        {!loading && !error && films.length === 0 && (
          <p className="text-sm text-white/40">
            {mode === 'search'
              ? query.trim().length >= 2
                ? 'Nothing matched that title.'
                : ''
              : 'Nothing matched. Try fewer genres, or widen the year range.'}
          </p>
        )}

        {!loading && films.length > 0 && <FilmGrid films={films} />}

        {!loading && films.length > 0 && page < totalPages && (
          <div className="mt-10 flex justify-center">
            <button
              type="button"
              onClick={loadMore}
              disabled={loadingMore}
              className="rounded-md border border-white/20 bg-white/5 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:border-brand-gold/60 hover:bg-white/10 disabled:opacity-40"
            >
              {loadingMore ? 'Loading…' : 'Load more'}
            </button>
          </div>
        )}

      </div>
    </section>
  )
}

export default FilmBrowser