import { useState, useEffect } from 'react'
import { searchFilms } from '../../services/tmdb'

const MAX_FAVOURITES = 4

// The backend's film search returns nothing for one letter, so don't ask.
const MIN_QUERY = 2

function FilmSearchPicker({ current, onAdd, onSave, onCancel }) {
  const [query, setQuery] = useState('')
  const trimmed = query.trim()

  // Remembers which query these results are for, so "still searching" is
  // just "the last answer was for a different query".
  const [found, setFound] = useState({ query: '', films: [], error: false })

  useEffect(() => {
    if (trimmed.length < MIN_QUERY) return

    let cancelled = false

    // Wait for a pause in typing before asking TMDB.
    const timer = setTimeout(() => {
      // searchFilms resolves to { films, page, totalPages, totalResults }.
      searchFilms(trimmed)
        .then((data) => {
          if (!cancelled) setFound({ query: trimmed, films: data.films ?? [], error: false })
        })
        .catch(() => {
          if (!cancelled) setFound({ query: trimmed, films: [], error: true })
        })
    }, 400)

    // A slow answer for "per" must not replace the one for "perfect blue".
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [trimmed])

  const tooShort = trimmed.length < MIN_QUERY
  const searching = !tooShort && found.query !== trimmed
  const results = !tooShort && !searching ? found.films : []

  const isFull = current.length >= MAX_FAVOURITES

  const alreadyPicked = (tmdbId) =>
    current.some((film) => film.tmdbId === tmdbId)

  return (
    <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">

      <h3 className="mb-4 text-sm font-semibold tracking-widest text-brand-gold uppercase">
        Add a favourite
      </h3>

      <input
        type="search"
        placeholder="Search for a film..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        disabled={isFull}
        className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition-colors placeholder:text-white/30 focus:border-brand-gold/60 focus:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
      />

      {isFull && (
        <p className="mt-2 text-xs text-white/40">
          You have four favourites. Remove one to add another.
        </p>
      )}

      {searching && !isFull && (
        <p className="mt-3 text-xs text-white/40">Searching…</p>
      )}

      {!tooShort && !searching && results.length === 0 && !isFull && (
        <p className="mt-3 text-xs text-white/40">
          {found.error ? "Couldn't reach the film search. Try again." : 'No films match that.'}
        </p>
      )}

      {!searching && results.length > 0 && !isFull && (
        <ul className="mt-3 space-y-2">
          {results.map((film) => {
            const picked = alreadyPicked(film.tmdbId)

            return (
              <li key={film.tmdbId}>
                <button
                  type="button"
                  disabled={picked}
                  onClick={() => onAdd(film)}
                  className="flex w-full items-center gap-3 rounded-md border border-white/10 bg-white/5 p-2 text-left transition-colors hover:border-brand-gold/60 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-white/10 disabled:hover:bg-white/5"
                >
                  <div className="h-16 w-11 shrink-0 overflow-hidden rounded bg-ink/60">
                    {film.posterPath ? (
                      <img
                        src={`https://image.tmdb.org/t/p/w92${film.posterPath}`}
                        alt={film.title}
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">
                      {film.title}
                    </p>
                    <p className="text-xs text-white/40">
                      {film.year || 'Unknown year'}
                      {picked && ' — already picked'}
                    </p>
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
      )}

      <div className="mt-6 flex gap-3">
        <button
          onClick={onSave}
          className="rounded-md bg-brand-red px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-orange"
        >
          Save
        </button>
        <button
          onClick={onCancel}
          className="rounded-md border border-white/20 bg-white/5 px-5 py-2 text-sm font-medium text-white transition-colors hover:border-brand-gold/60 hover:bg-white/10"
        >
          Cancel
        </button>
      </div>

    </div>
  )
}

export default FilmSearchPicker