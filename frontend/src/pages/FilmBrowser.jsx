import { useState, useEffect, useRef } from 'react'
import { useNavigationType, useSearchParams } from 'react-router-dom'
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

// One page of films for a search or a set of filters. "Movies with club
// reviews only" asks our server, which filters the club's reviewed films
// itself. Everything else asks TMDB.
function fetchFilms({ mode, query, filters }, pageNumber) {
  if (mode === 'search') return searchFilms(query, pageNumber)
  if (filters.reviewed) return getReviewedFilms(filters, pageNumber)
  return discoverFilms(filters, pageNumber)
}

const NO_RESULTS = { key: null, films: [], page: 1, totalPages: 0, totalResults: 0, error: null }

// The films on show and how far down the page they'd scrolled, kept for this
// tab (sessionStorage), so opening a film and coming back shows every film
// they'd loaded, where they left it, instead of starting again from page 1.
const SHOWN_KEY = 'filmBrowser.shown'
const SCROLL_KEY = 'filmBrowser.scroll'

function readShown() {
  try {
    const shown = JSON.parse(sessionStorage.getItem(SHOWN_KEY) ?? 'null')
    return shown?.key && Array.isArray(shown.films) ? { ...shown, error: null } : null
  } catch {
    return null
  }
}

function readScroll() {
  try {
    return Number(sessionStorage.getItem(SCROLL_KEY)) || 0
  } catch {
    return 0
  }
}

function remember(key, value) {
  try {
    sessionStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value))
  } catch {
    // Storage full or off: it just won't be remembered.
  }
}

function FilmBrowser() {
  const [searchParams, setSearchParams] = useSearchParams()

  const [genres, setGenres] = useState([])
  // Back, forward or a refresh ("POP"), rather than a link or a search.
  const cameBack = useNavigationType() === 'POP'
  // The films shown, and which search or filters (`key`) they're for. While
  // they're for different ones, the new ones are loading. Coming back, they
  // start as whatever was on show last time in this tab (readShown), and so
  // does how far down they were.
  const [results, setResults] = useState(() => (cameBack && readShown()) || NO_RESULTS)
  const [cameBackTo] = useState(() => (cameBack ? { key: results.key, scrollY: readScroll() } : null))
  const shownKey = useRef(results.key)
  const [loadingMore, setLoadingMore] = useState(false)

  const mode = searchParams.get('mode') === 'search' ? 'search' : 'browse'
  const query = searchParams.get('q') || ''

  // The search box, which follows the address when it changes (the back
  // button, a search from the nav) but is the member's to type in.
  const [searchInput, setSearchInput] = useState(query)
  const [searchInputFor, setSearchInputFor] = useState(query)
  if (searchInputFor !== query) {
    setSearchInputFor(query)
    setSearchInput(query)
  }

  const filters = {}
  FILTER_KEYS.forEach((key) => {
    filters[key] = searchParams.get(key) || ''
  })
  if (!filters.sort) filters.sort = 'popularity.desc'

  // Everything the first page depends on, as text: a new one loads afresh.
  const fetchKey = JSON.stringify({ mode, query, filters })
  const tooShort = mode === 'search' && query.trim().length < 2
  const current = !tooShort && results.key === fetchKey
  const loading = !tooShort && !current
  const { films, page, totalPages, totalResults, error } = current ? results : NO_RESULTS

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
  }, [searchParams, setSearchParams])

  useEffect(() => {
    getGenres()
      .then(setGenres)
      .catch(() => setGenres([]))
  }, [])

  // What's on show, remembered for coming back (and which search it's for,
  // so a remembered one isn't fetched again).
  useEffect(() => {
    shownKey.current = results.key
    if (results.key && !results.error) remember(SHOWN_KEY, results)
  }, [results])

  // How far down they are, remembered as they scroll and as they leave.
  useEffect(() => {
    let y = 0
    const onScroll = () => {
      y = window.scrollY
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      remember(SCROLL_KEY, String(y))
    }
  }, [])

  // Back (or forward) to the films they had: where they were. After the
  // site's own scroll to the top on a new page (components/ScrollToTop.jsx).
  useEffect(() => {
    if (!cameBackTo || cameBackTo.key !== fetchKey || cameBackTo.scrollY <= 0) return undefined
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => window.scrollTo(0, cameBackTo.scrollY))
    })
    return () => cancelAnimationFrame(frame)
    // Only as the page opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Refetch from page 1 whenever the mode, the search or any filter changes,
  // unless those films are on show already (remembered from last time).
  useEffect(() => {
    const asked = JSON.parse(fetchKey)
    if (asked.mode === 'search' && asked.query.trim().length < 2) return undefined
    if (shownKey.current === fetchKey) return undefined

    let cancelled = false

    fetchFilms(asked, 1)
      .then((data) => {
        if (cancelled) return
        setResults({ key: fetchKey, films: data.films, page: data.page, totalPages: data.totalPages, totalResults: data.totalResults, error: null })
      })
      .catch(() => {
        if (!cancelled) setResults({ ...NO_RESULTS, key: fetchKey, error: 'Could not load films. Is the backend running?' })
      })

    return () => {
      cancelled = true
    }
  }, [fetchKey])

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

    // Added to the films shown, if they're still for the same search.
    const forKey = fetchKey
    fetchFilms({ mode, query, filters }, nextPage)
      .then((data) => {
        setResults((previous) => (previous.key === forKey ? { ...previous, films: [...previous.films, ...data.films], page: data.page } : previous))
      })
      .catch(() => setResults((previous) => (previous.key === forKey ? { ...previous, error: 'Could not load more films.' } : previous)))
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